import { describe, it, expect, vi } from 'vitest';
import { createDefaultWorld } from '../../builtin/DefaultWorld';
import { CanvasCtx } from '../../builtin/resources/canvas';
import { Time } from '../../builtin/resources/time';
import { Transform } from '../../builtin/components/transform';

describe('createDefaultWorld', () => {
  it('should create world with correct phases', () => {
    const canvas = { getContext: () => null, width: 800, height: 600 } as unknown as HTMLCanvasElement;
    const dw = createDefaultWorld({ canvas, width: 800, height: 600 });

    expect(dw.world).toBeDefined();
    expect(dw.start).toBeInstanceOf(Function);
    expect(dw.stop).toBeInstanceOf(Function);
    expect(dw.spawn).toBeInstanceOf(Function);
    expect(dw.addSystem).toBeInstanceOf(Function);
  });

  it('should initialize CanvasCtx resource', () => {
    const canvas = { getContext: () => 'mock-context', width: 800, height: 600 } as unknown as HTMLCanvasElement;
    const dw = createDefaultWorld({ canvas, width: 800, height: 600 });
    const ctx = dw.world.getResource(CanvasCtx);
    expect(ctx.element).toBe(canvas);
    expect(ctx.context).toBe('mock-context');
    expect(ctx.width).toBe(800);
    expect(ctx.height).toBe(600);
  });

  it('should initialize Time resource', () => {
    const canvas = { getContext: () => null } as unknown as HTMLCanvasElement;
    const dw = createDefaultWorld({ canvas, width: 800, height: 600 });
    const time = dw.world.getResource(Time);
    expect(time.deltaTime).toBe(0);
    expect(time.elapsedTime).toBe(0);
    expect(time.frameCount).toBe(0);
  });

  it('should spawn entity and return number', () => {
    const canvas = { getContext: () => null } as unknown as HTMLCanvasElement;
    const dw = createDefaultWorld({ canvas, width: 800, height: 600 });
    const e = dw.spawn(Transform({ x: 100, y: 200 }));
    expect(typeof e).toBe('number');
    expect(dw.world.get(e, Transform)!.x).toBe(100);
  });

  it('should add system to specified phase', () => {
    const canvas = { getContext: () => null } as unknown as HTMLCanvasElement;
    const dw = createDefaultWorld({ canvas, width: 800, height: 600 });
    const spy = vi.fn();
    dw.addSystem(spy, 'update');
    dw.world.step(0);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should update Time resource through built-in system', () => {
    const canvas = { getContext: () => null } as unknown as HTMLCanvasElement;
    const dw = createDefaultWorld({ canvas, width: 800, height: 600 });

    dw.world.step(0.016);
    const time = dw.world.getResource(Time);
    expect(time.deltaTime).toBe(0.016);
    expect(time.elapsedTime).toBe(0.016);
    expect(time.frameCount).toBe(1);

    dw.world.step(0.032);
    expect(time.deltaTime).toBe(0.032);
    expect(time.elapsedTime).toBe(0.048);
    expect(time.frameCount).toBe(2);
  });

  it('should expose getTickTime', () => {
    const canvas = { getContext: () => null } as unknown as HTMLCanvasElement;
    const dw = createDefaultWorld({ canvas, width: 800, height: 600 });
    expect(dw.getTickTime).toBeInstanceOf(Function);
    expect(typeof dw.getTickTime()).toBe('number');
  });

  it('should expose getPhaseTimings', () => {
    const canvas = { getContext: () => null } as unknown as HTMLCanvasElement;
    const dw = createDefaultWorld({ canvas, width: 800, height: 600 });
    expect(dw.getPhaseTimings).toBeInstanceOf(Function);
    dw.world.step(0);
    const timings = dw.getPhaseTimings();
    expect(timings).toHaveProperty('input');
    expect(timings).toHaveProperty('update');
    expect(timings).toHaveProperty('render');
    expect(timings).toHaveProperty('postRender');
    expect(typeof timings.input).toBe('number');
  });
});
