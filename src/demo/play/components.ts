import { defineComponent, defineTag } from '../../ecs';

export const Mothership = defineTag('Mothership');
export const Asteroid = defineTag('Asteroid');
export const Miner = defineTag('Miner');
export const Turret = defineTag('Turret');
export const LaserTurret = defineTag('LaserTurret');
export const SolarPanel = defineTag('SolarPanel');
export const Enemy = defineTag('Enemy');
export const Projectile = defineTag('Projectile');

export const Health = defineComponent('Health', { hp: 100, maxHp: 100 });

export const AsteroidData = defineComponent('AsteroidData', {
  resources: 100,
  maxResources: 100,
  radius: 30,
});

export const MinerData = defineComponent('MinerData', {
  rate: 2,
  connectedAsteroid: -1,
  buffer: 0,
});

export const BuildingData = defineComponent('BuildingData', {
  type: '' as 'miner' | 'turret' | 'laser' | 'solar',
  connectedTo: -1,
  cost: 0,
});

export const EnemyData = defineComponent('EnemyData', {
  speed: 60,
  damage: 10,
  target: -1,
  attackCooldown: 0,
});

export const ProjectileData = defineComponent('ProjectileData', {
  damage: 20,
  speed: 300,
  targetX: 0,
  targetY: 0,
  targetEntity: -1,
  lifetime: 3,
});

export const LaserTarget = defineComponent('LaserTarget', {
  entity: -1,
  x: 0,
  y: 0,
});

export const MiningVisual = defineComponent('MiningVisual', {
  active: false,
});

export const ConstructionSite = defineComponent('ConstructionSite', {
  buildTime: 3,
  elapsed: 0,
  parentEntity: -1,
  buildType: '' as 'miner' | 'turret' | 'laser' | 'solar',
  cost: 0,
  connectedAsteroid: -1,
});
