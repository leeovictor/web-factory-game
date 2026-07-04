import { defineComponent } from '../../component';

export type ColliderShape = 'circle' | 'rect';

export const Collider = defineComponent('Collider', {
  shape: 'rect' as ColliderShape,
  radius: 10,
  width: 20,
  height: 20,
  offsetX: 0,
  offsetY: 0,
});
