import { useEffect, useState } from 'react'
import { usePlayerStore } from '../state/playerStore'
import { useDeviceStore } from '../game/systems/device'
import { AreaInfo } from './AreaInfo'
import { Minimap } from './Minimap'
import { PlayerCard } from './PlayerCard'
import { ChatPanel } from './chat/ChatPanel'
import { GameToast } from './GameToast'

function useFps() {
  const [fps, setFps] = useState(0)
  useEffect(() => {
    let frames = 0
    let last = performance.now()
    let raf = 0
    const loop = (now: number) => {
      frames++
      if (now - last >= 500) {
        setFps(Math.round((frames * 1000) / (now - last)))
        frames = 0
        last = now
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return fps
}

export function Hud() {
  const fps = useFps()
  const hasMoved = usePlayerStore((s) => s.hasMoved)
  const isTouch = useDeviceStore((s) => s.isTouch)
  return (
    <>
      <h1 className="hud-title">Jogo das Blogueiras</h1>
      <div className="hud-fps">{fps} FPS</div>
      <PlayerCard />
      <Minimap />
      <ChatPanel />
      <GameToast />
      <AreaInfo />
      <p className={`hud-hint${isTouch ? ' hud-hint--touch' : ''}${hasMoved ? ' hud-hint--hidden' : ''}`}>
        {isTouch
          ? 'Joystick para andar (empurre até o fim para correr) · Arraste para girar a câmera · Pinça para zoom · Toque no chão para ir até lá'
          : 'WASD para andar · Shift para correr · Clique no chão para ir até lá · Arraste para girar a câmera · Roda do mouse para zoom'}
      </p>
    </>
  )
}
