import type { World } from '../../../ecs';
import { UISettings } from '../resources';

export function createToggleTurretRanges(world: World) {
  return (checked: boolean) => {
    world.getResource(UISettings).showTurretRanges = checked;
  };
}
