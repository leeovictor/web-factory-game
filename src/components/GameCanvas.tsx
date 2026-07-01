import { useRef, useEffect } from 'react'
import { Game } from '../Game.ts'

export function GameCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current!
    const game = new Game(canvas)
    game.resize()

    const ro = new ResizeObserver(() => {
      game.resize()
    })
    ro.observe(canvas)

    game.start()

    return () => {
      game.stop()
      ro.disconnect()
    }
  }, [])

  return <canvas ref={ref} style={{ display: 'block', width: '100%', height: '100%' }} />
}
