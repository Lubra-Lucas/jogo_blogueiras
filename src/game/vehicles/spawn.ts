import { CITY, ROAD_SPEC, type Vec2 } from '../world/city/layout'
import { isFree, hasWorld } from '../navigation/probe'
import { grantOwnedItem, ownsItem } from '../economy/api'
import { usePlayerStore } from '../../state/playerStore'
import { useCameraStore } from '../../state/cameraStore'
import { ownedSlugs, paintOf, useVehicleStore, type CarInst } from './driveStore'

/** Ponto de estacionamento na pista: posicao + yaw ao longo da via. */
export interface Spot {
  x: number
  z: number
  yaw: number
}

interface Cand extends Spot {
  road: string
}

let cands: Cand[] | null = null

function buildCands(): Cand[] {
  const out: Cand[] = []
  for (const r of CITY.roads) {
    if (r.kind === 'path') continue
    const spec = ROAD_SPEC[r.kind]
    const lane = (r.width - spec.sidewalk * 2) / 4 // meio de cada faixa
    const pts = r.points as readonly Vec2[]
    for (let i = 0; i < pts.length - 1; i++) {
      const ax = pts[i][0]
      const az = pts[i][1]
      const bx = pts[i + 1][0]
      const bz = pts[i + 1][1]
      const len = Math.hypot(bx - ax, bz - az)
      if (len < 0.01) continue
      const dx = (bx - ax) / len
      const dz = (bz - az) / len
      const n = Math.max(1, Math.floor(len / 3))
      for (let k = 0; k <= n; k++) {
        const t = (k / n) * len
        const px = ax + dx * t
        const pz = az + dz * t
        for (const s of [-1, 1]) {
          // lado direito de quem anda no sentido da via (mao dupla): lado s, sentido s
          const nx = -dz * s
          const nz = dx * s
          out.push({ x: px + nx * lane, z: pz + nz * lane, yaw: Math.atan2(dx * s, dz * s), road: r.id })
        }
      }
    }
  }
  return out
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

/** Cabe um carro (3 esferas ao longo do eixo) sem bater na geometria fixa? */
function fits(x: number, z: number, yaw: number, halfL: number): boolean {
  const sn = Math.sin(yaw)
  const cs = Math.cos(yaw)
  const o = Math.max(0.9, halfL - 0.8)
  return isFree(x, z, 0.8) && isFree(x + sn * o, z + cs * o, 0.8) && isFree(x - sn * o, z - cs * o, 0.8)
}

/**
 * Melhor lugar livre da pista perto de (tx, tz). `faceYaw` (opcional) escolhe o sentido (a frente do carro mais proxima dele).
 * `avoid` = pontos a manter longe (m).
 */
export function findRoadSpot(tx: number, tz: number, opts: { faceYaw?: number; minDist?: number; from?: Vec2; halfL?: number; avoid?: Array<[number, number]> } = {}): Spot | null {
  if (!cands) cands = buildCands()
  const halfL = opts.halfL ?? 2.2
  const minD = opts.minDist ?? 0
  const from = opts.from
  const sorted = cands
    .filter((c) => !from || Math.hypot(c.x - from[0], c.z - from[1]) >= minD)
    .map((c) => ({ c, d: Math.hypot(c.x - tx, c.z - tz) }))
    .sort((a, b) => a.d - b.d)
  let n = 0
  for (const { c } of sorted) {
    if (opts.avoid?.some((a) => Math.hypot(a[0] - c.x, a[1] - c.z) < 5.5)) continue
    let yaw = c.yaw
    if (opts.faceYaw !== undefined && Math.abs(wrap(yaw - opts.faceYaw)) > Math.PI / 2) yaw = wrap(yaw + Math.PI)
    if (hasWorld() && !fits(c.x, c.z, yaw, halfL)) {
      if (++n > 400) break
      continue
    }
    return { x: c.x, z: c.z, yaw }
  }
  return null
}

let uidN = 0
const newUid = (p: string) => `${p}${++uidN}`

/** Carro da jogadora (garagem): coloca/troca em um ponto da pista perto de `near`. */
export function placeMine(near: [number, number], faceYaw?: number, minDist = 0, from?: Vec2): CarInst | null {
  const st = useVehicleStore.getState()
  if (st.drivingUid) return null
  const owned = ownedSlugs()
  const slug = owned.includes(st.selected) ? st.selected : owned[0]
  const spot = findRoadSpot(near[0], near[1], { faceYaw, minDist, from, halfL: 2.3 })
  if (!spot) return null
  const p = paintOf(slug)
  const inst: CarInst = { uid: newUid('mine'), slug, body: p.body, rim: p.rim, x: spot.x, z: spot.z, yaw: spot.yaw, kind: 'mine' }
  st.setCars([...st.cars.filter((c) => c.kind !== 'mine'), inst])
  return inst
}

/** "Chamar carro": o carro selecionado aparece na pista mais proxima, atras da jogadora. */
export function callCar(): boolean {
  const pl = usePlayerStore.getState().position
  const cam = useCameraStore.getState().yaw
  // atras = lado da camera (a camera fica atras da jogadora)
  const bx = pl.x + Math.sin(cam) * 9
  const bz = pl.z + Math.cos(cam) * 9
  const placed = placeMine([bx, bz], cam + Math.PI, 4.5, [pl.x, pl.z])
  return placed !== null
}

/** Carros de rua estacionados (emprestados) perto do centro; colocados uma vez. */
const STREET: Array<{ slug: string; body: string; at: [number, number] }> = [
  { slug: 'suv', body: '#2c2f36', at: [-30, 28] },
  { slug: 'conversivel', body: '#e9dfc8', at: [32, -30] },
  { slug: 'esportivo', body: '#d9a02a', at: [8, -66] },
  { slug: 'van', body: '#f1ede2', at: [-34, -112] },
]

export function placeStartCars() {
  // carro inicial: concedido uma vez pela API da economia
  if (!ownsItem('car.compacto')) grantOwnedItem('car.compacto')
  const st = useVehicleStore.getState()
  const pl = usePlayerStore.getState().position
  const list: CarInst[] = []
  const avoid: Array<[number, number]> = []
  // carro da jogadora: perto do ponto de nascimento
  const mine = findRoadSpot(pl.x, pl.z + 8, { halfL: 2.3 })
  if (mine) {
    const owned = ownedSlugs()
    const slug = owned.includes(st.selected) ? st.selected : owned[0]
    const p = paintOf(slug)
    list.push({ uid: newUid('mine'), slug, body: p.body, rim: p.rim, x: mine.x, z: mine.z, yaw: mine.yaw, kind: 'mine' })
    avoid.push([mine.x, mine.z])
  }
  for (const s of STREET) {
    const spot = findRoadSpot(s.at[0], s.at[1], { halfL: 2.5, avoid })
    if (!spot) continue
    list.push({ uid: newUid('street'), slug: s.slug, body: s.body, rim: '#d9dde6', x: spot.x, z: spot.z, yaw: spot.yaw, kind: 'street' })
    avoid.push([spot.x, spot.z])
  }
  st.setCars(list)
}
