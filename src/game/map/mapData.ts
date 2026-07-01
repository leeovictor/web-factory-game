import type { TileKind } from '../../types.ts'
import { GRID_W, GRID_H } from '../../constants.ts'

export function generateMap(): TileKind[][] {
  const map: TileKind[][] = []
  for (let y = 0; y < GRID_H; y++) {
    const row: TileKind[] = []
    for (let x = 0; x < GRID_W; x++) {
      if (x === 0 || x === GRID_W - 1 || y === 0 || y === GRID_H - 1) {
        row.push('empty')
      } else if (x >= 15 && x <= 24 && y >= 10 && y <= 14) {
        row.push('ore')
      } else {
        row.push('empty')
      }
    }
    map.push(row)
  }
  return map
}
