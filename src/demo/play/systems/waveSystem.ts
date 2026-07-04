import type { World } from '../../../ecs';
import { Transform, SpriteRenderer } from '../../../ecs/builtin';
import { Enemy, EnemyData, Health } from '../components';
import { GameState } from '../resources';
import {
  ENEMIES_PER_WAVE_BASE, ENEMIES_PER_WAVEINCREMENT,
  ENEMY_BASE_SPEED, ENEMY_BASE_HP, ENEMY_BASE_DAMAGE,
  ENEMY_SIZE, ENERGY_ATTACK_MULTIPLIER,
} from '../constants';

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

const WORLD_EDGE = 1500;

function spawnEnemy(world: World) {
  const side = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;

  switch (side) {
    case 0: x = -WORLD_EDGE; y = rand(-WORLD_EDGE, WORLD_EDGE); break;
    case 1: x = WORLD_EDGE; y = rand(-WORLD_EDGE, WORLD_EDGE); break;
    case 2: x = rand(-WORLD_EDGE, WORLD_EDGE); y = -WORLD_EDGE; break;
    case 3: x = rand(-WORLD_EDGE, WORLD_EDGE); y = WORLD_EDGE; break;
  }

  world.instantiate(
    Transform({ x, y }),
    SpriteRenderer({ sprite: 'circle', radius: ENEMY_SIZE, color: '#ff6b6b', fill: true }),
    Enemy(),
    EnemyData({
      speed: ENEMY_BASE_SPEED,
      damage: ENEMY_BASE_DAMAGE,
      target: -1,
      attackCooldown: 0,
    }),
    Health({ hp: ENEMY_BASE_HP, maxHp: ENEMY_BASE_HP }),
  );
}

export function createWaveSystem(_canvasW: number, _canvasH: number) {
  return (world: World, _dt: number) => {
    const state = world.getResource(GameState);
    if (state.gameOver) return;

    if (state.attackInProgress) {
      let hasEnemy = false;
      for (const _ of world.query(Enemy)) {
        hasEnemy = true;
        break;
      }
      if (!hasEnemy) {
        state.attackInProgress = false;
      }
      return;
    }

    if (state.totalEnergyConsumed >= state.nextAttackThreshold) {
      state.totalEnergyConsumed = 0;

      const count = ENEMIES_PER_WAVE_BASE + state.wave * ENEMIES_PER_WAVEINCREMENT;
      for (let i = 0; i < count; i++) {
        spawnEnemy(world);
      }

      state.wave++;
      state.nextAttackThreshold = Math.floor(state.nextAttackThreshold * ENERGY_ATTACK_MULTIPLIER);
      state.attackInProgress = true;
    }
  };
}