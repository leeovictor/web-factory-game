import { useEffect, useState } from 'react'
import { eventBus } from '../eventBus.ts'

export function useGameEvents() {
  const [storageCount, setStorageCount] = useState(0)
  const [fps, setFps] = useState(0)

  useEffect(() => {
    const unsub1 = eventBus.on('storage-count', (n: number) => setStorageCount(n))
    const unsub2 = eventBus.on('fps', (n: number) => setFps(n))
    return () => {
      unsub1()
      unsub2()
    }
  }, [])

  return { storageCount, fps }
}
