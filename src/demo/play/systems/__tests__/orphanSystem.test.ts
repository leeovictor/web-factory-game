import { describe, it, expect } from 'vitest';
import { createTestWorld, spawnMothership, spawnAsteroid, spawnMiner, spawnRelayNode } from './helpers';
import { createOrphanSystem } from '../orphanSystem';
import { ConnectionGraph, TransportNetwork, GameState } from '../../resources';
import { TRANSPORT_PACKET_SIZE } from '../../constants';

describe('orphanSystem (transport cleanup)', () => {
  it('should remove line from TransportNetwork when node becomes orphan', () => {
    const world = createTestWorld();
    spawnMothership(world);
    const asteroid = spawnAsteroid(world, 200, 0, 100);
    const relay = spawnRelayNode(world, 100, 0, 0);
    const miner = spawnMiner(world, 200, 0, relay, asteroid);

    const graph = world.getResource(ConnectionGraph);
    graph.nodes.delete(relay);

    const network = world.getResource(TransportNetwork);
    network.lines.get(miner)!.packets.push({ id: 1, pos: 0.5, amount: TRANSPORT_PACKET_SIZE });

    const system = createOrphanSystem();
    system(world, 0);

    expect(network.lines.has(miner)).toBe(false);
  });

  it('should not credit ore when line is removed (ore lost)', () => {
    const world = createTestWorld();
    spawnMothership(world);
    const asteroid = spawnAsteroid(world, 200, 0, 100);
    const relay = spawnRelayNode(world, 100, 0, 0);
    const miner = spawnMiner(world, 200, 0, relay, asteroid);

    const graph = world.getResource(ConnectionGraph);
    graph.nodes.delete(relay);

    const network = world.getResource(TransportNetwork);
    network.lines.get(miner)!.packets.push({ id: 1, pos: 0.5, amount: TRANSPORT_PACKET_SIZE });

    const state = world.getResource(GameState);
    const beforeResources = state.resources;

    const system = createOrphanSystem();
    system(world, 0);

    expect(state.resources).toBe(beforeResources);
  });

  it('should not remove line of non-orphan node', () => {
    const world = createTestWorld();
    spawnMothership(world);
    const asteroid = spawnAsteroid(world, 100, 0, 100);
    const miner = spawnMiner(world, 100, 0, 0, asteroid);

    const network = world.getResource(TransportNetwork);
    expect(network.lines.has(miner)).toBe(true);

    const system = createOrphanSystem();
    system(world, 0);

    expect(network.lines.has(miner)).toBe(true);
  });

  it('should handle chain orphan (remove all descendant lines)', () => {
    const world = createTestWorld();
    spawnMothership(world);
    const asteroid = spawnAsteroid(world, 300, 0, 100);
    const relay1 = spawnRelayNode(world, 100, 0, 0);
    const relay2 = spawnRelayNode(world, 200, 0, relay1);
    const miner = spawnMiner(world, 300, 0, relay2, asteroid);

    const graph = world.getResource(ConnectionGraph);
    graph.nodes.delete(relay1);

    const network = world.getResource(TransportNetwork);
    const system = createOrphanSystem();

    system(world, 0);
    expect(network.lines.has(relay2)).toBe(false);

    system(world, 0);
    expect(network.lines.has(miner)).toBe(false);
  });
});