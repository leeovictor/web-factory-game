import { describe, it, expect } from 'vitest';
import { createTestWorld, spawnMothership, spawnAsteroid, spawnMiner, spawnRelayNode } from './helpers';
import { createMiningSystem } from '../miningSystem';
import { createTransportEmissionSystem } from '../transportEmissionSystem';
import { createTransportMovementSystem } from '../transportMovementSystem';
import { createTransportRelaySystem } from '../transportRelaySystem';
import { TransportNetwork, GameState } from '../../resources';
import { MinerData, AsteroidData } from '../../components';
import { TRANSPORT_PACKET_SIZE } from '../../constants';

function runSystems(world: ReturnType<typeof createTestWorld>, dt: number) {
  createMiningSystem()(world, dt);
  world.flush();
  createTransportEmissionSystem()(world, dt);
  world.flush();
  createTransportMovementSystem()(world, dt);
  world.flush();
  createTransportRelaySystem()(world, dt);
  world.flush();
}

describe('transport end-to-end', () => {
  it('miner -> mothership: full flow deposits ore into GameState.resources', () => {
    const world = createTestWorld();
    const mothership = spawnMothership(world);
    const asteroid = spawnAsteroid(world, 100, 0, 500);
    spawnMiner(world, 100, 0, mothership, asteroid);

    const state = world.getResource(GameState);
    const initialResources = state.resources;

    runSystems(world, 50);

    expect(state.resources).toBeGreaterThan(initialResources);
  });

  it('miner -> relay -> mothership: full chain deposits ore', () => {
    const world = createTestWorld();
    const mothership = spawnMothership(world);
    const asteroid = spawnAsteroid(world, 200, 0, 1000);
    const relay = spawnRelayNode(world, 100, 0, mothership);
    spawnMiner(world, 200, 0, relay, asteroid);

    const state = world.getResource(GameState);
    const initialResources = state.resources;

    for (let i = 0; i < 200; i++) {
      runSystems(world, 0.1);
    }

    expect(state.resources).toBeGreaterThan(initialResources);
  });

  it('should eventually extract all ore from asteroid through chain', () => {
    const world = createTestWorld();
    const mothership = spawnMothership(world);
    const asteroid = spawnAsteroid(world, 100, 0, 50);
    const miner = spawnMiner(world, 100, 0, mothership, asteroid);

    const state = world.getResource(GameState);
    const initialResources = state.resources;

    for (let i = 0; i < 500; i++) {
      runSystems(world, 0.1);
    }

    const ast = world.get(asteroid, AsteroidData)!;
    expect(ast.resources).toBe(0);
    const minerData = world.get(miner, MinerData)!;
    const network = world.getResource(TransportNetwork);
    const minerLine = network.lines.get(miner)!;
    const oreInTransit = minerLine.packets.reduce((s, p) => s + p.amount, 0) + minerLine.relayBuffer + minerData.buffer;
    expect(state.resources).toBeCloseTo(initialResources + 50 - oreInTransit, 0);
  });

  it('should block emission when line full, then resume when space available', () => {
    const world = createTestWorld();
    const mothership = spawnMothership(world);
    const asteroid = spawnAsteroid(world, 100, 0, 1000);
    const miner = spawnMiner(world, 100, 0, mothership, asteroid);

    const network = world.getResource(TransportNetwork);
    const minerLine = network.lines.get(miner)!;
    const minerData = world.get(miner, MinerData)!;

    for (let i = 0; i < minerLine.capacity; i++) {
      minerLine.packets.push({ id: 1000 + i, pos: 0.01 * i, amount: TRANSPORT_PACKET_SIZE });
    }
    minerData.buffer = TRANSPORT_PACKET_SIZE * 2;

    createTransportEmissionSystem()(world, 0);

    expect(minerLine.packets.length).toBe(minerLine.capacity);
    expect(minerData.buffer).toBe(TRANSPORT_PACKET_SIZE * 2);

    minerLine.packets.length = 0;

    createTransportEmissionSystem()(world, 0);

    expect(minerLine.packets.length).toBeGreaterThan(0);
    expect(minerData.buffer).toBeLessThan(TRANSPORT_PACKET_SIZE * 2);
  });
});