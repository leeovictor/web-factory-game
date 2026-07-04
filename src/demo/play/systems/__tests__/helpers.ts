import type { World } from '../../../../ecs';
import { defineTag } from '../../../../ecs';
import { Transform } from '../../../../ecs/builtin';
import { ConnectionGraph, TransportNetwork, GameState, MouseState } from '../../resources';
import { Mothership, Miner, MinerData, AsteroidData, MiningVisual, BuildingData, Health } from '../../components';
import {
  TRANSPORT_LINE_CAPACITY,
  TRANSPORT_LINE_VELOCITY,
  MINER_RATE,
} from '../../constants';
import { createWorld } from '../../../../ecs';

export const TestMiner = defineTag('TestMiner');
export const TestRelay = defineTag('TestRelay');
export const TestAsteroid = defineTag('TestAsteroid');

export function createTestWorld(): World {
  const world = createWorld();
  world.insertResource(GameState, {
    resources: 100,
    energy: 50,
    maxEnergy: 50,
    wave: 1,
    totalEnergyConsumed: 0,
    nextAttackThreshold: 50,
    attackInProgress: false,
    gameOver: false,
    buildMode: '' as const,
    paused: false,
  });
  world.insertResource(TransportNetwork, { lines: new Map(), nextPacketId: 0 });
  world.insertResource(MouseState, { x: 0, y: 0, worldX: 0, worldY: 0, clicked: false });
  return world;
}

export function setupConnectionGraph(world: World, mothership: number) {
  const graph = world.getResource(ConnectionGraph);
  graph.nodes.set(mothership, -1);
}

export function spawnMothership(world: World): number {
  const e = world.instantiate(
    Transform({ x: 0, y: 0 }),
    Mothership(),
  );
  setupConnectionGraph(world, e);
  return e;
}

export function spawnAsteroid(world: World, x: number, y: number, resources: number): number {
  return world.instantiate(
    Transform({ x, y }),
    AsteroidData({ resources, maxResources: resources, radius: 20 }),
    TestAsteroid(),
  );
}

export function spawnMiner(world: World, x: number, y: number, parentEntity: number, asteroidEntity: number): number {
  const network = world.getResource(TransportNetwork);
  const parentT = world.get(parentEntity, Transform);
  const dx = x - parentT!.x;
  const dy = y - parentT!.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  const miner = world.instantiate(
    Transform({ x, y }),
    Miner(),
    MinerData({ rate: MINER_RATE, connectedAsteroid: asteroidEntity, buffer: 0 }),
    MiningVisual({ active: false }),
  );

  network.lines.set(miner, {
    fromEntity: miner,
    toEntity: parentEntity,
    length,
    capacity: TRANSPORT_LINE_CAPACITY,
    velocity: TRANSPORT_LINE_VELOCITY,
    packets: [],
    relayBuffer: 0,
  });

  const graph = world.getResource(ConnectionGraph);
  graph.nodes.set(miner, parentEntity);

  return miner;
}

export function spawnRelayNode(world: World, x: number, y: number, parentEntity: number): number {
  const network = world.getResource(TransportNetwork);
  const parentT = world.get(parentEntity, Transform);
  const dx = x - parentT!.x;
  const dy = y - parentT!.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  const relay = world.instantiate(
    Transform({ x, y }),
    BuildingData({ type: 'turret', connectedTo: parentEntity, cost: 10 }),
    Health({ hp: 80, maxHp: 80 }),
    TestRelay(),
  );

  network.lines.set(relay, {
    fromEntity: relay,
    toEntity: parentEntity,
    length,
    capacity: TRANSPORT_LINE_CAPACITY,
    velocity: TRANSPORT_LINE_VELOCITY,
    packets: [],
    relayBuffer: 0,
  });

  const graph = world.getResource(ConnectionGraph);
  graph.nodes.set(relay, parentEntity);

  return relay;
}