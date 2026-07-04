import type { World } from '../../../ecs';
import { Mothership } from '../components';
import { TransportNetwork, GameState } from '../resources';
import { TRANSPORT_PACKET_SIZE } from '../constants';

export function createTransportRelaySystem() {
  return (world: World, _dt: number) => {
    const network = world.getResource(TransportNetwork);
    const state = world.getResource(GameState);

    for (const [, line] of network.lines) {
      while (line.relayBuffer >= TRANSPORT_PACKET_SIZE) {
        const outgoing = network.lines.get(line.toEntity);
        if (!outgoing) {
          if (world.has(line.toEntity, Mothership)) {
            state.resources += line.relayBuffer;
            line.relayBuffer = 0;
          }
          break;
        }

        if (outgoing.packets.length >= outgoing.capacity) break;

        outgoing.packets.push({
          id: network.nextPacketId++,
          pos: 0,
          amount: TRANSPORT_PACKET_SIZE,
        });
        line.relayBuffer -= TRANSPORT_PACKET_SIZE;
      }
    }
  };
}