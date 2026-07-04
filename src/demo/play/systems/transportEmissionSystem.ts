import type { World } from '../../../ecs';
import { Miner, MinerData } from '../components';
import { TransportNetwork } from '../resources';
import { TRANSPORT_PACKET_SIZE } from '../constants';

export function createTransportEmissionSystem() {
  return (world: World, _dt: number) => {
    const network = world.getResource(TransportNetwork);

    for (const [entity, miner] of world.queryComponents(MinerData).withTag(Miner)) {
      while (miner.buffer >= TRANSPORT_PACKET_SIZE) {
        const line = network.lines.get(entity);
        if (!line) break;
        if (line.packets.length >= line.capacity) break;

        line.packets.push({
          id: network.nextPacketId++,
          pos: 0,
          amount: TRANSPORT_PACKET_SIZE,
        });
        miner.buffer -= TRANSPORT_PACKET_SIZE;
      }
    }
  };
}