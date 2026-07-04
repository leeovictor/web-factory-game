import { describe, it, expect } from 'vitest';
import { createTestWorld, spawnMothership } from './helpers';
import { createConstructionProgressSystem } from '../constructionProgressSystem';
import { TransportNetwork, ConnectionGraph } from '../../resources';
import { Transform, SpriteRenderer } from '../../../../ecs/builtin';
import { ConstructionSite } from '../../components';
import { TRANSPORT_LINE_CAPACITY, TRANSPORT_LINE_VELOCITY, BUILD_TIME, MINER_COST } from '../../constants';

function dist(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

describe('constructionProgressSystem (transport)', () => {
  it('should register line in TransportNetwork when building completes', () => {
    const world = createTestWorld();
    const mothership = spawnMothership(world);

    const x = 100;
    const y = 0;

    world.instantiate(
      Transform({ x, y }),
      SpriteRenderer({ sprite: 'rect', width: 14, height: 14, color: '#ff0', fill: true, alpha: 0.5 }),
      ConstructionSite({
        buildTime: BUILD_TIME,
        elapsed: BUILD_TIME,
        parentEntity: mothership,
        buildType: 'miner',
        cost: MINER_COST,
        connectedAsteroid: -1,
      }),
    );

    const system = createConstructionProgressSystem();
    system(world, 0);

    const network = world.getResource(TransportNetwork);
    const graph = world.getResource(ConnectionGraph);
    const builtEntities = [...graph.nodes.keys()].filter(e => e !== mothership);
    expect(builtEntities.length).toBe(1);

    const built = builtEntities[0];
    expect(network.lines.has(built)).toBe(true);

    const line = network.lines.get(built)!;
    expect(line.fromEntity).toBe(built);
    expect(line.toEntity).toBe(mothership);
    expect(line.capacity).toBe(TRANSPORT_LINE_CAPACITY);
    expect(line.velocity).toBe(TRANSPORT_LINE_VELOCITY);
    expect(line.length).toBeCloseTo(dist(x, y, 0, 0), 1);
    expect(line.packets).toEqual([]);
    expect(line.relayBuffer).toBe(0);
  });

  it('should not register line for mothership (spawn initial)', () => {
    const world = createTestWorld();
    const mothership = spawnMothership(world);

    const network = world.getResource(TransportNetwork);
    expect(network.lines.has(mothership)).toBe(false);
  });
});