import type { World } from '../../ecs';
import { Capsule, Circle, Transform } from '../../ecs/builtin';
import { Projectile, TrailParticle, Velocity } from '../components';
import { MouseState } from '../resources';
import { PlayerControlled } from '../components';
import { randomRange } from '../utils';

export function createShootingSystem() {
  let cooldown = 0;
  const COOLDOWN = 0.15;

  return (w: World, dt: number) => {
    if (cooldown > 0) {
      cooldown -= dt;
      return;
    }
    const mouse = w.getResource(MouseState);
    if (!mouse.trigger) return;

    for (const [_, t] of w.queryComponents(Transform, PlayerControlled, Capsule)) {
      const dx = mouse.x - t.x;
      const dy = mouse.y - t.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const speed = 1300;
      w.instantiate(
        Transform({ x: t.x, y: t.y }),
        Circle({ radius: 4, color: '#ffffff' }),
        Velocity({ vx: (dx / len) * speed, vy: (dy / len) * speed }),
        Projectile({ speed })
      );
      cooldown = COOLDOWN;
      break;
    }

    mouse.trigger = false;
  };
}

export function createProjectileMovementSystem(canvas: HTMLCanvasElement) {
  return (w: World, dt: number) => {
    for (const [id, t, v, _projectile, circle] of w.queryComponents(Transform, Velocity, Projectile, Circle)) {
      // Spawn trail particles behind projectile
      w.instantiate(
        Transform({ x: t.x + randomRange(-1, 1), y: t.y + randomRange(-1, 1) }),
        Circle({ radius: randomRange(1, 2.5), color: '#aaddff' }),
        TrailParticle({ lifetime: 0, maxLifetime: randomRange(0.04, 0.08) })
      );

      t.x += v.vx * dt;
      t.y += v.vy * dt;
      if (t.x + circle.radius < 0 || t.x - circle.radius > canvas.width || t.y + circle.radius < 0 || t.y - circle.radius > canvas.height) {
        w.despawn(id);
      }
    }
  };
}
