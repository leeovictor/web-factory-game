import { GameCanvas } from './components/GameCanvas.tsx'
import { BuildBar } from './components/BuildBar.tsx'

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <BuildBar />
      <GameCanvas />
    </div>
  )
}

export default App
