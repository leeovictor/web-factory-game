import type { Grid } from '../game/core/Grid.ts'
import { GameMap, key } from '../game/map/GameMap.ts'
import type { Simulation } from '../game/simulation/Simulation.ts'
import { createBuilding } from '../game/entities/Building.ts'
import { createItem } from '../game/entities/Item.ts'
import type { BuildingKind, Direction } from '../types.ts'
import { rotateCW, opposite } from '../game/core/Direction.ts'

export interface GhostState {
  kind: BuildingKind
  x: number
  y: number
  direction: Direction
  valid: boolean
}

export class BuildSystem {
  private grid: Grid
  private map: GameMap
  private sim: Simulation
  private currentKind: BuildingKind | null = 'belt'
  private currentDir: Direction = 'E'
  private ghost: GhostState | null = null

  constructor(grid: Grid, map: GameMap, sim: Simulation) {
    this.grid = grid
    this.map = map
    this.sim = sim
  }

  setCurrent(kind: BuildingKind | null): void {
    this.currentKind = kind
    if (!kind) {
      this.ghost = null
    }
  }

  rotateCW(): void {
    if (!this.currentKind) return
    this.currentDir = rotateCW(this.currentDir)
    if (this.ghost) {
      this.ghost.direction = this.currentDir
      this.ghost.valid = this.validatePlacement(this.ghost.kind, this.ghost.x, this.ghost.y)
    }
  }

  setHoverTile(x: number, y: number): void {
    const kind = this.currentKind
    if (!kind) {
      this.ghost = null
      return
    }
    const dir = this.currentDir
    const valid = this.validatePlacement(kind, x, y)
    this.ghost = { kind, x, y, direction: dir, valid }
  }

  clearHover(): void {
    this.ghost = null
  }

  getGhost(): GhostState | null {
    return this.ghost
  }

  getCurrentKind(): BuildingKind | null {
    return this.currentKind
  }

  place(x: number, y: number): { ok: true } | { ok: false; reason: string } {
    if (!this.currentKind) {
      return { ok: false, reason: 'no tool selected' }
    }
    if (!this.validatePlacement(this.currentKind, x, y)) {
      return { ok: false, reason: 'invalid placement' }
    }
    const b = createBuilding(this.currentKind, x, y, this.currentDir)
    this.grid.setBuilding(b)
    this.sim.buildings.push(b)
    return { ok: true }
  }

  remove(x: number, y: number): { ok: true } | { ok: false; reason: string } {
    const b = this.grid.getBuilding(x, y)
    if (!b) {
      return { ok: false, reason: 'no building' }
    }
    this.grid.removeBuilding(x, y)
    const idx = this.sim.buildings.findIndex((bb) => bb.id === b.id)
    if (idx !== -1) this.sim.buildings.splice(idx, 1)
    return { ok: true }
  }

  injectItem(x: number, y: number): { ok: true } | { ok: false; reason: string } {
    const b = this.grid.getBuilding(x, y)
    if (!b || b.kind !== 'belt' || !b.belt) {
      return { ok: false, reason: 'not a belt' }
    }
    if (b.belt.item !== null) {
      return { ok: false, reason: 'belt occupied' }
    }
    const item = createItem('iron_ore', { x, y }, opposite(b.direction))
    b.belt.item = item
    return { ok: true }
  }

  private validatePlacement(kind: BuildingKind, x: number, y: number): boolean {
    if (!this.map.inBounds(x, y)) return false
    if (kind === 'miner') {
      if (!this.map.isOre(x, y)) return false
      if (this.map.buildings.has(key(x, y))) return false
      return true
    }
    const b = createBuilding(kind, x, y, this.currentDir, 'preview')
    return this.grid.canPlace(b)
  }
}
