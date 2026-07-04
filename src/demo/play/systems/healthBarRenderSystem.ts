import type { World } from '../../../ecs';
import { Transform } from '../../../ecs/builtin';
import { CanvasCtx, Camera } from '../../../ecs/builtin';
import { Health } from '../components';

export function createHealthBarRenderSystem() {
  return (world: World) => {
    const canvas = world.getResource(CanvasCtx);
    const ctx = canvas.context;
    if (!ctx) return;

    const camera = world.getResource(Camera);

    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    for (const [, t, hp] of world.queryComponents(Transform, Health)) {
      if (hp.hp >= hp.maxHp) continue;

      const barW = 30;
      const barH = 4;
      const x = t.x - barW / 2;
      const y = t.y - 28;
      const ratio = Math.max(0, hp.hp / hp.maxHp);

      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x, y, barW, barH);

      ctx.fillStyle = ratio > 0.5 ? '#2ed573' : ratio > 0.25 ? '#ffa502' : '#ff4757';
      ctx.fillRect(x, y, barW * ratio, barH);
    }

    ctx.restore();
  };
}
