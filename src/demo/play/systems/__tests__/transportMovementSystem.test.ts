import { describe, it, expect } from 'vitest';
import { createTestWorld, spawnMothership, spawnAsteroid, spawnMiner, spawnRelayNode } from './helpers';
import { createTransportMovementSystem } from '../transportMovementSystem';
import { TransportNetwork, GameState } from '../../resources';
import { TRANSPORT_PACKET_SIZE, TRANSPORT_LINE_VELOCITY } from '../../constants';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pushPacketsToLine(network: any, lineKey: number, count: number, positions?: number[]) {
  const line = network.lines.get(lineKey)!;
  for (let i = 0; i < count; i++) {
    line.packets.push({
      id: network.nextPacketId++,
      pos: positions ? positions[i] : 0.1 + i * 0.1,
      amount: TRANSPORT_PACKET_SIZE,
    });
  }
}

describe('transportMovementSystem', () => {
  it('should advance packet pos by (velocity/length)*dt', () => {
    const world = createTestWorld();
    spawnMothership(world);
    const asteroid = spawnAsteroid(world, 100, 0, 100);
    const miner = spawnMiner(world, 100, 0, 0, asteroid);

    const network = world.getResource(TransportNetwork);
    const line = network.lines.get(miner)!;
    pushPacketsToLine(network, miner, 1, [0]);

    const dt = 0.5;
    const system = createTransportMovementSystem();
    system(world, dt);

    const expectedDelta = (TRANSPORT_LINE_VELOCITY / line.length) * dt;
    expect(line.packets[0].pos).toBeCloseTo(expectedDelta, 5);
  });

  it('should deliver packet to mothership (GameState.resources) when pos >= 1', () => {
    const world = createTestWorld();
    const mothership = spawnMothership(world);
    const asteroid = spawnAsteroid(world, 100, 0, 100);
    const miner = spawnMiner(world, 100, 0, 0, asteroid);

    const network = world.getResource(TransportNetwork);
    const line = network.lines.get(miner)!;
    line.toEntity = mothership;
    line.packets.push({ id: 1, pos: 0.99, amount: TRANSPORT_PACKET_SIZE });

    const initialState = world.getResource(GameState);
    const beforeResources = initialState.resources;

    const system = createTransportMovementSystem();
    system(world, 1);

    expect(line.packets.length).toBe(0);
    expect(initialState.resources).toBe(beforeResources + TRANSPORT_PACKET_SIZE);
  });

  it('should deposit packet into relayBuffer of non-mothership node when pos >= 1', () => {
    const world = createTestWorld();
    const mothership = spawnMothership(world);
    const asteroid = spawnAsteroid(world, 100, 0, 100);
    const relay = spawnRelayNode(world, 100, 0, mothership);
    const miner = spawnMiner(world, 200, 0, relay, asteroid);

    const network = world.getResource(TransportNetwork);
    const line = network.lines.get(miner)!;
    line.packets.push({ id: 1, pos: 0.99, amount: TRANSPORT_PACKET_SIZE });

    const system = createTransportMovementSystem();
    system(world, 1);

    expect(line.packets.length).toBe(0);
    expect(line.relayBuffer).toBe(TRANSPORT_PACKET_SIZE);
  });

  it('should remove only packets that reach pos >= 1', () => {
    const world = createTestWorld();
    spawnMothership(world);
    const asteroid = spawnAsteroid(world, 100, 0, 100);
    const miner = spawnMiner(world, 100, 0, 0, asteroid);

    const network = world.getResource(TransportNetwork);
    const line = network.lines.get(miner)!;
    line.packets.push({ id: 1, pos: 0.1, amount: TRANSPORT_PACKET_SIZE });
    line.packets.push({ id: 2, pos: 0.5, amount: TRANSPORT_PACKET_SIZE });
    line.packets.push({ id: 3, pos: 0.9, amount: TRANSPORT_PACKET_SIZE });

    const system = createTransportMovementSystem();
    system(world, 100);

    expect(line.packets.length).toBe(0);
  });

  it('should preserve order when multiple packets move', () => {
    const world = createTestWorld();
    spawnMothership(world);
    const asteroid = spawnAsteroid(world, 100, 0, 100);
    const miner = spawnMiner(world, 100, 0, 0, asteroid);

    const network = world.getResource(TransportNetwork);
    const line = network.lines.get(miner)!;
    line.packets.push({ id: 1, pos: 0.0, amount: TRANSPORT_PACKET_SIZE });
    line.packets.push({ id: 2, pos: 0.2, amount: TRANSPORT_PACKET_SIZE });
    line.packets.push({ id: 3, pos: 0.4, amount: TRANSPORT_PACKET_SIZE });

    const system = createTransportMovementSystem();
    system(world, 0.1);

    for (let i = 1; i < line.packets.length; i++) {
      expect(line.packets[i].pos).toBeGreaterThan(line.packets[i - 1].pos);
    }
    expect(line.packets[0].id).toBe(1);
    expect(line.packets[1].id).toBe(2);
    expect(line.packets[2].id).toBe(3);
  });

  it('should not crash when toEntity has no Transform (despawned)', () => {
    const world = createTestWorld();
    spawnMothership(world);
    const asteroid = spawnAsteroid(world, 100, 0, 100);
    const miner = spawnMiner(world, 100, 0, 0, asteroid);

    const network = world.getResource(TransportNetwork);
    const line = network.lines.get(miner)!;
    line.toEntity = 99999;
    line.packets.push({ id: 1, pos: 0.1, amount: TRANSPORT_PACKET_SIZE });

    const system = createTransportMovementSystem();
    expect(() => system(world, 0.1)).not.toThrow();
  });

  it('should advance packets proportionally to velocity/length (longer line = slower advance)', () => {
    const world = createTestWorld();
    spawnMothership(world);
    const asteroid = spawnAsteroid(world, 100, 0, 100);

    const shortMiner = spawnMiner(world, 80, 0, 0, asteroid);
    const longMiner = spawnMiner(world, 120, 40, 0, asteroid);

    const network = world.getResource(TransportNetwork);
    network.lines.get(shortMiner)!.packets.push({ id: 1, pos: 0, amount: TRANSPORT_PACKET_SIZE });
    network.lines.get(longMiner)!.packets.push({ id: 2, pos: 0, amount: TRANSPORT_PACKET_SIZE });

    const system = createTransportMovementSystem();
    system(world, 0.5);

    const shortPos = network.lines.get(shortMiner)!.packets[0]?.pos ?? 0;
    const longPos = network.lines.get(longMiner)!.packets[0]?.pos ?? 0;
    expect(shortPos).toBeGreaterThan(longPos);
  });

  it('should handle empty line (noop)', () => {
    const world = createTestWorld();
    spawnMothership(world);
    const asteroid = spawnAsteroid(world, 100, 0, 100);
    spawnMiner(world, 100, 0, 0, asteroid);

    const system = createTransportMovementSystem();
    expect(() => system(world, 1)).not.toThrow();
  });
});