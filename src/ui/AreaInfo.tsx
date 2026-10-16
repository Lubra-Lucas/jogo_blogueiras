import { useEffect, useState } from 'react'
import { locate } from '../game/world/city/layout'
import { usePlayerStore } from '../state/playerStore'
import { useProfileStore } from '../state/profileStore'
import { useChatStore } from '../state/chatStore'
import { interiorBridge } from '../game/interiors/interiorBridge'
import { useInteriorStore } from '../game/interiors/interiorStore'

/** Rotulo persistente da area atual + aviso "Você está em: ..." ao entrar em outra. */
export function AreaInfo() {
  const inside = useInteriorStore((s) => s.roomId !== null)
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
      if (interiorBridge.active) return // dentro de um interior a area continua a da porta
      const p = st.position
      const loc = locate(p.x, p.z)
      const n = loc.name
      if (n !== cand) {
        cand = n
        candSince = now
      }
      // so muda depois de ficar 350 ms na nova area (evita piscar na fronteira)
      if (cand !== shown && (shown === '' || now - candSince > 350)) {
        const first = shown === ''
        shown = cand
        setName(cand)
        setToast({ key: ++key, name: cand })
        // progresso: visitar areas conclui missoes; o chat anuncia o lugar
        useProfileStore.getState().visit(loc.id)
        useChatStore.getState().system(first ? `Bem-vinda ao Jogo das Blogueiras! Você está em: ${cand}.` : `Você chegou em: ${cand}.`)
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  if (inside) return null // o nome da sala vem do InteriorUi; sem avisos de areas da cidade
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
