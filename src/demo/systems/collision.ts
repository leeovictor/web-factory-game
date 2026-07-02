import type { World } from '../../ecs';
import { Circle, Transform } from '../../ecs/builtin';
import { Meteor, Projectile, Explosion, SmokeParticle, SplashParticle, Velocity } from '../components';
import { randomRange } from '../utils';

function getMeteorRadius(meteor: { vertices: Array<{x: number; y: number}> }): number {
  let maxR = 0;
  for (const v of meteor.vertices) {
    const r = Math.sqrt(v.x * v.x + v.y * v.y);
    if (r > maxR) maxR = r;
  }
  return maxR;
}

export function createProjectileMeteorCollisionSystem() {
  return (w: World) => {
    const meteors: Array<{ id: number; x: number; y: number; radius: number }> = [];
    for (const [id, t, meteor] of w.queryComponents(Transform, Meteor)) {
      const radius = getMeteorRadius(meteor);
      meteors.push({ id, x: t.x, y: t.y, radius });
    }

    for (const [projId, pt, projVel, _projectile, projCircle] of w.queryComponents(Transform, Velocity, Projectile, Circle)) {
      for (const meteor of meteors) {
        const dx = pt.x - meteor.x;
        const dy = pt.y - meteor.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < projCircle.radius + meteor.radius) {
          w.despawn(projId);
          w.despawn(meteor.id);
          w.instantiate(
            Transform({ x: meteor.x, y: meteor.y }),
            Explosion({ lifetime: 0, maxLifetime: 0.3 })
          );
          const smokeColors = ['#555555', '#666666', '#777777', '#888888', '#999999', '#aaaaaa'];
          for (let i = 0; i < 12; i++) {
            const offsetAngle = randomRange(0, Math.PI * 2);
            const offsetDist = randomRange(0, meteor.radius * 0.7);
            w.instantiate(
              Transform({ x: meteor.x + Math.cos(offsetAngle) * offsetDist, y: meteor.y + Math.sin(offsetAngle) * offsetDist }),
              Circle({ radius: randomRange(3, 10), color: smokeColors[i % smokeColors.length] }),
              Velocity({ vx: randomRange(-20, 20), vy: randomRange(-30, -65) }),
              SmokeParticle({ lifetime: 0, maxLifetime: randomRange(0.4, 0.7), driftPhase: randomRange(0, Math.PI * 2), driftSpeed: randomRange(1.5, 4) })
            );
          }
          // Splash particles — opposite direction to projectile
          {
            const projLen = Math.sqrt(projVel.vx * projVel.vx + projVel.vy * projVel.vy) || 1;
            const oppX = -projVel.vx / projLen;
            const oppY = -projVel.vy / projLen;
            const splashColors = ['#00ffff', '#ffffff', '#70a1ff', '#a29bfe', '#00ffff', '#ffffff'];
            for (let i = 0; i < 22; i++) {
              const spreadAngle = randomRange(-0.5, 0.5);
              const cosA = Math.cos(spreadAngle);
              const sinA = Math.sin(spreadAngle);
              const dirX = oppX * cosA - oppY * sinA;
              const dirY = oppX * sinA + oppY * cosA;
              const speed = randomRange(200, 500);
              w.instantiate(
                Transform({ x: meteor.x + randomRange(-4, 4), y: meteor.y + randomRange(-4, 4) }),
                Circle({ radius: randomRange(2, 5), color: splashColors[i % splashColors.length] }),
                Velocity({ vx: dirX * speed, vy: dirY * speed }),
                SplashParticle({ lifetime: 0, maxLifetime: randomRange(0.12, 0.22) })
              );
            }
          }
          break;
        }
      }
    }
  };
}
