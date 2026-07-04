import { describe, it, expect, vi } from 'vitest';
import { createWorld } from '../../world';
import type { World } from '../../types';
import { Transform } from '../../builtin/components/transform';
import { SpriteRenderer } from '../../builtin/components/spriteRenderer';
import { CanvasCtx } from '../../builtin/resources/canvas';
import { SpatialGrid, getCellKey } from '../../builtin/resources/spatialGrid';
import { Camera } from '../../builtin/resources/camera';
import { createRenderSystem } from '../../builtin/systems/renderSystem';

function populateGrid(world: World) {
  const grid = world.getResource(SpatialGrid);
  if (!grid.cells) grid.cells = new Map();
  for (const cell of grid.cells.values()) cell.length = 0;
  const touched = new Set<number>();
  for (const [entity, t, sr] of world.queryComponents(Transform, SpriteRenderer)) {
    let halfW: number, halfH: number;
    if (sr.sprite === 'circle') {
      halfW = sr.radius;
      halfH = sr.radius;
    } else if (sr.sprite === 'sprite' && sr.image) {
      halfW = sr.image.naturalWidth / 2;
      halfH = sr.image.naturalHeight / 2;
    } else {
      halfW = sr.width / 2;
      halfH = sr.height / 2;
    }
    const minCX = Math.floor((t.x - halfW) / grid.cellSize);
    const maxCX = Math.floor((t.x + halfW) / grid.cellSize);
    const minCY = Math.floor((t.y - halfH) / grid.cellSize);
    const maxCY = Math.floor((t.y + halfH) / grid.cellSize);
    for (let cy = minCY; cy <= maxCY; cy++) {
      for (let cx = minCX; cx <= maxCX; cx++) {
        const key = getCellKey(cx, cy);
        let cell = grid.cells.get(key);
        if (!cell) {
          cell = [];
          grid.cells.set(key, cell);
        }
        cell.push(entity);
        touched.add(key);
      }
    }
  }
  for (const key of grid.cells.keys()) {
    if (!touched.has(key)) grid.cells.delete(key);
  }
}

function createMockCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    drawImage: vi.fn(),
    clearRect: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    moveTo: vi.fn(),
    lineTo: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe('Sprite rendering', () => {
  it('should draw sprite at transform position centered (identity fast path)', () => {
    const world = createWorld({ phases: ['render'] });
    const ctx = createMockCtx();
    world.insertResource(CanvasCtx, { element: null, context: ctx, width: 800, height: 600 });
    world.insertResource(SpatialGrid, { cellSize: 200, cells: new Map(), staticCells: null, needsStaticRebuild: true });
    world.insertResource(Camera, { x: 0, y: 0, zoom: 1 });

    const image = { naturalWidth: 64, naturalHeight: 48 } as unknown as HTMLImageElement;
    world.instantiate(
      Transform({ x: 400, y: 300 }),
      SpriteRenderer({ sprite: 'sprite', image })
    );
    populateGrid(world);
    world.addSystem(createRenderSystem(), 'render');
    world.step(0);

    expect(ctx.translate).toHaveBeenCalledTimes(1);
    expect(ctx.drawImage).toHaveBeenCalledWith(image, 368, 276);
    expect(ctx.restore).toHaveBeenCalledTimes(1);
    expect(ctx.save).toHaveBeenCalledTimes(1);
  });

  it('should draw sprite with transform (slow path)', () => {
    const world = createWorld({ phases: ['render'] });
    const ctx = createMockCtx();
    world.insertResource(CanvasCtx, { element: null, context: ctx, width: 800, height: 600 });
    world.insertResource(SpatialGrid, { cellSize: 200, cells: new Map(), staticCells: null, needsStaticRebuild: true });
    world.insertResource(Camera, { x: 0, y: 0, zoom: 1 });

    const image = { naturalWidth: 32, naturalHeight: 32 } as unknown as HTMLImageElement;
    world.instantiate(
      Transform({ x: 100, y: 200, scaleX: 2, scaleY: 3, rotation: 0.5 }),
      SpriteRenderer({ sprite: 'sprite', image })
    );
    populateGrid(world);
    world.addSystem(createRenderSystem(), 'render');
    world.step(0);

    expect(ctx.translate).toHaveBeenCalledWith(100, 200);
    expect(ctx.scale).toHaveBeenCalledWith(2, 3);
    expect(ctx.rotate).toHaveBeenCalledWith(0.5);
    expect(ctx.drawImage).toHaveBeenCalledWith(image, -16, -16);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('should skip drawing when image is null', () => {
    const world = createWorld({ phases: ['render'] });
    const ctx = createMockCtx();
    world.insertResource(CanvasCtx, { element: null, context: ctx, width: 800, height: 600 });
    world.insertResource(SpatialGrid, { cellSize: 200, cells: new Map(), staticCells: null, needsStaticRebuild: true });
    world.insertResource(Camera, { x: 0, y: 0, zoom: 1 });

    world.instantiate(Transform(), SpriteRenderer({ sprite: 'sprite' }));
    populateGrid(world);
    world.addSystem(createRenderSystem(), 'render');
    world.step(0);

    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it('should respect alpha and reset it after draw (slow path)', () => {
    const world = createWorld({ phases: ['render'] });
    const ctx = createMockCtx();
    world.insertResource(CanvasCtx, { element: null, context: ctx, width: 800, height: 600 });
    world.insertResource(SpatialGrid, { cellSize: 200, cells: new Map(), staticCells: null, needsStaticRebuild: true });
    world.insertResource(Camera, { x: 0, y: 0, zoom: 1 });

    const image = { naturalWidth: 32, naturalHeight: 32 } as unknown as HTMLImageElement;
    world.instantiate(
      Transform({ rotation: 0.1 }),
      SpriteRenderer({ sprite: 'sprite', image, alpha: 0.5 })
    );
    populateGrid(world);
    world.addSystem(createRenderSystem(), 'render');
    world.step(0);

    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.globalAlpha).toBe(1);
    expect(ctx.drawImage).toHaveBeenCalled();
  });

  it('should draw sprites after circles and rects', () => {
    const world = createWorld({ phases: ['render'] });
    const ctx = createMockCtx();
    world.insertResource(CanvasCtx, { element: null, context: ctx, width: 800, height: 600 });
    world.insertResource(SpatialGrid, { cellSize: 200, cells: new Map(), staticCells: null, needsStaticRebuild: true });
    world.insertResource(Camera, { x: 0, y: 0, zoom: 1 });

    const image = { naturalWidth: 16, naturalHeight: 16 } as unknown as HTMLImageElement;
    world.instantiate(Transform(), SpriteRenderer({ sprite: 'circle', radius: 5 }));
    world.instantiate(Transform(), SpriteRenderer({ sprite: 'rect', width: 10, height: 10 }));
    world.instantiate(Transform(), SpriteRenderer({ sprite: 'sprite', image }));
    populateGrid(world);
    world.addSystem(createRenderSystem(), 'render');
    world.step(0);

    const circleCallOrder = ctx.beginPath.mock.invocationCallOrder[0];
    const rectCallOrder = ctx.fillRect.mock.invocationCallOrder[0];
    const spriteCallOrder = ctx.drawImage.mock.invocationCallOrder[0];

    expect(spriteCallOrder).toBeGreaterThan(circleCallOrder);
    expect(spriteCallOrder).toBeGreaterThan(rectCallOrder);
  });

  it('should render circle sprite (identity fast path)', () => {
    const world = createWorld({ phases: ['render'] });
    const ctx = createMockCtx();
    world.insertResource(CanvasCtx, { element: null, context: ctx, width: 800, height: 600 });
    world.insertResource(SpatialGrid, { cellSize: 200, cells: new Map(), staticCells: null, needsStaticRebuild: true });
    world.insertResource(Camera, { x: 0, y: 0, zoom: 1 });

    world.instantiate(
      Transform({ x: 100, y: 100 }),
      SpriteRenderer({ sprite: 'circle', radius: 15, color: '#ff0000', fill: true })
    );
    populateGrid(world);
    world.addSystem(createRenderSystem(), 'render');
    world.step(0);

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalledWith(100, 100, 15, 0, Math.PI * 2);
    expect(ctx.fillStyle).toBe('#ff0000');
    expect(ctx.fill).toHaveBeenCalled();
  });
});
