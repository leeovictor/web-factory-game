import type { World } from '../../ecs';
import { CanvasCtx, Circle, Transform } from '../../ecs/builtin';
import { SmokeParticle, Velocity } from '../components';

export function createSmokeUpdateSystem() {
  return (w: World, dt: number) => {
    for (const [id, t, v, smoke, circle] of w.queryComponents(Transform, Velocity, SmokeParticle, Circle)) {
      // Jitter horizontal for realism — each bubble wobbles uniquely
      const jitter = Math.sin(smoke.lifetime * smoke.driftSpeed + smoke.driftPhase) * 18;
      t.x += (v.vx + jitter) * dt;
      t.y += v.vy * dt;

      // Variable expansion speed based on size — smaller bubbles expand faster
      const expansionRate = 5 + (10 - Math.min(10, circle.radius)) * 0.8;
      circle.radius += expansionRate * dt;

      smoke.lifetime += dt;
      if (smoke.lifetime >= smoke.maxLifetime) {
        w.despawn(id);
      }
    }
  };
}

export function createSmokeRenderSystem() {
  return (w: World) => {
    const canvas = w.getResource(CanvasCtx);
    const ctx = canvas.context;
    if (!ctx) return;

    for (const [_id, t, smoke, circle] of w.queryComponents(Transform, SmokeParticle, Circle)) {
      const progress = smoke.lifetime / smoke.maxLifetime;
      const alpha = Math.max(0, 1 - progress * progress);

      // Base opacity varies by bubble size — larger = denser
      const sizeFactor = Math.min(1, circle.radius / 12);
      const baseAlpha = 0.2 + sizeFactor * 0.25;

      ctx.beginPath();
      ctx.arc(t.x, t.y, circle.radius, 0, Math.PI * 2);
      ctx.fillStyle = circle.color;
      ctx.globalAlpha = alpha * baseAlpha;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  };
}
