import { useEffect, useState } from 'react'
import { eventBus } from '../eventBus.ts'
import type { BuildingKind } from '../types.ts'

const KINDS: BuildingKind[] = ['miner', 'belt', 'furnace', 'storage', 'inserter']

export function BuildBar() {
  const [selected, setSelected] = useState<BuildingKind | null>('belt')

  useEffect(() => {
    const unsub = eventBus.on('select-kind', (kind: BuildingKind | null) => setSelected(kind))
    return () => {
      unsub()
    }
  }, [])

  const select = (kind: BuildingKind | null) => {
    setSelected(kind)
    eventBus.emit('select-kind', kind)
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 8,
        padding: '8px 16px',
        alignItems: 'center',
        background: 'rgba(17,17,17,0.85)',
        color: '#fff',
        borderRadius: 8,
        zIndex: 10,
        pointerEvents: 'auto',
      }}
    >
      <button
        onClick={() => select(null)}
        style={{
          background: selected === null ? '#444' : '#222',
          color: '#fff',
          border: selected === null ? '2px solid #fff' : '1px solid #555',
          padding: '4px 12px',
          cursor: 'pointer',
        }}
      >
        None
      </button>
      {KINDS.map((kind) => (
        <button
          key={kind}
          onClick={() => select(kind)}
          style={{
            background: selected === kind ? '#444' : '#222',
            color: '#fff',
            border: selected === kind ? '2px solid #fff' : '1px solid #555',
            padding: '4px 12px',
            cursor: 'pointer',
            textTransform: 'capitalize',
          }}
        >
          {kind}
        </button>
      ))}
    </div>
  )
}
