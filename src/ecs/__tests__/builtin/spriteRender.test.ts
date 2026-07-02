import { describe, it, expect, vi } from 'vitest';
import { createWorld } from '../../world';
import { Transform } from '../../builtin/components/transform';
import { Circle } from '../../builtin/components/circle';
import { Rect } from '../../builtin/components/rect';
import { Sprite } from '../../builtin/components/sprite';
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
    drawImage: vi.fn(),
    clearRect: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D;
}

describe('Sprite rendering', () => {
  it('should draw sprite at transform position centered (identity fast path)', () => {
    const world = createWorld({ phases: ['render'] });
    const ctx = createMockCtx();
    world.insertResource(CanvasCtx, { element: null, context: ctx, width: 800, height: 600 });

    const image = { naturalWidth: 64, naturalHeight: 48 } as unknown as HTMLImageElement;
    world.instantiate(Transform({ x: 400, y: 300 }), Sprite({ image }));

    world.addSystem(createRenderSystem(), 'render');
    world.step(0);

    expect(ctx.translate).not.toHaveBeenCalled();
    expect(ctx.drawImage).toHaveBeenCalledWith(image, 368, 276);
    expect(ctx.restore).not.toHaveBeenCalled();
    expect(ctx.save).not.toHaveBeenCalled();
  });

  it('should draw sprite with transform (slow path)', () => {
    const world = createWorld({ phases: ['render'] });
    const ctx = createMockCtx();
    world.insertResource(CanvasCtx, { element: null, context: ctx, width: 800, height: 600 });

    const image = { naturalWidth: 32, naturalHeight: 32 } as unknown as HTMLImageElement;
    world.instantiate(Transform({ x: 100, y: 200, scaleX: 2, scaleY: 3, rotation: 0.5 }), Sprite({ image }));
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

    world.instantiate(Transform(), Sprite());
    world.addSystem(createRenderSystem(), 'render');
    world.step(0);

    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it('should respect alpha value (slow path)', () => {
    const world = createWorld({ phases: ['render'] });
    const ctx = createMockCtx();
    world.insertResource(CanvasCtx, { element: null, context: ctx, width: 800, height: 600 });

    const image = { naturalWidth: 32, naturalHeight: 32 } as unknown as HTMLImageElement;
    world.instantiate(Transform({ rotation: 0.1 }), Sprite({ image, alpha: 0.5 }));
    world.addSystem(createRenderSystem(), 'render');
    world.step(0);

    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.globalAlpha).toBe(0.5);
    expect(ctx.drawImage).toHaveBeenCalled();
  });

  it('should draw sprites after circles and rects', () => {
    const world = createWorld({ phases: ['render'] });
    const ctx = createMockCtx();
    world.insertResource(CanvasCtx, { element: null, context: ctx, width: 800, height: 600 });

    const image = { naturalWidth: 16, naturalHeight: 16 } as unknown as HTMLImageElement;
    world.instantiate(Transform(), Circle({ radius: 5 }));
    world.instantiate(Transform(), Rect({ width: 10, height: 10 }));
    world.instantiate(Transform(), Sprite({ image }));
    world.addSystem(createRenderSystem(), 'render');
    world.step(0);

    // Sprite drawImage should be called after circle and rect draw methods
    const circleCallOrder = ctx.beginPath.mock.invocationCallOrder[0];
    const rectCallOrder = ctx.fillRect.mock.invocationCallOrder[0];
    const spriteCallOrder = ctx.drawImage.mock.invocationCallOrder[0];

    expect(spriteCallOrder).toBeGreaterThan(circleCallOrder);
    expect(spriteCallOrder).toBeGreaterThan(rectCallOrder);
  });

  it('should render entity with both sprite and circle (identity fast path)', () => {
    const world = createWorld({ phases: ['render'] });
    const ctx = createMockCtx();
    world.insertResource(CanvasCtx, { element: null, context: ctx, width: 800, height: 600 });

    const image = { naturalWidth: 24, naturalHeight: 24 } as unknown as HTMLImageElement;
    world.instantiate(Transform(), Circle({ radius: 5 }), Sprite({ image }));
    world.addSystem(createRenderSystem(), 'render');
    world.step(0);

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.drawImage).toHaveBeenCalledWith(image, -12, -12);
  });
});
