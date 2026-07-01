import { Camera } from '../input/Camera.ts'
import { GameMap } from '../game/map/GameMap.ts'
import {
  TILE_SIZE,
  BG_COLOR,
  ORE_COLOR,
  FLOOR_COLOR,
  GRID_COLOR,
  CURSOR_COLOR,
} from '../constants.ts'

export class Renderer {
  private ctx: CanvasRenderingContext2D
  private camera: Camera
  private map: GameMap
  private cursor: { x: number; y: number } | null = null

  constructor(ctx: CanvasRenderingContext2D, camera: Camera, map: GameMap) {
    this.ctx = ctx
    this.camera = camera
    this.map = map
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
}
