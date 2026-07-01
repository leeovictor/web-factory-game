import { MIN_ZOOM, MAX_ZOOM } from '../constants.ts'

export class Camera {
  x = 0
  y = 0
  zoom = 1

  constructor(canvasWidth: number, canvasHeight: number, worldWidth: number, worldHeight: number) {
    this.zoom = Math.min(canvasWidth / worldWidth, canvasHeight / worldHeight)
    this.x = (worldWidth * this.zoom - canvasWidth) / 2
    this.y = (worldHeight * this.zoom - canvasHeight) / 2
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx + this.x) / this.zoom,
      y: (sy + this.y) / this.zoom,
    }
  }

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return {
      x: wx * this.zoom - this.x,
      y: wy * this.zoom - this.y,
    }
  }

  pan(dx: number, dy: number): void {
    this.x -= dx
    this.y -= dy
  }

  zoomBy(factor: number, centerScreenX: number, centerScreenY: number): void {
    const oldZoom = this.zoom
    let newZoom = oldZoom * factor
    if (newZoom < MIN_ZOOM) newZoom = MIN_ZOOM
    if (newZoom > MAX_ZOOM) newZoom = MAX_ZOOM

    const worldX = (centerScreenX + this.x) / oldZoom
    const worldY = (centerScreenY + this.y) / oldZoom

    this.zoom = newZoom
    this.x = worldX * newZoom - centerScreenX
    this.y = worldY * newZoom - centerScreenY
  }
}
