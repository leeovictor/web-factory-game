import type { BuildingInstance } from '../entities/Building.ts'

export class Simulation {
  buildings: BuildingInstance[] = []

  tick(dt: number): void {
    void dt
  }
}
