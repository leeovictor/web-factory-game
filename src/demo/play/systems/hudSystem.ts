import type { World } from '../../../ecs';
import { GameState } from '../resources';

export function createHUDSystem(
  statsEl: HTMLElement,
  fpsEl: HTMLElement,
  buildMenuEl: HTMLElement,
) {
  const frameTimes: number[] = [];
  let elapsed = 0;

  return (_world: World, dt: number) => {
    frameTimes.push(dt);
    if (frameTimes.length > 60) frameTimes.shift();

    elapsed += dt;
    if (elapsed < 0.2) return;
    elapsed = 0;

    const state = _world.getResource(GameState);

    const resourcesEl = statsEl.querySelector('#resources')!;
    const energyEl = statsEl.querySelector('#energy')!;
    const waveEl = statsEl.querySelector('#wave')!;
    const waveTimerEl = statsEl.querySelector('#waveTimer')!;

    resourcesEl.textContent = Math.floor(state.resources).toString();
    energyEl.textContent = `${Math.floor(state.energy)}/${Math.floor(state.maxEnergy)}`;
    waveEl.textContent = state.wave.toString();
    waveTimerEl.textContent = `${Math.floor(state.totalEnergyConsumed)}/${state.nextAttackThreshold}`;

    buildMenuEl.dataset.build = state.buildMode;
    for (const btn of buildMenuEl.querySelectorAll('button')) {
      btn.classList.toggle('active', btn.dataset.build === state.buildMode);
    }

    if (state.gameOver) {
      document.getElementById('gameOver')!.style.display = 'block';
    }

    const alertEl = document.getElementById('attackAlert')!;
    alertEl.style.display = state.attackInProgress ? 'block' : 'none';

    if (frameTimes.length >= 10) {
      const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      fpsEl.textContent = Math.round(1 / avg).toString();
    }
  };
}
