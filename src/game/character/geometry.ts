import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  LatheGeometry,
  Matrix4,
  Quaternion,
  SphereGeometry,
  Vector2,
  Vector3,
  Euler,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/** Gerador pseudo-aleatorio deterministico (mulberry32): mesmo look = mesma malha. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Acumula geometrias (ja transformadas) e junta numa so, sem uv (para poder mesclar tipos diferentes). */
export class Batch {
  private list: BufferGeometry[] = []

  add(g: BufferGeometry, m?: Matrix4): this {
    if (m) g.applyMatrix4(m)
    g.deleteAttribute('uv')
    this.list.push(g)
    return this
  }

  /** Atalho: posicao + rotacao + escala. */
  addAt(
    g: BufferGeometry,
    pos: readonly [number, number, number] = [0, 0, 0],
    rot?: readonly [number, number, number],
    scale?: readonly [number, number, number],
  ): this {
    return this.add(g, makeMatrix(pos, rot, scale))
  }

  get empty() {
    return this.list.length === 0
  }

  build(): BufferGeometry {
    if (this.list.length === 1) return this.list[0]
    const merged = mergeGeometries(this.list, false)
    for (const g of this.list) g.dispose()
    this.list = []
    if (!merged) throw new Error('Batch: atributos incompativeis')
    return merged
  }
}

const _q = new Quaternion()
const _v = new Vector3()
const _s = new Vector3()
const _eu = new Euler()

export function makeMatrix(
  pos: readonly [number, number, number] = [0, 0, 0],
  rot?: readonly [number, number, number],
  scale?: readonly [number, number, number],
): Matrix4 {
  _v.set(pos[0], pos[1], pos[2])
  if (rot) _q.setFromEuler(_eu.set(rot[0], rot[1], rot[2]))
  else _q.identity()
  _s.set(scale?.[0] ?? 1, scale?.[1] ?? 1, scale?.[2] ?? 1)
  return new Matrix4().compose(_v, _q, _s)
}

/** Elipsoide (esfera escalada). */
export function ellipsoid(rx: number, ry: number, rz: number, w = 20, h = 14): BufferGeometry {
  const g = new SphereGeometry(1, w, h)
  g.scale(rx, ry, rz)
  return g
}

/** Revolve um perfil [y, raio] ao redor do eixo Y (do menor para o maior y ou vice-versa). */
export function lathe(profile: ReadonlyArray<readonly [number, number]>, segments = 24): BufferGeometry {
  const pts = profile.map(([y, r]) => new Vector2(Math.max(r, 0), y))
  // LatheGeometry espera pontos de baixo para cima para normais voltadas para fora
  if (pts.length > 1 && pts[0].y > pts[pts.length - 1].y) pts.reverse()
  return new LatheGeometry(pts, segments)
}

/** Interpolacao linear de um perfil [y, r] (y crescente). */
export function profileAt(profile: ReadonlyArray<readonly [number, number]>, y: number): number {
  if (y <= profile[0][0]) return profile[0][1]
  for (let i = 1; i < profile.length; i++) {
    if (y <= profile[i][0]) {
      const [y0, r0] = profile[i - 1]
      const [y1, r1] = profile[i]
      const t = (y - y0) / (y1 - y0)
      // smoothstep para evitar quinas
      const s = t * t * (3 - 2 * t)
      return r0 + (r1 - r0) * s
    }
  }
  return profile[profile.length - 1][1]
}

/** Reamostra um perfil com interpolacao suave em n pontos. */
export function resampleProfile(
  profile: ReadonlyArray<readonly [number, number]>,
  n: number,
): Array<[number, number]> {
  const y0 = profile[0][0]
  const y1 = profile[profile.length - 1][0]
  const out: Array<[number, number]> = []
  for (let i = 0; i < n; i++) {
    const y = y0 + ((y1 - y0) * i) / (n - 1)
    out.push([y, profileAt(profile, y)])
  }
  return out
}

export interface TubeOptions {
  radial?: number
  /** achatamento do eixo N (1 = redondo, 0.4 = fita) */
  flat?: number
  /** direcao de referencia (um por ponto, ou uma para todos) para o eixo N */
  hint?: Vector3 | Vector3[]
  closed?: boolean
  /** cor por ponto (t em 0..1) -> escreve em `out` */
  color?: (t: number, i: number, out: Color) => void
  /** tampa as pontas com um pequeno disco */
  capEnd?: boolean
}

const _t = new Vector3()
const _n = new Vector3()
const _b = new Vector3()
const _c = new Color()

/**
 * Tubo de raio variavel ao longo de uma polilinha (cabelo, cachos, frisos).
 * Quadros por transporte paralelo; normais por computeVertexNormals (sem emenda).
 */
export function taperedTube(
  pts: Vector3[],
  radius: (t: number) => number,
  opts: TubeOptions = {},
): BufferGeometry {
  const n = pts.length
  const radial = opts.radial ?? 6
  const flat = opts.flat ?? 1
  const closed = opts.closed ?? false
  const pos: number[] = []
  const col: number[] = []
  const idx: number[] = []

  const tangents: Vector3[] = []
  for (let i = 0; i < n; i++) {
    const a = pts[closed ? (i - 1 + n) % n : Math.max(i - 1, 0)]
    const b = pts[closed ? (i + 1) % n : Math.min(i + 1, n - 1)]
    tangents.push(new Vector3().subVectors(b, a).normalize())
  }

  const hintAt = (i: number): Vector3 | null =>
    Array.isArray(opts.hint) ? opts.hint[i] : (opts.hint ?? null)

  const prevN = new Vector3()
  for (let i = 0; i < n; i++) {
    _t.copy(tangents[i])
    const h = hintAt(i)
    if (h && (Array.isArray(opts.hint) || i === 0)) {
      _n.copy(h).addScaledVector(_t, -h.dot(_t))
    } else if (i === 0) {
      _n.set(0, 0, 1).addScaledVector(_t, -_t.z)
    } else {
      _n.copy(prevN).addScaledVector(_t, -prevN.dot(_t))
    }
    if (_n.lengthSq() < 1e-8) _n.set(1, 0, 0).addScaledVector(_t, -_t.x)
    _n.normalize()
    prevN.copy(_n)
    _b.crossVectors(_t, _n).normalize()

    const u = i / (n - 1)
    const r = Math.max(radius(u), 1e-4)
    if (opts.color) opts.color(u, i, _c)
    for (let k = 0; k < radial; k++) {
      const ph = (k / radial) * Math.PI * 2
      const c = Math.cos(ph)
      const s = Math.sin(ph)
      pos.push(
        pts[i].x + r * (c * flat * _n.x + s * _b.x),
        pts[i].y + r * (c * flat * _n.y + s * _b.y),
        pts[i].z + r * (c * flat * _n.z + s * _b.z),
      )
      if (opts.color) col.push(_c.r, _c.g, _c.b)
    }
  }
  const rings = closed ? n : n - 1
  for (let i = 0; i < rings; i++) {
    const i2 = (i + 1) % n
    for (let k = 0; k < radial; k++) {
      const k2 = (k + 1) % radial
      const a = i * radial + k
      const b = i2 * radial + k
      const c = i2 * radial + k2
      const d = i * radial + k2
      idx.push(a, d, b, b, d, c)
    }
  }
  if (!closed && opts.capEnd !== false) {
    // tampa final (anel -> ponto)
    const last = (n - 1) * radial
    const centerIdx = pos.length / 3
    pos.push(pts[n - 1].x, pts[n - 1].y, pts[n - 1].z)
    if (opts.color) col.push(col[last * 3], col[last * 3 + 1], col[last * 3 + 2])
    for (let k = 0; k < radial; k++) idx.push(last + k, last + ((k + 1) % radial), centerIdx)
  }

  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  if (opts.color) g.setAttribute('color', new Float32BufferAttribute(col, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** Pinta vertex colors em uma geometria a partir de uma funcao da posicao. */
export function paintVertexColors(g: BufferGeometry, fn: (p: Vector3, out: Color) => void): void {
  const p = g.getAttribute('position')
  const arr = new Float32Array(p.count * 3)
  const v = new Vector3()
  const c = new Color()
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p as BufferAttribute, i)
    fn(v, c)
    arr[i * 3] = c.r
    arr[i * 3 + 1] = c.g
    arr[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new BufferAttribute(arr, 3))
}

/** Curva de catmull-rom amostrada em n pontos. */
export function sampleSpline(ctrl: Vector3[], n: number, tension = 0.5): Vector3[] {
  const out: Vector3[] = []
  const m = ctrl.length
  const at = (i: number) => ctrl[Math.min(Math.max(i, 0), m - 1)]
  for (let s = 0; s < n; s++) {
    const f = (s / (n - 1)) * (m - 1)
    const i = Math.min(Math.floor(f), m - 2)
    const t = f - i
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)
    const t2 = t * t
    const t3 = t2 * t
    const k = tension
    const r = new Vector3()
    for (const ax of ['x', 'y', 'z'] as const) {
      const m1 = (p2[ax] - p0[ax]) * k
      const m2 = (p3[ax] - p1[ax]) * k
      r[ax] =
        (2 * t3 - 3 * t2 + 1) * p1[ax] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[ax] + (t3 - t2) * m2
    }
    out.push(r)
  }
  return out
}

/** Mistura de duas cores CSS em Color (sem alocar fora do necessario). */
export function mixColor(a: string, b: string, t: number): Color {
  return new Color(a).lerp(new Color(b), t)
}
