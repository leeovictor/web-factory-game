import { describe, it, expect } from 'vitest';
import { createTestWorld, spawnMothership, spawnAsteroid, spawnMiner } from './helpers';
import { createTransportEmissionSystem } from '../transportEmissionSystem';
import { TransportNetwork } from '../../resources';
import { MinerData } from '../../components';
import { TRANSPORT_PACKET_SIZE, TRANSPORT_LINE_CAPACITY } from '../../constants';

describe('transportEmissionSystem', () => {
  it('should emit a packet when miner buffer >= PACKET_SIZE and line has capacity', () => {
    const world = createTestWorld();
    spawnMothership(world);
    const asteroid = spawnAsteroid(world, 100, 0, 100);
    const miner = spawnMiner(world, 100, 0, 0, asteroid);

    const minerData = world.get(miner, MinerData)!;
    minerData.buffer = TRANSPORT_PACKET_SIZE;

    const system = createTransportEmissionSystem();
    system(world, 0);

    const network = world.getResource(TransportNetwork);
    const line = network.lines.get(miner)!;
    expect(line.packets.length).toBe(1);
    expect(line.packets[0].amount).toBe(TRANSPORT_PACKET_SIZE);
    expect(line.packets[0].pos).toBe(0);
    expect(minerData.buffer).toBe(0);
  });

  it('should emit multiple packets in one tick when buffer has enough', () => {
    const world = createTestWorld();
    spawnMothership(world);
    const asteroid = spawnAsteroid(world, 100, 0, 100);
    const miner = spawnMiner(world, 100, 0, 0, asteroid);

    const minerData = world.get(miner, MinerData)!;
    minerData.buffer = TRANSPORT_PACKET_SIZE * TRANSPORT_LINE_CAPACITY;

    const system = createTransportEmissionSystem();
    system(world, 0);

    const network = world.getResource(TransportNetwork);
    const line = network.lines.get(miner)!;
    expect(line.packets.length).toBe(TRANSPORT_LINE_CAPACITY);
    expect(minerData.buffer).toBe(0);
  });

  it('should not emit when line is full', () => {
    const world = createTestWorld();
    spawnMothership(world);
    const asteroid = spawnAsteroid(world, 100, 0, 100);
    const miner = spawnMiner(world, 100, 0, 0, asteroid);

    const minerData = world.get(miner, MinerData)!;
    minerData.buffer = TRANSPORT_PACKET_SIZE;

    const network = world.getResource(TransportNetwork);
    const line = network.lines.get(miner)!;
    for (let i = 0; i < TRANSPORT_LINE_CAPACITY; i++) {
      line.packets.push({ id: i, pos: i * 0.2, amount: TRANSPORT_PACKET_SIZE });
    }

    const system = createTransportEmissionSystem();
    system(world, 0);

    expect(line.packets.length).toBe(TRANSPORT_LINE_CAPACITY);
    expect(minerData.buffer).toBe(TRANSPORT_PACKET_SIZE);
  });

  it('should preserve buffer when line is full', () => {
    const world = createTestWorld();
    spawnMothership(world);
    const asteroid = spawnAsteroid(world, 100, 0, 100);
    const miner = spawnMiner(world, 100, 0, 0, asteroid);

    const minerData = world.get(miner, MinerData)!;
    minerData.buffer = TRANSPORT_PACKET_SIZE * 2;

    const network = world.getResource(TransportNetwork);
    const line = network.lines.get(miner)!;
    for (let i = 0; i < TRANSPORT_LINE_CAPACITY; i++) {
      line.packets.push({ id: i, pos: 0.1 + i * 0.1, amount: TRANSPORT_PACKET_SIZE });
    }

    const system = createTransportEmissionSystem();
    system(world, 0);

    expect(minerData.buffer).toBe(TRANSPORT_PACKET_SIZE * 2);
  });

  it('should not emit when miner buffer < PACKET_SIZE', () => {
    const world = createTestWorld();
    spawnMothership(world);
    const asteroid = spawnAsteroid(world, 100, 0, 100);
    const miner = spawnMiner(world, 100, 0, 0, asteroid);

    const minerData = world.get(miner, MinerData)!;
    minerData.buffer = TRANSPORT_PACKET_SIZE - 1;

    const system = createTransportEmissionSystem();
    system(world, 0);

    const network = world.getResource(TransportNetwork);
    const line = network.lines.get(miner)!;
    expect(line.packets.length).toBe(0);
    expect(minerData.buffer).toBe(TRANSPORT_PACKET_SIZE - 1);
  });

  it('should not emit when miner has no line registered', () => {
    const world = createTestWorld();
    spawnMothership(world);
    const asteroid = spawnAsteroid(world, 100, 0, 100);
    const miner = spawnMiner(world, 100, 0, 0, asteroid);

    world.getResource(TransportNetwork).lines.delete(miner);

    const minerData = world.get(miner, MinerData)!;
    minerData.buffer = TRANSPORT_PACKET_SIZE;

    const system = createTransportEmissionSystem();
    system(world, 0);

    expect(minerData.buffer).toBe(TRANSPORT_PACKET_SIZE);
  });

  it('should emit at most capacity packets when buffer is very large', () => {
    const world = createTestWorld();
    spawnMothership(world);
    const asteroid = spawnAsteroid(world, 100, 0, 100);
    const miner = spawnMiner(world, 100, 0, 0, asteroid);

    const minerData = world.get(miner, MinerData)!;
    minerData.buffer = TRANSPORT_PACKET_SIZE * 10;
    const initialBuffer = minerData.buffer;

    const system = createTransportEmissionSystem();
    system(world, 0);

    const network = world.getResource(TransportNetwork);
    const line = network.lines.get(miner)!;
    expect(line.packets.length).toBeLessThanOrEqual(TRANSPORT_LINE_CAPACITY);
    expect(minerData.buffer).toBe(initialBuffer - TRANSPORT_PACKET_SIZE * line.packets.length);
  });

  it('should assign unique incrementing packet IDs across miners', () => {
    const world = createTestWorld();
    spawnMothership(world);
    const asteroid1 = spawnAsteroid(world, 100, 0, 200);
    const asteroid2 = spawnAsteroid(world, 100, 50, 200);
    const miner1 = spawnMiner(world, 100, 0, 0, asteroid1);
    const miner2 = spawnMiner(world, 100, 50, 0, asteroid2);

    world.get(miner1, MinerData)!.buffer = TRANSPORT_PACKET_SIZE;
    world.get(miner2, MinerData)!.buffer = TRANSPORT_PACKET_SIZE;

    const system = createTransportEmissionSystem();
    system(world, 0);

    const network = world.getResource(TransportNetwork);
    const allPackets = [...network.lines.values()].flatMap(l => l.packets);
    const ids = allPackets.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});