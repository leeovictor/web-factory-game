import { describe, it, expect } from 'vitest';
import { createTestWorld, spawnMothership, spawnAsteroid, spawnMiner, spawnRelayNode } from './helpers';
import { TransportNetwork, GameState, ConnectionGraph } from '../../resources';
import { BuildingData, ConstructionSite, Health } from '../../components';
import { TRANSPORT_PACKET_SIZE } from '../../constants';

describe('constructionSystem demolish (transport)', () => {
  function mockDemolish(world: ReturnType<typeof createTestWorld>, entity: number) {
    const graph = world.getResource(ConnectionGraph);
    const network = world.getResource(TransportNetwork);
    graph.nodes.delete(entity);
    network.lines.delete(entity);
    world.despawn(entity);
  }

  it('should remove line from TransportNetwork when building is demolished', () => {
    const world = createTestWorld();
    spawnMothership(world);
    const asteroid = spawnAsteroid(world, 100, 0, 100);
    const miner = spawnMiner(world, 100, 0, 0, asteroid);

    const network = world.getResource(TransportNetwork);
    expect(network.lines.has(miner)).toBe(true);

    mockDemolish(world, miner);

    expect(network.lines.has(miner)).toBe(false);
  });

  it('should not credit ore in transit to resources when demolished', () => {
    const world = createTestWorld();
    spawnMothership(world);
    const asteroid = spawnAsteroid(world, 100, 0, 100);
    const miner = spawnMiner(world, 100, 0, 0, asteroid);

    const network = world.getResource(TransportNetwork);
    network.lines.get(miner)!.packets.push({ id: 1, pos: 0.5, amount: TRANSPORT_PACKET_SIZE });

    const state = world.getResource(GameState);
    const beforeResources = state.resources;

    mockDemolish(world, miner);

    expect(state.resources).toBe(beforeResources);
  });

  it('should remove relay with transit ore lost', () => {
    const world = createTestWorld();
    const mothership = spawnMothership(world);
    const asteroid = spawnAsteroid(world, 200, 0, 100);
    const relay = spawnRelayNode(world, 100, 0, mothership);
    const miner = spawnMiner(world, 200, 0, relay, asteroid);

    const network = world.getResource(TransportNetwork);
    const minerLine = network.lines.get(miner)!;
    minerLine.packets.push({ id: 1, pos: 0.5, amount: TRANSPORT_PACKET_SIZE });

    const state = world.getResource(GameState);
    const beforeResources = state.resources;

    mockDemolish(world, relay);

    expect(state.resources).toBe(beforeResources);
  });
});