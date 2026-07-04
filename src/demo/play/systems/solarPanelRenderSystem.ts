import type { World } from '../../../ecs';
import { Transform } from '../../../ecs/builtin';
import { CanvasCtx, Camera } from '../../../ecs/builtin';
import { SolarPanel } from '../components';

export function createSolarPanelRenderSystem() {
  return (world: World) => {
    const canvas = world.getResource(CanvasCtx);
    const ctx = canvas.context;
    if (!ctx) return;

    const camera = world.getResource(Camera);

    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    for (const [, t] of world.queryComponents(Transform).withTag(SolarPanel)) {
      const size = 16;
      const hw = size / 2;

      ctx.fillStyle = '#ffa502';
      ctx.fillRect(t.x - hw, t.y - hw, size, size);

      ctx.strokeStyle = '#ff6348';
      ctx.lineWidth = 1;
      ctx.strokeRect(t.x - hw, t.y - hw, size, size);

      for (let i = 0; i < 3; i++) {
        const lx = t.x - hw + 3 + i * 5;
        ctx.beginPath();
        ctx.moveTo(lx, t.y - hw + 3);
        ctx.lineTo(lx, t.y + hw - 3);
        ctx.strokeStyle = 'rgba(255, 99, 72, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    ctx.restore();
  };
}
