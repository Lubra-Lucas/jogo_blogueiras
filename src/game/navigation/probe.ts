import type { RapierContext } from '@react-three/rapier'

/**
 * Consultas de visibilidade contra a geometria FIXA do Rapier (predios, props, muro do lago, limites).
 * O mundo e registrado pelo NavigationRunner (dentro de <Physics>).
 */
type World = RapierContext['world']
type RapierNs = RapierContext['rapier']

let world: World | null = null
let rapierNs: RapierNs | null = null
let flags = 0
const balls = new Map<number, InstanceType<RapierNs['Ball']>>()

const Y = 0.85 // altura do centro da esfera (cobre ~0,45..1,25 m: ignora meio-fio, pega bancos/postes)
const ORIGIN = { x: 0, y: Y, z: 0 }
const DIR = { x: 0, y: 0, z: 0 }
const ROT = { x: 0, y: 0, z: 0, w: 1 }

export function registerWorld(w: World, r: RapierNs) {
  world = w
  rapierNs = r
  flags = r.QueryFilterFlags.EXCLUDE_SENSORS | r.QueryFilterFlags.EXCLUDE_DYNAMIC | r.QueryFilterFlags.EXCLUDE_KINEMATIC
  balls.clear()
}
export function unregisterWorld(w: World) {
  if (world === w) world = null
}
export const hasWorld = () => world !== null
export const colliderCount = () => (world ? world.colliders.len() : 0)

function ball(r: number) {
  let b = balls.get(r)
  if (!b && rapierNs) {
    b = new rapierNs.Ball(r)
    balls.set(r, b)
  }
  return b!
}

/** O ponto esta livre de colisores fixos para uma esfera de raio r? */
export function isFree(x: number, z: number, r = 0.42): boolean {
  if (!world) return true
  ORIGIN.x = x
  ORIGIN.z = z
  return world.intersectionWithShape(ORIGIN, ROT, ball(r), flags) === null
}

/** Linha de visao: uma esfera de raio r anda de A ate B sem bater em nada fixo? */
export function hasLineOfSight(ax: number, az: number, bx: number, bz: number, r = 0.42): boolean {
  if (!world) return true
  const dx = bx - ax
  const dz = bz - az
  const len = Math.hypot(dx, dz)
  if (len < 0.01) return true
  ORIGIN.x = ax
  ORIGIN.z = az
  DIR.x = dx / len
  DIR.z = dz / len
  const hit = world.castShape(ORIGIN, ROT, DIR, ball(r), 0, len, false, flags)
  return hit === null
}
