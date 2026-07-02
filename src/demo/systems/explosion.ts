import type { World } from '../../ecs';
import { CanvasCtx, Transform } from '../../ecs/builtin';
import { Explosion } from '../components';

export function createExplosionUpdateSystem() {
  return (w: World, dt: number) => {
    for (const [id, _t, explosion] of w.queryComponents(Transform, Explosion)) {
      explosion.lifetime += dt;
      if (explosion.lifetime >= explosion.maxLifetime) {
        w.despawn(id);
      }
    }
  };
}

const PARTICLE_COUNT = 26;
const MAX_RADIUS = 90;
const DEBRIS_COLORS = ['#ffffff', '#ffffff', '#fffa65', '#fffa65', '#ff9f43', '#ff9f43', '#ff5e57', '#ff5e57', '#e74c3c', '#e74c3c', '#c0392b', '#f1c40f'];

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function createExplosionRenderSystem() {
  return (w: World) => {
    const canvas = w.getResource(CanvasCtx);
    const ctx = canvas.context;
    if (!ctx) return;

    for (const [id, t, explosion] of w.queryComponents(Transform, Explosion)) {
      const progress = explosion.lifetime / explosion.maxLifetime;

      // 1. Core flash — bright white center that burns out fast
      {
        const flashAlpha = Math.max(0, 1 - progress * 4);
        const flashRadius = (1 - progress * 1.5) * 22;
        if (flashRadius > 0) {
          ctx.beginPath();
          ctx.arc(t.x, t.y, Math.max(0, flashRadius), 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = flashAlpha;
          ctx.fill();
        }
      }

      // 2. Inner burn — orange filled circle fading out
      {
        const burnAlpha = Math.max(0, 1 - progress * 3);
        const burnRadius = (1 - progress) * 28;
        if (burnRadius > 0) {
          ctx.beginPath();
          ctx.arc(t.x, t.y, Math.max(0, burnRadius), 0, Math.PI * 2);
          ctx.fillStyle = '#ff9f43';
          ctx.globalAlpha = burnAlpha * 0.7;
          ctx.fill();
        }
      }

      // 3. Primary shockwave ring — fast expanding outline
      {
        const waveAlpha = Math.max(0, 1 - progress * 3);
        const waveRadius = progress * MAX_RADIUS * 1.5;
        if (waveAlpha > 0) {
          ctx.beginPath();
          ctx.arc(t.x, t.y, waveRadius, 0, Math.PI * 2);
          ctx.strokeStyle = '#fffa65';
          ctx.globalAlpha = waveAlpha * 0.8;
          ctx.lineWidth = 4;
          ctx.stroke();
        }
      }

      // 4. Secondary shockwave
      {
        const wave2Alpha = Math.max(0, 1 - progress * 2.5);
        const wave2Radius = progress * MAX_RADIUS * 1.1;
        if (wave2Alpha > 0 && progress > 0.02) {
          ctx.beginPath();
          ctx.arc(t.x, t.y, wave2Radius, 0, Math.PI * 2);
          ctx.strokeStyle = '#ff9f43';
          ctx.globalAlpha = wave2Alpha * 0.55;
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }

      // 5. Tertiary shockwave
      {
        const wave3Alpha = Math.max(0, 1 - progress * 2);
        const wave3Radius = progress * MAX_RADIUS * 0.7;
        if (wave3Alpha > 0 && progress > 0.05) {
          ctx.beginPath();
          ctx.arc(t.x, t.y, wave3Radius, 0, Math.PI * 2);
          ctx.strokeStyle = '#ff5e57';
          ctx.globalAlpha = wave3Alpha * 0.4;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // 6. Debris particles — small circles flying outward radially
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const seed = id * 37 + i * 17;
        const angle = (Math.PI * 2 / PARTICLE_COUNT) * i + pseudoRandom(seed) * 0.5;
        const speed = 80 + pseudoRandom(seed + 1) * 260; // 80-340 px/s
        const dist = speed * explosion.lifetime;
        const px = t.x + Math.cos(angle) * dist;
        const py = t.y + Math.sin(angle) * dist;
        const size = Math.max(0.5, (1 - progress) * (3 + pseudoRandom(seed + 2) * 5));
        const alpha = Math.max(0, 1 - progress * 1.3);

        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fillStyle = DEBRIS_COLORS[i % DEBRIS_COLORS.length];
        ctx.globalAlpha = alpha;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    }
  };
}
