import type { World } from '../../ecs';
import { CanvasCtx, Circle, Transform } from '../../ecs/builtin';
import { TrailParticle } from '../components';

export function createTrailUpdateSystem() {
  return (w: World, dt: number) => {
    for (const [id, _t, trail, circle] of w.queryComponents(Transform, TrailParticle, Circle)) {
      trail.lifetime += dt;
      circle.radius *= 0.96;
      if (trail.lifetime >= trail.maxLifetime || circle.radius < 0.3) {
        w.despawn(id);
      }
    }
  };
}

export function createTrailRenderSystem() {
  return (w: World) => {
    const canvas = w.getResource(CanvasCtx);
    const ctx = canvas.context;
    if (!ctx) return;

    for (const [_id, t, trail, circle] of w.queryComponents(Transform, TrailParticle, Circle)) {
      const progress = trail.lifetime / trail.maxLifetime;

      // Bell curve: starts transparent (near meteor), peaks mid-tail, fades at end
      const peakAlpha = 0.35;
      const alpha = progress < 0.5
        ? progress * 2 * peakAlpha
        : (1 - progress) * 2 * peakAlpha;

      ctx.beginPath();
      ctx.arc(t.x, t.y, Math.max(0, circle.radius), 0, Math.PI * 2);
      ctx.fillStyle = circle.color;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  };
}
