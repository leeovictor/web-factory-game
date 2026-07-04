import { createDefaultWorld, Transform, SpriteRenderer, CanvasCtx, SpatialGrid, Camera, getCellKey, createSpatialGridDebugSystem, Static } from '../ecs/builtin';
import { defineTag, defineResource, defineComponent } from '../ecs';
import type { World } from '../ecs';


const BallCount = defineResource('BallCount', { count: 0 });
const Velocity = defineComponent('Velocity', { vx: 0, vy: 0 });
const Fast = defineTag('Fast');

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const fpsEl = document.getElementById('fps')!;
const countEl = document.getElementById('count')!;
const tickEl = document.getElementById('tickTime')!;
const phaseEl = document.getElementById('phaseTimings')!;
const slider = document.getElementById('ballSlider') as HTMLInputElement;
const sliderVal = document.getElementById('ballSliderVal')!;
const fastCountEl = document.getElementById('fastCount')!;
const renderedCountEl = document.getElementById('renderedCount')!;
const staticCountEl = document.getElementById('staticCount')!;
const dynamicCountEl = document.getElementById('dynamicCount')!;
const totalCountEl = document.getElementById('totalCount')!;
const culledCountEl = document.getElementById('culledCount')!;
const debugCheckbox = document.getElementById('debugToggle') as HTMLInputElement;

const WORLD_WIDTH = canvas.width * 2;
const WORLD_HEIGHT = canvas.height * 2;

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
  const x = random(radius, WORLD_WIDTH - radius);
  const y = random(radius, WORLD_HEIGHT - radius);
  const vx = random(-250, 250);
  const vy = random(-250, 250);
  const color = colors[Math.floor(Math.random() * colors.length)];
  const isFast = Math.random() < 0.25;
  dw.spawn(
    Transform({ x, y }),
    SpriteRenderer({ sprite: 'circle', radius, color, fill: true }),
    Velocity({ vx, vy }),
    ...(isFast ? [Fast()] : [])
  );
}

function spawnStaticElements() {
  const WALL_COLOR = '#3a3a4a';

  for (let x = 0; x < WORLD_WIDTH; x += 200) {
    dw.spawn(
      Transform({ x, y: 10 }),
      SpriteRenderer({ sprite: 'rect', width: 190, height: 20, color: WALL_COLOR, fill: true }),
      Static()
    );
    dw.spawn(
      Transform({ x, y: WORLD_HEIGHT - 10 }),
      SpriteRenderer({ sprite: 'rect', width: 190, height: 20, color: WALL_COLOR, fill: true }),
      Static()
    );
  }

  for (let y = 200; y < WORLD_HEIGHT - 200; y += 200) {
    dw.spawn(
      Transform({ x: 10, y }),
      SpriteRenderer({ sprite: 'rect', width: 20, height: 190, color: WALL_COLOR, fill: true }),
      Static()
    );
    dw.spawn(
      Transform({ x: WORLD_WIDTH - 10, y }),
      SpriteRenderer({ sprite: 'rect', width: 20, height: 190, color: WALL_COLOR, fill: true }),
      Static()
    );
  }

  const PILLAR_COLOR = '#4a4a5a';
  for (let x = 400; x < WORLD_WIDTH; x += 600) {
    for (let y = 400; y < WORLD_HEIGHT; y += 600) {
      dw.spawn(
        Transform({ x, y }),
        SpriteRenderer({ sprite: 'circle', radius: 25, color: PILLAR_COLOR, fill: true }),
        Static()
      );
    }
  }
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
      for (const [e] of w.queryComponents(Transform, SpriteRenderer, Velocity)) {
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
    for (const [e, t, c, v] of w.queryComponents(Transform, SpriteRenderer, Velocity)) {
      const mult = w.has(e, Fast) ? 1.5 : 1.0;
      t.x += v.vx * dt * mult;
      t.y += v.vy * dt * mult;

      if (t.x - c.radius < 0) {
        t.x = c.radius;
        v.vx = Math.abs(v.vx);
      } else if (t.x + c.radius > WORLD_WIDTH) {
        t.x = WORLD_WIDTH - c.radius;
        v.vx = -Math.abs(v.vx);
      }

      if (t.y - c.radius < 0) {
        t.y = c.radius;
        v.vy = Math.abs(v.vy);
      } else if (t.y + c.radius > WORLD_HEIGHT) {
        t.y = WORLD_HEIGHT - c.radius;
        v.vy = -Math.abs(v.vy);
      }
    }
  };
}

function createFastHighlightSystem() {
  return (w: World) => {
    const ctx = w.getResource(CanvasCtx).context;
    const camera = w.getResource(Camera);
    if (!ctx) return;
    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);
    for (const [_, t, c] of w.queryComponents(Transform, SpriteRenderer).withTag(Fast)) {
      ctx.beginPath();
      ctx.arc(t.x, t.y, c.radius + 3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2 / camera.zoom;
      ctx.stroke();
    }
    ctx.restore();
  };
}

function createUISystem() {
  const frameTimes: number[] = [];
  let elapsed = 0;
  return (w: World, dt: number) => {
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
    let staticCount = 0;
    let dynamicCount = 0;
    for (const _ of dw.world.query(Transform)) entityCount++;
    for (const _ of dw.world.query().withTag(Fast)) fastCount++;
    for (const _ of dw.world.queryComponents(Transform, SpriteRenderer).withTag(Static)) staticCount++;
    for (const _ of dw.world.queryComponents(Transform, SpriteRenderer).without(Static)) dynamicCount++;
    countEl.textContent = entityCount.toString();
    fastCountEl.textContent = fastCount.toString();
    staticCountEl.textContent = staticCount.toString();
    dynamicCountEl.textContent = dynamicCount.toString();
    tickEl.textContent = dw.getTickTime().toFixed(2);

    const grid = w.getResource(SpatialGrid);
    const canvasRes = w.getResource(CanvasCtx);
    const camera = w.getResource(Camera);
    let renderedCount = 0;
    if (grid.cells) {
      const viewW = canvasRes.width / camera.zoom;
      const viewH = canvasRes.height / camera.zoom;
      const minCellX = Math.floor(camera.x / grid.cellSize);
      const maxCellX = Math.floor((camera.x + viewW) / grid.cellSize);
      const minCellY = Math.floor(camera.y / grid.cellSize);
      const maxCellY = Math.floor((camera.y + viewH) / grid.cellSize);
      const seen = new Set<number>();
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        for (let cx = minCellX; cx <= maxCellX; cx++) {
          const cell = grid.cells.get(getCellKey(cx, cy));
          if (cell) {
            for (const e of cell) {
              if (!seen.has(e)) {
                seen.add(e);
                renderedCount++;
              }
            }
          }
          if (grid.staticCells) {
            const staticCell = grid.staticCells.get(getCellKey(cx, cy));
            if (staticCell) {
              for (const e of staticCell) {
                if (!seen.has(e)) {
                  seen.add(e);
                  renderedCount++;
                }
              }
            }
          }
        }
      }
    }
    renderedCountEl.textContent = renderedCount.toString();
    totalCountEl.textContent = entityCount.toString();
    culledCountEl.textContent = (entityCount - renderedCount).toString();

    const timings = dw.getPhaseTimings();
    const pairs = Object.entries(timings)
      .map(([name, ms]) => `${name} ${ms.toFixed(2)}`)
      .join(' / ');
    phaseEl.textContent = pairs || '...';
    sliderVal.textContent = slider.value;
  };
}

function createCameraControlSystem(canvasEl: HTMLCanvasElement) {
  const keys = new Set<string>();
  const SPEED = 600;
  const ZOOM_SPEED = 0.1;
  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 5;

  window.addEventListener('keydown', (e) => keys.add(e.key));
  window.addEventListener('keyup', (e) => keys.delete(e.key));
  canvasEl.addEventListener('wheel', (e) => {
    const camera = dw.world.getResource(Camera);
    const oldZoom = camera.zoom;
    camera.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom - Math.sign(e.deltaY) * ZOOM_SPEED));
    camera.x += e.offsetX * (1 / oldZoom - 1 / camera.zoom);
    camera.y += e.offsetY * (1 / oldZoom - 1 / camera.zoom);
  }, { passive: true });

  return (w: World, dt: number) => {
    const camera = w.getResource(Camera);

    if (keys.has('=') || keys.has('+') || keys.has('o')) {
      const oldZoom = camera.zoom;
      camera.zoom = Math.min(MAX_ZOOM, camera.zoom + ZOOM_SPEED);
      camera.x += (canvasEl.width / 2) * (1 / oldZoom - 1 / camera.zoom);
      camera.y += (canvasEl.height / 2) * (1 / oldZoom - 1 / camera.zoom);
    }
    if (keys.has('-') || keys.has('_') || keys.has('i')) {
      const oldZoom = camera.zoom;
      camera.zoom = Math.max(MIN_ZOOM, camera.zoom - ZOOM_SPEED);
      camera.x += (canvasEl.width / 2) * (1 / oldZoom - 1 / camera.zoom);
      camera.y += (canvasEl.height / 2) * (1 / oldZoom - 1 / camera.zoom);
    }

    let dx = 0;
    let dy = 0;
    if (keys.has('ArrowLeft') || keys.has('a')) dx -= 1;
    if (keys.has('ArrowRight') || keys.has('d')) dx += 1;
    if (keys.has('ArrowUp') || keys.has('w')) dy -= 1;
    if (keys.has('ArrowDown') || keys.has('s')) dy += 1;
    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      camera.x += (dx / len) * SPEED * dt / camera.zoom;
      camera.y += (dy / len) * SPEED * dt / camera.zoom;
    }
  };
}

slider.addEventListener('input', () => {
  sliderVal.textContent = slider.value;
});

dw.addSystem(createBallCountSystem(), 'input');
dw.addSystem(createBallMovementSystem(), 'update');
dw.addSystem(createCameraControlSystem(canvas), 'update');
const debugSystem = createSpatialGridDebugSystem();
if (debugCheckbox.checked) dw.addSystem(debugSystem, 'postRender');
dw.addSystem(createFastHighlightSystem(), 'postRender');
dw.addSystem(createUISystem(), 'postRender');

debugCheckbox.addEventListener('change', () => {
  if (debugCheckbox.checked) {
    dw.world.addSystem(debugSystem, 'postRender');
  } else {
    dw.world.removeSystem(debugSystem, 'postRender');
  }
});

spawnStaticElements();
dw.start();
