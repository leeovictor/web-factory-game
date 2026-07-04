import { describe, it, expect, vi } from 'vitest';
import { createWorld } from '../../../../ecs';
import { CanvasCtx, Camera, Transform } from '../../../../ecs/builtin';
import { UISettings } from '../../resources';
import { Turret, LaserTurret } from '../../components';
import { TURRET_RANGE, LASER_TURRET_RANGE } from '../../constants';
import { createTurretRangeRenderSystem } from '../turretRangeRenderSystem';

function createRenderWorld() {
  const world = createWorld();
  const ctx = {
    save: vi.fn(), restore: vi.fn(), scale: vi.fn(), translate: vi.fn(),
    beginPath: vi.fn(), moveTo: vi.fn(), arc: vi.fn(), fill: vi.fn(),
    stroke: vi.fn(), fillStyle: '', strokeStyle: '', lineWidth: 0,
  } as unknown as CanvasRenderingContext2D;
  world.insertResource(CanvasCtx, { element: null, context: ctx, width: 800, height: 600 });
  world.insertResource(Camera, { x: 0, y: 0, zoom: 1 });
  world.insertResource(UISettings, { showTurretRanges: false });
  return { world, ctx };
}

describe('turretRangeRenderSystem', () => {
  it('não desenha nada quando showTurretRanges=false', () => {
    const { world, ctx } = createRenderWorld();
    world.instantiate(Transform({ x: 0, y: 0 }), Turret());
    const sys = createTurretRangeRenderSystem();
    sys(world, 0);
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it('desenha um círculo azul de raio TURRET_RANGE para cada Turret', () => {
    const { world, ctx } = createRenderWorld();
    world.getResource(UISettings).showTurretRanges = true;
    world.instantiate(Transform({ x: 10, y: 20 }), Turret());
    world.instantiate(Transform({ x: 50, y: 60 }), Turret());
    const sys = createTurretRangeRenderSystem();
    sys(world, 0);
    expect(ctx.arc).toHaveBeenCalledTimes(2);
    expect(ctx.arc).toHaveBeenNthCalledWith(1, 10, 20, TURRET_RANGE, 0, Math.PI * 2);
    expect(ctx.arc).toHaveBeenNthCalledWith(2, 50, 60, TURRET_RANGE, 0, Math.PI * 2);
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.fillStyle).toMatch(/rgba\(.*70.*130.*255/i);
  });

  it('desenha círculos de raio LASER_TURRET_RANGE para LaserTurret', () => {
    const { world, ctx } = createRenderWorld();
    world.getResource(UISettings).showTurretRanges = true;
    world.instantiate(Transform({ x: 0, y: 0 }), LaserTurret());
    const sys = createTurretRangeRenderSystem();
    sys(world, 0);
    expect(ctx.arc).toHaveBeenCalledWith(0, 0, LASER_TURRET_RANGE, 0, Math.PI * 2);
  });

  it('ignora entidades sem tag de turreta', () => {
    const { world, ctx } = createRenderWorld();
    world.getResource(UISettings).showTurretRanges = true;
    world.instantiate(Transform({ x: 0, y: 0 }));
    const sys = createTurretRangeRenderSystem();
    sys(world, 0);
    expect(ctx.arc).not.toHaveBeenCalled();
  });
});
