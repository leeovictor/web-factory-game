import { GameMap, key } from '../map/GameMap.ts'
import type { Building } from '../../types.ts'

export class Grid {
  private map: GameMap

  constructor(map: GameMap) {
    this.map = map
  }

  getBuilding(x: number, y: number): Building | undefined {
    return this.map.buildingAt(x, y)
  }

  setBuilding(b: Building): void {
    this.map.setBuilding(b)
  }

  removeBuilding(x: number, y: number): void {
    this.map.removeBuilding(x, y)
  }

  isFree(x: number, y: number): boolean {
    return this.map.isFree(x, y)
  }

  canPlace(b: Building): boolean {
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

  static key(x: number, y: number): string {
    return key(x, y)
  }
}
