import type { World } from '../../ecs';
import { Transform, SpriteRenderer } from '../../ecs/builtin';
import {
  Mothership, Asteroid, Health, AsteroidData,
} from './components';
import { ConnectionGraph, GameState } from './resources';
import {
  MOTHERSHIP_HP, MOTHERSHIP_RADIUS, MOTHERSHIP_BASE_MAX_ENERGY,
  ASTEROID_MIN_RADIUS, ASTEROID_MAX_RADIUS,
  ASTEROID_ORBIT_MIN, ASTEROID_ORBIT_MAX, ASTEROID_COUNT,
  ENERGY_ATTACK_BASE,
} from './constants';

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function spawnInitialWorld(world: World) {
  const mothership = world.instantiate(
    Transform({ x: 0, y: 0 }),
    SpriteRenderer({ sprite: 'capsule', width: MOTHERSHIP_RADIUS * 2, height: MOTHERSHIP_RADIUS * 2.5, color: '#4ecdc4', fill: true }),
    Health({ hp: MOTHERSHIP_HP, maxHp: MOTHERSHIP_HP }),
    Mothership(),
  );

  const graph = world.getResource(ConnectionGraph);
  graph.nodes.set(mothership, -1);

  const state = world.getResource(GameState);
  state.resources = 100;
  state.energy = MOTHERSHIP_BASE_MAX_ENERGY;
  state.maxEnergy = MOTHERSHIP_BASE_MAX_ENERGY;
  state.wave = 1;
  state.totalEnergyConsumed = 0;
  state.nextAttackThreshold = ENERGY_ATTACK_BASE;
  state.attackInProgress = false;
  state.gameOver = false;

  for (let i = 0; i < ASTEROID_COUNT; i++) {
    const angle = (i / ASTEROID_COUNT) * Math.PI * 2 + rand(-0.3, 0.3);
    const dist = rand(ASTEROID_ORBIT_MIN, ASTEROID_ORBIT_MAX);
    const x = Math.cos(angle) * dist;
    const y = Math.sin(angle) * dist;
    const radius = rand(ASTEROID_MIN_RADIUS, ASTEROID_MAX_RADIUS);
    const resources = Math.floor(rand(500, 1500));

    world.instantiate(
      Transform({ x, y }),
      SpriteRenderer({ sprite: 'circle', radius, color: '#8b7355', fill: true }),
      Asteroid(),
      AsteroidData({ resources, maxResources: resources, radius }),
      Health({ hp: 9999, maxHp: 9999 }),
    );
  }
}
