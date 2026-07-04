import type { World } from '../../types';
import { Transform } from '../components/transform';
import { RigidBody } from '../components/rigidBody';
import { PhysicsConfig } from '../resources/physicsConfig';

export function createPhysicsSystem() {
  return (world: World, dt: number) => {
    const config = world.getResource(PhysicsConfig);

    for (const [, transform, rb] of world.queryComponents(Transform, RigidBody)) {
      if (rb.isStatic) continue;

      if (rb.isKinematic) {
        transform.x += rb.velocityX * dt;
        transform.y += rb.velocityY * dt;
        continue;
      }

      if (rb.gravity) {
        rb.velocityX += config.gravityX * dt;
        rb.velocityY += config.gravityY * dt;
      }

      rb.velocityX += rb.accelerationX * dt;
      rb.velocityY += rb.accelerationY * dt;

      const speed = Math.sqrt(rb.velocityX * rb.velocityX + rb.velocityY * rb.velocityY);
      if (speed > config.maxVelocity) {
        const scale = config.maxVelocity / speed;
        rb.velocityX *= scale;
        rb.velocityY *= scale;
      }

      transform.x += rb.velocityX * dt;
      transform.y += rb.velocityY * dt;

      rb.accelerationX = 0;
      rb.accelerationY = 0;
    }
  };
}
