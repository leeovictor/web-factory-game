import { GameMap } from './game/map/GameMap.ts'
import { Grid } from './game/core/Grid.ts'
import { Camera } from './input/Camera.ts'
import { InputController } from './input/InputController.ts'
import { BuildSystem } from './input/BuildSystem.ts'
import { Simulation } from './game/simulation/Simulation.ts'
import { Renderer } from './rendering/Renderer.ts'
import { GameLoop } from './GameLoop.ts'
import { eventBus } from './eventBus.ts'
import { GRID_W, GRID_H, TILE_SIZE } from './constants.ts'
import type { BuildingKind } from './types.ts'

export class Game {
  map: GameMap
  grid: Grid
  camera: Camera
  renderer: Renderer
  input: InputController
  buildSystem: BuildSystem
  sim: Simulation
  loop: GameLoop
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!

    const worldW = GRID_W * TILE_SIZE
    const worldH = GRID_H * TILE_SIZE
    this.camera = new Camera(canvas.width, canvas.height, worldW, worldH)

    this.map = new GameMap()
    this.grid = new Grid(this.map)
    this.sim = new Simulation(this.grid)

    this.buildSystem = new BuildSystem(this.grid, this.map, this.sim)

    this.renderer = new Renderer(this.ctx, this.camera, this.map, this.grid, () => this.buildSystem.getGhost())

    this.input = new InputController(
      this.canvas,
      this.camera,
      (x, y) => {
        this.renderer.setCursor(x, y)
        if (y !== null) {
          this.buildSystem.setHoverTile(x, y)
        } else {
          this.buildSystem.clearHover()
        }
      },
      (x, y, button) => {
        if (button === 'left') {
          this.buildSystem.place(x, y)
        } else {
          this.buildSystem.remove(x, y)
        }
      },
      (key) => {
        if (key === 'r') {
          this.buildSystem.rotateCW()
        } else if (key === 'x') {
          const tile = this.input.getHoveredTile()
          if (tile) this.buildSystem.remove(tile.x, tile.y)
        } else if (key === 'i') {
          const tile = this.input.getHoveredTile()
          if (tile) this.buildSystem.injectItem(tile.x, tile.y)
        } else if (key >= '1' && key <= '5') {
          const kinds: BuildingKind[] = ['miner', 'belt', 'furnace', 'storage', 'inserter']
          const idx = parseInt(key) - 1
          if (idx >= 0 && idx < kinds.length) {
            eventBus.emit('select-kind', kinds[idx])
          }
        } else if (key === 'escape' || key === '0') {
          eventBus.emit('select-kind', null)
        }
      }
    )

    eventBus.on('select-kind', (kind: BuildingKind | null) => {
      this.buildSystem.setCurrent(kind)
    })

    this.loop = new GameLoop(
      () => this.sim.tick(1 / 60),
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
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
}
