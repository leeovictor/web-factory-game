import type { World } from '../../ecs';
import { CanvasCtx, Circle, Transform } from '../../ecs/builtin';
import { GroundExplosion, Meteor, SmokeColumn, TrailParticle, Velocity } from '../components';
import { randomMeteorColor, randomTailColor, randomRange } from '../utils';

export function createMeteorSpawnSystem(canvas: HTMLCanvasElement) {
  let accumulator = 0;
  const INTERVAL = 1 / 3;

  return (w: World, dt: number) => {
    accumulator += dt;
    while (accumulator >= INTERVAL) {
      accumulator -= INTERVAL;
      const x = randomRange(20, canvas.width - 20);
      const y = -randomRange(10, 50);
      const radius = randomRange(12, 24);
      const vertexCount = 8;
      const vertices = [];
      for (let i = 0; i < vertexCount; i++) {
        const angle = (Math.PI * 2 / vertexCount) * i;
        const r = radius * randomRange(0.65, 1.35);
        vertices.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      }
      w.instantiate(
        Transform({ x, y }),
        Velocity({ vx: randomRange(-60, 60), vy: randomRange(80, 180) }),
        Meteor({ active: true, radius, color: randomMeteorColor(), vertices })
      );
    }
  };
}

export function createMeteorMovementSystem(canvas: HTMLCanvasElement) {
  return (w: World, dt: number) => {
    for (const [id, t, v, meteor] of w.queryComponents(Transform, Velocity, Meteor)) {
      t.x += v.vx * dt;
      t.y += v.vy * dt;

      // Calculate meteor heading
      const speed = Math.sqrt(v.vx * v.vx + v.vy * v.vy) || 1;
      const dirX = v.vx / speed;
      const dirY = v.vy / speed;

      // Tail trail — behind the meteor, extending outward (3 particles per frame)
      for (let i = 0; i < 3; i++) {
        const tailX = t.x - dirX * meteor.radius * (1.0 + i * 0.5);
        const tailY = t.y - dirY * meteor.radius * (1.0 + i * 0.5);
        w.instantiate(
          Transform({ x: tailX + randomRange(-8, 8), y: tailY + randomRange(-8, 8) }),
          Circle({ radius: meteor.radius * randomRange(0.8, 1.4), color: randomTailColor() }),
          TrailParticle({ lifetime: 0, maxLifetime: randomRange(0.25, 0.55) })
        );
      }

      if (t.y - meteor.radius > canvas.height) {
        w.instantiate(
          Transform({ x: t.x, y: canvas.height }),
          GroundExplosion({ lifetime: 0, maxLifetime: 1.0 })
        );
        const smokeColors = ['#4a3f35', '#555555', '#5a4d42', '#666666', '#6d5e55', '#777777'];
        for (let i = 0; i < 14; i++) {
          w.instantiate(
            Transform({ x: t.x + randomRange(-20, 20), y: canvas.height + randomRange(-5, 5) }),
            Circle({ radius: randomRange(6, 16), color: smokeColors[i % smokeColors.length] }),
            SmokeColumn({ lifetime: 0, maxLifetime: randomRange(1.8, 3.0), driftPhase: randomRange(0, Math.PI * 2), driftSpeed: randomRange(0.8, 2.2), riseSpeed: randomRange(14, 32) })
          );
        }
        w.despawn(id);
      } else if (t.x + meteor.radius < 0 || t.x - meteor.radius > canvas.width) {
        w.despawn(id);
      }
    }
  };
}

export function createMeteorRenderSystem() {
  return (w: World) => {
    const canvas = w.getResource(CanvasCtx);
    const ctx = canvas.context;
    if (!ctx) return;

    for (const [_id, t, meteor] of w.queryComponents(Transform, Meteor)) {
      if (meteor.vertices.length === 0) continue;

      ctx.beginPath();
      const first = meteor.vertices[0];
      ctx.moveTo(t.x + first.x, t.y + first.y);
      for (let i = 1; i < meteor.vertices.length; i++) {
        const v = meteor.vertices[i];
        ctx.lineTo(t.x + v.x, t.y + v.y);
      }
      ctx.closePath();

      ctx.fillStyle = meteor.color;
      ctx.fill();
    }
  };
}
