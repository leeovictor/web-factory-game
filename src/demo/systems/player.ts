import type { World } from '../../ecs';
import { Capsule, Transform } from '../../ecs/builtin';
import { PlayerControlled, Velocity } from '../components';
import { InputState } from '../resources';

export function createPlayerSystem(canvas: HTMLCanvasElement) {
  return (w: World, dt: number) => {
    const input = w.getResource(InputState);

    for (const [_, t, v, pc, cap] of w.queryComponents(Transform, Velocity, PlayerControlled, Capsule)) {
      // Horizontal movement with momentum — different values on ground vs air
      {
        let moveX = 0;
        if (input.keys.includes('a') || input.keys.includes('arrowleft')) moveX -= 1;
        if (input.keys.includes('d') || input.keys.includes('arrowright')) moveX += 1;

        const accel = pc.isGrounded ? pc.acceleration : pc.airAcceleration;
        const fric = pc.isGrounded ? pc.friction : pc.airFriction;

        if (moveX !== 0) {
          v.vx += moveX * accel * dt;
        } else {
          if (v.vx > 0) {
            v.vx -= fric * dt;
            if (v.vx < 0) v.vx = 0;
          } else if (v.vx < 0) {
            v.vx += fric * dt;
            if (v.vx > 0) v.vx = 0;
          }
        }

        v.vx = Math.max(-pc.maxSpeed, Math.min(pc.maxSpeed, v.vx));
      }

      // Gravity
      v.vy += pc.gravity * dt;

      // Jump (Space, only when grounded)
      if (input.keys.includes(' ') && pc.isGrounded) {
        v.vy = -pc.jumpSpeed;
        pc.isGrounded = false;
      }

      // Apply velocity
      t.x += v.vx * dt;
      t.y += v.vy * dt;

      // Floor collision
      const halfH = cap.height / 2;
      if (t.y + halfH > canvas.height) {
        t.y = canvas.height - halfH;
        v.vy = 0;
        pc.isGrounded = true;
      }

      // Ceiling collision
      if (t.y - halfH < 0) {
        t.y = halfH;
        v.vy = 0;
      }

      // Wall collision
      const halfW = cap.width / 2;
      if (t.x - halfW < 0) {
        t.x = halfW;
      } else if (t.x + halfW > canvas.width) {
        t.x = canvas.width - halfW;
      }
    }
  };
}
