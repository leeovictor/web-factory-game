import { GameMap, key } from '../map/GameMap.ts'
import type { Direction } from '../../types.ts'
import type { BuildingInstance } from '../entities/Building.ts'
import { DIRS, opposite } from './Direction.ts'

export class Grid {
  private map: GameMap

  constructor(map: GameMap) {
    this.map = map
  }

  getBuilding(x: number, y: number): BuildingInstance | undefined {
    return this.map.buildingAt(x, y)
  }

  setBuilding(b: BuildingInstance): void {
    this.map.setBuilding(b)
  }

  removeBuilding(x: number, y: number): void {
    this.map.removeBuilding(x, y)
  }

  isFree(x: number, y: number): boolean {
    return this.map.isFree(x, y)
  }

  canPlace(b: BuildingInstance): boolean {
    for (let dy = 0; dy < b.height; dy++) {
      for (let dx = 0; dx < b.width; dx++) {
        const tx = b.x + dx
        const ty = b.y + dy
        if (!this.map.inBounds(tx, ty) || !this.map.isFree(tx, ty)) {
          return false
        }
      }
    }
    return true
  }

  isOre(x: number, y: number): boolean {
    return this.map.isOre(x, y)
  }

  inBounds(x: number, y: number): boolean {
    return this.map.inBounds(x, y)
  }

  buildingAhead(x: number, y: number, dir: Direction): BuildingInstance | undefined {
    const { dx, dy } = DIRS[dir]
    return this.getBuilding(x + dx, y + dy)
  }

  detectInputDir(b: BuildingInstance): Direction {
    const defaultDir = opposite(b.direction)
    if (b.kind !== 'belt') return defaultDir
    const dirs: Direction[] = ['N', 'E', 'S', 'W']
    for (const dir of dirs) {
      const { dx, dy } = DIRS[dir]
      const neighbor = this.getBuilding(b.x + dx, b.y + dy)
      if (neighbor && neighbor.kind === 'belt' && neighbor.direction === opposite(dir)) {
        return dir
      }
    }
    return defaultDir
  }

  static key(x: number, y: number): string {
    return key(x, y)
  }
}
