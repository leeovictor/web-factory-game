import { defineComponent } from '../../component';

export const RigidBody = defineComponent('RigidBody', {
  mass: 1,
  restitution: 0,
  friction: 0,
  isStatic: false,
  isKinematic: false,
  gravity: false,
  velocityX: 0,
  velocityY: 0,
  accelerationX: 0,
  accelerationY: 0,
});
