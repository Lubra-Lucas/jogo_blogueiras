import { LIFE } from './lifeQuality'

/**
 * Pool de particulas simples (CPU, SoA pre-alocado, nenhum objeto por quadro). Desenhado por FxLayer em UMA malha instanciada.
 * kinds: 0 = fumaca/poeira (disco macio), 1 = gota (disco nitido), 2 = anel no chao (poeira/respingo), 3 = folha/petala, 4 = bolha de neblina.
 */
export const K_PUFF = 0
export const K_DROP = 1
export const K_RING = 2
export const K_LEAF = 3
export const K_MIST = 4

const N = Math.max(8, LIFE.particles)
export const pool = {
  n: N,
  x: new Float32Array(N), y: new Float32Array(N), z: new Float32Array(N),
  vx: new Float32Array(N), vy: new Float32Array(N), vz: new Float32Array(N),
  age: new Float32Array(N), life: new Float32Array(N),
  s0: new Float32Array(N), s1: new Float32Array(N),
  r: new Float32Array(N), g: new Float32Array(N), b: new Float32Array(N), a: new Float32Array(N),
  kind: new Uint8Array(N), grav: new Float32Array(N), drag: new Float32Array(N),
  rot: new Float32Array(N), rotV: new Float32Array(N),
  alive: new Uint8Array(N),
  cursor: 0,
}

export interface Spawn {
  x: number; y: number; z: number
  vx?: number; vy?: number; vz?: number
  life: number
  s0: number; s1?: number
  /** cor 0xRRGGBB */
  color?: number
  a?: number
  kind?: number
  grav?: number
  drag?: number
  rot?: number
  rotV?: number
}

/** Cria uma particula (reaproveita a mais antiga quando cheio). */
export function spawn(o: Spawn) {
  const p = pool
  let i = p.cursor
  for (let k = 0; k < 16; k++) {
    const j = (p.cursor + k) % p.n
    if (!p.alive[j]) {
      i = j
      break
    }
  }
  p.cursor = (i + 1) % p.n
  p.alive[i] = 1
  p.x[i] = o.x; p.y[i] = o.y; p.z[i] = o.z
  p.vx[i] = o.vx ?? 0; p.vy[i] = o.vy ?? 0; p.vz[i] = o.vz ?? 0
  p.age[i] = 0; p.life[i] = o.life
  p.s0[i] = o.s0; p.s1[i] = o.s1 ?? o.s0
  const c = o.color ?? 0xffffff
  p.r[i] = ((c >> 16) & 255) / 255; p.g[i] = ((c >> 8) & 255) / 255; p.b[i] = (c & 255) / 255
  p.a[i] = o.a ?? 1
  p.kind[i] = o.kind ?? K_PUFF
  p.grav[i] = o.grav ?? 0
  p.drag[i] = o.drag ?? 0
  p.rot[i] = o.rot ?? 0
  p.rotV[i] = o.rotV ?? 0
}

/** Anel que cresce no chao (respingo, poeira de pouso, ondulacao). */
export function ring(x: number, y: number, z: number, size: number, life: number, color: number, a = 0.5) {
  spawn({ x, y, z, life, s0: size * 0.25, s1: size, color, a, kind: K_RING })
}

export function stepPool(dt: number) {
  const p = pool
  for (let i = 0; i < p.n; i++) {
    if (!p.alive[i]) continue
    p.age[i] += dt
    if (p.age[i] >= p.life[i]) {
      p.alive[i] = 0
      continue
    }
    if (p.drag[i] > 0) {
      const k = Math.exp(-p.drag[i] * dt)
      p.vx[i] *= k; p.vy[i] *= k; p.vz[i] *= k
    }
    p.vy[i] -= p.grav[i] * dt
    p.x[i] += p.vx[i] * dt
    p.y[i] += p.vy[i] * dt
    p.z[i] += p.vz[i] * dt
    p.rot[i] += p.rotV[i] * dt
  }
}
