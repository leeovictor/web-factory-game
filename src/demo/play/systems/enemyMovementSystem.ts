import type { World } from '../../../ecs';
import { Transform } from '../../../ecs/builtin';
import { Enemy, EnemyData, BuildingData, Mothership } from '../components';

function dist(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function createEnemyMovementSystem() {
  return (world: World, dt: number) => {
    for (const [, enemyT, enemyData] of world.queryComponents(Transform, EnemyData).withTag(Enemy)) {
      if (enemyData.attackCooldown > 0) {
        enemyData.attackCooldown -= dt;
        continue;
      }

      let bestTarget = -1;
      let bestDist = Infinity;

      for (const mothership of world.query(Mothership)) {
        const mt = world.get(mothership, Transform);
        if (mt) {
          const d = dist(enemyT.x, enemyT.y, mt.x, mt.y);
          if (d < bestDist) {
            bestDist = d;
            bestTarget = mothership;
          }
        }
      }

      for (const [building, bt] of world.queryComponents(Transform)) {
        if (!world.has(building, BuildingData)) continue;
        const d = dist(enemyT.x, enemyT.y, bt.x, bt.y);
        if (d < bestDist) {
          bestDist = d;
          bestTarget = building;
        }
      }

      if (bestTarget === -1) continue;
      enemyData.target = bestTarget;

      const targetT = world.get(bestTarget, Transform);
      if (!targetT) continue;

      const dx = targetT.x - enemyT.x;
      const dy = targetT.y - enemyT.y;
      const len = Math.sqrt(dx * dx + dy * dy);

      if (len < 20) {
        enemyData.attackCooldown = 1;
        continue;
      }

      enemyT.x += (dx / len) * enemyData.speed * dt;
      enemyT.y += (dy / len) * enemyData.speed * dt;
    }
  };
}
