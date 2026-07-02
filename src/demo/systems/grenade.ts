import type { World } from '../../ecs';
import { Circle, Transform } from '../../ecs/builtin';
import { Explosion, Grenade, Meteor, SmokeParticle, SplashParticle, Velocity } from '../components';
import { PlayerControlled } from '../components';
import { MouseState } from '../resources';
import { randomRange } from '../utils';

export function createGrenadeThrowSystem(
  qPressedRef: { value: boolean },
  qJustReleasedRef: { value: boolean },
  qChargeRef: { value: number },
  chargeBarWrap: HTMLDivElement,
  chargeBarFill: HTMLDivElement,
  chargeLabel: HTMLElement
) {
  const MIN_CHARGE = 0.05;
  const MAX_CHARGE = 2.5;
  const MIN_SPEED = 500;
  const MAX_SPEED = 2400;

  return (w: World, dt: number) => {
    // Accumulate charge while Q is held
    if (qPressedRef.value) {
      qChargeRef.value = Math.min(MAX_CHARGE, qChargeRef.value + dt);
      const pct = Math.min(100, (qChargeRef.value / MAX_CHARGE) * 100);
      chargeBarWrap.style.display = 'block';
      chargeBarFill.style.width = pct + '%';
      chargeLabel.textContent = 'charging...';
      return;
    }

    // Hide bar when not charging
    if (qChargeRef.value <= 0) {
      chargeBarWrap.style.display = 'none';
      chargeBarFill.style.width = '0%';
      chargeLabel.textContent = 'ready';
    }

    // Only throw on release and if charge exists
    if (!qJustReleasedRef.value) return;
    qJustReleasedRef.value = false;

    const charge = qChargeRef.value;
    qChargeRef.value = 0;
    chargeBarWrap.style.display = 'none';
    chargeBarFill.style.width = '0%';
    chargeLabel.textContent = 'ready';

    if (charge < MIN_CHARGE) return;

    // Only allow one grenade at a time
    let hasGrenade = false;
    for (const _ of w.queryComponents(Transform, Grenade)) {
      hasGrenade = true;
      break;
    }
    if (hasGrenade) return;

    const mouse = w.getResource(MouseState);

    for (const [_, t] of w.queryComponents(Transform, PlayerControlled)) {
      const dx = mouse.x - t.x;
      const dy = mouse.y - t.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const dirX = dx / dist;
      const dirY = dy / dist;
      const chargeRatio = Math.min(1, charge / MAX_CHARGE);
      const throwSpeed = MIN_SPEED + chargeRatio * (MAX_SPEED - MIN_SPEED);

      w.instantiate(
        Transform({ x: t.x, y: t.y }),
        Circle({ radius: 7, color: '#6b7c3e' }),
        Velocity({ vx: dirX * throwSpeed, vy: dirY * throwSpeed * 0.2 - 580 }),
        Grenade({ fuse: 0, maxFuse: 1.5, explodeRadius: 150 })
      );
      break;
    }
  };
}

export function createGrenadePhysicsSystem() {
  return (w: World, dt: number) => {
    for (const [id, t, v, grenade, _circle] of w.queryComponents(Transform, Velocity, Grenade, Circle)) {
      // Apply gravity
      v.vy += 1200 * dt;

      // Move
      t.x += v.vx * dt;
      t.y += v.vy * dt;

      // Increment fuse
      grenade.fuse += dt;

      // Explode when fuse expires
      if (grenade.fuse >= grenade.maxFuse) {
        // Explosion at grenade position
        w.instantiate(
          Transform({ x: t.x, y: t.y }),
          Explosion({ lifetime: 0, maxLifetime: 0.5 })
        );

        // Smoke
        const smokeColors = ['#555555', '#666666', '#777777', '#888888', '#999999', '#aaaaaa'];
        for (let i = 0; i < 10; i++) {
          const offsetAngle = randomRange(0, Math.PI * 2);
          const offsetDist = randomRange(0, 40);
          w.instantiate(
            Transform({ x: t.x + Math.cos(offsetAngle) * offsetDist, y: t.y + Math.sin(offsetAngle) * offsetDist }),
            Circle({ radius: randomRange(4, 12), color: smokeColors[i % smokeColors.length] }),
            Velocity({ vx: randomRange(-20, 20), vy: randomRange(-30, -65) }),
            SmokeParticle({ lifetime: 0, maxLifetime: randomRange(0.4, 0.7), driftPhase: randomRange(0, Math.PI * 2), driftSpeed: randomRange(1.5, 4) })
          );
        }

        // Splash in all directions (360°)
        const splashColors = ['#00ffff', '#ffffff', '#70a1ff', '#a29bfe', '#fffa65', '#ff9f43'];
        for (let i = 0; i < 24; i++) {
          const angle = (Math.PI * 2 / 24) * i + randomRange(-0.3, 0.3);
          const speed = randomRange(180, 450);
          w.instantiate(
            Transform({ x: t.x + randomRange(-4, 4), y: t.y + randomRange(-4, 4) }),
            Circle({ radius: randomRange(2, 5), color: splashColors[i % splashColors.length] }),
            Velocity({ vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed }),
            SplashParticle({ lifetime: 0, maxLifetime: randomRange(0.12, 0.25) })
          );
        }

        // Destroy nearby meteors
        for (const [meteorId, mt, _meteor] of w.queryComponents(Transform, Meteor)) {
          const dx = mt.x - t.x;
          const dy = mt.y - t.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < grenade.explodeRadius) {
            w.despawn(meteorId);
            // Small explosion for each destroyed meteor
            w.instantiate(
              Transform({ x: mt.x, y: mt.y }),
              Explosion({ lifetime: 0, maxLifetime: 0.3 })
            );
          }
        }

        // Despawn grenade
        w.despawn(id);
      }
    }
  };
}
