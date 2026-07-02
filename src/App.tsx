import { GameCanvas } from './components/GameCanvas.tsx'
import { BuildBar } from './components/BuildBar.tsx'
import { Hud } from './components/Hud.tsx'

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <BuildBar />
      <Hud />
      <GameCanvas />
    </div>
  )
}

export default App
