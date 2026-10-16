import { useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { CITY } from '../world/city/layout'
import { usePlayerStore } from '../../state/playerStore'
import { driveBridge } from '../vehicles/driveStore'
import { useMinigameStore } from '../minigames/minigameStore'
import { interiorBridge } from '../interiors/interiorBridge'
import { hasInterior } from '../interiors/interiorStore'
import { interact, poiMinigames, poiShops, useInteractionStore, type NearbyPoi } from './interactionStore'

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
      const idx = e.code === 'KeyE' ? 0 : e.code === 'KeyR' ? 1 : e.code === 'KeyT' ? 2 : e.code === 'KeyY' ? 3 : -1
      if (idx < 0 || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target
      if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      if (useMinigameStore.getState().active || driveBridge.active) return
      if (interact(idx)) {
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
    if (!useMinigameStore.getState().active && !driveBridge.active && !interiorBridge.active) {
      const p = usePlayerStore.getState().position
      let bd = INTERACT_RADIUS * INTERACT_RADIUS
      for (const d of DOORS) {
        const dd = (d.x - p.x) ** 2 + (d.z - p.z) ** 2
        if (dd < bd) {
          bd = dd
          best = { id: d.id, name: d.name, minigames: poiMinigames(d.id), shops: poiShops(d.id), interior: hasInterior(d.id) }
        }
      }
    }
    const cur = useInteractionStore.getState().nearby
    if (cur?.id !== best?.id) useInteractionStore.setState({ nearby: best })
  })
  return null
}
