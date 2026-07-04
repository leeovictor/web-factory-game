import {
  createDefaultWorld,
  Transform,
  SpriteRenderer,
  Camera,
  RigidBody,
  PhysicsConfig,
  createSpatialGridDebugSystem,
  Static,
  applyForce,
  Collider,
} from '../ecs/builtin';
import { defineTag } from '../ecs';
import type { World } from '../ecs';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const fpsEl = document.getElementById('fps')!;
const tickEl = document.getElementById('tickTime')!;
const phaseEl = document.getElementById('phaseTimings')!;
const gravityToggle = document.getElementById('gravityToggle') as HTMLInputElement;
const fallSlider = document.getElementById('fallSlider') as HTMLInputElement;
const fallSliderVal = document.getElementById('fallSliderVal')!;
const powerSlider = document.getElementById('powerSlider') as HTMLInputElement;
const powerSliderVal = document.getElementById('powerSliderVal')!;

const WORLD_WIDTH = canvas.width;
const WORLD_HEIGHT = canvas.height;
const FLOOR_Y = WORLD_HEIGHT - 40;

const dw = createDefaultWorld({ canvas, width: WORLD_WIDTH, height: WORLD_HEIGHT });

const FallingBall = defineTag('FallingBall');
const Projectile = defineTag('Projectile');
const Player = defineTag('Player');
const Platform = defineTag('Platform');

const physics = dw.world.getResource(PhysicsConfig);
physics.gravityY = 980;

function random(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

const colors = [
  '#ff5e57', '#ff7f50', '#ff9f43', '#ffc048', '#ffdd59',
  '#7bed9f', '#2ed573', '#1e90ff', '#70a1ff', '#5352ed',
  '#ff6b81', '#f368e0', '#a29bfe',
];

function randomColor() {
  return colors[Math.floor(Math.random() * colors.length)];
}

function spawnFallingBall() {
  const radius = random(5, 10);
  const x = random(100, WORLD_WIDTH - 100);
  dw.spawn(
    Transform({ x, y: -radius }),
    SpriteRenderer({ sprite: 'circle', radius, color: randomColor(), fill: true }),
    Collider({ shape: 'circle', radius }),
    RigidBody({ mass: 1, gravity: true, velocityY: random(0, 100), restitution: 0.6 }),
    FallingBall(),
  );
}

function createFallingBallSystem() {
  return (w: World, _dt: number) => {
    const target = parseInt(fallSlider.value, 10);
    let count = 0;
    for (const _ of w.query(FallingBall)) count++;

    if (count < target) {
      for (let i = count; i < target; i++) {
        spawnFallingBall();
      }
    } else if (count > target) {
      const toRemove: number[] = [];
      for (const e of w.query(FallingBall)) {
        toRemove.push(e);
        if (toRemove.length >= count - target) break;
      }
      for (const eid of toRemove) w.despawn(eid);
    }

    for (const [eid, t] of w.queryComponents(Transform).withTag(FallingBall)) {
      if (t.y > FLOOR_Y + 100) {
        w.despawn(eid);
        spawnFallingBall();
      }
    }
  };
}

function spawnProjectile(originX: number, originY: number) {
  const power = parseInt(powerSlider.value, 10);
  const angle = -Math.PI / 4 + random(-0.3, 0.3);
  const vx = Math.cos(angle) * power;
  const vy = Math.sin(angle) * power;

  dw.spawn(
    Transform({ x: originX, y: originY }),
    SpriteRenderer({ sprite: 'circle', radius: 6, color: '#ffdd59', fill: true }),
    Collider({ shape: 'circle', radius: 6 }),
    RigidBody({ mass: 0.5, gravity: true, velocityX: vx, velocityY: vy, restitution: 0.7 }),
    Projectile(),
  );
}

function createProjectileCleanupSystem() {
  return (w: World, _dt: number) => {
    for (const [eid, t] of w.queryComponents(Transform).withTag(Projectile)) {
      if (t.y > FLOOR_Y + 100 || t.x < -100 || t.x > WORLD_WIDTH + 100) {
        w.despawn(eid);
      }
    }
  };
}

function spawnPlayer() {
  dw.spawn(
    Transform({ x: WORLD_WIDTH / 2, y: FLOOR_Y - 20 }),
    SpriteRenderer({ sprite: 'rect', width: 30, height: 40, color: '#2ed573', fill: true }),
    Collider({ shape: 'rect', width: 30, height: 40 }),
    RigidBody({ mass: 5, gravity: true, restitution: 0.1, friction: 0.3 }),
    Player(),
  );
}

function createPlayerControlSystem() {
  const keys = new Set<string>();
  const MOVE_SPEED = 400;
  const JUMP_VELOCITY = -500;
  let onGround = false;

  window.addEventListener('keydown', (e) => keys.add(e.key));
  window.addEventListener('keyup', (e) => keys.delete(e.key));

  return (w: World, _dt: number) => {
    for (const [, t, rb] of w.queryComponents(Transform, RigidBody).withTag(Player)) {
      onGround = t.y >= FLOOR_Y - 20;

      let moveX = 0;
      if (keys.has('ArrowLeft') || keys.has('a')) moveX -= 1;
      if (keys.has('ArrowRight') || keys.has('d')) moveX += 1;

      if (moveX !== 0) {
        applyForce(rb, moveX * MOVE_SPEED * rb.mass, 0);
      } else {
        rb.velocityX *= 0.85;
      }

      if ((keys.has(' ') || keys.has('ArrowUp') || keys.has('w')) && onGround) {
        rb.velocityY = JUMP_VELOCITY;
        onGround = false;
      }
    }
  };
}

function spawnPlatforms() {
  const PLATFORM_WIDTH = 120;
  const PLATFORM_HEIGHT = 16;

  dw.spawn(
    Transform({ x: 300, y: 300 }),
    SpriteRenderer({ sprite: 'rect', width: PLATFORM_WIDTH, height: PLATFORM_HEIGHT, color: '#a29bfe', fill: true }),
    Collider({ shape: 'rect', width: PLATFORM_WIDTH, height: PLATFORM_HEIGHT }),
    RigidBody({ isKinematic: true, velocityY: 80 }),
    Platform(),
  );

  dw.spawn(
    Transform({ x: 600, y: 450 }),
    SpriteRenderer({ sprite: 'rect', width: PLATFORM_WIDTH, height: PLATFORM_HEIGHT, color: '#f368e0', fill: true }),
    Collider({ shape: 'rect', width: PLATFORM_WIDTH, height: PLATFORM_HEIGHT }),
    RigidBody({ isKinematic: true, velocityY: -60 }),
    Platform(),
  );

  dw.spawn(
    Transform({ x: 900, y: 250 }),
    SpriteRenderer({ sprite: 'rect', width: PLATFORM_WIDTH, height: PLATFORM_HEIGHT, color: '#70a1ff', fill: true }),
    Collider({ shape: 'rect', width: PLATFORM_WIDTH, height: PLATFORM_HEIGHT }),
    RigidBody({ isKinematic: true, velocityY: 100 }),
    Platform(),
  );
}

function createPlatformMovementSystem() {
  return (_w: World, _dt: number) => {
    for (const [, t, rb] of dw.world.queryComponents(Transform, RigidBody).withTag(Platform)) {
      if (t.y < 150) {
        rb.velocityY = Math.abs(rb.velocityY);
      } else if (t.y > FLOOR_Y - 50) {
        rb.velocityY = -Math.abs(rb.velocityY);
      }
    }
  };
}

function spawnFloor() {
  dw.spawn(
    Transform({ x: WORLD_WIDTH / 2, y: FLOOR_Y + 10 }),
    SpriteRenderer({ sprite: 'rect', width: WORLD_WIDTH, height: 20, color: '#3a3a4a', fill: true }),
    Collider({ shape: 'rect', width: WORLD_WIDTH, height: 20 }),
    Static(),
  );
}

function createCameraControlSystem() {
  const keys = new Set<string>();
  const SPEED = 400;
  const ZOOM_SPEED = 0.1;
  const MIN_ZOOM = 0.3;
  const MAX_ZOOM = 3;

  window.addEventListener('keydown', (e) => {
    if (!e.repeat) keys.add(e.key);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key));

  canvas.addEventListener('wheel', (e) => {
    const camera = dw.world.getResource(Camera);
    const oldZoom = camera.zoom;
    camera.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom - Math.sign(e.deltaY) * ZOOM_SPEED));
    camera.x += e.offsetX * (1 / oldZoom - 1 / camera.zoom);
    camera.y += e.offsetY * (1 / oldZoom - 1 / camera.zoom);
  }, { passive: true });

  canvas.addEventListener('click', (e) => {
    const camera = dw.world.getResource(Camera);
    const worldX = e.offsetX / camera.zoom + camera.x;
    const worldY = e.offsetY / camera.zoom + camera.y;
    spawnProjectile(worldX, worldY);
  });

  return (w: World, dt: number) => {
    const camera = w.getResource(Camera);
    let dx = 0;
    let dy = 0;
    if (keys.has('q')) dx -= 1;
    if (keys.has('e')) dx += 1;
    if (keys.has('Shift') && keys.has('ArrowLeft')) dy -= 1;
    if (keys.has('Shift') && keys.has('ArrowRight')) dy += 1;
    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      camera.x += (dx / len) * SPEED * dt / camera.zoom;
      camera.y += (dy / len) * SPEED * dt / camera.zoom;
    }
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

    tickEl.textContent = dw.getTickTime().toFixed(2);

    const timings = dw.getPhaseTimings();
    const pairs = Object.entries(timings)
      .map(([name, ms]) => `${name} ${ms.toFixed(2)}`)
      .join(' / ');
    phaseEl.textContent = pairs || '...';
  };
}

gravityToggle.addEventListener('change', () => {
  physics.gravityY = gravityToggle.checked ? 980 : 0;
});

fallSlider.addEventListener('input', () => {
  fallSliderVal.textContent = fallSlider.value;
});

powerSlider.addEventListener('input', () => {
  powerSliderVal.textContent = powerSlider.value;
});

dw.addSystem(createFallingBallSystem(), 'input');
dw.addSystem(createPlayerControlSystem(), 'update');
dw.addSystem(createPlatformMovementSystem(), 'update');
dw.addSystem(createProjectileCleanupSystem(), 'update');
dw.addSystem(createCameraControlSystem(), 'update');

const debugSystem = createSpatialGridDebugSystem();
dw.addSystem(debugSystem, 'postRender');
dw.addSystem(createUISystem(), 'postRender');

spawnFloor();
spawnPlatforms();
spawnPlayer();
dw.start();
