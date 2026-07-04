import type { World } from '../../../ecs';
import { Transform } from '../../../ecs/builtin';
import { Projectile, ProjectileData, Enemy, Health, AsteroidData } from '../components';

export function createCleanupSystem() {
  return (world: World, _dt: number) => {
    const toDespawn: number[] = [];

    for (const [entity, _t, proj] of world.queryComponents(Transform, ProjectileData).withTag(Projectile)) {
      if (proj.lifetime <= 0) {
        toDespawn.push(entity);
      }
    }

    for (const [entity, hp] of world.queryComponents(Health).withTag(Enemy)) {
      if (hp.hp <= 0) {
        toDespawn.push(entity);
      }
    }

    for (const [entity, ast] of world.queryComponents(AsteroidData).withTag(AsteroidData as any)) {
      if (ast.resources <= 0) {
        toDespawn.push(entity);
      }
    }

    for (const e of toDespawn) world.despawn(e);
  };
}
