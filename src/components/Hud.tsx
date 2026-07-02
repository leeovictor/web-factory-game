import { useGameEvents } from '../hooks/useGameEvents.ts'
import { eventBus } from '../eventBus.ts'

export function Hud() {
  const { storageByType, storageCount, fps, debugMode, debugInfo } = useGameEvents()

  return (
    <div className="hud">
      <div className="hud-title">Armazenadas</div>
      <div className="hud-row">
        <span className="hud-label">Barra:</span>
        <span className="hud-value">{storageByType.iron_bar}</span>
      </div>
      <div className="hud-row">
        <span className="hud-label">Minério:</span>
        <span className="hud-value">{storageByType.iron_ore}</span>
      </div>
      <div className="hud-row">
        <span className="hud-label">Total:</span>
        <span className="hud-value">{storageCount}</span>
      </div>
      <div className="hud-row">
        <span className="hud-label">FPS:</span>
        <span className="hud-value">{fps}</span>
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
        <button
          onClick={() => eventBus.emit('clear-buildings', undefined)}
          style={{ background: '#822', color: '#fff', border: '1px solid #555', padding: '2px 8px', cursor: 'pointer', fontSize: 11 }}
        >
          Limpar
        </button>
        <button
          onClick={() => eventBus.emit('toggle-debug', undefined)}
          style={{ background: debugMode ? '#262' : '#222', color: '#fff', border: '1px solid #555', padding: '2px 8px', cursor: 'pointer', fontSize: 11 }}
        >
          Debug (F3)
        </button>
      </div>
      {debugMode && (
        <div style={{ marginTop: 6, fontSize: 11, color: '#0f0', fontFamily: 'monospace' }}>
          <div>ent: {debugInfo.entityCount}</div>
          <div>itm: {debugInfo.itemCount}</div>
          <div>tick: {debugInfo.tickMs}ms</div>
        </div>
      )}
    </div>
  )
}
