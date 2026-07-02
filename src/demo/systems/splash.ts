import type { World } from '../../ecs';
import { CanvasCtx, Circle, Transform } from '../../ecs/builtin';
import { SplashParticle, Velocity } from '../components';

export function createSplashUpdateSystem() {
  return (w: World, dt: number) => {
    for (const [id, t, v, splash, circle] of w.queryComponents(Transform, Velocity, SplashParticle, Circle)) {
      t.x += v.vx * dt;
      t.y += v.vy * dt;
      v.vx *= 0.92;
      v.vy *= 0.92;
      circle.radius *= 0.94;
      splash.lifetime += dt;
      if (splash.lifetime >= splash.maxLifetime || circle.radius < 0.5) {
        w.despawn(id);
      }
    }
  };
}

export function createSplashRenderSystem() {
  return (w: World) => {
    const canvas = w.getResource(CanvasCtx);
    const ctx = canvas.context;
    if (!ctx) return;

    for (const [_id, t, splash, circle] of w.queryComponents(Transform, SplashParticle, Circle)) {
      const progress = splash.lifetime / splash.maxLifetime;
      const alpha = Math.max(0, 1 - progress);

      ctx.beginPath();
      ctx.arc(t.x, t.y, Math.max(0, circle.radius), 0, Math.PI * 2);
      ctx.fillStyle = circle.color;
      ctx.globalAlpha = alpha * 0.9;
      ctx.fill();

      // Glow layer
      ctx.beginPath();
      ctx.arc(t.x, t.y, Math.max(0, circle.radius * 1.6), 0, Math.PI * 2);
      ctx.fillStyle = circle.color;
      ctx.globalAlpha = alpha * 0.25;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  };
}
