import type { World } from '../../../ecs';
import { SolarPanel } from '../components';
import { GameState } from '../resources';
import { SOLAR_ENERGY_RATE, SOLAR_ENERGY_CAPACITY, MOTHERSHIP_BASE_MAX_ENERGY } from '../constants';

export function createSolarPanelSystem() {
  return (world: World, dt: number) => {
    const state = world.getResource(GameState);
    if (state.gameOver) return;

    let count = 0;
    for (const _ of world.query(SolarPanel)) {
      count++;
    }

    state.maxEnergy = MOTHERSHIP_BASE_MAX_ENERGY + count * SOLAR_ENERGY_CAPACITY;

    if (count > 0) {
      state.energy = Math.min(state.maxEnergy, state.energy + count * SOLAR_ENERGY_RATE * dt);
    }
  };
}
