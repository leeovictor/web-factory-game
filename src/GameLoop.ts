import { eventBus } from './eventBus.ts'

interface Stats {
  entityCount: number
  itemCount: number
}

export class GameLoop {
  private running = false
  private rafId = 0
  private acc = 0
  private last = 0
  private readonly STEP = 1 / 60
  private frameCount = 0
  private fpsLastTime = 0
  private tickMsSum = 0
  private tickSamples = 0

  private tick: (dt: number) => void
  private render: (alpha: number) => void
  private getStats: (() => Stats) | null

  constructor(tick: (dt: number) => void, render: (alpha: number) => void, getStats?: () => Stats) {
    this.tick = tick
    this.render = render
    this.getStats = getStats ?? null
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.last = performance.now()
    this.acc = 0
    this.fpsLastTime = performance.now()
    this.frameCount = 0
    this.rafId = requestAnimationFrame((now) => this.frame(now))
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.rafId)
  }

  private frame(now: number): void {
    if (!this.running) return
    let dt = (now - this.last) / 1000
    this.last = now
    if (dt > 0.25) dt = 0.25
    this.acc += dt

    while (this.acc >= this.STEP) {
      const t0 = performance.now()
      this.tick(this.STEP)
      const t1 = performance.now()
      this.tickMsSum += t1 - t0
      this.tickSamples++
      this.acc -= this.STEP
    }

    this.render(this.acc / this.STEP)
    this.rafId = requestAnimationFrame((t) => this.frame(t))

    this.frameCount++
    const fpsElapsed = now - this.fpsLastTime
    if (fpsElapsed >= 1000) {
      const fps = Math.round((this.frameCount * 1000) / fpsElapsed)
      eventBus.emit('fps', fps)
      if (this.getStats && this.tickSamples > 0) {
        const stats = this.getStats()
        eventBus.emit('debug-info', {
          tickMs: Math.round((this.tickMsSum / this.tickSamples) * 100) / 100,
          entityCount: stats.entityCount,
          itemCount: stats.itemCount,
        })
      }
      this.tickMsSum = 0
      this.tickSamples = 0
      this.frameCount = 0
      this.fpsLastTime = now
    }
  }
}
