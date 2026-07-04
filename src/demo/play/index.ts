import { createWorld } from '../../ecs';
import type { World } from '../../ecs';
import { CanvasCtx, Camera, Transform, SpriteRenderer, createTimeSystem } from '../../ecs/builtin';
import { GameState, ConnectionGraph, MouseState, TransportNetwork } from './resources';
import { spawnInitialWorld } from './spawn';

import { createInputSystem } from './systems/inputSystem';
import { createConstructionSystem } from './systems/constructionSystem';
import { createConstructionProgressSystem } from './systems/constructionProgressSystem';
import { createMiningSystem } from './systems/miningSystem';
import { createTurretSystem } from './systems/turretSystem';
import { createLaserTurretSystem } from './systems/laserTurretSystem';
import { createSolarPanelSystem } from './systems/solarPanelSystem';
import { createEnemyMovementSystem } from './systems/enemyMovementSystem';
import { createProjectileMovementSystem } from './systems/projectileMovementSystem';
import { createCombatSystem } from './systems/combatSystem';
import { createWaveSystem } from './systems/waveSystem';
import { createCleanupSystem } from './systems/cleanupSystem';
import { createOrphanSystem } from './systems/orphanSystem';
import { createBackgroundSystem } from './systems/backgroundSystem';
import { createMiningRenderSystem } from './systems/miningRenderSystem';
import { createConstructionRenderSystem } from './systems/constructionRenderSystem';
import { createPreviewRenderSystem } from './systems/previewRenderSystem';
import { createConnectionRenderSystem } from './systems/connectionRenderSystem';
import { createLaserRenderSystem } from './systems/laserRenderSystem';
import { createSolarPanelRenderSystem } from './systems/solarPanelRenderSystem';
import { createHealthBarRenderSystem } from './systems/healthBarRenderSystem';
import { createHUDSystem } from './systems/hudSystem';
import { createTransportEmissionSystem } from './systems/transportEmissionSystem';
import { createTransportMovementSystem } from './systems/transportMovementSystem';
import { createTransportRelaySystem } from './systems/transportRelaySystem';
import { createTransportRenderSystem } from './systems/transportRenderSystem';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const statsEl = document.getElementById('stats')!;
const fpsEl = document.getElementById('fps')!;
const buildMenuEl = document.getElementById('buildMenu')!;

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const world = createWorld({ phases: ['input', 'update', 'render', 'postRender'] });

world.insertResource(CanvasCtx, {
  element: canvas,
  context: canvas.getContext('2d'),
  width: WIDTH,
  height: HEIGHT,
});

world.insertResource(Camera, { x: -WIDTH / 2, y: -HEIGHT / 2, zoom: 1 });
world.insertResource(GameState, {
  resources: 100,
  energy: 50,
  maxEnergy: 50,
  wave: 1,
  totalEnergyConsumed: 0,
  nextAttackThreshold: 50,
  attackInProgress: false,
  gameOver: false,
  buildMode: '',
  paused: false,
});
world.insertResource(ConnectionGraph, { nodes: new Map<number, number>() });
world.insertResource(TransportNetwork, { lines: new Map(), nextPacketId: 0 });
world.insertResource(MouseState, { x: 0, y: 0, worldX: 0, worldY: 0, clicked: false });

world.addSystem(createTimeSystem(), 'input');
world.addSystem(createInputSystem(canvas), 'input');

world.addSystem(createConstructionSystem(), 'update');
world.addSystem(createConstructionProgressSystem(), 'update');
world.addSystem(createMiningSystem(), 'update');
world.addSystem(createTransportEmissionSystem(), 'update');
world.addSystem(createTransportMovementSystem(), 'update');
world.addSystem(createTransportRelaySystem(), 'update');
world.addSystem(createTurretSystem(), 'update');
world.addSystem(createLaserTurretSystem(), 'update');
world.addSystem(createSolarPanelSystem(), 'update');
world.addSystem(createEnemyMovementSystem(), 'update');
world.addSystem(createProjectileMovementSystem(), 'update');
world.addSystem(createCombatSystem(), 'update');
world.addSystem(createWaveSystem(WIDTH, HEIGHT), 'update');
world.addSystem(createCleanupSystem(), 'update');
world.addSystem(createOrphanSystem(), 'update');

world.addSystem(createBackgroundSystem(), 'render');
world.addSystem(createEntityRenderSystem(), 'render');
world.addSystem(createMiningRenderSystem(), 'render');
world.addSystem(createConstructionRenderSystem(), 'render');
world.addSystem(createPreviewRenderSystem(), 'render');
world.addSystem(createConnectionRenderSystem(), 'render');
world.addSystem(createTransportRenderSystem(), 'render');
world.addSystem(createLaserRenderSystem(), 'render');
world.addSystem(createSolarPanelRenderSystem(), 'render');
world.addSystem(createHealthBarRenderSystem(), 'render');

world.addSystem(createHUDSystem(statsEl, fpsEl, buildMenuEl), 'postRender');

function createEntityRenderSystem() {
  return (w: World) => {
    const canvas = w.getResource(CanvasCtx);
    const ctx = canvas.context;
    if (!ctx) return;

    const camera = w.getResource(Camera);

    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    for (const [, t, sr] of w.queryComponents(Transform, SpriteRenderer)) {
      switch (sr.sprite) {
        case 'circle': {
          ctx.beginPath();
          ctx.arc(t.x, t.y, sr.radius, 0, Math.PI * 2);
          if (sr.fill) {
            ctx.fillStyle = sr.color;
            ctx.fill();
          } else {
            ctx.strokeStyle = sr.color;
            ctx.lineWidth = sr.lineWidth;
            ctx.stroke();
          }
          break;
        }
        case 'rect': {
          const hw = sr.width / 2;
          const hh = sr.height / 2;
          if (sr.fill) {
            ctx.fillStyle = sr.color;
            ctx.fillRect(t.x - hw, t.y - hh, sr.width, sr.height);
          } else {
            ctx.strokeStyle = sr.color;
            ctx.lineWidth = sr.lineWidth;
            ctx.strokeRect(t.x - hw, t.y - hh, sr.width, sr.height);
          }
          break;
        }
        case 'capsule': {
          const hw = sr.width / 2;
          const radius = hw;
          const rectHeight = sr.height - sr.width;
          const halfRect = rectHeight / 2;

          ctx.beginPath();
          ctx.moveTo(t.x - hw, t.y - halfRect);
          ctx.arc(t.x, t.y - halfRect, radius, Math.PI, 0, false);
          ctx.lineTo(t.x + hw, t.y + halfRect);
          ctx.arc(t.x, t.y + halfRect, radius, 0, Math.PI, false);
          ctx.lineTo(t.x - hw, t.y - halfRect);
          ctx.closePath();

          if (sr.fill) {
            ctx.fillStyle = sr.color;
            ctx.fill();
          } else {
            ctx.strokeStyle = sr.color;
            ctx.lineWidth = sr.lineWidth;
            ctx.stroke();
          }
          break;
        }
      }
    }

    ctx.restore();
  };
}

buildMenuEl.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('[data-build]') as HTMLElement;
  if (!btn) return;
  const mode = btn.dataset.build as 'miner' | 'turret' | 'laser' | 'solar' | 'demolish';
  const state = world.getResource(GameState);
  state.buildMode = state.buildMode === mode ? '' : mode;
});

spawnInitialWorld(world);

let lastTime = 0;

function tick(now: number) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  world.step(dt);
  requestAnimationFrame(tick);
}

lastTime = performance.now();
requestAnimationFrame(tick);
