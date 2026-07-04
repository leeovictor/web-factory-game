import type { World } from '../../../ecs';
import { BuildingData } from '../components';
import { ConnectionGraph, GameState, TransportNetwork } from '../resources';

export function createOrphanSystem() {
  return (world: World, _dt: number) => {
    const state = world.getResource(GameState);
    if (state.gameOver) return;

    const graph = world.getResource(ConnectionGraph);
    const network = world.getResource(TransportNetwork);
    const toRemove: number[] = [];

    for (const [child, parent] of graph.nodes) {
      if (parent === -1) continue;
      if (!graph.nodes.has(parent)) {
        toRemove.push(child);
      }
    }

    for (const entity of toRemove) {
      graph.nodes.delete(entity);
      network.lines.delete(entity);
      if (world.has(entity, BuildingData)) {
        world.despawn(entity);
      }
    }
  };
}
