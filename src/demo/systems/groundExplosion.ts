import type { World } from '../../ecs';
import { CanvasCtx, Transform } from '../../ecs/builtin';
import { GroundExplosion } from '../components';

export function createGroundExplosionUpdateSystem() {
  return (w: World, dt: number) => {
    for (const [id, _t, explosion] of w.queryComponents(Transform, GroundExplosion)) {
      explosion.lifetime += dt;
      if (explosion.lifetime >= explosion.maxLifetime) {
        w.despawn(id);
      }
    }
  };
}

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function createGroundExplosionRenderSystem() {
  return (w: World) => {
    const canvas = w.getResource(CanvasCtx);
    const ctx = canvas.context;
    if (!ctx) return;

    for (const [id, t, explosion] of w.queryComponents(Transform, GroundExplosion)) {
      const progress = explosion.lifetime / explosion.maxLifetime;

      // 1. Base flash — bright white/orange at ground impact
      {
        const flashAlpha = Math.max(0, 1 - progress * 3);
        const flashRadius = (1 - progress) * 38;
        if (flashRadius > 0) {
          // White core
          ctx.beginPath();
          ctx.arc(t.x, t.y, Math.max(0, flashRadius), 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = flashAlpha;
          ctx.fill();

          // Orange glow around core
          ctx.beginPath();
          ctx.arc(t.x, t.y, Math.max(0, flashRadius * 2.0), 0, Math.PI * 2);
          ctx.fillStyle = '#ff9f43';
          ctx.globalAlpha = flashAlpha * 0.6;
          ctx.fill();

          // Outer red glow
          ctx.beginPath();
          ctx.arc(t.x, t.y, Math.max(0, flashRadius * 3.0), 0, Math.PI * 2);
          ctx.fillStyle = '#ff5e57';
          ctx.globalAlpha = flashAlpha * 0.25;
          ctx.fill();
        }
      }

      // 2. Ground dust ring — expanding horizontally at ground level
      {
        const ringAlpha = Math.max(0, 1 - progress * 1.8);
        const ringRadius = progress * 140;
        if (ringAlpha > 0) {
          ctx.beginPath();
          ctx.ellipse(t.x, t.y, ringRadius, ringRadius * 0.28, 0, 0, Math.PI * 2);
          ctx.strokeStyle = '#8b7355';
          ctx.globalAlpha = ringAlpha * 0.55;
          ctx.lineWidth = 4;
          ctx.stroke();

          // Inner ring
          ctx.beginPath();
          ctx.ellipse(t.x, t.y, ringRadius * 0.6, ringRadius * 0.17, 0, 0, Math.PI * 2);
          ctx.strokeStyle = '#a08b6d';
          ctx.globalAlpha = ringAlpha * 0.35;
          ctx.lineWidth = 3;
          ctx.stroke();

          // Core dust cloud
          ctx.beginPath();
          ctx.ellipse(t.x, t.y, ringRadius * 0.25, ringRadius * 0.08, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#6d5e55';
          ctx.globalAlpha = ringAlpha * 0.3;
          ctx.fill();
        }
      }

      // 3. Smoke column (stem) — rising vertical particles
      const stemHeight = progress * 110;
      const stemBaseWidth = 16;
      const stemTopWidth = 38 * Math.min(1, progress * 2.5);
      const stemAlpha = Math.max(0, 1 - progress * 1.1);

      for (let i = 0; i < 14; i++) {
        const heightRatio = i / 13;
        const wobble = Math.sin(progress * 4 + i * 0.8) * 6;
        const sx = t.x + wobble;
        const sy = t.y - stemHeight * heightRatio;
        const width = stemBaseWidth + (stemTopWidth - stemBaseWidth) * heightRatio;
        const particleAlpha = stemAlpha * (0.7 - heightRatio * 0.25);
        if (particleAlpha <= 0) continue;

        ctx.beginPath();
        ctx.arc(sx, sy, width * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#5a4d42';
        ctx.globalAlpha = particleAlpha * 0.6;
        ctx.fill();
      }

      // 4. Mushroom cap — expanding flattened cloud at top
      const capProgress = Math.max(0, (progress - 0.2) / 0.8);
      if (capProgress > 0) {
        const capY = t.y - stemHeight - 8;
        const capRadiusX = 20 + capProgress * 95;
        const capRadiusY = 14 + capProgress * 45;
        const capAlpha = Math.max(0, 1 - capProgress * 1.2);

        // Main cap body
        ctx.beginPath();
        ctx.ellipse(t.x, capY, capRadiusX, capRadiusY, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#4a3f35';
        ctx.globalAlpha = capAlpha * 0.6;
        ctx.fill();

        // Cap top highlight
        ctx.beginPath();
        ctx.ellipse(t.x, capY - capRadiusY * 0.2, capRadiusX * 0.75, capRadiusY * 0.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#6d5e55';
        ctx.globalAlpha = capAlpha * 0.45;
        ctx.fill();

        // Cap bottom ruffle
        for (let i = 0; i < 9; i++) {
          const angle = (Math.PI * 2 / 9) * i + pseudoRandom(id * 11 + i) * 0.3;
          const dist = capRadiusX * (0.7 + pseudoRandom(id * 13 + i) * 0.35);
          const rx = t.x + Math.cos(angle) * dist;
          const ry = capY + Math.sin(angle) * dist * 0.4;
          const rSize = 10 + pseudoRandom(id * 17 + i) * 14;
          ctx.beginPath();
          ctx.arc(rx, ry, rSize, 0, Math.PI * 2);
          ctx.fillStyle = '#3e2723';
          ctx.globalAlpha = capAlpha * 0.5;
          ctx.fill();
        }
      }

      // 5. Secondary debris — small particles shooting outward from base
      {
        const debrisAlpha = Math.max(0, 1 - progress * 2.5);
        if (debrisAlpha > 0) {
          for (let i = 0; i < 12; i++) {
            const seed = id * 19 + i * 7;
            const angle = pseudoRandom(seed) * Math.PI; // upward arc
            const speed = 50 + pseudoRandom(seed + 1) * 140;
            const dist = speed * explosion.lifetime;
            const dx = t.x + Math.cos(angle) * dist;
            const dy = t.y - Math.sin(angle) * dist;
            const size = Math.max(0.5, (1 - progress) * (4 + pseudoRandom(seed + 2) * 5));

            ctx.beginPath();
            ctx.arc(dx, dy, size, 0, Math.PI * 2);
            ctx.fillStyle = '#8b7355';
            ctx.globalAlpha = debrisAlpha * 0.7;
            ctx.fill();
          }
        }
      }

      ctx.globalAlpha = 1;
    }
  };
}
