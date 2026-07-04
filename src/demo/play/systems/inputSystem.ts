import type { World } from '../../../ecs';
import { Camera } from '../../../ecs/builtin';
import { MouseState, GameState } from '../resources';

export function createInputSystem(canvas: HTMLCanvasElement) {
  const keys = new Set<string>();
  const PAN_SPEED = 400;
  const ZOOM_SPEED = 0.1;
  const MIN_ZOOM = 0.3;
  const MAX_ZOOM = 3;

  window.addEventListener('keydown', (e) => {
    if (!e.repeat) keys.add(e.key);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key));

  canvas.addEventListener('mousemove', (e) => {
    const mouse = world_ref.mouse;
    mouse.x = e.offsetX;
    mouse.y = e.offsetY;
    const camera = world_ref.camera;
    mouse.worldX = e.offsetX / camera.zoom + camera.x;
    mouse.worldY = e.offsetY / camera.zoom + camera.y;
  });

  canvas.addEventListener('mousedown', () => {
    world_ref.mouse.clicked = true;
  });

  canvas.addEventListener('wheel', (e) => {
    const camera = world_ref.camera;
    const oldZoom = camera.zoom;
    camera.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom - Math.sign(e.deltaY) * ZOOM_SPEED));
    camera.x += e.offsetX * (1 / oldZoom - 1 / camera.zoom);
    camera.y += e.offsetY * (1 / oldZoom - 1 / camera.zoom);
  }, { passive: true });

  const world_ref = { mouse: { x: 0, y: 0, worldX: 0, worldY: 0, clicked: false }, camera: { x: 0, y: 0, zoom: 1 } };

  return (world: World, dt: number) => {
    const camera = world.getResource(Camera);
    world_ref.camera = camera;

    let dx = 0;
    let dy = 0;
    if (keys.has('a') || keys.has('ArrowLeft')) dx -= 1;
    if (keys.has('d') || keys.has('ArrowRight')) dx += 1;
    if (keys.has('w') || keys.has('ArrowUp')) dy -= 1;
    if (keys.has('s') || keys.has('ArrowDown')) dy += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      camera.x += (dx / len) * PAN_SPEED * dt / camera.zoom;
      camera.y += (dy / len) * PAN_SPEED * dt / camera.zoom;
    }

    const mouse = world.getResource(MouseState);
    mouse.x = world_ref.mouse.x;
    mouse.y = world_ref.mouse.y;
    mouse.worldX = world_ref.mouse.worldX;
    mouse.worldY = world_ref.mouse.worldY;
    mouse.clicked = world_ref.mouse.clicked;
    world_ref.mouse.clicked = false;

    const state = world.getResource(GameState);
    if (keys.has('1')) state.buildMode = 'miner';
    if (keys.has('2')) state.buildMode = 'turret';
    if (keys.has('3')) state.buildMode = 'laser';
    if (keys.has('4')) state.buildMode = 'solar';
    if (keys.has('x') || keys.has('X')) state.buildMode = 'demolish';
    if (keys.has('Escape')) state.buildMode = '';
  };
}
