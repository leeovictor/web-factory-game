import { defineResource } from '../../resource';

export const CELL_KEY_MULT = 1000000;

export const SpatialGrid = defineResource('SpatialGrid', {
  cellSize: 200,
  cells: null as Map<number, number[]> | null,
  staticCells: null as Map<number, number[]> | null,
  needsStaticRebuild: true,
});

export function getCellKey(cx: number, cy: number): number {
  return cx * CELL_KEY_MULT + cy;
}
