import { defineComponent } from '../../component';

export type SpriteVariant = 'circle' | 'rect' | 'capsule' | 'sprite';

export const SpriteRenderer = defineComponent('SpriteRenderer', {
  sprite: 'rect' as SpriteVariant,
  color: '#ffffff',
  fill: true,
  alpha: 1,
  radius: 10,
  width: 20,
  height: 20,
  lineWidth: 1,
  image: null as HTMLImageElement | null,
});
