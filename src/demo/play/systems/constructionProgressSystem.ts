import type { World } from '../../../ecs';
import { Transform, SpriteRenderer } from '../../../ecs/builtin';
import {
  Miner, Turret, LaserTurret, SolarPanel, Health, MinerData, BuildingData, LaserTarget, MiningVisual, ConstructionSite,
} from '../components';
import { ConnectionGraph, TransportNetwork } from '../resources';
import { MINER_SIZE, MINER_RATE, TRANSPORT_LINE_CAPACITY, TRANSPORT_LINE_VELOCITY } from '../constants';

const BUILD_COLORS: Record<string, string> = {
  miner: '#ffd93d',
  turret: '#6c5ce7',
  laser: '#ff4757',
  solar: '#ffa502',
};

const BUILD_HP: Record<string, number> = {
  miner: 50,
  turret: 80,
  laser: 60,
  solar: 40,
};

export function createConstructionProgressSystem() {
  return (world: World, dt: number) => {
    const toComplete: number[] = [];

    for (const [entity, , cs] of world.queryComponents(Transform, ConstructionSite)) {
      cs.elapsed += dt;
      if (cs.elapsed >= cs.buildTime) {
        toComplete.push(entity);
      }
    }

    for (const entity of toComplete) {
      const cs = world.get(entity, ConstructionSite);
      const t = world.get(entity, Transform);
      if (!cs || !t) continue;

      const graph = world.getResource(ConnectionGraph);
      const network = world.getResource(TransportNetwork);
      const color = BUILD_COLORS[cs.buildType];
      const size = cs.buildType === 'miner' ? MINER_SIZE : 18;

      const built = world.instantiate(
        Transform({ x: t.x, y: t.y }),
        SpriteRenderer({ sprite: 'rect', width: size, height: size, color, fill: true }),
        BuildingData({ type: cs.buildType, connectedTo: cs.parentEntity, cost: cs.cost }),
        Health({ hp: BUILD_HP[cs.buildType], maxHp: BUILD_HP[cs.buildType] }),
      );
      graph.nodes.set(built, cs.parentEntity);

      const parentT = world.get(cs.parentEntity, Transform);
      const dx = t.x - parentT!.x;
      const dy = t.y - parentT!.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      network.lines.set(built, {
        fromEntity: built,
        toEntity: cs.parentEntity,
        length,
        capacity: TRANSPORT_LINE_CAPACITY,
        velocity: TRANSPORT_LINE_VELOCITY,
        packets: [],
        relayBuffer: 0,
      });

      if (cs.buildType === 'miner') {
        world.insert(built, Miner());
        world.insert(built, MinerData({ rate: MINER_RATE, connectedAsteroid: cs.connectedAsteroid }));
        world.insert(built, MiningVisual({ active: false }));
      } else if (cs.buildType === 'turret') {
        world.insert(built, Turret());
      } else if (cs.buildType === 'laser') {
        world.insert(built, LaserTurret());
        world.insert(built, LaserTarget({ entity: -1, x: 0, y: 0 }));
      } else if (cs.buildType === 'solar') {
        world.insert(built, SolarPanel());
      }

      world.despawn(entity);
    }
  };
}
