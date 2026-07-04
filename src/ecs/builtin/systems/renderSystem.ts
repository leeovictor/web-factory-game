import type { World, Entity } from '../../types';
import { Transform } from '../components/transform';
import { SpriteRenderer } from '../components/spriteRenderer';
import { CanvasCtx } from '../resources/canvas';
import { SpatialGrid, getCellKey } from '../resources/spatialGrid';
import { Camera } from '../resources/camera';

function hasTransform(t: { rotation: number; scaleX: number; scaleY: number }) {
  return t.rotation !== 0 || t.scaleX !== 1 || t.scaleY !== 1;
}

function drawCircleAt(ctx: CanvasRenderingContext2D, x: number, y: number, sr: { radius: number; color: string; fill: boolean; lineWidth: number }) {
  ctx.beginPath();
  ctx.arc(x, y, sr.radius, 0, Math.PI * 2);
  if (sr.fill) {
    ctx.fillStyle = sr.color;
    ctx.fill();
  } else {
    ctx.strokeStyle = sr.color;
    ctx.lineWidth = sr.lineWidth;
    ctx.stroke();
  }
}

function drawRectAt(ctx: CanvasRenderingContext2D, x: number, y: number, sr: { width: number; height: number; color: string; fill: boolean }) {
  const hw = sr.width / 2;
  const hh = sr.height / 2;
  if (sr.fill) {
    ctx.fillStyle = sr.color;
    ctx.fillRect(x - hw, y - hh, sr.width, sr.height);
  } else {
    ctx.strokeStyle = sr.color;
    ctx.lineWidth = 1;
    ctx.strokeRect(x - hw, y - hh, sr.width, sr.height);
  }
}

function drawCapsuleAt(ctx: CanvasRenderingContext2D, x: number, y: number, sr: { width: number; height: number; color: string; fill: boolean; lineWidth: number }) {
  const hw = sr.width / 2;
  const radius = hw;
  const rectHeight = sr.height - sr.width;
  const halfRect = rectHeight / 2;

  ctx.beginPath();
  ctx.moveTo(x - hw, y - halfRect);
  ctx.arc(x, y - halfRect, radius, Math.PI, 0, false);
  ctx.lineTo(x + hw, y + halfRect);
  ctx.arc(x, y + halfRect, radius, 0, Math.PI, false);
  ctx.lineTo(x - hw, y - halfRect);
  ctx.closePath();

  if (sr.fill) {
    ctx.fillStyle = sr.color;
    ctx.fill();
  } else {
    ctx.strokeStyle = sr.color;
    ctx.lineWidth = sr.lineWidth;
    ctx.stroke();
  }
}

function drawSpriteAt(ctx: CanvasRenderingContext2D, x: number, y: number, sr: { image: HTMLImageElement | null; alpha: number }) {
  if (!sr.image) return;
  if (sr.alpha !== 1) ctx.globalAlpha = sr.alpha;
  ctx.drawImage(sr.image, x - sr.image.naturalWidth / 2, y - sr.image.naturalHeight / 2);
  if (sr.alpha !== 1) ctx.globalAlpha = 1;
}

export function createRenderSystem() {
  return (world: World) => {
    const canvas = world.getResource(CanvasCtx);
    const ctx = canvas.context;
    if (!ctx) return;

    const grid = world.getResource(SpatialGrid);
    const camera = world.getResource(Camera);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    let visibleEntities: Set<Entity> | null = null;

    if (grid.cells && grid.cells.size >= 0) {
      visibleEntities = new Set<Entity>();
      const viewW = canvas.width / camera.zoom;
      const viewH = canvas.height / camera.zoom;
      const minCellX = Math.floor(camera.x / grid.cellSize);
      const maxCellX = Math.floor((camera.x + viewW) / grid.cellSize);
      const minCellY = Math.floor(camera.y / grid.cellSize);
      const maxCellY = Math.floor((camera.y + viewH) / grid.cellSize);

      for (let cy = minCellY; cy <= maxCellY; cy++) {
        for (let cx = minCellX; cx <= maxCellX; cx++) {
          const key = getCellKey(cx, cy);
          const cell = grid.cells.get(key);
          if (cell) {
            for (let i = 0; i < cell.length; i++) {
              visibleEntities.add(cell[i]);
            }
          }
          if (grid.staticCells) {
            const staticCell = grid.staticCells.get(key);
            if (staticCell) {
              for (let i = 0; i < staticCell.length; i++) {
                visibleEntities.add(staticCell[i]);
              }
            }
          }
        }
      }
    }

    if (!visibleEntities) {
      ctx.restore();
      return;
    }

    for (const entity of visibleEntities) {
      const t = world.get(entity, Transform);
      const sr = world.get(entity, SpriteRenderer);
      if (!t || !sr) continue;

      if (hasTransform(t)) {
        ctx.save();
        ctx.translate(t.x, t.y);
        if (t.scaleX !== 1 || t.scaleY !== 1) ctx.scale(t.scaleX, t.scaleY);
        if (t.rotation !== 0) ctx.rotate(t.rotation);
      }

      switch (sr.sprite) {
        case 'circle':
          if (hasTransform(t)) {
            drawCircleAt(ctx, 0, 0, sr);
          } else {
            drawCircleAt(ctx, t.x, t.y, sr);
          }
          break;
        case 'rect':
          if (hasTransform(t)) {
            drawRectAt(ctx, 0, 0, sr);
          } else {
            drawRectAt(ctx, t.x, t.y, sr);
          }
          break;
        case 'capsule':
          if (hasTransform(t)) {
            drawCapsuleAt(ctx, 0, 0, sr);
          } else {
            drawCapsuleAt(ctx, t.x, t.y, sr);
          }
          break;
        case 'sprite':
          if (hasTransform(t)) {
            drawSpriteAt(ctx, 0, 0, sr);
          } else {
            drawSpriteAt(ctx, t.x, t.y, sr);
          }
          break;
      }

      if (hasTransform(t)) {
        ctx.restore();
      }
    }

    ctx.restore();
  };
}
