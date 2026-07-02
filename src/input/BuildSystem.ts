import type { Grid } from '../game/core/Grid.ts'
import { GameMap, key } from '../game/map/GameMap.ts'
import type { Simulation } from '../game/simulation/Simulation.ts'
import { createBuilding } from '../game/entities/Building.ts'
import { createItem } from '../game/entities/Item.ts'
import type { BuildingKind, Direction } from '../types.ts'
import { rotateCW, opposite, DIRS, isPerpendicular } from '../game/core/Direction.ts'
import type { BuildingInstance } from '../game/entities/Building.ts'

export interface GhostState {
  kind: BuildingKind
  x: number
  y: number
  direction: Direction
  valid: boolean
  inputDir?: Direction
}

export class BuildSystem {
  private grid: Grid
  private map: GameMap
  private sim: Simulation
  private currentKind: BuildingKind | null = 'belt'
  private currentDir: Direction = 'E'
  private ghost: GhostState | null = null
  private rejectReason: string | null = null
  private rejectUntil = 0

  // drag-to-build state
  private dragFrom: { x: number; y: number } | null = null
  private isBeltDragging = false
  private invertCurve = false

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

  handleRotate(hoverX?: number, hoverY?: number): void {
    // 1) Toggle curve on a placed belt under cursor
    if (hoverX !== undefined && hoverY !== undefined) {
      const b = this.grid.getBuilding(hoverX, hoverY)
      if (b?.kind === 'belt' && b.belt) {
        const inputDir = this.grid.detectInputDir(b)
        if (isPerpendicular(inputDir, b.direction)) {
          const other = this.getOtherPerpDir(b.direction, inputDir)
          b.belt.inputDirOverride = b.belt.inputDirOverride ? undefined : other
          return
        }
      }
    }

    // 2) Toggle curveHint during drag
    if (this.isBeltDragging) {
      this.toggleCurveHint()
      return
    }

    // 3) Default: rotate currentDir
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

    // During belt drag, compute ghost direction from drag path
    if (this.isBeltDragging && this.dragFrom && kind === 'belt') {
      const dir = this.directionFromDelta(this.dragFrom.x, this.dragFrom.y, x, y)
      const valid = this.validatePlacement(kind, x, y)
      const inputDir = this.simulateInputDir(x, y, dir)
      this.ghost = { kind, x, y, direction: dir, valid, inputDir }
      return
    }

    const dir = this.currentDir
    const valid = this.validatePlacement(kind, x, y)
    const inputDir = kind === 'belt' ? this.simulateInputDir(x, y, dir) : undefined
    this.ghost = { kind, x, y, direction: dir, valid, inputDir }
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

  // --- Drag-to-build API ---

  isDraggingBelt(): boolean {
    return this.isBeltDragging
  }

  beginDrag(x: number, y: number): void {
    this.dragFrom = { x, y }
    this.isBeltDragging = true
  }

  paintDrag(tx: number, ty: number): void {
    if (!this.dragFrom || !this.isBeltDragging) return
    if (this.dragFrom.x === tx && this.dragFrom.y === ty) return

    const path = this.walkLine(this.dragFrom.x, this.dragFrom.y, tx, ty)

    for (let i = 0; i < path.length - 1; i++) {
      const prev = path[i]
      const curr = path[i + 1]
      const dir = this.directionFromDelta(prev.x, prev.y, curr.x, curr.y)

      // Check if previous tile's direction changes (corner)
      const prevBelt = this.grid.getBuilding(prev.x, prev.y)
      const oldDir = prevBelt?.direction

      this.ensureBeltAt(prev.x, prev.y, dir)

      // Apply invertCurve at a corner
      if (oldDir !== undefined && oldDir !== dir && this.invertCurve) {
        const b = this.grid.getBuilding(prev.x, prev.y) as BuildingInstance | undefined
        if (b?.belt) {
          const perp1 = rotateCW(dir)
          const perp2 = rotateCW(rotateCW(rotateCW(dir)))
          const autoInput = opposite(oldDir)
          b.belt.inputDirOverride = perp1 === autoInput ? perp2 : perp1
          this.invertCurve = false
        }
      }

      this.dragFrom = { x: curr.x, y: curr.y }
    }

    // Place the final tile
    if (path.length >= 2) {
      const secondToLast = path[path.length - 2]
      const last = path[path.length - 1]
      const finalDir = this.directionFromDelta(secondToLast.x, secondToLast.y, last.x, last.y)
      this.ensureBeltAt(last.x, last.y, finalDir)
    }
  }

  endDrag(): void {
    this.dragFrom = null
    this.isBeltDragging = false
    this.invertCurve = false
  }

  // --- Curve hint ---

  private toggleCurveHint(): void {
    this.invertCurve = !this.invertCurve
  }

  private simulateInputDir(x: number, y: number, outDir: Direction): Direction {
    const dirs: Direction[] = ['N', 'E', 'S', 'W']
    for (const d of dirs) {
      const { dx, dy } = DIRS[d]
      const neighbor = this.grid.getBuilding(x + dx, y + dy)
      if (neighbor?.kind === 'belt' && neighbor.direction === opposite(d)) {
        return d
      }
    }
    return opposite(outDir)
  }

  // --- Helpers ---

  private ensureBeltAt(x: number, y: number, dir: Direction, inputDirOverride?: Direction): boolean {
    if (!this.map.inBounds(x, y)) return false
    const existing = this.grid.getBuilding(x, y)
    if (existing) {
      if (existing.kind !== 'belt') return false
      existing.direction = dir
      if (existing.belt) existing.belt.inputDirOverride = inputDirOverride
      return true
    }
    const b = createBuilding('belt', x, y, dir)
    if (b.belt) b.belt.inputDirOverride = inputDirOverride
    this.grid.setBuilding(b)
    this.sim.buildings.push(b)
    return true
  }

  private walkLine(fromX: number, fromY: number, toX: number, toY: number): { x: number; y: number }[] {
    const tiles: { x: number; y: number }[] = [{ x: fromX, y: fromY }]
    let cx = fromX
    let cy = fromY
    while (cx !== toX || cy !== toY) {
      const dx = Math.sign(toX - cx)
      const dy = Math.sign(toY - cy)
      if (dx !== 0 && (dy === 0 || Math.abs(toX - cx) >= Math.abs(toY - cy))) {
        cx += dx
      } else if (dy !== 0) {
        cy += dy
      } else {
        break
      }
      tiles.push({ x: cx, y: cy })
    }
    return tiles
  }

  private directionFromDelta(x1: number, y1: number, x2: number, y2: number): Direction {
    const dx = x2 - x1
    const dy = y2 - y1
    if (dx > 0) return 'E'
    if (dx < 0) return 'W'
    if (dy > 0) return 'S'
    if (dy < 0) return 'N'
    return this.currentDir
  }

  private getOtherPerpDir(outDir: Direction, currentInput: Direction): Direction {
    const cw = rotateCW(outDir)
    const ccw = rotateCW(rotateCW(rotateCW(outDir)))
    return currentInput === cw ? ccw : cw
  }

  // --- Existing methods ---

  place(x: number, y: number): { ok: true } | { ok: false; reason: string } {
    if (!this.currentKind) {
      this.setReject('no tool selected')
      return { ok: false, reason: 'no tool selected' }
    }
    const reason = this.getPlacementReason(this.currentKind, x, y)
    if (reason) {
      this.setReject(reason)
      return { ok: false, reason }
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

  clearAll(): void {
    for (const b of [...this.sim.buildings]) {
      this.grid.removeBuilding(b.x, b.y)
    }
    this.sim.buildings.length = 0
  }

  getRejectInfo(): { reason: string | null; active: boolean } {
    const active = performance.now() < this.rejectUntil
    return { reason: active ? this.rejectReason : null, active }
  }

  getInserterPreview(): { from: { x: number; y: number }; to: { x: number; y: number }; valid: boolean } | null {
    const g = this.ghost
    if (!g || g.kind !== 'inserter') return null
    const { dx, dy } = DIRS[g.direction]
    const from = { x: g.x + dx, y: g.y + dy }
    const to = { x: g.x - dx, y: g.y - dy }
    const fromValid = this.map.inBounds(from.x, from.y)
    const toValid = this.map.inBounds(to.x, to.y)
    return { from, to, valid: fromValid && toValid }
  }

  private setReject(reason: string): void {
    this.rejectReason = reason
    this.rejectUntil = performance.now() + 200
  }

  private validatePlacement(kind: BuildingKind, x: number, y: number): boolean {
    return this.getPlacementReason(kind, x, y) === null
  }

  private getPlacementReason(kind: BuildingKind, x: number, y: number): string | null {
    if (!this.map.inBounds(x, y)) return 'fora do mapa'
    if (kind === 'miner') {
      if (!this.map.isOre(x, y)) return 'mineradora só sobre minério'
      if (this.map.buildings.has(key(x, y))) return 'tile ocupado'
      return null
    }
    const b = createBuilding(kind, x, y, this.currentDir, 'preview')
    if (!this.grid.canPlace(b)) return 'tile ocupado ou inválido'
    return null
  }
}
