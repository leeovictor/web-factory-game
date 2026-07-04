import { RigidBody } from './components/rigidBody';

type RigidBodyData = ReturnType<typeof RigidBody>['data'];

export function applyForce(rb: RigidBodyData, fx: number, fy: number) {
  rb.accelerationX += fx / rb.mass;
  rb.accelerationY += fy / rb.mass;
}
