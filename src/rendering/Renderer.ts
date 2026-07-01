import { Camera } from '../input/Camera.ts'
import { GameMap } from '../game/map/GameMap.ts'
import type { Building, Direction } from '../types.ts'
import { DIRS } from '../game/core/Direction.ts'
import { PALETTE } from './Palette.ts'
import {
  TILE_SIZE,
  BG_COLOR,
  ORE_COLOR,
  FLOOR_COLOR,
  GRID_COLOR,
  CURSOR_COLOR,
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
  private cursor: { x: number; y: number } | null = null
  private getGhost: () => GhostInfo | null

  constructor(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    map: GameMap,
    getGhost: () => GhostInfo | null
  ) {
    this.ctx = ctx
    this.camera = camera
    this.map = map
    this.getGhost = getGhost
  }

  setCursor(x: number | null, y: number | null): void {
    if (x === null || y === null) {
      this.cursor = null
    } else {
      this.cursor = { x, y }
    }
  }

  render(_alpha: number): void {
    void _alpha
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

  private drawBuilding(b: Building): void {
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

    this.drawArrow(x, y, w, h, b.direction, palette.accent)
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
}
