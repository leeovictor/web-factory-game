import { createDefaultWorld, Transform, Capsule } from '../ecs/builtin';
import { Velocity, PlayerControlled } from './components';
import { createKeyboardInputSystem, createMouseInputSystem } from './systems/input';
import { createPlayerSystem } from './systems/player';
import { createMeteorSpawnSystem, createMeteorMovementSystem, createMeteorRenderSystem } from './systems/meteor';
import { createShootingSystem, createProjectileMovementSystem } from './systems/projectile';
import { createGrenadeThrowSystem, createGrenadePhysicsSystem } from './systems/grenade';
import { createProjectileMeteorCollisionSystem } from './systems/collision';
import { createExplosionUpdateSystem, createExplosionRenderSystem } from './systems/explosion';
import { createSmokeUpdateSystem, createSmokeRenderSystem } from './systems/smoke';
import { createGroundExplosionUpdateSystem, createGroundExplosionRenderSystem } from './systems/groundExplosion';
import { createSmokeColumnUpdateSystem, createSmokeColumnRenderSystem } from './systems/smokeColumn';
import { createSplashUpdateSystem, createSplashRenderSystem } from './systems/splash';
import { createTrailUpdateSystem, createTrailRenderSystem } from './systems/trail';
import { createUISystem } from './systems/render';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const fpsEl = document.getElementById('fps')!;
const countEl = document.getElementById('count')!;
const tickEl = document.getElementById('tickTime')!;
const phaseEl = document.getElementById('phaseTimings')!;
const chargeBarWrap = document.getElementById('chargeBarWrap') as HTMLDivElement;
const chargeBarFill = document.getElementById('chargeBarFill') as HTMLDivElement;
const chargeLabel = document.getElementById('chargeLabel')!;

const dw = createDefaultWorld({ canvas, width: 1200, height: 675 });

// Event listeners
const pressedKeys = new Set<string>();
window.addEventListener('keydown', e => pressedKeys.add(e.key.toLowerCase()));
window.addEventListener('keyup', e => pressedKeys.delete(e.key.toLowerCase()));

const mouseXRef = { value: 0 };
const mouseYRef = { value: 0 };
const mouseDownRef = { value: false };
const qPressedRef = { value: false };
const qJustReleasedRef = { value: false };
const qChargeRef = { value: 0 };
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouseXRef.value = e.clientX - rect.left;
  mouseYRef.value = e.clientY - rect.top;
});
canvas.addEventListener('mousedown', () => mouseDownRef.value = true);
canvas.addEventListener('mouseup', () => mouseDownRef.value = false);
canvas.addEventListener('mouseleave', () => mouseDownRef.value = false);
window.addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'q') qPressedRef.value = true;
});
window.addEventListener('keyup', e => {
  if (e.key.toLowerCase() === 'q') {
    qPressedRef.value = false;
    qJustReleasedRef.value = true;
  }
});

// Register systems
dw.addSystem(createKeyboardInputSystem(pressedKeys), 'input');
dw.addSystem(createMouseInputSystem(mouseXRef, mouseYRef, mouseDownRef), 'input');
dw.addSystem(createMeteorSpawnSystem(canvas), 'input');
dw.addSystem(createShootingSystem(), 'input');
dw.addSystem(createGrenadeThrowSystem(qPressedRef, qJustReleasedRef, qChargeRef, chargeBarWrap, chargeBarFill, chargeLabel), 'input');

dw.addSystem(createMeteorMovementSystem(canvas), 'update');
dw.addSystem(createProjectileMovementSystem(canvas), 'update');
dw.addSystem(createProjectileMeteorCollisionSystem(), 'update');
dw.addSystem(createExplosionUpdateSystem(), 'update');
dw.addSystem(createGroundExplosionUpdateSystem(), 'update');
dw.addSystem(createSmokeColumnUpdateSystem(), 'update');
dw.addSystem(createSmokeUpdateSystem(), 'update');
dw.addSystem(createSplashUpdateSystem(), 'update');
dw.addSystem(createTrailUpdateSystem(), 'update');
dw.addSystem(createGrenadePhysicsSystem(), 'update');
dw.addSystem(createPlayerSystem(canvas), 'update');

dw.addSystem(createMeteorRenderSystem(), 'render');
dw.addSystem(createExplosionRenderSystem(), 'render');
dw.addSystem(createGroundExplosionRenderSystem(), 'render');
dw.addSystem(createSmokeColumnRenderSystem(), 'render');
dw.addSystem(createSmokeRenderSystem(), 'render');
dw.addSystem(createSplashRenderSystem(), 'render');
dw.addSystem(createTrailRenderSystem(), 'render');
dw.addSystem(createUISystem(dw, fpsEl, countEl, tickEl, phaseEl), 'postRender');

// Spawn player
const init = () => {
  dw.spawn(
    Transform({ x: canvas.width / 2, y: canvas.height / 2 }),
    Capsule({ width: 28, height: 56, color: '#00d2d3' }),
    Velocity({ vx: 0, vy: 0 }),
    PlayerControlled({ acceleration: 1800, airAcceleration: 800, maxSpeed: 400, friction: 1200, airFriction: 500, jumpSpeed: 600, gravity: 1200 })
  );
  dw.start();
};
init();
