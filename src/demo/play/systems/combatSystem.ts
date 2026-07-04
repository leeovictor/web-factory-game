import type { World } from '../../../ecs';
import { Transform } from '../../../ecs/builtin';
import {
  Projectile, ProjectileData, Enemy, EnemyData, Health,
  Mothership,
} from '../components';
import { GameState, ConnectionGraph } from '../resources';
import { ENEMY_BASE_DAMAGE } from '../constants';

function dist(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function createCombatSystem() {
  return (world: World, _dt: number) => {
    const state = world.getResource(GameState);
    if (state.gameOver) return;

    const projectilesToDespawn: number[] = [];
    const enemiesToDespawn: number[] = [];

    for (const [projEntity, projT, projData] of world.queryComponents(Transform, ProjectileData).withTag(Projectile)) {
      for (const [enemyEntity, enemyT] of world.queryComponents(Transform).withTag(Enemy)) {
        if (enemiesToDespawn.includes(enemyEntity)) continue;
        const d = dist(projT.x, projT.y, enemyT.x, enemyT.y);
        if (d < 20) {
          const enemyHp = world.get(enemyEntity, Health);
          if (enemyHp) {
            enemyHp.hp -= projData.damage;
            if (enemyHp.hp <= 0) {
              enemiesToDespawn.push(enemyEntity);
            }
          }
          projectilesToDespawn.push(projEntity);
          break;
        }
      }
    }

    for (const [, enemyT, enemyData] of world.queryComponents(Transform, EnemyData).withTag(Enemy)) {
      if (enemyData.attackCooldown > 0) continue;
      if (enemyData.target === -1) continue;

      const targetT = world.get(enemyData.target, Transform);
      if (!targetT) continue;

      const d = dist(enemyT.x, enemyT.y, targetT.x, targetT.y);
      if (d > 30) continue;

      const targetHp = world.get(enemyData.target, Health);
      if (targetHp) {
        targetHp.hp -= ENEMY_BASE_DAMAGE;
        if (targetHp.hp <= 0) {
          if (world.has(enemyData.target, Mothership)) {
            state.gameOver = true;
          }
          world.despawn(enemyData.target);
          const graph = world.getResource(ConnectionGraph);
          graph.nodes.delete(enemyData.target);
        }
      }
      enemyData.attackCooldown = 1;
    }

    for (const e of projectilesToDespawn) world.despawn(e);
    for (const e of enemiesToDespawn) world.despawn(e);
  };
}
