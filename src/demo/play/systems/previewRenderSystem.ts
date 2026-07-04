import type { World } from '../../../ecs';
import { Transform } from '../../../ecs/builtin';
import { CanvasCtx, Camera } from '../../../ecs/builtin';
import { AsteroidData, Asteroid, ConstructionSite } from '../components';
import { GameState, ConnectionGraph, MouseState } from '../resources';
import {
  MINER_SIZE, TURRET_SIZE, LASER_TURRET_SIZE, SOLAR_SIZE,
  MINER_COST, TURRET_COST, LASER_TURRET_COST, SOLAR_COST,
  BUILD_RANGE, MINER_ASTEROID_RANGE, MAX_CONNECTIONS_PER_NODE,
} from '../constants';

const PREVIEW_SIZES: Record<string, number> = {
  miner: MINER_SIZE,
  turret: TURRET_SIZE,
  laser: LASER_TURRET_SIZE,
  solar: SOLAR_SIZE,
};

const PREVIEW_COSTS: Record<string, number> = {
  miner: MINER_COST,
  turret: TURRET_COST,
  laser: LASER_TURRET_COST,
  solar: SOLAR_COST,
};

const PREVIEW_COLORS: Record<string, string> = {
  miner: 'rgba(255, 217, 61, 0.4)',
  turret: 'rgba(108, 92, 231, 0.4)',
  laser: 'rgba(255, 71, 87, 0.4)',
  solar: 'rgba(255, 165, 2, 0.4)',
};

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

export function createPreviewRenderSystem() {
  return (world: World) => {
    const state = world.getResource(GameState);
    if (!state.buildMode || state.buildMode === 'demolish') return;

    const mouse = world.getResource(MouseState);
    const canvas = world.getResource(CanvasCtx);
    const ctx = canvas.context;
    if (!ctx) return;

    const camera = world.getResource(Camera);
    const size = PREVIEW_SIZES[state.buildMode];
    const cost = PREVIEW_COSTS[state.buildMode];
    if (!size || !cost) return;

    const px = mouse.worldX;
    const py = mouse.worldY;

    const graph = world.getResource(ConnectionGraph);
    let bestNode = -1;
    let bestDist = Infinity;
    let bestAvailNode = -1;
    let bestAvailDist = Infinity;
    for (const [entity] of graph.nodes) {
      const t = world.get(entity, Transform);
      if (!t) continue;
      const d = dist(px, py, t.x, t.y);
      if (d < bestDist) {
        bestDist = d;
        bestNode = entity;
      }
      if (d < bestAvailDist && countNodeConnections(world, entity) < MAX_CONNECTIONS_PER_NODE) {
        bestAvailDist = d;
        bestAvailNode = entity;
      }
    }

    const hasAvailConnection = bestAvailNode !== -1 && bestAvailDist <= BUILD_RANGE;

    let hasAsteroid = true;
    if (state.buildMode === 'miner') {
      hasAsteroid = false;
      for (const [, t] of world.queryComponents(Transform, AsteroidData).withTag(Asteroid)) {
        if (dist(px, py, t.x, t.y) <= MINER_ASTEROID_RANGE) {
          hasAsteroid = true;
          break;
        }
      }
    }

    const canAfford = state.resources >= cost;
    const isValid = hasAvailConnection && hasAsteroid && canAfford;

    const validColor = PREVIEW_COLORS[state.buildMode];
    const invalidColor = 'rgba(255, 71, 87, 0.4)';
    const color = isValid ? validColor : invalidColor;

    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    const lineTarget = hasAvailConnection ? bestAvailNode : bestNode;

    if (lineTarget !== -1) {
      const bt = world.get(lineTarget, Transform);
      if (bt) {
        ctx.beginPath();
        ctx.arc(bt.x, bt.y, BUILD_RANGE, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(78, 205, 196, 0.1)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(bt.x, bt.y);
        const lineHasSpace = bestAvailNode === lineTarget && hasAvailConnection;
        ctx.strokeStyle = lineHasSpace ? 'rgba(78, 205, 196, 0.25)' : 'rgba(255, 71, 87, 0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        const connCount = countNodeConnections(world, lineTarget);
        ctx.font = '10px monospace';
        ctx.fillStyle = connCount >= MAX_CONNECTIONS_PER_NODE ? '#ff4757' : '#4ecdc4';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${connCount}/${MAX_CONNECTIONS_PER_NODE}`, bt.x, bt.y - 8);
      }
    }

    const hw = size / 2;
    ctx.fillStyle = color;
    ctx.fillRect(px - hw, py - hw, size, size);
    ctx.strokeStyle = isValid ? validColor.replace('0.4', '0.8') : 'rgba(255, 71, 87, 0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px - hw, py - hw, size, size);

    if (state.buildMode === 'miner') {
      ctx.beginPath();
      ctx.arc(px, py, MINER_ASTEROID_RANGE, 0, Math.PI * 2);
      ctx.strokeStyle = hasAsteroid ? 'rgba(255, 217, 61, 0.15)' : 'rgba(255, 71, 87, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  };
}
