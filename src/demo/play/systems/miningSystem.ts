import type { World } from '../../../ecs';
import { Miner, MinerData, AsteroidData, MiningVisual } from '../components';
import { GameState } from '../resources';
import { MINER_ENERGY_COST, MINER_BUFFER_MAX } from '../constants';

export function createMiningSystem() {
  return (world: World, dt: number) => {
    const state = world.getResource(GameState);
    if (state.gameOver) return;

    const energyCost = MINER_ENERGY_COST * dt;

    for (const [, miner, mv] of world.queryComponents(MinerData, MiningVisual).withTag(Miner)) {
      const ast = world.get(miner.connectedAsteroid, AsteroidData);
      if (!ast || ast.resources <= 0) {
        mv.active = false;
        continue;
      }

      if (state.energy < energyCost) {
        mv.active = false;
        continue;
      }

      if (miner.buffer >= MINER_BUFFER_MAX) {
        mv.active = false;
        continue;
      }

      mv.active = true;
      state.energy -= energyCost;
      if (!state.attackInProgress) {
        state.totalEnergyConsumed += energyCost;
      }
      const extracted = Math.min(miner.rate * dt, ast.resources, MINER_BUFFER_MAX - miner.buffer);
      ast.resources -= extracted;
      miner.buffer += extracted;
    }
  };
}
