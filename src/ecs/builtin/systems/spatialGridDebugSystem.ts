import type { World } from '../../types';
import { CanvasCtx } from '../resources/canvas';
import { SpatialGrid, getCellKey } from '../resources/spatialGrid';
import { Camera } from '../resources/camera';

export function createSpatialGridDebugSystem() {
  return (world: World) => {
    const canvas = world.getResource(CanvasCtx);
    const ctx = canvas.context;
    if (!ctx) return;

    const grid = world.getResource(SpatialGrid);
    const camera = world.getResource(Camera);

    if (!grid.cells || grid.cells.size === 0) return;

    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    const minCellX = Math.floor(camera.x / grid.cellSize);
    const maxCellX = Math.ceil((camera.x + canvas.width / camera.zoom) / grid.cellSize);
    const minCellY = Math.floor(camera.y / grid.cellSize);
    const maxCellY = Math.ceil((camera.y + canvas.height / camera.zoom) / grid.cellSize);

    for (let cy = minCellY; cy < maxCellY; cy++) {
      for (let cx = minCellX; cx < maxCellX; cx++) {
        const key = getCellKey(cx, cy);
        if (!grid.cells.has(key)) continue;

        const sx = cx * grid.cellSize;
        const sy = cy * grid.cellSize;

        ctx.fillStyle = 'rgba(0, 255, 100, 0.06)';
        ctx.fillRect(sx, sy, grid.cellSize, grid.cellSize);

        ctx.strokeStyle = 'rgba(0, 255, 100, 0.25)';
        ctx.lineWidth = 1 / camera.zoom;
        ctx.strokeRect(sx, sy, grid.cellSize, grid.cellSize);

        ctx.fillStyle = 'rgba(0, 255, 100, 0.4)';
        ctx.font = `${9 / camera.zoom}px monospace`;
        ctx.fillText(`${cx},${cy}`, sx + 3 / camera.zoom, sy + 11 / camera.zoom);
      }
    }

    ctx.restore();
  };
}
