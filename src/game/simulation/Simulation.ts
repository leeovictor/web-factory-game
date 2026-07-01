import type { Grid } from '../core/Grid.ts'
import type { BuildingInstance } from '../entities/Building.ts'
import { tickMovers } from './Movers.ts'

export class Simulation {
  buildings: BuildingInstance[] = []
  private grid: Grid

  constructor(grid: Grid) {
    this.grid = grid
  }

  tick(dt: number): void {
    tickMovers(this.buildings, this.grid, dt)
    for (const b of this.buildings) {
      if (b.kind === 'belt' && b.belt?.item) {
        b.belt.item.prevPos = b.belt.item.pos
      }
    }
  }
}
