import { describe, it, expect, vi } from 'vitest';
import { createWorld } from '../../world';
import { Transform } from '../../builtin/components/transform';
import { Circle } from '../../builtin/components/circle';
import { Rect } from '../../builtin/components/rect';
import { CanvasCtx } from '../../builtin/resources/canvas';
import { createRenderSystem } from '../../builtin/systems/renderSystem';

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
  } as unknown as CanvasRenderingContext2D;
}

describe('renderSystem', () => {
  it('should clear canvas before drawing', () => {
    const world = createWorld({ phases: ['render'] });
    const ctx = createMockCtx();
    world.insertResource(CanvasCtx, { element: null, context: ctx, width: 800, height: 600 });
    world.addSystem(createRenderSystem(), 'render');
    world.step(0);
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
  });

  it('should draw circles with correct properties (identity transform, fast path)', () => {
    const world = createWorld({ phases: ['render'] });
    const ctx = createMockCtx();
    world.insertResource(CanvasCtx, { element: null, context: ctx, width: 800, height: 600 });
    world.instantiate(Transform({ x: 100, y: 200 }), Circle({ radius: 15, color: '#ff0000' }));
    world.addSystem(createRenderSystem(), 'render');
    world.step(0);

    expect(ctx.save).not.toHaveBeenCalled();
    expect(ctx.translate).not.toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalledWith(100, 200, 15, 0, Math.PI * 2);
    expect(ctx.fillStyle).toBe('#ff0000');
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.restore).not.toHaveBeenCalled();
  });

  it('should draw circles with transform (slow path)', () => {
    const world = createWorld({ phases: ['render'] });
    const ctx = createMockCtx();
    world.insertResource(CanvasCtx, { element: null, context: ctx, width: 800, height: 600 });
    world.instantiate(Transform({ x: 50, y: 60, rotation: 0.5, scaleX: 2, scaleY: 3 }), Circle({ radius: 10 }));
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
    world.instantiate(Transform({ x: 0, y: 0 }), Circle({ radius: 5, color: '#00f', fill: false, lineWidth: 2 }));
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
    world.instantiate(Transform({ x: 50, y: 60 }), Rect({ width: 30, height: 40, color: '#0f0', fill: true }));
    world.addSystem(createRenderSystem(), 'render');
    world.step(0);

    expect(ctx.translate).not.toHaveBeenCalled();
    expect(ctx.fillStyle).toBe('#0f0');
    expect(ctx.fillRect).toHaveBeenCalledWith(35, 40, 30, 40);
  });

  it('should draw rects with transform (slow path)', () => {
    const world = createWorld({ phases: ['render'] });
    const ctx = createMockCtx();
    world.insertResource(CanvasCtx, { element: null, context: ctx, width: 800, height: 600 });
    world.instantiate(Transform({ x: 10, y: 20, rotation: 1, scaleX: 1.5, scaleY: 2 }), Rect({ width: 20, height: 10 }));
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
    world.instantiate(Transform({ x: 0, y: 0 }), Rect({ width: 10, height: 10, color: '#f00', fill: false }));
    world.addSystem(createRenderSystem(), 'render');
    world.step(0);

    expect(ctx.strokeRect).toHaveBeenCalled();
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('should do nothing if context is null', () => {
    const world = createWorld({ phases: ['render'] });
    world.insertResource(CanvasCtx, { element: null, context: null, width: 800, height: 600 });
    world.instantiate(Transform(), Circle());
    world.addSystem(createRenderSystem(), 'render');
    expect(() => world.step(0)).not.toThrow();
  });
});
