import type { World } from '../../ecs';
import { CanvasCtx, Circle, Transform } from '../../ecs/builtin';
import { SmokeColumn } from '../components';

export function createSmokeColumnUpdateSystem() {
  return (w: World, dt: number) => {
    for (const [id, t, column, circle] of w.queryComponents(Transform, SmokeColumn, Circle)) {
      column.lifetime += dt;

      // Rise upward at individual speed
      t.y -= column.riseSpeed * dt;

      // Horizontal wobble / drift
      const wobble = Math.sin(column.lifetime * column.driftSpeed + column.driftPhase) * 14;
      t.x += wobble * dt;

      // Expand as it rises — smaller bubbles expand faster
      const expansionRate = 2.5 + (12 - Math.min(12, circle.radius)) * 0.6;
      circle.radius += expansionRate * dt;

      if (column.lifetime >= column.maxLifetime) {
        w.despawn(id);
      }
    }
  };
}

export function createSmokeColumnRenderSystem() {
  return (w: World) => {
    const canvas = w.getResource(CanvasCtx);
    const ctx = canvas.context;
    if (!ctx) return;

    for (const [_id, t, column, circle] of w.queryComponents(Transform, SmokeColumn, Circle)) {
      const progress = column.lifetime / column.maxLifetime;
      const alpha = Math.max(0, 1 - progress * progress);

      // Size-based density — larger = more opaque
      const sizeFactor = Math.min(1, circle.radius / 14);
      const baseAlpha = 0.25 + sizeFactor * 0.35;

      ctx.beginPath();
      ctx.arc(t.x, t.y, circle.radius, 0, Math.PI * 2);
      ctx.fillStyle = circle.color;
      ctx.globalAlpha = alpha * baseAlpha;
      ctx.fill();

      // Soft glow layer
      ctx.beginPath();
      ctx.arc(t.x, t.y, circle.radius * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = circle.color;
      ctx.globalAlpha = alpha * baseAlpha * 0.2;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  };
}
