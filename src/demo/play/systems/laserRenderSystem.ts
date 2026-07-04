import type { World } from '../../../ecs';
import { Transform } from '../../../ecs/builtin';
import { CanvasCtx, Camera } from '../../../ecs/builtin';
import { LaserTurret, LaserTarget } from '../components';

export function createLaserRenderSystem() {
  return (world: World) => {
    const canvas = world.getResource(CanvasCtx);
    const ctx = canvas.context;
    if (!ctx) return;

    const camera = world.getResource(Camera);

    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    for (const [entity, t] of world.queryComponents(Transform).withTag(LaserTurret)) {
      const lt = world.get(entity, LaserTarget);
      if (!lt || lt.entity === -1) continue;

      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(lt.x, lt.y);
      ctx.strokeStyle = 'rgba(255, 71, 87, 0.8)';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(lt.x, lt.y);
      ctx.strokeStyle = 'rgba(255, 150, 150, 0.4)';
      ctx.lineWidth = 8;
      ctx.stroke();
    }

    ctx.restore();
  };
}
