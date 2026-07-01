import { GameMap } from './game/map/GameMap.ts'
import { Camera } from './input/Camera.ts'
import { InputController } from './input/InputController.ts'
import { Renderer } from './rendering/Renderer.ts'
import { GameLoop } from './GameLoop.ts'
import { GRID_W, GRID_H, TILE_SIZE } from './constants.ts'

export class Game {
  private map: GameMap
  private camera: Camera
  private renderer: Renderer
  private input: InputController
  private loop: GameLoop
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!

    const worldW = GRID_W * TILE_SIZE
    const worldH = GRID_H * TILE_SIZE
    this.camera = new Camera(canvas.width, canvas.height, worldW, worldH)

    this.map = new GameMap()

    this.renderer = new Renderer(this.ctx, this.camera, this.map)

    this.input = new InputController(this.canvas, this.camera, (x, y) => {
      this.renderer.setCursor(x, y)
    })

    this.loop = new GameLoop(
      () => {},
      (alpha) => this.renderer.render(alpha)
    )
  }

  start(): void {
    this.loop.start()
  }

  stop(): void {
    this.loop.stop()
    this.input.destroy()
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1
    const rect = this.canvas.getBoundingClientRect()
    this.canvas.width = rect.width * dpr
    this.canvas.height = rect.height * dpr
    this.ctx.scale(dpr, dpr)
  }
}
