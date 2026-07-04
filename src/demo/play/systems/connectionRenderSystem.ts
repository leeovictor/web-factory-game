import type { World } from '../../../ecs';
import { Transform } from '../../../ecs/builtin';
import { CanvasCtx, Camera } from '../../../ecs/builtin';
import { ConnectionGraph } from '../resources';
import { MAX_CONNECTIONS_PER_NODE } from '../constants';

export function createConnectionRenderSystem() {
  return (world: World) => {
    const canvas = world.getResource(CanvasCtx);
    const ctx = canvas.context;
    if (!ctx) return;

    const camera = world.getResource(Camera);
    const graph = world.getResource(ConnectionGraph);

    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    ctx.strokeStyle = 'rgba(78, 205, 196, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);

    const childCount = new Map<number, number>();
    for (const [, parent] of graph.nodes) {
      childCount.set(parent, (childCount.get(parent) ?? 0) + 1);
    }

    for (const [child, parent] of graph.nodes) {
      if (parent === -1) continue;
      const childT = world.get(child, Transform);
      const parentT = world.get(parent, Transform);
      if (!childT || !parentT) continue;

      ctx.beginPath();
      ctx.moveTo(parentT.x, parentT.y);
      ctx.lineTo(childT.x, childT.y);
      ctx.stroke();
    }

    for (const [entity] of graph.nodes) {
      const t = world.get(entity, Transform);
      if (!t) continue;
      const used = childCount.get(entity) ?? 0;
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = used >= MAX_CONNECTIONS_PER_NODE ? '#ff4757' : '#4ecdc4';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${used}/${MAX_CONNECTIONS_PER_NODE}`, t.x, t.y - 8);
    }

    ctx.setLineDash([]);
    ctx.restore();
  };
}
