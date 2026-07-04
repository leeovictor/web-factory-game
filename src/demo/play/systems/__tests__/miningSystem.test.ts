import { describe, it, expect } from 'vitest';
import { createTestWorld, spawnMothership, spawnAsteroid, spawnMiner } from './helpers';
import { createMiningSystem } from '../miningSystem';
import { GameState } from '../../resources';
import { MinerData, MiningVisual, AsteroidData } from '../../components';
import { MINER_ENERGY_COST, MINER_RATE, MINER_BUFFER_MAX } from '../../constants';

describe('miningSystem (buffer)', () => {
  it('should accumulate extracted ore into miner.buffer instead of state.resources', () => {
    const world = createTestWorld();
    spawnMothership(world);
    const asteroid = spawnAsteroid(world, 100, 0, 100);
    const miner = spawnMiner(world, 100, 0, 0, asteroid);

    const beforeResources = world.getResource(GameState).resources;
    const system = createMiningSystem();

    system(world, 1);

    const minerData = world.get(miner, MinerData)!;
    expect(minerData.buffer).toBeGreaterThan(0);
    expect(minerData.buffer).toBeCloseTo(MINER_RATE * 1, 0);
    const afterResources = world.getResource(GameState).resources;
    expect(afterResources).toBe(beforeResources);
  });

  it('should not accumulate state.resources during mining', () => {
    const world = createTestWorld();
    spawnMothership(world);
    const asteroid = spawnAsteroid(world, 100, 0, 100);
    spawnMiner(world, 100, 0, 0, asteroid);

    const initialResources = world.getResource(GameState).resources;
    const system = createMiningSystem();

    system(world, 2);

    expect(world.getResource(GameState).resources).toBe(initialResources);
  });

  it('should pause mining when miner buffer reaches MINER_BUFFER_MAX', () => {
    const world = createTestWorld();
    spawnMothership(world);
    const asteroid = spawnAsteroid(world, 100, 0, 1000);
    const miner = spawnMiner(world, 100, 0, 0, asteroid);

    const minerData = world.get(miner, MinerData)!;
    const mv = world.get(miner, MiningVisual)!;
    minerData.buffer = MINER_BUFFER_MAX;
    mv.active = true;

    const system = createMiningSystem();
    system(world, 0.5);

    expect(mv.active).toBe(false);
  });

  it('should consume energy normally during mining', () => {
    const world = createTestWorld();
    spawnMothership(world);
    const asteroid = spawnAsteroid(world, 100, 0, 100);
    spawnMiner(world, 100, 0, 0, asteroid);

    const state = world.getResource(GameState);
    const initialEnergy = state.energy;
    const system = createMiningSystem();

    system(world, 1);

    const expectedCost = MINER_ENERGY_COST * 1;
    expect(state.energy).toBeCloseTo(initialEnergy - expectedCost, 1);
  });

  it('should set mv.active=false when asteroid is depleted', () => {
    const world = createTestWorld();
    spawnMothership(world);
    const asteroid = spawnAsteroid(world, 100, 0, 0);
    const miner = spawnMiner(world, 100, 0, 0, asteroid);

    const mv = world.get(miner, MiningVisual)!;
    mv.active = true;
    const system = createMiningSystem();
    system(world, 1);

    expect(mv.active).toBe(false);
  });

  it('should not exceed asteroid resources when extracting', () => {
    const world = createTestWorld();
    spawnMothership(world);
    const asteroid = spawnAsteroid(world, 100, 0, 10);
    const miner = spawnMiner(world, 100, 0, 0, asteroid);

    const system = createMiningSystem();

    for (let i = 0; i < 20; i++) {
      system(world, 0.5);
      world.flush();
    }

    const ast = world.get(asteroid, AsteroidData)!;
    expect(ast.resources).toBe(0);
    const minerData = world.get(miner, MinerData)!;
    expect(minerData.buffer).toBeLessThanOrEqual(10 + MINER_RATE * 100);
  });

  it('should extract resources from asteroid', () => {
    const world = createTestWorld();
    spawnMothership(world);
    const asteroid = spawnAsteroid(world, 100, 0, 100);
    spawnMiner(world, 100, 0, 0, asteroid);

    const ast = world.get(asteroid, AsteroidData)!;
    const initialResources = ast.resources;
    const system = createMiningSystem();

    system(world, 1);

    expect(ast.resources).toBeLessThan(initialResources);
  });
});