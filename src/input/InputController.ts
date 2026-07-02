import { Camera } from './Camera.ts'
import { TILE_SIZE } from '../constants.ts'

export class InputController {
  private canvas: HTMLCanvasElement
  private camera: Camera
  private onHover: (x: number, y: number | null) => void
  private onClick: (x: number, y: number, button: 'left' | 'right') => void
  private onKey: (key: string) => void
  private isPanning = false
  private lastX = 0
  private lastY = 0
  private hoveredTile: { x: number; y: number } | null = null
  private mouseDownPos: { sx: number; sy: number } | null = null
  private mouseDownTile: { x: number; y: number } | null = null
  private mouseDownButton: number | null = null
  private hasDragged = false
  private readonly DRAG_THRESHOLD = 5

  // belt drag-to-build
  private isBeltDragging = false
  private lastPaintedTile: { x: number; y: number } | null = null
  private onDragStart: ((x: number, y: number) => void) | null = null
  private onPaintTile: ((x: number, y: number) => void) | null = null
  private onDragEnd: (() => void) | null = null
  private getActiveKind: () => string | null = () => null

  constructor(
    canvas: HTMLCanvasElement,
    camera: Camera,
    onHover: (x: number, y: number | null) => void,
    onClick: (x: number, y: number, button: 'left' | 'right') => void,
    onKey: (key: string) => void,
    getActiveKind?: () => string | null,
    onDragStart?: (x: number, y: number) => void,
    onPaintTile?: (x: number, y: number) => void,
    onDragEnd?: () => void,
  ) {
    this.canvas = canvas
    this.camera = camera
    this.onHover = onHover
    this.onClick = onClick
    this.onKey = onKey
    if (getActiveKind) this.getActiveKind = getActiveKind
    if (onDragStart) this.onDragStart = onDragStart
    if (onPaintTile) this.onPaintTile = onPaintTile
    if (onDragEnd) this.onDragEnd = onDragEnd

    this.handleMouseMove = this.handleMouseMove.bind(this)
    this.handleMouseDown = this.handleMouseDown.bind(this)
    this.handleMouseUp = this.handleMouseUp.bind(this)
    this.handleWheel = this.handleWheel.bind(this)
    this.handleContextMenu = this.handleContextMenu.bind(this)
    this.handleKeyDown = this.handleKeyDown.bind(this)

    canvas.addEventListener('mousemove', this.handleMouseMove)
    canvas.addEventListener('mousedown', this.handleMouseDown)
    canvas.addEventListener('mouseup', this.handleMouseUp)
    canvas.addEventListener('wheel', this.handleWheel, { passive: false })
    canvas.addEventListener('contextmenu', this.handleContextMenu)
    window.addEventListener('keydown', this.handleKeyDown)
  }

  destroy(): void {
    this.canvas.removeEventListener('mousemove', this.handleMouseMove)
    this.canvas.removeEventListener('mousedown', this.handleMouseDown)
    this.canvas.removeEventListener('mouseup', this.handleMouseUp)
    this.canvas.removeEventListener('wheel', this.handleWheel)
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu)
    window.removeEventListener('keydown', this.handleKeyDown)
  }

  getHoveredTile(): { x: number; y: number } | null {
    return this.hoveredTile
  }

  private getScreenPos(e: MouseEvent): { sx: number; sy: number } {
    const rect = this.canvas.getBoundingClientRect()
    return {
      sx: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      sy: (e.clientY - rect.top) * (this.canvas.height / rect.height),
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const { sx, sy } = this.getScreenPos(e)

    if (this.isPanning) {
      const dx = sx - this.lastX
      const dy = sy - this.lastY
      this.camera.pan(dx, dy)
    } else if (this.mouseDownPos && this.mouseDownButton !== null) {
      const dist = Math.hypot(sx - this.mouseDownPos.sx, sy - this.mouseDownPos.sy)
      if (dist > this.DRAG_THRESHOLD) {
        this.hasDragged = true
        if (this.mouseDownButton === 1 || (this.mouseDownButton === 0 && e.altKey)) {
          this.isPanning = true
          const dx = sx - this.lastX
          const dy = sy - this.lastY
          this.camera.pan(dx, dy)
        }
      }
    }

    this.lastX = sx
    this.lastY = sy

    const world = this.camera.screenToWorld(sx, sy)
    const tx = Math.floor(world.x / TILE_SIZE)
    const ty = Math.floor(world.y / TILE_SIZE)
    this.hoveredTile = { x: tx, y: ty }
    this.onHover(tx, ty)

    // Belt drag painting
    if (this.isBeltDragging && !this.isPanning && this.hasDragged && this.onPaintTile) {
      if (this.lastPaintedTile &&
          (this.lastPaintedTile.x !== tx || this.lastPaintedTile.y !== ty)) {
        this.lastPaintedTile = { x: tx, y: ty }
        this.onPaintTile(tx, ty)
      }
    }
  }

  private handleMouseDown(e: MouseEvent): void {
    const { sx, sy } = this.getScreenPos(e)
    this.mouseDownPos = { sx, sy }
    this.mouseDownTile = this.hoveredTile ? { ...this.hoveredTile } : null
    this.mouseDownButton = e.button
    this.hasDragged = false

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      this.isPanning = true
    }

    // Start belt drag
    if (e.button === 0 && !e.altKey && this.getActiveKind() === 'belt' && this.hoveredTile) {
      this.isBeltDragging = true
      this.lastPaintedTile = { ...this.hoveredTile }
      if (this.onDragStart) {
        this.onDragStart(this.hoveredTile.x, this.hoveredTile.y)
      }
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    // Belt drag: suppress onClick only if actually dragged
    if (this.isBeltDragging) {
      if (!this.hasDragged && this.mouseDownTile && this.mouseDownButton === e.button) {
        if (e.button === 0 || e.button === 2) {
          this.onClick(this.mouseDownTile.x, this.mouseDownTile.y, e.button === 0 ? 'left' : 'right')
        }
      }
      this.isBeltDragging = false
      this.lastPaintedTile = null
      if (this.onDragEnd) this.onDragEnd()
    } else if (!this.hasDragged && this.mouseDownTile && this.mouseDownButton === e.button) {
      if (e.button === 0 || e.button === 2) {
        this.onClick(this.mouseDownTile.x, this.mouseDownTile.y, e.button === 0 ? 'left' : 'right')
      }
    }

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      this.isPanning = false
    }

    if (this.mouseDownButton === e.button) {
      this.mouseDownPos = null
      this.mouseDownTile = null
      this.mouseDownButton = null
      this.hasDragged = false
    }
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault()
    const { sx, sy } = this.getScreenPos(e)
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    this.camera.zoomBy(factor, sx, sy)
  }

  private handleContextMenu(e: MouseEvent): void {
    e.preventDefault()
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase()
    if (key === 'f3') {
      e.preventDefault()
    }
    this.onKey(key)
  }
}
