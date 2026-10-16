import { useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { CITY } from '../world/city/layout'
import { usePlayerStore } from '../../state/playerStore'
import { useMinigameStore } from '../minigames/minigameStore'
import { POI_MINIGAMES, interact, useInteractionStore, type NearbyPoi } from './interactionStore'

/** Distancia (m) ate a porta para aparecer o aviso. */
export const INTERACT_RADIUS = 3.5
const DOORS = CITY.pois.filter((p) => p.kind !== 'spawn')

/**
 * Dentro do Canvas (nao renderiza nada): a ~8 Hz acha a porta mais proxima do jogador e publica em
 * `useInteractionStore`; [E] abre o minijogo. Fica quieto enquanto um minijogo esta aberto.
 */
export function InteractionTrigger() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyE' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target
      if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      if (useMinigameStore.getState().active) return
      if (interact()) {
        // [E] tambem gira a camera: nao deixa o teclado do jogo ver esta tecla
        e.stopPropagation()
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      useInteractionStore.setState({ nearby: null })
    }
  }, [])

  let acc = 0
  useFrame((_, dt) => {
    acc += dt
    if (acc < 0.12) return
    acc = 0
    let best: NearbyPoi | null = null
    if (!useMinigameStore.getState().active) {
      const p = usePlayerStore.getState().position
      let bd = INTERACT_RADIUS * INTERACT_RADIUS
      for (const d of DOORS) {
        const dd = (d.x - p.x) ** 2 + (d.z - p.z) ** 2
        if (dd < bd) {
          bd = dd
          best = { id: d.id, name: d.name, minigame: POI_MINIGAMES[d.id] ?? null }
        }
      }
    }
    const cur = useInteractionStore.getState().nearby
    if (cur?.id !== best?.id) useInteractionStore.setState({ nearby: best })
  })
  return null
}
