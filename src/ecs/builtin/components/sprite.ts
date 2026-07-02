import { defineComponent } from '../../component';

export const Sprite = defineComponent('Sprite', {
  image: null as HTMLImageElement | null,
  alpha: 1,
});
