import type { World } from '../../../ecs';
import { Transform } from '../../../ecs/builtin';
import { CanvasCtx, Camera } from '../../../ecs/builtin';
import { Turret, LaserTurret } from '../components';
import { UISettings } from '../resources';
import { TURRET_RANGE, LASER_TURRET_RANGE } from '../constants';

export function createTurretRangeRenderSystem() {
  return (world: World) => {
    const ui = world.getResource(UISettings);
    if (!ui.showTurretRanges) return;

    const canvas = world.getResource(CanvasCtx);
    const ctx = canvas.context;
    if (!ctx) return;

    const camera = world.getResource(Camera);

    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    ctx.fillStyle = 'rgba(70, 130, 255, 0.12)';
    ctx.strokeStyle = 'rgba(70, 130, 255, 0.35)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    for (const [, t] of world.queryComponents(Transform).withTag(Turret)) {
      ctx.moveTo(t.x + TURRET_RANGE, t.y);
      ctx.arc(t.x, t.y, TURRET_RANGE, 0, Math.PI * 2);
    }
    for (const [, t] of world.queryComponents(Transform).withTag(LaserTurret)) {
      ctx.moveTo(t.x + LASER_TURRET_RANGE, t.y);
      ctx.arc(t.x, t.y, LASER_TURRET_RANGE, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  };
}
