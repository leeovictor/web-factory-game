import type { World } from '../../../ecs';
import { CanvasCtx, Camera } from '../../../ecs/builtin';

const STARS: { x: number; y: number; r: number; brightness: number }[] = [];
for (let i = 0; i < 200; i++) {
  STARS.push({
    x: (Math.random() - 0.5) * 4000,
    y: (Math.random() - 0.5) * 4000,
    r: Math.random() * 1.5 + 0.3,
    brightness: Math.random() * 0.5 + 0.3,
  });
}

export function createBackgroundSystem() {
  return (world: World) => {
    const canvas = world.getResource(CanvasCtx);
    const ctx = canvas.context;
    if (!ctx) return;

    const camera = world.getResource(Camera);

    ctx.fillStyle = '#070b1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    for (const star of STARS) {
      const parallax = 0.3;
      const sx = star.x + camera.x * parallax;
      const sy = star.y + camera.y * parallax;
      ctx.beginPath();
      ctx.arc(sx, sy, star.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
      ctx.fill();
    }

    ctx.restore();
  };
}
