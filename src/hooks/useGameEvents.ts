import { useEffect, useState } from 'react'
import { eventBus } from '../eventBus.ts'
import type { ItemType } from '../types.ts'

interface DebugInfo {
  tickMs: number
  entityCount: number
  itemCount: number
}

export function useGameEvents() {
  const [storageByType, setStorageByType] = useState<Record<ItemType, number>>({
    iron_ore: 0,
    iron_bar: 0,
  })
  const [fps, setFps] = useState(0)
  const [debugMode, setDebugMode] = useState(false)
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({ tickMs: 0, entityCount: 0, itemCount: 0 })

  useEffect(() => {
    const unsub1 = eventBus.on('storage-by-type', (counts: Record<ItemType, number>) =>
      setStorageByType(counts)
    )
    const unsub2 = eventBus.on('fps', (n: number) => setFps(n))
    const unsub3 = eventBus.on('toggle-debug', () => setDebugMode((prev) => !prev))
    const unsub4 = eventBus.on('debug-info', (info: DebugInfo) => setDebugInfo(info))
    return () => {
      unsub1()
      unsub2()
      unsub3()
      unsub4()
    }
  }, [])

  const storageCount = storageByType.iron_ore + storageByType.iron_bar

  return { storageByType, storageCount, fps, debugMode, debugInfo }
}
