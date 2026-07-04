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
    clearRect: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    moveTo: vi.fn(),
    lineTo: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe('renderSystem', () => {
  it('should clear canvas before drawing', () => {
    const world = createWorld({ phases: ['render'] });
    const ctx = createMockCtx();
    world.insertResource(CanvasCtx, { element: null, context: ctx, width: 800, height: 600 });
    world.insertResource(SpatialGrid, { cellSize: 200, cells: new Map(), staticCells: null, needsStaticRebuild: true });
    world.insertResource(Camera, { x: 0, y: 0, zoom: 1 });
    world.addSystem(createRenderSystem(), 'render');
    world.step(0);
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
  });

  it('should draw circles with correct properties (identity transform, fast path)', () => {
    const world = createWorld({ phases: ['render'] });
    const ctx = createMockCtx();
    world.insertResource(CanvasCtx, { element: null, context: ctx, width: 800, height: 600 });
    world.insertResource(SpatialGrid, { cellSize: 200, cells: new Map(), staticCells: null, needsStaticRebuild: true });
    world.insertResource(Camera, { x: 0, y: 0, zoom: 1 });
    world.instantiate(
      Transform({ x: 100, y: 200 }),
      SpriteRenderer({ sprite: 'circle', radius: 15, color: '#ff0000' })
    );
    populateGrid(world);
    world.addSystem(createRenderSystem(), 'render');
    world.step(0);

    expect(ctx.save).toHaveBeenCalledTimes(1);
    expect(ctx.translate).toHaveBeenCalledTimes(1);
    expect(ctx.arc).toHaveBeenCalledWith(100, 200, 15, 0, Math.PI * 2);
    expect(ctx.fillStyle).toBe('#ff0000');
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalledTimes(1);
  });

  it('should draw circles with transform (slow path)', () => {
    const world = createWorld({ phases: ['render'] });
    const ctx = createMockCtx();
    world.insertResource(CanvasCtx, { element: null, context: ctx, width: 800, height: 600 });
    world.insertResource(SpatialGrid, { cellSize: 200, cells: new Map(), staticCells: null, needsStaticRebuild: true });
    world.insertResource(Camera, { x: 0, y: 0, zoom: 1 });
    world.instantiate(
      Transform({ x: 50, y: 60, rotation: 0.5, scaleX: 2, scaleY: 3 }),
      SpriteRenderer({ sprite: 'circle', radius: 10 })
    );
    populateGrid(world);
    world.addSystem(createRenderSystem(), 'render');
    world.step(0);

    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.translate).toHaveBeenCalledWith(50, 60);
    expect(ctx.scale).toHaveBeenCalledWith(2, 3);
    expect(ctx.rotate).toHaveBeenCalledWith(0.5);
    expect(ctx.arc).toHaveBeenCalledWith(0, 0, 10, 0, Math.PI * 2);
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('should draw circles with stroke when fill is false', () => {
    const world = createWorld({ phases: ['render'] });
    const ctx = createMockCtx();
    world.insertResource(CanvasCtx, { element: null, context: ctx, width: 800, height: 600 });
    world.insertResource(SpatialGrid, { cellSize: 200, cells: new Map(), staticCells: null, needsStaticRebuild: true });
    world.insertResource(Camera, { x: 0, y: 0, zoom: 1 });
    world.instantiate(
      Transform({ x: 0, y: 0 }),
      SpriteRenderer({ sprite: 'circle', radius: 5, color: '#00f', fill: false, lineWidth: 2 })
    );
    populateGrid(world);
    world.addSystem(createRenderSystem(), 'render');
    world.step(0);

    expect(ctx.strokeStyle).toBe('#00f');
    expect(ctx.lineWidth).toBe(2);
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.fill).not.toHaveBeenCalled();
  });

  it('should draw rects (identity transform, fast path)', () => {
    const world = createWorld({ phases: ['render'] });
    const ctx = createMockCtx();
    world.insertResource(CanvasCtx, { element: null, context: ctx, width: 800, height: 600 });
    world.insertResource(SpatialGrid, { cellSize: 200, cells: new Map(), staticCells: null, needsStaticRebuild: true });
    world.insertResource(Camera, { x: 0, y: 0, zoom: 1 });
    world.instantiate(
      Transform({ x: 50, y: 60 }),
      SpriteRenderer({ sprite: 'rect', width: 30, height: 40, color: '#0f0', fill: true })
    );
    populateGrid(world);
    world.addSystem(createRenderSystem(), 'render');
    world.step(0);

    expect(ctx.translate).toHaveBeenCalledTimes(1);
    expect(ctx.fillStyle).toBe('#0f0');
    expect(ctx.fillRect).toHaveBeenCalledWith(35, 40, 30, 40);
  });

  it('should draw rects with transform (slow path)', () => {
    const world = createWorld({ phases: ['render'] });
    const ctx = createMockCtx();
    world.insertResource(CanvasCtx, { element: null, context: ctx, width: 800, height: 600 });
    world.insertResource(SpatialGrid, { cellSize: 200, cells: new Map(), staticCells: null, needsStaticRebuild: true });
    world.insertResource(Camera, { x: 0, y: 0, zoom: 1 });
    world.instantiate(
      Transform({ x: 10, y: 20, rotation: 1, scaleX: 1.5, scaleY: 2 }),
      SpriteRenderer({ sprite: 'rect', width: 20, height: 10 })
    );
    populateGrid(world);
    world.addSystem(createRenderSystem(), 'render');
    world.step(0);

    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.translate).toHaveBeenCalledWith(10, 20);
    expect(ctx.scale).toHaveBeenCalledWith(1.5, 2);
    expect(ctx.rotate).toHaveBeenCalledWith(1);
    expect(ctx.fillRect).toHaveBeenCalledWith(-10, -5, 20, 10);
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('should draw rects with stroke when fill is false', () => {
    const world = createWorld({ phases: ['render'] });
    const ctx = createMockCtx();
    world.insertResource(CanvasCtx, { element: null, context: ctx, width: 800, height: 600 });
    world.insertResource(SpatialGrid, { cellSize: 200, cells: new Map(), staticCells: null, needsStaticRebuild: true });
    world.insertResource(Camera, { x: 0, y: 0, zoom: 1 });
    world.instantiate(
      Transform({ x: 0, y: 0 }),
      SpriteRenderer({ sprite: 'rect', width: 10, height: 10, color: '#f00', fill: false })
    );
    populateGrid(world);
    world.addSystem(createRenderSystem(), 'render');
    world.step(0);

    expect(ctx.strokeRect).toHaveBeenCalled();
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('should do nothing if context is null', () => {
    const world = createWorld({ phases: ['render'] });
    world.insertResource(CanvasCtx, { element: null, context: null, width: 800, height: 600 });
    world.instantiate(Transform(), SpriteRenderer());
    world.addSystem(createRenderSystem(), 'render');
    expect(() => world.step(0)).not.toThrow();
  });
});
