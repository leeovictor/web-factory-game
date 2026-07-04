import { describe, it, expect } from 'vitest';
import { createTestWorld, spawnMothership, spawnAsteroid, spawnMiner, spawnRelayNode } from './helpers';
import { createTransportRelaySystem } from '../transportRelaySystem';
import { TransportNetwork, GameState } from '../../resources';
import { TRANSPORT_PACKET_SIZE, TRANSPORT_LINE_CAPACITY } from '../../constants';

describe('transportRelaySystem', () => {
  it('should emit packet to parent line when relayBuffer >= PACKET_SIZE and parent line has capacity', () => {
    const world = createTestWorld();
    const mothership = spawnMothership(world);
    const asteroid = spawnAsteroid(world, 200, 0, 100);
    const relay = spawnRelayNode(world, 100, 0, mothership);
    const miner = spawnMiner(world, 200, 0, relay, asteroid);

    const network = world.getResource(TransportNetwork);
    const minerLine = network.lines.get(miner)!;
    minerLine.relayBuffer = TRANSPORT_PACKET_SIZE;

    const system = createTransportRelaySystem();
    system(world, 0);

    const relayLine = network.lines.get(relay)!;
    expect(relayLine.packets.length).toBe(1);
    expect(relayLine.packets[0].amount).toBe(TRANSPORT_PACKET_SIZE);
    expect(relayLine.packets[0].pos).toBe(0);
    expect(minerLine.relayBuffer).toBe(0);
  });

  it('should not emit when parent line is full', () => {
    const world = createTestWorld();
    const mothership = spawnMothership(world);
    const asteroid = spawnAsteroid(world, 200, 0, 100);
    const relay = spawnRelayNode(world, 100, 0, mothership);
    const miner = spawnMiner(world, 200, 0, relay, asteroid);

    const network = world.getResource(TransportNetwork);
    const relayLine = network.lines.get(relay)!;
    for (let i = 0; i < TRANSPORT_LINE_CAPACITY; i++) {
      relayLine.packets.push({ id: i, pos: i * 0.1, amount: TRANSPORT_PACKET_SIZE });
    }

    const minerLine = network.lines.get(miner)!;
    minerLine.relayBuffer = TRANSPORT_PACKET_SIZE;

    const system = createTransportRelaySystem();
    system(world, 0);

    expect(relayLine.packets.length).toBe(TRANSPORT_LINE_CAPACITY);
    expect(minerLine.relayBuffer).toBe(TRANSPORT_PACKET_SIZE);
  });

  it('should credit directly to GameState when parent is mothership (no outgoing line)', () => {
    const world = createTestWorld();
    const mothership = spawnMothership(world);
    const asteroid = spawnAsteroid(world, 100, 0, 100);
    const miner = spawnMiner(world, 100, 0, mothership, asteroid);

    const network = world.getResource(TransportNetwork);
    const minerLine = network.lines.get(miner)!;
    minerLine.relayBuffer = TRANSPORT_PACKET_SIZE;

    const state = world.getResource(GameState);
    const beforeResources = state.resources;

    const system = createTransportRelaySystem();
    system(world, 0);

    expect(state.resources).toBe(beforeResources + TRANSPORT_PACKET_SIZE);
    expect(minerLine.relayBuffer).toBe(0);
  });

  it('should emit multiple packets when relayBuffer has enough and capacity allows', () => {
    const world = createTestWorld();
    const mothership = spawnMothership(world);
    const asteroid = spawnAsteroid(world, 200, 0, 100);
    const relay = spawnRelayNode(world, 100, 0, mothership);
    const miner = spawnMiner(world, 200, 0, relay, asteroid);

    const network = world.getResource(TransportNetwork);
    const minerLine = network.lines.get(miner)!;
    minerLine.relayBuffer = TRANSPORT_PACKET_SIZE * 5;

    const system = createTransportRelaySystem();
    system(world, 0);

    const relayLine = network.lines.get(relay)!;
    expect(relayLine.packets.length).toBe(TRANSPORT_LINE_CAPACITY);
    expect(minerLine.relayBuffer).toBe(TRANSPORT_PACKET_SIZE * 5 - TRANSPORT_PACKET_SIZE * TRANSPORT_LINE_CAPACITY);
  });

  it('should not emit when relayBuffer < PACKET_SIZE', () => {
    const world = createTestWorld();
    const mothership = spawnMothership(world);
    const asteroid = spawnAsteroid(world, 200, 0, 100);
    const relay = spawnRelayNode(world, 100, 0, mothership);
    const miner = spawnMiner(world, 200, 0, relay, asteroid);

    const network = world.getResource(TransportNetwork);
    const minerLine = network.lines.get(miner)!;
    minerLine.relayBuffer = TRANSPORT_PACKET_SIZE - 0.5;

    const system = createTransportRelaySystem();
    system(world, 0);

    const relayLine = network.lines.get(relay)!;
    expect(relayLine.packets.length).toBe(0);
    expect(minerLine.relayBuffer).toBe(TRANSPORT_PACKET_SIZE - 0.5);
  });

  it('should handle nodes without outgoing line (orphaned relay)', () => {
    const world = createTestWorld();
    const mothership = spawnMothership(world);
    const asteroid = spawnAsteroid(world, 200, 0, 100);
    const orphanRelay = spawnRelayNode(world, 100, 0, mothership);
    const miner = spawnMiner(world, 200, 0, orphanRelay, asteroid);

    const network = world.getResource(TransportNetwork);
    network.lines.delete(orphanRelay);
    const minerLine = network.lines.get(miner)!;
    minerLine.relayBuffer = TRANSPORT_PACKET_SIZE;

    const system = createTransportRelaySystem();
    expect(() => system(world, 0)).not.toThrow();
    expect(minerLine.relayBuffer).toBe(TRANSPORT_PACKET_SIZE);
  });

  it('should credit to mothership when relayBuffer at a node whose parent is mothership and has no outgoing line', () => {
    const world = createTestWorld();
    const mothership = spawnMothership(world);
    const asteroid = spawnAsteroid(world, 100, 0, 100);
    const miner = spawnMiner(world, 100, 0, mothership, asteroid);

    const network = world.getResource(TransportNetwork);
    network.lines.delete(miner);
    const minerLine = {
      fromEntity: miner,
      toEntity: mothership,
      length: 100,
      capacity: TRANSPORT_LINE_CAPACITY,
      velocity: 80,
      packets: [],
      relayBuffer: TRANSPORT_PACKET_SIZE,
    };
    network.lines.set(miner, minerLine);

    const state = world.getResource(GameState);
    const beforeResources = state.resources;

    const system = createTransportRelaySystem();
    system(world, 0);

    expect(state.resources).toBe(beforeResources + TRANSPORT_PACKET_SIZE);
  });
});