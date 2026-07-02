/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Entity, ComponentPayload, World } from '../types';
import { createWorld } from '../world';
import { CanvasCtx } from './resources/canvas';
import { createTimeSystem } from './systems/timeSystem';
import { createRenderSystem } from './systems/renderSystem';

export interface DefaultWorldConfig {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export interface DefaultWorld {
  readonly world: World;
  start(): void;
  stop(): void;
  spawn(...payloads: ComponentPayload<any>[]): Entity;
  addSystem(system: (world: World, dt: number) => void, phase?: string): void;
  getTickTime(): number;
  getPhaseTimings(): Record<string, number>;
}

export function createDefaultWorld(config: DefaultWorldConfig): DefaultWorld {
  const world = createWorld({ phases: ['input', 'update', 'render', 'postRender'] });

  world.insertResource(CanvasCtx, {
    element: config.canvas,
    context: config.canvas.getContext('2d'),
    width: config.width,
    height: config.height,
  });

  world.addSystem(createTimeSystem(), 'input');
  world.addSystem(createRenderSystem(), 'render');

  let animationId: number | null = null;
  let lastTime = 0;
  let tickTime = 0;

  function tick(now: number) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    const start = performance.now();
    world.step(dt);
    tickTime = performance.now() - start;
    animationId = requestAnimationFrame(tick);
  }

  return {
    world,

    start() {
      if (animationId !== null) return;
      lastTime = performance.now();
      animationId = requestAnimationFrame(tick);
    },

    getTickTime() {
      return tickTime;
    },

    getPhaseTimings() {
      return { ...world.phaseTimings };
    },

    stop() {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    },

    spawn(...payloads) {
      return world.instantiate(...payloads);
    },

    addSystem(system, phase?) {
      world.addSystem(system, phase);
    },
  };
}
