import type { World } from '../../../ecs';
import { Transform, SpriteRenderer } from '../../../ecs/builtin';
import {
  Mothership, AsteroidData, BuildingData, Asteroid, ConstructionSite,
} from '../components';
import { GameState, ConnectionGraph, MouseState, TransportNetwork } from '../resources';
import {
  MINER_COST,
  TURRET_COST,
  LASER_TURRET_COST,
  SOLAR_COST,
  DEMOLISH_REFUND,
  BUILD_TIME,
  BUILD_RANGE,
  MINER_ASTEROID_RANGE,
  MAX_CONNECTIONS_PER_NODE,
} from '../constants';

function dist(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function countNodeConnections(world: World, nodeId: number): number {
  const graph = world.getResource(ConnectionGraph);
  let count = 0;
  for (const [, parent] of graph.nodes) {
    if (parent === nodeId) count++;
  }
  for (const [, , cs] of world.queryComponents(Transform, ConstructionSite)) {
    if (cs.parentEntity === nodeId) count++;
  }
  return count;
}

function findNearestConnected(world: World, x: number, y: number): number {
  let best = -1;
  let bestDist = Infinity;
  const graph = world.getResource(ConnectionGraph);

  for (const [entity] of graph.nodes) {
    const t = world.get(entity, Transform);
    if (!t) continue;
    const d = dist(x, y, t.x, t.y);
    if (d >= bestDist || d > BUILD_RANGE) continue;
    if (countNodeConnections(world, entity) >= MAX_CONNECTIONS_PER_NODE) continue;
    bestDist = d;
    best = entity;
  }
  return best;
}

function findNearestAsteroid(world: World, x: number, y: number, maxRange: number): number {
  let best = -1;
  let bestDist = Infinity;

  for (const [entity, t] of world.queryComponents(Transform, AsteroidData).withTag(Asteroid)) {
    const d = dist(x, y, t.x, t.y);
    if (d < bestDist) {
      bestDist = d;
      best = entity;
    }
  }

  if (best === -1 || bestDist > maxRange) return -1;
  return best;
}

function findBuildingAtClick(world: World, x: number, y: number): number {
  let best = -1;
  let bestDist = 30;

  for (const [entity, t] of world.queryComponents(Transform)) {
    if (world.has(entity, Mothership)) continue;
    if (!world.has(entity, BuildingData) && !world.has(entity, ConstructionSite)) continue;
    const d = dist(x, y, t.x, t.y);
    if (d < bestDist) {
      bestDist = d;
      best = entity;
    }
  }
  return best;
}

function demolishBuilding(world: World, entity: number, state: { resources: number }) {
  const bd = world.get(entity, BuildingData);
  const cs = world.get(entity, ConstructionSite);
  if (bd) {
    state.resources += Math.floor(bd.cost * DEMOLISH_REFUND);
  } else if (cs) {
    state.resources += Math.floor(cs.cost * DEMOLISH_REFUND);
  }

  const graph = world.getResource(ConnectionGraph);
  const network = world.getResource(TransportNetwork);
  graph.nodes.delete(entity);
  network.lines.delete(entity);
  world.despawn(entity);
}

export function createConstructionSystem() {
  return (world: World, _dt: number) => {
    const state = world.getResource(GameState);
    const mouse = world.getResource(MouseState);

    if (state.gameOver || !state.buildMode || !mouse.clicked) return;
    mouse.clicked = false;

    const px = mouse.worldX;
    const py = mouse.worldY;

    if (state.buildMode === 'demolish') {
      const target = findBuildingAtClick(world, px, py);
      if (target !== -1) {
        demolishBuilding(world, target, state);
      }
      return;
    }

    if (state.buildMode === 'miner' && state.resources >= MINER_COST) {
      const astEntity = findNearestAsteroid(world, px, py, MINER_ASTEROID_RANGE);
      if (astEntity === -1) return;

      const parent = findNearestConnected(world, px, py);
      if (parent === -1) return;

      state.resources -= MINER_COST;
      world.instantiate(
        Transform({ x: px, y: py }),
        SpriteRenderer({ sprite: 'rect', width: 14, height: 14, color: '#ffd93d', fill: true, alpha: 0.5 }),
        ConstructionSite({
          buildTime: BUILD_TIME,
          elapsed: 0,
          parentEntity: parent,
          buildType: 'miner',
          cost: MINER_COST,
          connectedAsteroid: astEntity,
        }),
      );
    }

    if (state.buildMode === 'turret' && state.resources >= TURRET_COST) {
      const parent = findNearestConnected(world, px, py);
      if (parent === -1) return;

      state.resources -= TURRET_COST;
      world.instantiate(
        Transform({ x: px, y: py }),
        SpriteRenderer({ sprite: 'rect', width: 18, height: 18, color: '#6c5ce7', fill: true, alpha: 0.5 }),
        ConstructionSite({
          buildTime: BUILD_TIME,
          elapsed: 0,
          parentEntity: parent,
          buildType: 'turret',
          cost: TURRET_COST,
          connectedAsteroid: -1,
        }),
      );
    }

    if (state.buildMode === 'laser' && state.resources >= LASER_TURRET_COST) {
      const parent = findNearestConnected(world, px, py);
      if (parent === -1) return;

      state.resources -= LASER_TURRET_COST;
      world.instantiate(
        Transform({ x: px, y: py }),
        SpriteRenderer({ sprite: 'rect', width: 18, height: 18, color: '#ff4757', fill: true, alpha: 0.5 }),
        ConstructionSite({
          buildTime: BUILD_TIME,
          elapsed: 0,
          parentEntity: parent,
          buildType: 'laser',
          cost: LASER_TURRET_COST,
          connectedAsteroid: -1,
        }),
      );
    }

    if (state.buildMode === 'solar' && state.resources >= SOLAR_COST) {
      const parent = findNearestConnected(world, px, py);
      if (parent === -1) return;

      state.resources -= SOLAR_COST;
      world.instantiate(
        Transform({ x: px, y: py }),
        SpriteRenderer({ sprite: 'rect', width: 16, height: 16, color: '#ffa502', fill: true, alpha: 0.5 }),
        ConstructionSite({
          buildTime: BUILD_TIME,
          elapsed: 0,
          parentEntity: parent,
          buildType: 'solar',
          cost: SOLAR_COST,
          connectedAsteroid: -1,
        }),
      );
    }
  };
}
