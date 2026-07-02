import { defineResource } from '../ecs';

export const InputState = defineResource('InputState', { keys: [] as string[] });
export const MouseState = defineResource('MouseState', { x: 0, y: 0, trigger: false });
