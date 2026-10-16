import { Suspense, useEffect } from 'react'
import { triggerPrompt } from './actions'
import { useFrame, useThree } from '@react-three/fiber'
import { usePlayerStore } from '../../state/playerStore'
import { useSitStore } from '../sit/sitStore'
import { EXTRA_SEATS } from '../sit/seats'
import { useMinigameStore } from '../minigames/minigameStore'
import { useShopStore } from '../../ui/shop/shopStore'
import { driveBridge } from '../vehicles/driveStore'
import { navBridge } from '../navigation/navStore'
import { RoomView } from './Room'
import { startAmbience, stopAmbience } from './ambience'
import { interiorBridge } from './interiorBridge'
import { canInteract, exitRoom, useInteriorStore, type PromptState } from './interiorStore'
import { ROOMS_BY_ID } from './rooms'

/**
 * Dentro do Physics. Quando ha uma sala ativa: monta a sala (separada da cidade), registra assentos, ambiente sonoro,
 * ilumina (sem sol/ceu), detecta pontos de uso e trata a tecla E. Fora de uma sala nao renderiza nada.
 */
export function InteriorHost() {
  const roomId = useInteriorStore((s) => s.roomId)
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  const room = interiorBridge.room
  const layout = roomId ? ROOMS_BY_ID[roomId] : null

  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__gl = gl
  }, [gl])

  // assentos + audio
  useEffect(() => {
    if (!room || !layout) return
    EXTRA_SEATS.length = 0
    EXTRA_SEATS.push(...room.seats)
    startAmbience(layout.ambient)
    return () => {
      EXTRA_SEATS.length = 0
      stopAmbience()
    }
  }, [room, layout])

  // tecla E: usa o ponto de uso (depois do SitController, que tem prioridade quando o assento esta mais perto)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyE' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      if (!interiorBridge.active) return
      const t = e.target
      if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      if (useMinigameStore.getState().active || driveBridge.active) return
      if (triggerPrompt()) {
        e.stopImmediatePropagation()
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  let acc = 0
  useFrame((_, dt) => {
    if (!interiorBridge.active || !layout) return
    // luz do interior: sem sol/ceu/clima
    scene.environmentIntensity = layout.envIntensity ?? 0.5
    gl.toneMappingExposure = layout.exposure ?? 1
    // teletransporte externo (viagem rapida do celular): sai sem fade
    const p = usePlayerStore.getState().position
    if (!room) return
    if (Math.abs(p.x - room.ox) > room.layout.w + 20 && !navBridge.teleport && !useInteriorStore.getState().loading) {
      void exitRoom(true)
      return
    }
    acc += dt
    if (acc < 0.1) return
    acc = 0
    let best: PromptState | null = null
    if (!useSitStore.getState().seat && !useMinigameStore.getState().active && !useShopStore.getState().open && canInteract()) {
      let bd = Infinity
      for (const s of room.spots) {
        const d2 = (s.x - p.x) ** 2 + (s.z - p.z) ** 2
        // conversar com NPC nunca encobre um ponto de uso (minijogo, loja...) ao alcance: so entra na disputa com penalidade
        const rank = d2 + (s.action === 'talk' ? 100 : 0)
        if (d2 < s.radius * s.radius && rank < bd) {
          bd = rank
          best = { key: s.key, label: s.label, spot: s, d2 }
        }
      }
    }
    const cur = useInteriorStore.getState().prompt
    if (cur?.key !== best?.key) useInteriorStore.setState({ prompt: best })
    else if (best && cur) cur.d2 = best.d2
  })

  if (!room || !layout) return null
  return (
    <Suspense fallback={null}>
      <RoomView r={room} />
    </Suspense>
  )
}
