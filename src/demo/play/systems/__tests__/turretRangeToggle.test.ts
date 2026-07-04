import { describe, it, expect } from 'vitest';
import { createWorld } from '../../../../ecs';
import { UISettings } from '../../resources';
import { createToggleTurretRanges } from '../turretRangeToggle';

describe('toggle turret ranges', () => {
  it('ativa e desativa showTurretRanges', () => {
    const world = createWorld();
    world.insertResource(UISettings, { showTurretRanges: false });
    const toggle = createToggleTurretRanges(world);
    expect(world.getResource(UISettings).showTurretRanges).toBe(false);
    toggle(true);
    expect(world.getResource(UISettings).showTurretRanges).toBe(true);
    toggle(false);
    expect(world.getResource(UISettings).showTurretRanges).toBe(false);
  });
});
