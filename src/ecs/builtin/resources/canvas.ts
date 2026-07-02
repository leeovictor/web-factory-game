import { defineResource } from '../../resource';

export const CanvasCtx = defineResource('CanvasCtx', {
  element: null as HTMLCanvasElement | null,
  context: null as CanvasRenderingContext2D | null,
  width: 0,
  height: 0,
});
