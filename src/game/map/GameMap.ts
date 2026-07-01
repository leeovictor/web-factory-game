import type { TileKind } from '../../types.ts'
import type { BuildingInstance } from '../entities/Building.ts'
import { generateMap } from './mapData.ts'

export function key(x: number, y: number): string {
  return `${x},${y}`
}

export class GameMap {
  width: number
  height: number
  tiles: TileKind[][]
  buildings = new Map<string, BuildingInstance>()

  constructor() {
    this.tiles = generateMap()
    this.width = this.tiles[0].length
    this.height = this.tiles.length
  }

  tileAt(x: number, y: number): TileKind | undefined {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return undefined
    return this.tiles[y][x]
  }

  buildingAt(x: number, y: number): BuildingInstance | undefined {
    return this.buildings.get(key(x, y))
  }

  setBuilding(b: BuildingInstance): void {
    for (let dy = 0; dy < b.height; dy++) {
      for (let dx = 0; dx < b.width; dx++) {
        this.buildings.set(key(b.x + dx, b.y + dy), b)
      }
    }
  }

  removeBuilding(x: number, y: number): void {
    const b = this.buildings.get(key(x, y))
    if (!b) return
    for (let dy = 0; dy < b.height; dy++) {
      for (let dx = 0; dx < b.width; dx++) {
        this.buildings.delete(key(b.x + dx, b.y + dy))
      }
    }
  }

  isFree(x: number, y: number): boolean {
    const t = this.tileAt(x, y)
    return t === 'empty' && !this.buildings.has(key(x, y))
  }

  isOre(x: number, y: number): boolean {
    return this.tileAt(x, y) === 'ore'
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height
  }
}
