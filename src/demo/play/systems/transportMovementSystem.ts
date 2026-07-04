import type { World } from '../../../ecs';
import { Mothership } from '../components';
import { TransportNetwork, GameState } from '../resources';

export function createTransportMovementSystem() {
  return (world: World, dt: number) => {
    const network = world.getResource(TransportNetwork);
    const state = world.getResource(GameState);
    const toRemove: Array<{ lineKey: number; idx: number }> = [];

    for (const [lineKey, line] of network.lines) {
      if (line.packets.length === 0) continue;

      const delta = (line.velocity / line.length) * dt;

      for (let i = line.packets.length - 1; i >= 0; i--) {
        line.packets[i].pos += delta;

        if (line.packets[i].pos >= 1) {
          toRemove.push({ lineKey, idx: i });
        }
      }
    }

    for (const { lineKey, idx } of toRemove) {
      const line = network.lines.get(lineKey);
      if (!line || idx >= line.packets.length) continue;

      const packet = line.packets[idx];
      const last = line.packets.length - 1;
      if (idx !== last) {
        line.packets[idx] = line.packets[last];
      }
      line.packets.pop();

      if (world.has(line.toEntity, Mothership)) {
        state.resources += packet.amount;
      } else {
        line.relayBuffer += packet.amount;
      }
    }
  };
}