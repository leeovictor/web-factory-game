import type { World } from '../../../ecs';
import { Transform } from '../../../ecs/builtin';
import { LaserTurret, Enemy, Health, LaserTarget } from '../components';
import { GameState } from '../resources';
import { LASER_TURRET_RANGE, LASER_TURRET_DPS, LASER_TURRET_ENERGY_COST } from '../constants';

function dist(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function createLaserTurretSystem() {
  return (world: World, dt: number) => {
    const state = world.getResource(GameState);

    for (const [, t, lt] of world.queryComponents(Transform, LaserTarget).withTag(LaserTurret)) {
      let bestEnemy = -1;
      let bestDist = LASER_TURRET_RANGE;
      let bestX = 0;
      let bestY = 0;

      for (const [enemyEntity, enemyT] of world.queryComponents(Transform).withTag(Enemy)) {
        const d = dist(t.x, t.y, enemyT.x, enemyT.y);
        if (d < bestDist) {
          bestDist = d;
          bestEnemy = enemyEntity;
          bestX = enemyT.x;
          bestY = enemyT.y;
        }
      }

      if (bestEnemy === -1) {
        lt.entity = -1;
        lt.x = 0;
        lt.y = 0;
        continue;
      }

      lt.entity = bestEnemy;
      lt.x = bestX;
      lt.y = bestY;

      if (state.energy < LASER_TURRET_ENERGY_COST * dt) {
        continue;
      }

      state.energy -= LASER_TURRET_ENERGY_COST * dt;
      if (!state.attackInProgress) {
        state.totalEnergyConsumed += LASER_TURRET_ENERGY_COST * dt;
      }

      const enemyHp = world.get(bestEnemy, Health);
      if (enemyHp) {
        enemyHp.hp -= LASER_TURRET_DPS * dt;
      }
    }
  };
}
