import type { World } from '../../ecs';
import { InputState, MouseState } from '../resources';

export function createKeyboardInputSystem(pressedKeys: Set<string>) {
  return (w: World) => {
    w.insertResource(InputState, { keys: Array.from(pressedKeys) });
  };
}

export function createMouseInputSystem(
  mouseXRef: { value: number },
  mouseYRef: { value: number },
  mouseDownRef: { value: boolean }
) {
  return (w: World) => {
    w.insertResource(MouseState, { x: mouseXRef.value, y: mouseYRef.value, trigger: mouseDownRef.value });
  };
}
