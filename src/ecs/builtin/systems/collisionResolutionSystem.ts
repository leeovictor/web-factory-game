import type { World } from '../../types';
import { Transform } from '../components/transform';
import { RigidBody } from '../components/rigidBody';
import { CollisionPairs } from './collisionDetectionSystem';

export function createCollisionResolutionSystem() {
  return (world: World) => {
    const { pairs } = world.getResource(CollisionPairs);

    for (const pair of pairs) {
      const tA = world.get(pair.entityA, Transform);
      const tB = world.get(pair.entityB, Transform);
      if (!tA || !tB) continue;

      const rbA = world.get(pair.entityA, RigidBody);
      const rbB = world.get(pair.entityB, RigidBody);

      const isStaticA = !rbA || rbA.isStatic;
      const isStaticB = !rbB || rbB.isStatic;
      const isKinematicA = !!rbA && rbA.isKinematic;
      const isKinematicB = !!rbB && rbB.isKinematic;

      if (isStaticA && isStaticB) continue;

      const invMassA = (isStaticA || isKinematicA) ? 0 : 1 / rbA!.mass;
      const invMassB = (isStaticB || isKinematicB) ? 0 : 1 / rbB!.mass;
      const invMassSum = invMassA + invMassB;
      if (invMassSum === 0) continue;

      const nx = -pair.normalX;
      const ny = -pair.normalY;
      const pen = pair.penetration;
      const invMassSumRcp = 1 / invMassSum;
      const ratioA = invMassA * invMassSumRcp;
      const ratioB = invMassB * invMassSumRcp;

      if (!isStaticA && !isKinematicA) {
        tA.x += nx * pen * ratioA;
        tA.y += ny * pen * ratioA;
      }
      if (!isStaticB && !isKinematicB) {
        tB.x -= nx * pen * ratioB;
        tB.y -= ny * pen * ratioB;
      }

      const vAx = rbA ? rbA.velocityX : 0;
      const vAy = rbA ? rbA.velocityY : 0;
      const vBx = rbB ? rbB.velocityX : 0;
      const vBy = rbB ? rbB.velocityY : 0;

      const relVx = vAx - vBx;
      const relVy = vAy - vBy;
      const relVN = relVx * nx + relVy * ny;

      if (relVN > 0) continue;

      const eA = rbA ? rbA.restitution : 0;
      const eB = rbB ? rbB.restitution : 0;
      const e = Math.min(eA, eB);

      const j = -(1 + e) * relVN * invMassSumRcp;

      if (!isStaticA && !isKinematicA && rbA) {
        rbA.velocityX += j * invMassA * nx;
        rbA.velocityY += j * invMassA * ny;
      }
      if (!isStaticB && !isKinematicB && rbB) {
        rbB.velocityX -= j * invMassB * nx;
        rbB.velocityY -= j * invMassB * ny;
      }

      const fA = rbA ? rbA.friction : 0;
      const fB = rbB ? rbB.friction : 0;
      const mu = (fA + fB) * 0.5;

      if (mu > 0) {
        const tx = relVx - relVN * nx;
        const ty = relVy - relVN * ny;
        const tLen = Math.sqrt(tx * tx + ty * ty);

        if (tLen > 0.0001) {
          const invTLen = 1 / tLen;
          const tanX = tx * invTLen;
          const tanY = ty * invTLen;

          const jt = -(relVx * tanX + relVy * tanY) * invMassSumRcp;
          const jtClamped = Math.max(-mu * j, Math.min(mu * j, jt));

          if (!isStaticA && !isKinematicA && rbA) {
            rbA.velocityX += jtClamped * invMassA * tanX;
            rbA.velocityY += jtClamped * invMassA * tanY;
          }
          if (!isStaticB && !isKinematicB && rbB) {
            rbB.velocityX -= jtClamped * invMassB * tanX;
            rbB.velocityY -= jtClamped * invMassB * tanY;
          }
        }
      }
    }
  };
}
