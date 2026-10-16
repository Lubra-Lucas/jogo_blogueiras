import { useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Raycaster, Vector2, Vector3 } from 'three'
import { usePlayerStore } from '../../state/playerStore'
import { useCameraStore } from '../../state/cameraStore'
import { cameraIntent, intent, isPointerClaimed, setMoveTarget } from '../input/intent'
import { useInteractionStore } from '../interaction/interactionStore'
import { useMinigameStore } from '../minigames/minigameStore'
import { CITY } from '../world/city/layout'
import { BENCHES, EXTRA_SEATS, KINDS, SEATS, type Seat } from './seats'
import { useInteriorStore } from '../interiors/interiorStore'
import { useSitStore } from './sitStore'
import { driveBridge } from '../vehicles/driveStore'

/** Distancia (m) do assento para aparecer o aviso "Sentar". */
export const SIT_RADIUS = 2.2
const ARRIVE = 1.1 // m do ponto de aproximacao para sentar ao chegar
const PICK_RANGE = 45 // so testa bancos perto da camera
const MAX_MOVE_PX = 6
const MAX_HOLD_MS = 300

/** Cursor "assento" (SVG inline) para o mouse sobre um banco. */
const CURSOR_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'>" +
  "<path d='M5 14c0-3 2-5 5-5h12c3 0 5 2 5 5v5H5z' fill='#ffc2dc' stroke='#a84a7a' stroke-width='1.6' stroke-linejoin='round'/>" +
  "<rect x='3' y='18' width='26' height='6' rx='3' fill='#ff8fbf' stroke='#a84a7a' stroke-width='1.6'/>" +
  "<rect x='7' y='24' width='3' height='5' rx='1' fill='#a84a7a'/><rect x='22' y='24' width='3' height='5' rx='1' fill='#a84a7a'/>" +
  "<path d='M16 11.2c-1.7-1.9-4.3-.4-2.8 1.6L16 15l2.8-2.2c1.5-2-1.1-3.5-2.8-1.6z' fill='#fff'/></svg>"
export const SEAT_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(CURSOR_SVG)}") 16 16, pointer`

const POIS = new Map(CITY.pois.map((p) => [p.id, p]))

/** [E] senta no lugar mais proximo. Registrado na captura ANTES do InteractionTrigger (modulo importado primeiro). */
if (typeof window !== 'undefined') {
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.code !== 'KeyE' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target
      if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      if (useMinigameStore.getState().active || driveBridge.active) return
      const st = useSitStore.getState()
      if (st.seat || !st.nearest) return
      st.sitDown(st.nearest)
      e.stopImmediatePropagation() // [E] tambem gira a camera / abre minijogo
      e.preventDefault()
    },
    true,
  )
}

const _o = new Vector3()
const _d = new Vector3()
/** etapa do trajeto ate o assento: 'corner' = contornando o banco por tras (sem pathfinding, a reta bateria no colisor) */
let stage: 'corner' | 'final' | null = null
const _c = new Vector3() // destino atual da etapa 'corner'

/** Manda a personagem para o assento: se estiver atras do banco, contorna pela ponta antes. Senta ao chegar. */
function routeToSeat(seat: Seat, run: boolean) {
  const p = usePlayerStore.getState().position
  if (seat.simple) {
    // assento de interior (game/interiors): vai direto ao ponto de aproximacao livre
    _o.set(seat.ax, 0, seat.az)
    stage = 'final'
    _c.copy(_o)
    setMoveTarget(_o, run)
    useSitStore.setState({ pending: seat, pendingStamp: intent.targetSetAt })
    return
  }
  const b = seat.bench
  const k = KINDS[b.kind]
  const dx = p.x - b.x
  const dz = p.z - b.z
  const sn = Math.sin(-b.rot)
  const cs = Math.cos(-b.rot)
  const lx = dx * cs + dz * sn // mundo -> local do banco
  const lz = -dx * sn + dz * cs
  if (lz < k.box[2] / 2 + 0.1 && Math.abs(lx) < k.box[0] / 2 + 0.5) {
    const side = lx < 0 ? -1 : 1
    const cx = side * (k.box[0] / 2 + 1.0)
    const cz = 0.7
    const sn2 = Math.sin(b.rot)
    const cs2 = Math.cos(b.rot)
    _o.set(b.x + cx * cs2 + cz * sn2, 0, b.z - cx * sn2 + cz * cs2)
    stage = 'corner'
  } else {
    _o.set(seat.ax, 0, seat.az)
    stage = 'final'
  }
  _c.copy(_o)
  setMoveTarget(_o, run)
  useSitStore.setState({ pending: seat, pendingStamp: intent.targetSetAt })
}

/** Raio da camera contra as caixas dos bancos (no espaco local de cada banco). Retorna o assento clicado. */
function pickSeat(ray: Raycaster): Seat | null {
  let best: Seat | null = null
  let bt = Infinity
  const ro = ray.ray.origin
  const rd = ray.ray.direction
  // assentos de interiores: esfera de 0,5 m em torno do assento
  for (const s of EXTRA_SEATS) {
    const ox = s.x - ro.x
    const oy = s.y - 0.1 - ro.y
    const oz = s.z - ro.z
    const tca = ox * rd.x + oy * rd.y + oz * rd.z
    if (tca < 0) continue
    const d2 = ox * ox + oy * oy + oz * oz - tca * tca
    if (d2 < 0.3 * 0.3 && tca < bt) {
      bt = tca
      best = s
    }
  }
  for (const b of BENCHES) {
    if (Math.abs(b.x - ro.x) > PICK_RANGE || Math.abs(b.z - ro.z) > PICK_RANGE) continue
    const k = KINDS[b.kind]
    const sn = Math.sin(-b.rot)
    const cs = Math.cos(-b.rot)
    // mundo -> local (yaw -rot)
    const ox = ro.x - b.x
    const oz = ro.z - b.z
    _o.set(ox * cs + oz * sn, ro.y, -ox * sn + oz * cs)
    _d.set(rd.x * cs + rd.z * sn, rd.y, -rd.x * sn + rd.z * cs)
    const hx = k.box[0] / 2
    const hy = k.box[1] / 2
    const hz = k.box[2] / 2 + 0.05
    let t0 = 0
    let t1 = Infinity
    const slab = (o: number, d: number, lo: number, hi: number) => {
      if (Math.abs(d) < 1e-9) return o >= lo && o <= hi
      let a = (lo - o) / d
      let c = (hi - o) / d
      if (a > c) [a, c] = [c, a]
      t0 = Math.max(t0, a)
      t1 = Math.min(t1, c)
      return t0 <= t1
    }
    if (!slab(_o.x, _d.x, -hx, hx) || !slab(_o.y, _d.y, 0, hy * 2) || !slab(_o.z, _d.z, -hz, hz)) continue
    if (t0 < bt) {
      bt = t0
      const lx = _o.x + _d.x * t0
      best = SEATS[b.id * 2 + (lx < 0 ? 0 : 1)]
    }
  }
  return best
}

/**
 * Dentro do Canvas (nao renderiza nada): acha o assento livre mais proximo (aviso), cursor "assento" ao passar o mouse
 * em um banco, clique no banco = andar ate la e sentar ao chegar (tem prioridade sobre o click-to-move do chao).
 */
export function SitController() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    const el = gl.domElement
    const ray = new Raycaster()
    const ndc = new Vector2()
    const pick = (cx: number, cy: number) => {
      const r = el.getBoundingClientRect()
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      return pickSeat(ray)
    }
    let down: { id: number; x: number; y: number; t: number } | null = null
    let hover = false

    const onDown = (e: PointerEvent) => {
      down =
        !driveBridge.active &&
        e.isPrimary && !isPointerClaimed(e.pointerId) && (e.pointerType !== 'mouse' || e.button === 0)
          ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() }
          : null
    }
    const onMove = (e: PointerEvent) => {
      const d = down
      if (d && e.pointerId === d.id && Math.hypot(e.clientX - d.x, e.clientY - d.y) > MAX_MOVE_PX) down = null
      if (e.pointerType !== 'mouse' || e.buttons !== 0) return
      const over = pick(e.clientX, e.clientY) !== null
      if (over !== hover) {
        hover = over
        el.style.cursor = over ? SEAT_CURSOR : ''
      }
    }
    const onUp = (e: PointerEvent) => {
      const d = down
      if (!d || e.pointerId !== d.id) return
      down = null
      if (performance.now() - d.t > MAX_HOLD_MS || Math.hypot(e.clientX - d.x, e.clientY - d.y) > MAX_MOVE_PX) return
      const seat = pick(e.clientX, e.clientY)
      if (!seat) return
      // depois do ClickToMove (que tambem escuta este pointerup e poria um destino no chao): o banco vence
      setTimeout(() => {
        const st = useSitStore.getState()
        if (st.seat === seat) return
        routeToSeat(seat, false)
      }, 0)
    }
    const onCancel = () => {
      down = null
    }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onCancel)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onCancel)
      if (hover) el.style.cursor = ''
    }
  }, [gl, camera])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    // dev/testes: window.__sit.near(n) lista os n assentos mais proximos; go(i) manda ir/sentar (como o clique no banco)
    const near = (n = 5) => {
      const p = usePlayerStore.getState().position
      return SEATS.map((s, i) => ({ i, id: s.id, d: Math.hypot(s.x - p.x, s.z - p.z), x: s.x, z: s.z, kind: s.bench.kind })).sort((a, b) => a.d - b.d).slice(0, n)
    }
    const go = (i: number) => {
      routeToSeat(SEATS[i], true)
    }
    ;(window as unknown as Record<string, unknown>).__sit = { near, go, store: useSitStore, player: usePlayerStore, cam: cameraIntent, camStore: useCameraStore }
  }, [])

  let acc = 0
  useFrame((_, dt) => {
    const st = useSitStore.getState()
    const p = usePlayerStore.getState().position
    // indo ate o banco: senta ao chegar; outro comando de movimento cancela
    if (st.pending && !st.seat) {
      const pd = st.pending
      if (intent.move.x !== 0 || intent.move.y !== 0 || (intent.target && intent.targetSetAt !== st.pendingStamp)) {
        useSitStore.setState({ pending: null })
      } else if (!intent.target) {
        if (stage === 'corner' && Math.hypot(_c.x - p.x, _c.z - p.z) < 1.0) {
          // chegou na ponta do banco: agora a frente (aproximacao)
          _o.set(pd.ax, 0, pd.az)
          setMoveTarget(_o, intent.targetRun)
          useSitStore.setState({ pendingStamp: intent.targetSetAt })
          stage = 'final'
        } else if (stage !== 'corner' && Math.hypot(pd.ax - p.x, pd.az - p.z) < ARRIVE) st.sitDown(pd)
        else useSitStore.setState({ pending: null })
      }
    }

    acc += dt
    if (acc < 0.12) return
    acc = 0
    let best: Seat | null = null
    if (!st.seat && !useMinigameStore.getState().active && !driveBridge.active) {
      let bd = SIT_RADIUS * SIT_RADIUS
      for (const s of SEATS) {
        const dd = (s.x - p.x) ** 2 + (s.z - p.z) ** 2
        if (dd < bd) {
          bd = dd
          best = s
        }
      }
      for (const s of EXTRA_SEATS) {
        const dd = (s.x - p.x) ** 2 + (s.z - p.z) ** 2
        if (dd < bd) {
          bd = dd
          best = s
        }
      }
      // ponto de uso de interior (balcao, porta de saida...) mais perto que o assento: o aviso e dele
      const ip = useInteriorStore.getState().prompt
      if (best && ip && ip.d2 < bd) best = null
      // se uma porta (cafe...) esta mais perto que o assento, o aviso e dela
      const door = useInteractionStore.getState().nearby
      const poi = door && POIS.get(door.id)
      if (best && poi && (poi.x - p.x) ** 2 + (poi.z - p.z) ** 2 < bd) best = null
    }
    if (useSitStore.getState().nearest?.id !== best?.id) useSitStore.setState({ nearest: best })
  })
  return null
}
