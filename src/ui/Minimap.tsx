import { useEffect, useRef, useState } from 'react'
import { CITY } from '../game/world/city/layout'
import { usePlayerStore } from '../state/playerStore'
import { drawBig, drawMini } from './mapDraw'

const MINI_RADIUS_M = 85

/** Minimapa redondo (canto superior direito, abaixo do FPS). Toque/clique abre o mapa grande; M tambem. */
export function Minimap() {
  const mini = useRef<HTMLCanvasElement>(null)
  const big = useRef<HTMLCanvasElement>(null)
  const [open, setOpen] = useState(() => new URLSearchParams(window.location.search).get('bigmap') === '1')
  const openRef = useRef(open)
  openRef.current = open

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyM') setOpen((o) => !o)
      else if (e.code === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    let raf = 0
    let last = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (now - last < 50) return
      last = now
      const p = usePlayerStore.getState()
      const m = mini.current
      if (m) {
        const css = m.clientWidth
        const px = Math.round(css * dpr)
        if (m.width !== px) {
          m.width = px
          m.height = px
        }
        const g = m.getContext('2d')
        if (g && px > 0) drawMini(g, px, css, p.position.x, p.position.z, p.yaw, MINI_RADIUS_M)
      }
      const b = big.current
      if (b && openRef.current) {
        const css = b.clientWidth
        const px = Math.round(css * dpr)
        if (b.width !== px) {
          b.width = px
          b.height = px
        }
        const g = b.getContext('2d')
        if (g && px > 0) drawBig(g, px, p.position.x, p.position.z, p.yaw)
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <>
      <button type="button" className="minimap" aria-label="Abrir mapa da cidade" onClick={() => setOpen(true)}>
        <canvas ref={mini} />
      </button>
      {open && (
        <div className="bigmap" onClick={() => setOpen(false)}>
          <div className="bigmap__panel" onClick={(e) => e.stopPropagation()}>
            <div className="bigmap__head">
              <span>Mapa da cidade</span>
              <button type="button" className="bigmap__close" onClick={() => setOpen(false)} aria-label="Fechar mapa">
                ×
              </button>
            </div>
            <canvas ref={big} className="bigmap__canvas" />
            <ul className="bigmap__legend">
              {CITY.pois.map((p) => (
                <li key={p.id}>
                  <i style={{ background: p.color }}>{p.icon}</i>
                  {p.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
