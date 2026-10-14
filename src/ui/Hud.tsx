import { useEffect, useState } from 'react'

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
  return (
    <>
      <h1 className="hud-title">Jogo das Blogueiras</h1>
      <div className="hud-fps">{fps} FPS</div>
      <p className="hud-hint">Arraste para olhar ao redor</p>
    </>
  )
}
