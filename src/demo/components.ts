import { defineComponent } from '../ecs';

export const Velocity = defineComponent('Velocity', { vx: 0, vy: 0 });
export const PlayerControlled = defineComponent('PlayerControlled', { acceleration: 1800, airAcceleration: 800, maxSpeed: 400, friction: 1200, airFriction: 500, jumpSpeed: 600, gravity: 1200, isGrounded: false });
export interface Vertex { x: number; y: number }
export const Meteor = defineComponent('Meteor', { active: true, radius: 18, color: '#ffffff', vertices: [] as Vertex[] });
export const Projectile = defineComponent('Projectile', { speed: 800 });
export const Explosion = defineComponent('Explosion', { lifetime: 0, maxLifetime: 0.3 });
export const GroundExplosion = defineComponent('GroundExplosion', { lifetime: 0, maxLifetime: 1.0 });
export const SmokeColumn = defineComponent('SmokeColumn', { lifetime: 0, maxLifetime: 2.5, driftPhase: 0, driftSpeed: 1, riseSpeed: 20 });
export const SmokeParticle = defineComponent('SmokeParticle', { lifetime: 0, maxLifetime: 0.4, driftPhase: 0, driftSpeed: 1 });
export const SplashParticle = defineComponent('SplashParticle', { lifetime: 0, maxLifetime: 0.15 });
export const TrailParticle = defineComponent('TrailParticle', { lifetime: 0, maxLifetime: 0.06 });
export const Grenade = defineComponent('Grenade', { fuse: 0, maxFuse: 1.5, explodeRadius: 150 });
