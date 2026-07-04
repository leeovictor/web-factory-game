import type { World } from '../../../ecs';
import { Transform } from '../../../ecs/builtin';
import { CanvasCtx, Camera } from '../../../ecs/builtin';
import { TransportNetwork } from '../resources';
import { packetWorldPos } from '../transport/geometry';
import { RELAY_BUFFER_MAX } from '../constants';

export function createTransportRenderSystem() {
  return (world: World) => {
    const canvas = world.getResource(CanvasCtx);
    const ctx = canvas.context;
    if (!ctx) return;

    const camera = world.getResource(Camera);
    const network = world.getResource(TransportNetwork);

    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    for (const [, line] of network.lines) {
      const fromT = world.get(line.fromEntity, Transform);
      const toT = world.get(line.toEntity, Transform);
      if (!fromT || !toT) continue;

      for (const packet of line.packets) {
        const { x, y } = packetWorldPos(fromT.x, fromT.y, toT.x, toT.y, packet.pos);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd93d';
        ctx.fill();
      }

      if (line.relayBuffer > 0) {
        const ratio = Math.min(1, line.relayBuffer / RELAY_BUFFER_MAX);
        const r = 255;
        const g = Math.floor(217 - ratio * 100);
        const b = Math.floor(61 - ratio * 61);

        ctx.beginPath();
        ctx.arc(toT.x, toT.y, 6, 0, Math.PI * 2);
        ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    ctx.restore();
  };
}