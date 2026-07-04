import type { World } from '../../../ecs';
import { Transform, SpriteRenderer } from '../../../ecs/builtin';
import { Turret, Enemy, Projectile, ProjectileData } from '../components';
import { GameState } from '../resources';
import { TURRET_RANGE, TURRET_FIRE_RATE, PROJECTILE_SPEED, PROJECTILE_DAMAGE, PROJECTILE_SIZE, TURRET_ENERGY_COST } from '../constants';

function dist(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function createTurretSystem() {
  const cooldowns = new Map<number, number>();

  return (world: World, dt: number) => {
    const state = world.getResource(GameState);

    for (const [turretEntity, turretT] of world.queryComponents(Transform).withTag(Turret)) {
      const cd = cooldowns.get(turretEntity) ?? 0;
      if (cd > 0) {
        cooldowns.set(turretEntity, cd - dt);
        continue;
      }

      if (state.energy < TURRET_ENERGY_COST) continue;

      let bestEnemy = -1;
      let bestDist = TURRET_RANGE;

      for (const [enemyEntity, enemyT] of world.queryComponents(Transform).withTag(Enemy)) {
        const d = dist(turretT.x, turretT.y, enemyT.x, enemyT.y);
        if (d < bestDist) {
          bestDist = d;
          bestEnemy = enemyEntity;
        }
      }

      if (bestEnemy === -1) continue;

      const targetT = world.get(bestEnemy, Transform);
      if (!targetT) continue;

      const dx = targetT.x - turretT.x;
      const dy = targetT.y - turretT.y;
      const len = Math.sqrt(dx * dx + dy * dy);

      state.energy -= TURRET_ENERGY_COST;
      if (!state.attackInProgress) {
        state.totalEnergyConsumed += TURRET_ENERGY_COST;
      }

      world.instantiate(
        Transform({ x: turretT.x, y: turretT.y }),
        SpriteRenderer({ sprite: 'circle', radius: PROJECTILE_SIZE, color: '#feca57', fill: true }),
        Projectile(),
        ProjectileData({
          damage: PROJECTILE_DAMAGE,
          speed: PROJECTILE_SPEED,
          targetX: dx / len,
          targetY: dy / len,
          targetEntity: bestEnemy,
          lifetime: 3,
        }),
      );

      cooldowns.set(turretEntity, TURRET_FIRE_RATE);
    }
  };
}
