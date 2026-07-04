import { defineResource } from '../../resource';

export const PhysicsConfig = defineResource('PhysicsConfig', {
  gravityX: 0,
  gravityY: 0,
  maxVelocity: 1000,
});
