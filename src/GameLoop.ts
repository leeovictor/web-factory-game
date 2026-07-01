export class GameLoop {
  private running = false
  private rafId = 0
  private acc = 0
  private last = 0
  private readonly STEP = 1 / 60

  private tick: (dt: number) => void
  private render: (alpha: number) => void

  constructor(tick: (dt: number) => void, render: (alpha: number) => void) {
    this.tick = tick
    this.render = render
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.last = performance.now()
    this.acc = 0
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
      this.tick(this.STEP)
      this.acc -= this.STEP
    }

    this.render(this.acc / this.STEP)
    this.rafId = requestAnimationFrame((t) => this.frame(t))
  }
}
