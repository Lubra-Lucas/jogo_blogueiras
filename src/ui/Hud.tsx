import { useEffect, useState } from 'react'
import { usePlayerStore } from '../state/playerStore'

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
  return (
    <>
      <h1 className="hud-title">Jogo das Blogueiras</h1>
      <div className="hud-fps">{fps} FPS</div>
      <p className={hasMoved ? 'hud-hint hud-hint--hidden' : 'hud-hint'}>
        WASD para andar · Shift para correr · Clique no chão para ir até lá · Arraste para girar a câmera · Roda do mouse para zoom
      </p>
    </>
  )
}
