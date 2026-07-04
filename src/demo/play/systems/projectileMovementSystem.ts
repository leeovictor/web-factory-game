import type { World } from '../../../ecs';
import { Transform } from '../../../ecs/builtin';
import { Projectile, ProjectileData } from '../components';

export function createProjectileMovementSystem() {
  return (world: World, dt: number) => {
    for (const [, t, proj] of world.queryComponents(Transform, ProjectileData).withTag(Projectile)) {
      t.x += proj.targetX * proj.speed * dt;
      t.y += proj.targetY * proj.speed * dt;
      proj.lifetime -= dt;
    }
  };
}
