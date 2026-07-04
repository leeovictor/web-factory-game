import { defineResource } from '../../ecs';
import type { LineState } from './transport/types';

export const GameState = defineResource('GameState', {
  resources: 100,
  energy: 0,
  maxEnergy: 0,
  wave: 1,
  totalEnergyConsumed: 0,
  nextAttackThreshold: 50,
  attackInProgress: false,
  gameOver: false,
  buildMode: '' as '' | 'miner' | 'turret' | 'laser' | 'solar' | 'demolish',
  paused: false,
});

export const ConnectionGraph = defineResource('ConnectionGraph', {
  nodes: new Map<number, number>(),
});

export const MouseState = defineResource('MouseState', {
  x: 0,
  y: 0,
  worldX: 0,
  worldY: 0,
  clicked: false,
});

export const TransportNetwork = defineResource('TransportNetwork', {
  lines: new Map<number, LineState>(),
  nextPacketId: 0,
});
