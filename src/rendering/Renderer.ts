import { Camera } from '../input/Camera.ts'
import { GameMap } from '../game/map/GameMap.ts'
import type { Building, Direction } from '../types.ts'
import { Grid } from '../game/core/Grid.ts'
import type { BuildingInstance } from '../game/entities/Building.ts'
import { DIRS, isPerpendicular } from '../game/core/Direction.ts'
import { PALETTE } from './Palette.ts'
import {
  TILE_SIZE,
  BG_COLOR,
  ORE_COLOR,
  FLOOR_COLOR,
  GRID_COLOR,
  CURSOR_COLOR,
  ITEM_SIZE,
} from '../constants.ts'

interface GhostInfo {
  kind: Building['kind']
  x: number
  y: number
  direction: Direction
  valid: boolean
}

export class Renderer {
  private ctx: CanvasRenderingContext2D
  private camera: Camera
  private map: GameMap
  private grid: Grid
  private cursor: { x: number; y: number } | null = null
  private getGhost: () => GhostInfo | null

  constructor(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    map: GameMap,
    grid: Grid,
    getGhost: () => GhostInfo | null
  ) {
    this.ctx = ctx
    this.camera = camera
    this.map = map
    this.grid = grid
    this.getGhost = getGhost
  }

  setCursor(x: number | null, y: number | null): void {
    if (x === null || y === null) {
      this.cursor = null
    } else {
      this.cursor = { x, y }
    }
  }

  render(alpha: number): void {
    const ctx = this.ctx
    const { width, height } = ctx.canvas

    ctx.save()
    ctx.fillStyle = BG_COLOR
    ctx.fillRect(0, 0, width, height)

    ctx.translate(-this.camera.x, -this.camera.y)
    ctx.scale(this.camera.zoom, this.camera.zoom)

    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const tile = this.map.tileAt(x, y)
        const px = x * TILE_SIZE
        const py = y * TILE_SIZE

        if (tile === 'ore') {
          ctx.fillStyle = ORE_COLOR
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE)
        } else {
          ctx.fillStyle = FLOOR_COLOR
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE)
        }

        ctx.strokeStyle = GRID_COLOR
        ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE)
      }
    }

    this.drawBuildings()
    this.drawItems(alpha)

    const ghost = this.getGhost()
    if (ghost) {
      this.drawGhost(ghost)
    }

    if (this.cursor) {
      const cx = this.cursor.x * TILE_SIZE
      const cy = this.cursor.y * TILE_SIZE
      ctx.strokeStyle = CURSOR_COLOR
      ctx.lineWidth = 2
      ctx.strokeRect(cx + 1, cy + 1, TILE_SIZE - 2, TILE_SIZE - 2)
      ctx.lineWidth = 1
    }

    ctx.restore()
  }

  private drawBuildings(): void {
    const seen = new Set<string>()
    for (const b of this.map.buildings.values()) {
      if (seen.has(b.id)) continue
      seen.add(b.id)
      this.drawBuilding(b)
    }
  }

  private drawBuilding(b: BuildingInstance): void {
    const ctx = this.ctx
    const x = b.x * TILE_SIZE
    const y = b.y * TILE_SIZE
    const w = b.width * TILE_SIZE
    const h = b.height * TILE_SIZE
    const palette = PALETTE[b.kind]

    ctx.fillStyle = palette.fill
    ctx.strokeStyle = palette.stroke
    ctx.lineWidth = 2
    ctx.fillRect(x, y, w, h)
    ctx.strokeRect(x, y, w, h)
    ctx.lineWidth = 1

    if (b.kind === 'belt') {
      this.drawBeltLane(b)
    } else {
      this.drawArrow(x, y, w, h, b.direction, palette.accent)
    }
  }

  private drawGhost(g: GhostInfo): void {
    const ctx = this.ctx
    const kind = g.kind
    const w = (kind === 'furnace' || kind === 'storage' ? 2 : 1) * TILE_SIZE
    const h = w
    const x = g.x * TILE_SIZE
    const y = g.y * TILE_SIZE

    ctx.fillStyle = g.valid ? PALETTE.ghostValid : PALETTE.ghostInvalid
    ctx.fillRect(x, y, w, h)

    this.drawArrow(x, y, w, h, g.direction, PALETTE.arrow)
  }

  private drawItems(alpha: number): void {
    const ctx = this.ctx
    const size = ITEM_SIZE * TILE_SIZE
    const half = size / 2
    const stripW = size * 0.22
    const seen = new Set<string>()
    for (const b of this.map.buildings.values()) {
      if (seen.has(b.id)) continue
      seen.add(b.id)
      if (b.kind !== 'belt' || !b.belt?.item) continue
      const item = b.belt.item
      const t = item.prevPos + (item.pos - item.prevPos) * alpha
      const px = b.x * TILE_SIZE
      const py = b.y * TILE_SIZE
      let ix: number
      let iy: number
      let tangent: number
      if (isPerpendicular(item.inputDir, b.direction)) {
        const entry = this.getEdgeCenter(px, py, TILE_SIZE, item.inputDir)
        const exit = this.getEdgeCenter(px, py, TILE_SIZE, b.direction)
        const { cx, cy, r, startAngle, diff } = this.getArcParams(px, py, TILE_SIZE, item.inputDir, b.direction, entry, exit)
        const angle = startAngle + diff * t
        ix = cx + r * Math.cos(angle)
        iy = cy + r * Math.sin(angle)
        tangent = angle + Math.sign(diff) * Math.PI / 2
      } else {
        const { dx, dy } = DIRS[b.direction]
        ix = px + TILE_SIZE / 2 + dx * (t - 0.5) * TILE_SIZE
        iy = py + TILE_SIZE / 2 + dy * (t - 0.5) * TILE_SIZE
        tangent = Math.atan2(dy, dx)
      }
      ctx.save()
      ctx.translate(ix, iy)
      ctx.rotate(tangent)
      ctx.fillStyle = PALETTE[item.type]
      ctx.fillRect(-half, -half, size, size)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.fillRect(half - stripW, -half + 2, stripW - 1, size - 4)
      ctx.restore()
    }
  }

  private drawArrow(x: number, y: number, w: number, h: number, dir: Direction, color: string): void {
    const ctx = this.ctx
    const cx = x + w / 2
    const cy = y + h / 2
    const len = Math.min(w, h) * 0.35
    const { dx, dy } = DIRS[dir]

    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = 2

    const x1 = cx - dx * len * 0.5
    const y1 = cy - dy * len * 0.5
    const x2 = cx + dx * len * 0.5
    const y2 = cy + dy * len * 0.5

    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()

    const headSize = len * 0.3
    const backX = x2 - dx * headSize
    const backY = y2 - dy * headSize

    ctx.beginPath()
    ctx.moveTo(x2, y2)
    ctx.lineTo(backX - dy * headSize, backY + dx * headSize)
    ctx.lineTo(backX + dy * headSize, backY - dx * headSize)
    ctx.closePath()
    ctx.fill()

    ctx.lineWidth = 1
  }

  private drawBeltLane(b: BuildingInstance): void {
    const ctx = this.ctx
    const px = b.x * TILE_SIZE
    const py = b.y * TILE_SIZE
    const inputDir = b.belt?.item ? b.belt.item.inputDir : this.grid.detectInputDir(b)
    const outDir = b.direction
    const entry = this.getEdgeCenter(px, py, TILE_SIZE, inputDir)
    const exit = this.getEdgeCenter(px, py, TILE_SIZE, outDir)
    const color = PALETTE[b.kind].accent

    ctx.strokeStyle = color
    ctx.lineWidth = TILE_SIZE * 0.2

    if (isPerpendicular(inputDir, outDir)) {
      const { cx, cy, r, startAngle, endAngle, diff } = this.getArcParams(px, py, TILE_SIZE, inputDir, outDir, entry, exit)
      ctx.beginPath()
      ctx.arc(cx, cy, r, startAngle, endAngle, diff < 0)
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.moveTo(entry.x, entry.y)
      ctx.lineTo(exit.x, exit.y)
      ctx.stroke()
    }

    ctx.lineWidth = 1
    this.drawArrowHead(exit.x, exit.y, outDir, TILE_SIZE * 0.15, color)
  }

  private getEdgeCenter(px: number, py: number, ts: number, dir: Direction): { x: number; y: number } {
    switch (dir) {
      case 'N': return { x: px + ts / 2, y: py }
      case 'E': return { x: px + ts, y: py + ts / 2 }
      case 'S': return { x: px + ts / 2, y: py + ts }
      case 'W': return { x: px, y: py + ts / 2 }
    }
  }

  private getArcParams(
    px: number, py: number, ts: number,
    inDir: Direction, outDir: Direction,
    entry: { x: number; y: number }, exit: { x: number; y: number }
  ): { cx: number; cy: number; r: number; startAngle: number; endAngle: number; diff: number } {
    const cx = px + (inDir === 'E' || outDir === 'E' ? ts : 0)
    const cy = py + (inDir === 'S' || outDir === 'S' ? ts : 0)
    const r = ts / 2
    const startAngle = Math.atan2(entry.y - cy, entry.x - cx)
    let diff = Math.atan2(exit.y - cy, exit.x - cx) - startAngle
    if (diff > Math.PI) diff -= 2 * Math.PI
    if (diff < -Math.PI) diff += 2 * Math.PI
    const endAngle = startAngle + diff
    return { cx, cy, r, startAngle, endAngle, diff }
  }

  private drawArrowHead(cx: number, cy: number, dir: Direction, size: number, color: string): void {
    const ctx = this.ctx
    const { dx, dy } = DIRS[dir]
    const backX = cx - dx * size
    const backY = cy - dy * size

    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(backX - dy * size, backY + dx * size)
    ctx.lineTo(backX + dy * size, backY - dx * size)
    ctx.closePath()
    ctx.fill()
  }
}
