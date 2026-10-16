import { useEffect, useState } from 'react'
import { locate } from '../game/world/city/layout'
import { usePlayerStore } from '../state/playerStore'

/** Rotulo persistente da area atual + aviso "Você está em: ..." ao entrar em outra. */
export function AreaInfo() {
  const [name, setName] = useState('')
  const [toast, setToast] = useState<{ key: number; name: string } | null>(null)

  useEffect(() => {
    let raf = 0
    let shown = ''
    let cand = ''
    let candSince = 0
    let key = 0
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const st = usePlayerStore.getState()
      if (!st.body) return // jogador ainda nao nasceu
      const p = st.position
      const n = locate(p.x, p.z).name
      if (n !== cand) {
        cand = n
        candSince = now
      }
      // so muda depois de ficar 350 ms na nova area (evita piscar na fronteira)
      if (cand !== shown && (shown === '' || now - candSince > 350)) {
        shown = cand
        setName(cand)
        setToast({ key: ++key, name: cand })
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <>
      {name && <div className="hud-area">{name}</div>}
      {toast && (
        <div className="area-toast" key={toast.key} role="status" aria-live="polite">
          <span className="area-toast__pre">Você está em</span>
          <span className="area-toast__name">{toast.name}</span>
        </div>
      )}
    </>
  )
}
