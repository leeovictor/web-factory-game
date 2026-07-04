import type { World } from '../../../ecs';
import { Transform } from '../../../ecs/builtin';
import { CanvasCtx, Camera } from '../../../ecs/builtin';
import { ConstructionSite } from '../components';

interface Particle {
  x: number;
  y: number;
  life: number;
  maxLife: number;
}

const particles = new Map<number, Particle[]>();
const beamTime = new Map<number, number>();

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function createConstructionRenderSystem() {
  return (world: World, dt: number) => {
    const canvas = world.getResource(CanvasCtx);
    const ctx = canvas.context;
    if (!ctx) return;

    const camera = world.getResource(Camera);

    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    for (const [entity, t, cs] of world.queryComponents(Transform, ConstructionSite)) {
      const parentT = world.get(cs.parentEntity, Transform);
      if (!parentT) continue;

      let time = beamTime.get(entity) ?? 0;
      time += dt;
      beamTime.set(entity, time);

      let list = particles.get(entity);
      if (!list) {
        list = [];
        particles.set(entity, list);
      }

      const progress = cs.elapsed / cs.buildTime;

      for (let i = 0; i < 2; i++) {
        list.push({
          x: parentT.x,
          y: parentT.y,
          life: 0.6 + Math.random() * 0.3,
          maxLife: 0.6 + Math.random() * 0.3,
        });
      }

      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        const targetX = lerp(parentT.x, t.x, progress);
        const targetY = lerp(parentT.y, t.y, progress);
        const dx = targetX - p.x;
        const dy = targetY - p.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 1) {
          const speed = 200;
          p.x += (dx / d) * speed * dt;
          p.y += (dy / d) * speed * dt;
        }
        p.life -= dt;
        if (p.life <= 0) {
          list.splice(i, 1);
        }
      }

      ctx.beginPath();
      ctx.moveTo(parentT.x, parentT.y);
      ctx.lineTo(t.x, t.y);
      ctx.strokeStyle = 'rgba(78, 205, 196, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      for (const p of list) {
        const alpha = p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2 * alpha, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(78, 205, 196, ${alpha * 0.8})`;
        ctx.fill();
      }

      const barW = 24;
      const barH = 3;
      const barX = t.x - barW / 2;
      const barY = t.y + 14;

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#4ecdc4';
      ctx.fillRect(barX, barY, barW * progress, barH);
    }

    ctx.restore();
  };
}
