import { GameCanvas } from './components/GameCanvas.tsx'

function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh' }}>
      <div style={{ height: '48px', background: '#111', color: '#fff', display: 'flex', alignItems: 'center', padding: '0 12px' }}>
        <span>BuildBar placeholder</span>
      </div>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <GameCanvas />
      </div>
    </div>
  )
}

export default App
