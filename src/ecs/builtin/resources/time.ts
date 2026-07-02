import { defineResource } from '../../resource';

export const Time = defineResource('Time', {
  deltaTime: 0,
  elapsedTime: 0,
  frameCount: 0,
});
