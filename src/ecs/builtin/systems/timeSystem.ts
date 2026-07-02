import type { World } from '../../types';
import { Time } from '../resources/time';

export function createTimeSystem() {
  return (world: World, dt: number) => {
    const time = world.getResource(Time);
    time.deltaTime = dt;
    time.elapsedTime += dt;
    time.frameCount++;
  };
}
