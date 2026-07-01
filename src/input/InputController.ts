import { Camera } from './Camera.ts'
import { TILE_SIZE } from '../constants.ts'

export class InputController {
  private canvas: HTMLCanvasElement
  private camera: Camera
  private onHover: (x: number, y: number | null) => void
  private isPanning = false
  private lastX = 0
  private lastY = 0
  private hoveredTile: { x: number; y: number } | null = null

  constructor(
    canvas: HTMLCanvasElement,
    camera: Camera,
    onHover: (x: number, y: number | null) => void
  ) {
    this.canvas = canvas
    this.camera = camera
    this.onHover = onHover

    this.handleMouseMove = this.handleMouseMove.bind(this)
    this.handleMouseDown = this.handleMouseDown.bind(this)
    this.handleMouseUp = this.handleMouseUp.bind(this)
    this.handleWheel = this.handleWheel.bind(this)

    canvas.addEventListener('mousemove', this.handleMouseMove)
    canvas.addEventListener('mousedown', this.handleMouseDown)
    canvas.addEventListener('mouseup', this.handleMouseUp)
    canvas.addEventListener('wheel', this.handleWheel, { passive: false })
  }

  destroy(): void {
    this.canvas.removeEventListener('mousemove', this.handleMouseMove)
    this.canvas.removeEventListener('mousedown', this.handleMouseDown)
    this.canvas.removeEventListener('mouseup', this.handleMouseUp)
    this.canvas.removeEventListener('wheel', this.handleWheel)
  }

  getHoveredTile(): { x: number; y: number } | null {
    return this.hoveredTile
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect()
    const sx = (e.clientX - rect.left) * (this.canvas.width / rect.width)
    const sy = (e.clientY - rect.top) * (this.canvas.height / rect.height)

    if (this.isPanning) {
      const dx = sx - this.lastX
      const dy = sy - this.lastY
      this.camera.pan(dx, dy)
    }

    this.lastX = sx
    this.lastY = sy

    const world = this.camera.screenToWorld(sx, sy)
    const tx = Math.floor(world.x / TILE_SIZE)
    const ty = Math.floor(world.y / TILE_SIZE)
    this.hoveredTile = { x: tx, y: ty }
    this.onHover(tx, ty)
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      this.isPanning = true
    }
  }

  private handleMouseUp(): void {
    this.isPanning = false
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault()
    const rect = this.canvas.getBoundingClientRect()
    const sx = (e.clientX - rect.left) * (this.canvas.width / rect.width)
    const sy = (e.clientY - rect.top) * (this.canvas.height / rect.height)
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    this.camera.zoomBy(factor, sx, sy)
  }
}
