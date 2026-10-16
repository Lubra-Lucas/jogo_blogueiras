import { useProfileStore, CURRENCY_NAME } from '../../state/profileStore'
import { useEconomyStore } from '../economy/economyStore'
import { useMinigameStore } from '../minigames/minigameStore'
import { clearMoveTarget } from '../input/intent'
import { usePlayerStore } from '../../state/playerStore'
import { useCameraStore } from '../../state/cameraStore'
import { navBridge } from '../navigation/navStore'
import { cancelNavigation } from '../navigation/navigation'
import { invalidateGraph } from '../navigation/pathfinder'
import { getDestination, HOME_ID } from './destinations'
import { persistTravel, useTravelStore } from './travelStore'
import { arrivalOf } from './worlds'

/**
 * Viagem de aviao. Fluxo: comprar passagem (nivel + Brilhos) -> cena da janela do aviao (3-6 s, pulavel; aqui o kit da cidade nova
 * baixa e monta por tras) -> a cidade atual e DESCARREGADA e a nova montada (so uma por vez) -> a jogadora aparece no aeroporto de chegada
 * -> o overlay some. O perfil guarda a cidade atual e as visitadas; a primeira viagem rende a conquista "Primeira viagem".
 */
const params = new URLSearchParams(window.location.search)
/** ?viagem=livre (versao de teste, tambem no site) ou, em desenvolvimento, ?travelunlock=1 / window.__travelUnlock: ignora o nivel minimo */
export const devUnlock = () => params.get('viagem') === 'livre' || (import.meta.env.DEV && (params.get('travelunlock') === '1' || (window as unknown as { __travelUnlock?: boolean }).__travelUnlock === true))

export type TravelCheck = { ok: true } | { ok: false; reason: 'level' | 'coins' | 'busy' | 'same' | 'unknown'; msg: string }

export function checkTravel(destId: string): TravelCheck {
  const t = useTravelStore.getState()
  const d = getDestination(destId)
  if (!d) return { ok: false, reason: 'unknown', msg: 'Destino desconhecido.' }
  if (t.flight) return { ok: false, reason: 'busy', msg: 'Você já está em voo.' }
  if (d.id === t.cityId) return { ok: false, reason: 'same', msg: 'Você já está aqui.' }
  const p = useProfileStore.getState()
  if (p.level < d.minLevel && !devUnlock()) return { ok: false, reason: 'level', msg: `Nível ${d.minLevel} necessário` }
  if (d.price > 0 && p.coins < d.price) return { ok: false, reason: 'coins', msg: `Faltam ${d.price - p.coins} ${CURRENCY_NAME} para a passagem.` }
  return { ok: true }
}

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

export function skipFlight() {
  const f = useTravelStore.getState().flight
  if (f && f.stage === 'flying') useTravelStore.setState({ flight: { ...f, skip: true } })
}

/** compra a passagem e voa; resolve true se a viagem aconteceu */
export async function startTravel(destId: string): Promise<boolean> {
  const chk = checkTravel(destId)
  if (!chk.ok) return false
  const d = getDestination(destId)!
  const from = useTravelStore.getState().cityId
  if (d.price > 0 && !useProfileStore.getState().debit('brilhos', d.price, `Passagem: ${d.name}`)) return false

  useMinigameStore.getState().close()
  cancelNavigation()
  clearMoveTarget()
  const t0 = performance.now()
  useTravelStore.setState({ flight: { from, to: d.id, stage: 'flying', t0, skip: false, seconds: d.flightSeconds }, panel: false })

  // baixa o codigo e os modelos da cidade nova enquanto a cena do aviao roda
  const loading: Promise<unknown>[] = []
  if (d.id !== HOME_ID) {
    loading.push(import('../world/miami/kit').then((m) => m.preloadMiamiKit()))
    loading.push(import('../world/miami/MiamiCity'))
  }

  // 1) cena da janela do aviao: tempo minimo (pulavel, mas nunca menos de 1,4 s)
  for (;;) {
    const f = useTravelStore.getState().flight
    if (!f) return false
    const el = performance.now() - f.t0
    if (el >= f.seconds * 1000 || (f.skip && el >= 1400)) break
    await sleep(80)
  }

  // (o codigo da cidade nova precisa estar carregado: sem ele o chao nao existe e a jogadora cairia)
  await Promise.race([Promise.all(loading), sleep(20000)]).catch(() => undefined)

  // 2) troca de cidade: so uma na cena
  useTravelStore.setState((s) => ({
    cityId: d.id,
    visited: s.visited.includes(d.id) ? s.visited : [...s.visited, d.id],
    ready: { ...s.ready, [d.id]: d.id === HOME_ID },
    flight: s.flight ? { ...s.flight, stage: 'landing' } : s.flight,
  }))
  persistTravel()
  const a = arrivalOf(d.id)
  invalidateGraph()
  navBridge.teleport = { x: a.x, z: a.z, yaw: a.yaw }
  useProfileStore.getState().visit(`cidade:${d.id}`)
  useEconomyStore.getState().checkAchievements()

  // 3) espera a cidade nova montar (todos os modelos) e o jogo estabilizar
  const w0 = performance.now()
  while (!useTravelStore.getState().ready[d.id] && performance.now() - w0 < 12000) await sleep(100)
  await sleep(500)
  invalidateGraph()
  useTravelStore.setState((s) => ({ flight: s.flight ? { ...s.flight, stage: 'fade' } : s.flight }))
  await sleep(850)
  useTravelStore.setState({ flight: null })
  return true
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  const w = window as unknown as Record<string, unknown>
  w.__fly = startTravel
  // depuracao: teleporte e estado do jogador/camera (usado nos testes com Edge headless)
  w.__tdbg = { nav: navBridge, player: usePlayerStore, camera: useCameraStore, tp: (x: number, z: number, yaw: number | null = null) => (navBridge.teleport = { x, z, yaw }) }
}
