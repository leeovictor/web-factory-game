import type { World } from '../../../ecs';
import { Transform } from '../../../ecs/builtin';
import { CanvasCtx, Camera } from '../../../ecs/builtin';
import { Miner, MinerData, MiningVisual } from '../components';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

const particles = new Map<number, Particle[]>();
const beamTime = new Map<number, number>();

function spawnParticle(x: number, y: number) {
  const angle = Math.random() * Math.PI * 2;
  const speed = 20 + Math.random() * 40;
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 0.4 + Math.random() * 0.3,
    maxLife: 0.4 + Math.random() * 0.3,
  };
}

export function createMiningRenderSystem() {
  return (world: World, dt: number) => {
    const canvas = world.getResource(CanvasCtx);
    const ctx = canvas.context;
    if (!ctx) return;

    const camera = world.getResource(Camera);

    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    for (const [entity, t, miner, mv] of world.queryComponents(Transform, MinerData, MiningVisual).withTag(Miner)) {
      const ast = world.get(miner.connectedAsteroid, Transform);
      if (!ast) continue;

      let time = beamTime.get(entity) ?? 0;
      if (mv.active) time += dt;
      beamTime.set(entity, time);

      let list = particles.get(entity);
      if (!list) {
        list = [];
        particles.set(entity, list);
      }

      const wobbleX = mv.active ? Math.sin(time * 4) * 4 : 0;
      const wobbleY = mv.active ? Math.cos(time * 5) * 3 : 0;
      const tipX = ast.x + wobbleX;
      const tipY = ast.y + wobbleY;

      if (mv.active) {
        for (let i = 0; i < 3; i++) {
          list.push(spawnParticle(tipX, tipY));
        }
      }

      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) {
          list.splice(i, 1);
        }
      }

      if (mv.active) {
        ctx.beginPath();
        ctx.moveTo(t.x, t.y);
        ctx.lineTo(tipX, tipY);
        ctx.strokeStyle = 'rgba(255, 217, 61, 0.35)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      for (const p of list) {
        const alpha = p.life / p.maxLife;
        const size = 2 * alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 217, 61, ${alpha * 0.8})`;
        ctx.fill();
      }
    }

    ctx.restore();
  };
}
