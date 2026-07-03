import { createDefaultWorld, Transform, Circle, CanvasCtx } from '../ecs/builtin';
import { Velocity } from './components';
import { defineTag, defineResource } from '../ecs';
import type { World } from '../ecs';

const BallCount = defineResource('BallCount', { count: 0 });

const Fast = defineTag('Fast');

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const fpsEl = document.getElementById('fps')!;
const countEl = document.getElementById('count')!;
const tickEl = document.getElementById('tickTime')!;
const phaseEl = document.getElementById('phaseTimings')!;
const slider = document.getElementById('ballSlider') as HTMLInputElement;
const sliderVal = document.getElementById('ballSliderVal')!;
const fastCountEl = document.getElementById('fastCount')!;

const dw = createDefaultWorld({ canvas, width: 1200, height: 675 });

const colors = [
  '#ff5e57', '#ff7f50', '#ff9f43', '#ffc048', '#ffdd59',
  '#7bed9f', '#2ed573', '#1e90ff', '#70a1ff', '#5352ed',
  '#ff6b81', '#f368e0', '#a29bfe', '#dfe4ea', '#ffffff',
];

function random(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function spawnBall() {
  const radius = random(4, 12);
  const x = random(radius, canvas.width - radius);
  const y = random(radius, canvas.height - radius);
  const vx = random(-250, 250);
  const vy = random(-250, 250);
  const color = colors[Math.floor(Math.random() * colors.length)];
  const isFast = Math.random() < 0.25;
  dw.spawn(
    Transform({ x, y }),
    Circle({ radius, color, fill: true }),
    Velocity({ vx, vy }),
    ...(isFast ? [Fast()] : [])
  );
}

function createBallCountSystem() {
  return (w: World) => {
    const target = parseInt(slider.value, 10);
    const cache = w.getResource(BallCount);
    const current = cache.count;
    if (current < target) {
      for (let i = current; i < target; i++) {
        spawnBall();
        cache.count++;
      }
    } else if (current > target) {
      const toRemove: number[] = [];
      for (const [e] of w.queryComponents(Transform, Circle, Velocity)) {
        toRemove.push(e);
        if (toRemove.length >= current - target) break;
      }
      for (const e of toRemove) {
        w.despawn(e);
        cache.count--;
      }
    }
  };
}

function createBallMovementSystem() {
  return (w: World, dt: number) => {
    for (const [e, t, c, v] of w.queryComponents(Transform, Circle, Velocity)) {
      const mult = w.has(e, Fast) ? 1.5 : 1.0;
      t.x += v.vx * dt * mult;
      t.y += v.vy * dt * mult;

      if (t.x - c.radius < 0) {
        t.x = c.radius;
        v.vx = Math.abs(v.vx);
      } else if (t.x + c.radius > canvas.width) {
        t.x = canvas.width - c.radius;
        v.vx = -Math.abs(v.vx);
      }

      if (t.y - c.radius < 0) {
        t.y = c.radius;
        v.vy = Math.abs(v.vy);
      } else if (t.y + c.radius > canvas.height) {
        t.y = canvas.height - c.radius;
        v.vy = -Math.abs(v.vy);
      }
    }
  };
}

function createFastHighlightSystem() {
  return (w: World) => {
    const ctx = w.getResource(CanvasCtx).context;
    if (!ctx) return;
    ctx.save();
    for (const [_, t, c] of w.queryComponents(Transform, Circle).withTag(Fast)) {
      ctx.beginPath();
      ctx.arc(t.x, t.y, c.radius + 3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  };
}

function createUISystem() {
  const frameTimes: number[] = [];
  let elapsed = 0;
  return (_w: World, dt: number) => {
    frameTimes.push(dt);
    if (frameTimes.length > 60) frameTimes.shift();

    elapsed += dt;
    if (elapsed < 0.25) return;
    elapsed = 0;

    if (frameTimes.length >= 10) {
      const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      fpsEl.textContent = Math.round(1 / avg).toString();
    }

    let entityCount = 0;
    let fastCount = 0;
    for (const _ of dw.world.query(Transform)) entityCount++;
    for (const _ of dw.world.query().withTag(Fast)) fastCount++;
    countEl.textContent = entityCount.toString();
    fastCountEl.textContent = fastCount.toString();
    tickEl.textContent = dw.getTickTime().toFixed(2);

    const timings = dw.getPhaseTimings();
    const pairs = Object.entries(timings)
      .map(([name, ms]) => `${name} ${ms.toFixed(2)}`)
      .join(' / ');
    phaseEl.textContent = pairs || '...';
    sliderVal.textContent = slider.value;
  };
}

slider.addEventListener('input', () => {
  sliderVal.textContent = slider.value;
});

dw.addSystem(createBallCountSystem(), 'input');
dw.addSystem(createBallMovementSystem(), 'update');
dw.addSystem(createFastHighlightSystem(), 'postRender');
dw.addSystem(createUISystem(), 'postRender');

dw.start();
