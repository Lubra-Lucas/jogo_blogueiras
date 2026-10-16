import { Vector3 } from 'three'
import { clearMoveTarget, intent, setMoveTarget } from '../input/intent'
import { usePlayerStore } from '../../state/playerStore'
import { playEmote } from '../character/animation/emoteStore'
import { resolveDestination, type Destination } from './destinations'
import { findPath, graphStats, pathLength, type Pt } from './pathfinder'
import { hasLineOfSight, hasWorld, isFree } from './probe'
import { navBridge, navStore } from './navStore'

export { navStore } from './navStore'
export type NavResult = 'arrived' | 'cancelled' | 'failed'

const RUN_DIST = 60 // acima disso (restante do caminho) a jogadora corre
const ADVANCE = 0.7 // raio para trocar para o proximo ponto
const ARRIVE = 0.4
const STUCK_WINDOW = 1.3 // s sem progresso minimo => replaneja
const STUCK_MIN = 0.25 // m

interface Session {
  path: Pt[]
  idx: number
  stamp: number
  replanned: boolean
  dest: { id: string | null; name: string | null; x: number; z: number; yaw: number | null }
  forceRun: boolean
  total: number
  resolve: (r: NavResult) => void
  winT: number
  winX: number
  winZ: number
}

let session: Session | null = null
const tmp = new Vector3()

export const isNavigating = () => session !== null

export function cancelNavigation() {
  if (session) finish('cancelled')
}

function remaining(s: Session, px: number, pz: number): number {
  let l = Math.hypot(s.path[s.idx][0] - px, s.path[s.idx][1] - pz)
  for (let i = s.idx; i < s.path.length - 1; i++) l += Math.hypot(s.path[i + 1][0] - s.path[i][0], s.path[i + 1][1] - s.path[i][1])
  return l
}

function applyTarget(s: Session) {
  const p = usePlayerStore.getState().position
  const wp = s.path[s.idx]
  tmp.set(wp[0], 0, wp[1])
  setMoveTarget(tmp, s.forceRun || remaining(s, p.x, p.z) > RUN_DIST)
  s.stamp = intent.targetSetAt
  s.winT = 0
  s.winX = p.x
  s.winZ = p.z
}

function finish(result: NavResult) {
  const s = session
  if (!s) return
  session = null
  if (intent.targetSetAt === s.stamp) clearMoveTarget()
  navStore.setState({ active: false, targetId: null, targetName: null, waypoints: [], progress: result === 'arrived' ? 1 : 0 })
  if (result === 'arrived' && s.dest.yaw !== null) navBridge.faceYaw = s.dest.yaw
  s.resolve(result)
}

function begin(
  dest: Session['dest'],
  path: Pt[],
  forceRun: boolean,
): Promise<NavResult> {
  if (session) finish('cancelled')
  return new Promise<NavResult>((resolve) => {
    const p = usePlayerStore.getState().position
    const s: Session = {
      path,
      idx: 0,
      stamp: -1,
      replanned: false,
      dest,
      forceRun,
      total: pathLength([p.x, p.z], path),
      resolve,
      winT: 0,
      winX: p.x,
      winZ: p.z,
    }
    session = s
    navStore.setState({ active: true, targetId: dest.id, targetName: dest.name, waypoints: path, progress: 0 })
    applyTarget(s)
  })
}

/** Primeiro ponto livre do destino (a frente da porta; cai para pontos mais afastados se estiver bloqueado). */
function pickPoint(d: Destination): Pt {
  for (const [x, z] of [[d.x, d.z], ...d.fallbacks] as Pt[]) if (isFree(x, z, 0.3)) return [x, z]
  return [d.x, d.z]
}

/** Anda ate o destino (porta de loja, bairro, area...). Resolve quando chega, e cancelado ou falha. */
export function navigateTo(poiId: string): Promise<NavResult> {
  const d = resolveDestination(poiId)
  if (!d || !hasWorld()) return Promise.resolve('failed')
  const [gx, gz] = pickPoint(d)
  const p = usePlayerStore.getState().position
  const path = findPath(p.x, p.z, gx, gz)
  if (!path) return Promise.resolve('failed')
  return begin({ id: d.id, name: d.name, x: gx, z: gz, yaw: d.yaw }, path, false)
}

/**
 * Click-to-move com desvio: se a linha reta ate o ponto clicado esta livre devolve false (o chamador usa o
 * alvo reto de sempre); senao calcula um caminho e comeca a segui-lo (true).
 */
export function navigateToPoint(x: number, z: number, run: boolean): boolean {
  if (!hasWorld()) return false
  const p = usePlayerStore.getState().position
  if (hasLineOfSight(p.x, p.z, x, z, 0.45)) return false
  const path = findPath(p.x, p.z, x, z)
  if (!path) return false
  void begin({ id: null, name: null, x, z, yaw: null }, path, run)
  return true
}

/** Chamado todo frame pelo NavigationRunner. */
export function tickNavigation(dt: number) {
  const s = session
  if (!s) return
  const mv = intent.move
  if (mv.x * mv.x + mv.y * mv.y > 1e-4 || intent.targetSetAt !== s.stamp) {
    finish('cancelled') // WASD/joystick ou novo clique
    return
  }
  const pos = usePlayerStore.getState().position
  const wp = s.path[s.idx]
  const d = Math.hypot(wp[0] - pos.x, wp[1] - pos.z)
  const last = s.idx === s.path.length - 1

  s.total = Math.max(s.total, 0.01)
  navStore.setState({ progress: Math.min(0.99, Math.max(0, 1 - remaining(s, pos.x, pos.z) / s.total)) })

  if (last ? d < ARRIVE || (intent.target === null && d < 1.2) : d < ADVANCE) {
    if (last) {
      finish('arrived')
      return
    }
    s.idx++
    applyTarget(s)
    return
  }

  // alvo apagado pelo PlayerController (preso numa parede) ou sem progresso: replaneja uma vez
  s.winT += dt
  const moved = Math.hypot(pos.x - s.winX, pos.z - s.winZ)
  if (intent.target === null || (s.winT > STUCK_WINDOW && moved < STUCK_MIN)) {
    if (s.replanned) {
      finish('failed')
      return
    }
    s.replanned = true
    const path = findPath(pos.x, pos.z, s.dest.x, s.dest.z)
    if (!path) {
      finish('failed')
      return
    }
    s.path = path
    s.idx = 0
    s.total = pathLength([pos.x, pos.z], path)
    navStore.setState({ waypoints: path })
    applyTarget(s)
    return
  }
  if (s.winT > STUCK_WINDOW) {
    s.winT = 0
    s.winX = pos.x
    s.winZ = pos.z
  }
}

// ---------------------------------------------------------------- fast travel

let fadeTimers: number[] = []

/** Teletransporte com fade para branco-perola (~0,55 s) e aceno ao chegar. */
export function fastTravelTo(poiId: string): void {
  const d = resolveDestination(poiId)
  if (!d) return
  cancelNavigation()
  fadeTimers.forEach((t) => window.clearTimeout(t))
  const [x, z] = pickPoint(d)
  navStore.setState({ fade: 1 })
  fadeTimers = [
    window.setTimeout(() => {
      navBridge.teleport = { x, z, yaw: d.yaw }
      clearMoveTarget()
    }, 200),
    window.setTimeout(() => navStore.setState({ fade: 0 }), 330),
    window.setTimeout(() => playEmote('wave', { once: true }), 520),
  ]
}

/** Para depuracao no console (?goto=...): estatisticas do grafo. */
export function navDebug() {
  return graphStats()
}
