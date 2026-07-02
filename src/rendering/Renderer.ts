import { Camera } from '../input/Camera.ts'
import { GameMap } from '../game/map/GameMap.ts'
import type { Building, Direction } from '../types.ts'
import { Grid } from '../game/core/Grid.ts'
import type { BuildingInstance } from '../game/entities/Building.ts'
import { DIRS, isPerpendicular, opposite } from '../game/core/Direction.ts'
import { PALETTE } from './Palette.ts'
import {
  TILE_SIZE,
  BG_COLOR,
  ORE_COLOR,
  FLOOR_COLOR,
  GRID_COLOR,
  CURSOR_COLOR,
  ITEM_SIZE,
  MINER_INTERVAL,
} from '../constants.ts'

interface GhostInfo {
  kind: Building['kind']
  x: number
  y: number
  direction: Direction
  valid: boolean
  inputDir?: Direction
}

interface RejectInfo {
  reason: string | null
  active: boolean
}

interface InserterPreview {
  from: { x: number; y: number }
  to: { x: number; y: number }
  valid: boolean
}

export class Renderer {
  private ctx: CanvasRenderingContext2D
  private camera: Camera
  private map: GameMap
  private grid: Grid
  private cursor: { x: number; y: number } | null = null
  private getGhost: () => GhostInfo | null
  private getRejectInfo: () => RejectInfo
  private getInserterPreview: () => InserterPreview | null
  private getActiveKind: () => string | null = () => null
  private debugMode = false

  constructor(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    map: GameMap,
    grid: Grid,
    getGhost: () => GhostInfo | null,
    getRejectInfo: () => RejectInfo,
    getInserterPreview: () => InserterPreview | null,
    getActiveKind?: () => string | null
  ) {
    this.ctx = ctx
    this.camera = camera
    this.map = map
    this.grid = grid
    this.getGhost = getGhost
    this.getRejectInfo = getRejectInfo
    this.getInserterPreview = getInserterPreview
    if (getActiveKind) this.getActiveKind = getActiveKind
  }

  setDebugMode(v: boolean): void {
    this.debugMode = v
  }

  getDebugMode(): boolean {
    return this.debugMode
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

        if (this.getActiveKind() !== null) {
          ctx.strokeStyle = GRID_COLOR
          ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE)
        }
      }
    }

    this.drawBuildings()
    this.drawItems(alpha)

    const ghost = this.getGhost()
    if (ghost) {
      this.drawGhost(ghost)
    }

    const preview = this.getInserterPreview()
    if (preview) {
      this.drawInserterPreview(preview)
    }

    const reject = this.getRejectInfo()
    if (reject.active && reject.reason && this.cursor) {
      this.drawTooltip(this.cursor.x * TILE_SIZE, this.cursor.y * TILE_SIZE, reject.reason)
    }

    if (this.cursor) {
      const cx = this.cursor.x * TILE_SIZE
      const cy = this.cursor.y * TILE_SIZE
      ctx.strokeStyle = CURSOR_COLOR
      ctx.lineWidth = 2
      ctx.strokeRect(cx + 1, cy + 1, TILE_SIZE - 2, TILE_SIZE - 2)
      ctx.lineWidth = 1
    }

    if (this.debugMode) {
      this.drawDebugOverlay()
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

    // Belts draw their own body in drawBeltLane; skip the rect background
    if (b.kind !== 'belt') {
      ctx.fillStyle = palette.fill
      ctx.strokeStyle = palette.stroke
      ctx.lineWidth = 2
      ctx.fillRect(x, y, w, h)
      ctx.strokeRect(x, y, w, h)
      ctx.lineWidth = 1
    }

    if (b.kind === 'belt') {
      this.drawBeltLane(b)
    } else if (b.kind === 'inserter') {
      this.drawArrow(x, y, w, h, opposite(b.direction), palette.accent)
    } else if (b.kind === 'miner') {
      this.drawArrow(x, y, w, h, b.direction, palette.accent)
    }

    if (b.kind === 'miner') {
      this.drawMinerState(b)
    } else if (b.kind === 'furnace') {
      this.drawFurnaceState(b)
    } else if (b.kind === 'inserter') {
      this.drawInserterArm(b)
      this.drawInserterMarkers(b)
    } else if (b.kind === 'storage') {
      this.drawStorageState(b)
    }
  }

  private drawGhost(g: GhostInfo): void {
    const ctx = this.ctx
    const kind = g.kind
    const w = (kind === 'furnace' || kind === 'storage' ? 2 : 1) * TILE_SIZE
    const h = w
    let x = g.x * TILE_SIZE
    let y = g.y * TILE_SIZE

    const reject = this.getRejectInfo()
    if (!g.valid && reject.active) {
      const shake = 2
      x += (Math.random() - 0.5) * shake * 2
      y += (Math.random() - 0.5) * shake * 2
      ctx.globalAlpha = 0.6 + Math.sin(performance.now() / 25) * 0.2
    }

    ctx.globalAlpha = 1

    if (kind === 'belt' && g.inputDir !== undefined) {
      const inputDir = g.inputDir!
      const px = x
      const py = y
      const entry = this.getEdgeCenter(px, py, TILE_SIZE, inputDir)
      const exit = this.getEdgeCenter(px, py, TILE_SIZE, g.direction)
      const bodyW = TILE_SIZE * 0.75
      const halfW = bodyW / 2
      const ghostColor = g.valid ? PALETTE.ghostValid : PALETTE.ghostInvalid

      if (isPerpendicular(inputDir, g.direction)) {
        const { cx, cy, r, startAngle, endAngle, diff } = this.getArcParams(px, py, TILE_SIZE, inputDir, g.direction, entry, exit)

        // Curved body
        const outerR = r + halfW
        const innerR = r - halfW
        ctx.beginPath()
        ctx.arc(cx, cy, outerR, startAngle, endAngle, diff < 0)
        ctx.arc(cx, cy, innerR, endAngle, startAngle, diff >= 0)
        ctx.closePath()
        ctx.fillStyle = ghostColor
        ctx.fill()

        // Only arcs (parallel walls)
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(cx, cy, outerR, startAngle, endAngle, diff < 0)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(cx, cy, innerR, startAngle, endAngle, diff < 0)
        ctx.stroke()

        // Lane
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'
        ctx.lineWidth = TILE_SIZE * 0.18
        ctx.beginPath()
        ctx.arc(cx, cy, r, startAngle, endAngle, diff < 0)
        ctx.stroke()
      } else {
        // Straight body
        const alongX = g.direction === 'E' || g.direction === 'W'
        const midX = x + TILE_SIZE / 2
        const midY = y + TILE_SIZE / 2

        ctx.fillStyle = ghostColor
        if (alongX) {
          ctx.fillRect(x, midY - halfW, TILE_SIZE, bodyW)
        } else {
          ctx.fillRect(midX - halfW, y, bodyW, TILE_SIZE)
        }

        // Only parallel walls
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        if (alongX) {
          ctx.moveTo(x, midY - halfW)
          ctx.lineTo(x + TILE_SIZE, midY - halfW)
          ctx.moveTo(x, midY + halfW)
          ctx.lineTo(x + TILE_SIZE, midY + halfW)
        } else {
          ctx.moveTo(midX - halfW, y)
          ctx.lineTo(midX - halfW, y + TILE_SIZE)
          ctx.moveTo(midX + halfW, y)
          ctx.lineTo(midX + halfW, y + TILE_SIZE)
        }
        ctx.stroke()

        // Lane
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'
        ctx.lineWidth = TILE_SIZE * 0.18
        ctx.beginPath()
        ctx.moveTo(entry.x, entry.y)
        ctx.lineTo(exit.x, exit.y)
        ctx.stroke()
      }

      ctx.lineWidth = 1
      this.drawArrowHead(exit.x, exit.y, g.direction, TILE_SIZE * 0.15, 'rgba(255,255,255,0.8)')
    } else {
      ctx.fillStyle = g.valid ? PALETTE.ghostValid : PALETTE.ghostInvalid
      ctx.fillRect(x, y, w, h)
      this.drawArrow(x, y, w, h, g.direction, PALETTE.arrow)
    }
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
      const inDir = this.grid.detectInputDir(b)
      if (isPerpendicular(inDir, b.direction)) {
        const entry = this.getEdgeCenter(px, py, TILE_SIZE, inDir)
        const exit = this.getEdgeCenter(px, py, TILE_SIZE, b.direction)
        const { cx, cy, r, startAngle, diff } = this.getArcParams(px, py, TILE_SIZE, inDir, b.direction, entry, exit)
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
    const len = Math.min(w, h) * 0.45
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

    const headSize = len * 0.35
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
    const inputDir = this.grid.detectInputDir(b)
    const outDir = b.direction
    const entry = this.getEdgeCenter(px, py, TILE_SIZE, inputDir)
    const exit = this.getEdgeCenter(px, py, TILE_SIZE, outDir)
    const palette = PALETTE[b.kind]

    const bodyW = TILE_SIZE * 0.75
    const halfW = bodyW / 2

    if (isPerpendicular(inputDir, outDir)) {
      const { cx, cy, r, startAngle, endAngle, diff } = this.getArcParams(px, py, TILE_SIZE, inputDir, outDir, entry, exit)

      // Belt body — filled arc track
      const outerR = r + halfW
      const innerR = r - halfW
      ctx.beginPath()
      ctx.arc(cx, cy, outerR, startAngle, endAngle, diff < 0)
      ctx.arc(cx, cy, innerR, endAngle, startAngle, diff >= 0)
      ctx.closePath()
      ctx.fillStyle = palette.fill
      ctx.fill()

      // Only arcs (parallel walls) — no connector at entry/exit
      ctx.strokeStyle = palette.stroke
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(cx, cy, outerR, startAngle, endAngle, diff < 0)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(cx, cy, innerR, startAngle, endAngle, diff < 0)
      ctx.stroke()

      // Lane (center line)
      ctx.strokeStyle = palette.accent
      ctx.lineWidth = TILE_SIZE * 0.18
      ctx.beginPath()
      ctx.arc(cx, cy, r, startAngle, endAngle, diff < 0)
      ctx.stroke()
    } else {
      // Straight belt: belt track the same width as curved
      const alongX = outDir === 'E' || outDir === 'W'
      const midX = px + TILE_SIZE / 2
      const midY = py + TILE_SIZE / 2

      // Body fill
      ctx.fillStyle = palette.fill
      if (alongX) {
        ctx.fillRect(px, midY - halfW, TILE_SIZE, bodyW)
      } else {
        ctx.fillRect(midX - halfW, py, bodyW, TILE_SIZE)
      }

      // Only parallel walls (top/bottom for horizontal, left/right for vertical)
      ctx.strokeStyle = palette.stroke
      ctx.lineWidth = 1.5
      ctx.beginPath()
      if (alongX) {
        ctx.moveTo(px, midY - halfW)
        ctx.lineTo(px + TILE_SIZE, midY - halfW)
        ctx.moveTo(px, midY + halfW)
        ctx.lineTo(px + TILE_SIZE, midY + halfW)
      } else {
        ctx.moveTo(midX - halfW, py)
        ctx.lineTo(midX - halfW, py + TILE_SIZE)
        ctx.moveTo(midX + halfW, py)
        ctx.lineTo(midX + halfW, py + TILE_SIZE)
      }
      ctx.stroke()

      // Lane
      ctx.strokeStyle = palette.accent
      ctx.lineWidth = TILE_SIZE * 0.18
      ctx.beginPath()
      ctx.moveTo(entry.x, entry.y)
      ctx.lineTo(exit.x, exit.y)
      ctx.stroke()
    }

    ctx.lineWidth = 1
    this.drawArrowHead(exit.x, exit.y, outDir, TILE_SIZE * 0.15, palette.accent)
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

  private drawMinerState(b: BuildingInstance): void {
    const px = b.x * TILE_SIZE
    const py = b.y * TILE_SIZE
    const state = b.miner!
    if (state.internal !== null) {
      this.drawItemRect(px + TILE_SIZE / 2, py + TILE_SIZE / 2, state.internal.type)
    }
    const pct = state.internal === null ? Math.max(0, Math.min(1, 1 - state.cooldown / MINER_INTERVAL)) : 1
    this.drawProgressBar(px, py, pct, PALETTE.miner.accent)
  }

  private drawFurnaceState(b: BuildingInstance): void {
    const ctx = this.ctx
    const x = b.x * TILE_SIZE
    const y = b.y * TILE_SIZE
    const w = b.width * TILE_SIZE
    const h = b.height * TILE_SIZE
    const state = b.furnace!
    if (state.input !== null) {
      this.drawItemRect(x + TILE_SIZE * 0.25, y + TILE_SIZE * 0.25, state.input.type)
    }
    if (state.output !== null) {
      this.drawItemRect(x + w - TILE_SIZE * 0.75, y + h - TILE_SIZE * 0.75, state.output.type)
    }
    if (state.processing !== null) {
      ctx.fillStyle = 'rgba(255, 200, 0, 0.2)'
      ctx.fillRect(x, y, w, h)
    }
  }

  private drawInserterArm(b: BuildingInstance): void {
    const ctx = this.ctx
    const px = b.x * TILE_SIZE
    const py = b.y * TILE_SIZE
    const cx = px + TILE_SIZE / 2
    const cy = py + TILE_SIZE / 2
    const s = b.inserter!
    const angleFront = this.angleForDirection(b.direction)
    const angleBack = angleFront + Math.PI
    let angle: number
    switch (s.mode) {
      case 'waiting_for_cargo':
        angle = angleFront
        break
      case 'transporting':
        angle = angleFront + (angleBack - angleFront) * s.phase
        break
      case 'returning':
        angle = angleBack + (angleFront - angleBack) * s.phase
        break
      case 'product_overflow':
        angle = angleBack
        break
    }
    const armLen = TILE_SIZE * 0.75
    const tipX = cx + Math.cos(angle) * armLen
    const tipY = cy + Math.sin(angle) * armLen
    ctx.strokeStyle = PALETTE.inserter.accent
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(tipX, tipY)
    ctx.stroke()
    ctx.lineWidth = 1
    if (s.holding !== null) {
      this.drawItemRect(tipX, tipY, s.holding.type)
    }
  }

  private angleForDirection(d: Direction): number {
    switch (d) {
      case 'E': return 0
      case 'S': return Math.PI / 2
      case 'W': return Math.PI
      case 'N': return -Math.PI / 2
    }
  }

  private drawItemRect(x: number, y: number, type: 'iron_ore' | 'iron_bar'): void {
    const ctx = this.ctx
    const size = ITEM_SIZE * TILE_SIZE * 0.6
    const half = size / 2
    ctx.fillStyle = PALETTE[type]
    ctx.fillRect(x - half, y - half, size, size)
  }

  private drawProgressBar(px: number, py: number, pct: number, color: string): void {
    const ctx = this.ctx
    const barW = TILE_SIZE - 8
    const barH = 4
    ctx.fillStyle = '#333333'
    ctx.fillRect(px + 4, py + 2, barW, barH)
    ctx.fillStyle = color
    ctx.fillRect(px + 4, py + 2, barW * pct, barH)
  }

  private drawStorageState(b: BuildingInstance): void {
    const ctx = this.ctx
    const x = b.x * TILE_SIZE
    const y = b.y * TILE_SIZE
    const w = b.width * TILE_SIZE
    const h = b.height * TILE_SIZE
    const state = b.storage!
    const total = state.counts.iron_ore + state.counts.iron_bar
    if (total === 0) return
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(x + 2, y + h - 14, w - 4, 12)
    ctx.fillStyle = '#ffffff'
    ctx.font = '10px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${total}`, x + w / 2, y + h - 8)
  }

  private drawTooltip(tx: number, ty: number, text: string): void {
    const ctx = this.ctx
    ctx.font = '11px system-ui, sans-serif'
    const pad = 4
    const m = ctx.measureText(text)
    const w = m.width + pad * 2
    const h = 16
    const x = tx + TILE_SIZE / 2 - w / 2
    const y = ty + TILE_SIZE + 4
    ctx.fillStyle = 'rgba(0,0,0,0.8)'
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1
    ctx.strokeRect(x, y, w, h)
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, x + w / 2, y + h / 2)
  }

  private drawInserterMarkers(b: BuildingInstance): void {
    const ctx = this.ctx
    const px = b.x * TILE_SIZE
    const py = b.y * TILE_SIZE
    const { dx, dy } = DIRS[b.direction]
    const frontX = px + TILE_SIZE / 2 + dx * TILE_SIZE * 0.35
    const frontY = py + TILE_SIZE / 2 + dy * TILE_SIZE * 0.35
    const backX = px + TILE_SIZE / 2 - dx * TILE_SIZE * 0.35
    const backY = py + TILE_SIZE / 2 - dy * TILE_SIZE * 0.35
    const sz = TILE_SIZE * 0.15
    ctx.fillStyle = '#e74c3c'
    ctx.fillRect(frontX - sz / 2, frontY - sz / 2, sz, sz)
    ctx.fillStyle = '#2ecc71'
    ctx.fillRect(backX - sz / 2, backY - sz / 2, sz, sz)
  }

  private drawInserterPreview(p: InserterPreview): void {
    const ctx = this.ctx
    const ts = TILE_SIZE
    const fromX = p.from.x * ts
    const fromY = p.from.y * ts
    const toX = p.to.x * ts
    const toY = p.to.y * ts
    ctx.strokeStyle = p.valid ? 'rgba(46,204,113,0.6)' : 'rgba(231,76,60,0.6)'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.strokeRect(fromX + 2, fromY + 2, ts - 4, ts - 4)
    ctx.strokeRect(toX + 2, toY + 2, ts - 4, ts - 4)
    ctx.setLineDash([])
    ctx.lineWidth = 1
  }

  private drawDebugOverlay(): void {
    const ctx = this.ctx
    const height = ctx.canvas.height
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(8, height - 80, 160, 72)
    ctx.fillStyle = '#0f0'
    ctx.font = '12px monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText('DEBUG', 14, height - 74)
    ctx.restore()
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
