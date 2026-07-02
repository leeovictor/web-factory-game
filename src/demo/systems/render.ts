import type { World } from '../../ecs';
import { Transform } from '../../ecs/builtin';

export function createUISystem(
  dw: { getTickTime(): number; getPhaseTimings(): Record<string, number> },
  fpsEl: HTMLElement,
  countEl: HTMLElement,
  tickEl: HTMLElement,
  phaseEl: HTMLElement
) {
  const frameTimes: number[] = [];

  return (w: World, dt: number) => {
    frameTimes.push(dt);
    if (frameTimes.length > 60) frameTimes.shift();

    if (frameTimes.length >= 10) {
      const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      fpsEl.textContent = Math.round(1 / avg).toString();
    }
    let entityCount = 0;
    for (const _ of w.query(Transform)) entityCount++;
    countEl.textContent = entityCount.toString();
    tickEl.textContent = dw.getTickTime().toFixed(2);
    const timings = dw.getPhaseTimings();
    const pairs = Object.entries(timings).map(([name, ms]) => `${name} ${ms.toFixed(2)}`).join(' / ');
    phaseEl.textContent = pairs || '...';
  };
}
