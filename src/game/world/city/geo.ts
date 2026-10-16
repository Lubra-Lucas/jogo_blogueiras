import {
  BufferGeometry,
  CircleGeometry,
  Color,
  Float32BufferAttribute,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Shape, Vec2 } from './layout'

const UP = new Vector3(0, 1, 0)

/** Faixa (fita) ao longo de uma polilinha, com juncao suavizada. Normais para cima (winding CCW visto de cima). */
export function ribbon(points: readonly Vec2[], width: number, y: number, uvTile?: number): BufferGeometry {
  const uv: number[] = []
  let run = 0
  const n = points.length
  const pos: number[] = []
  const idx: number[] = []
  const hw = width / 2
  for (let i = 0; i < n; i++) {
    const a = points[Math.max(0, i - 1)]
    const b = points[Math.min(n - 1, i + 1)]
    let tx = b[0] - a[0]
    let tz = b[1] - a[1]
    const l = Math.hypot(tx, tz) || 1
    tx /= l
    tz /= l
    const nx = -tz
    const nz = tx
    // alongamento da quina (limitado)
    let k = 1
    if (i > 0 && i < n - 1) {
      const p = points[i - 1]
      const q = points[i + 1]
      const s0x = points[i][0] - p[0]
      const s0z = points[i][1] - p[1]
      const s1x = q[0] - points[i][0]
      const s1z = q[1] - points[i][1]
      const l0 = Math.hypot(s0x, s0z) || 1
      const l1 = Math.hypot(s1x, s1z) || 1
      const dot = (s0x * s1x + s0z * s1z) / (l0 * l1)
      k = 1 / Math.max(0.6, Math.sqrt((1 + dot) / 2))
    }
    const x = points[i][0]
    const z = points[i][1]
    pos.push(x - nx * hw * k, y, z - nz * hw * k, x + nx * hw * k, y, z + nz * hw * k)
    if (uvTile) {
      if (i > 0) run += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
      uv.push(0, run / uvTile, width / uvTile, run / uvTile)
    }
  }
  for (let i = 0; i < n - 1; i++) {
    const l0 = i * 2
    const r0 = l0 + 1
    const l1 = l0 + 2
    const r1 = l0 + 3
    idx.push(l0, r0, l1, r0, r1, l1)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  if (uvTile) g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.computeVertexNormals()
  return g
}

/** Disco/retangulo horizontal para uma Shape, no nivel y. */
export function flatShape(s: Shape, y: number, segs = 64): BufferGeometry {
  if (s.t === 'circle') {
    const g = new CircleGeometry(s.r, segs)
    g.rotateX(-Math.PI / 2)
    g.translate(s.cx, y, s.cz)
    return g
  }
  const g = new PlaneGeometry(s.x1 - s.x0, s.z1 - s.z0)
  g.rotateX(-Math.PI / 2)
  g.translate((s.x0 + s.x1) / 2, y, (s.z0 + s.z1) / 2)
  return g
}

export function paint(g: BufferGeometry, color: string | Color): BufferGeometry {
  const c = typeof color === 'string' ? new Color(color) : color
  const n = g.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r
    arr[i * 3 + 1] = c.g
    arr[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new Float32BufferAttribute(arr, 3))
  return g
}

/** Junta geometrias (position/normal/color) numa so. */
export function merge(list: BufferGeometry[], keepUv = false): BufferGeometry {
  const clean = list.map((g) => {
    const c = g.index ? g : g.clone()
    for (const name of Object.keys(c.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'color' && !(keepUv && name === 'uv')) c.deleteAttribute(name)
    }
    if (keepUv && !c.attributes.uv) c.setAttribute('uv', new Float32BufferAttribute(new Float32Array(c.attributes.position.count * 2), 2))
    if (!c.index) {
      const count = c.attributes.position.count
      c.setIndex(Array.from({ length: count }, (_, i) => i))
    }
    if (!c.attributes.color) paint(c, '#ffffff')
    return c
  })
  const m = mergeGeometries(clean, false)
  return m
}

const _m = new Matrix4()
const _q = new Quaternion()
const _s = new Vector3(1, 1, 1)
const _p = new Vector3()

/** Matriz T(x, y, z) * Ry(rot). */
export function placement(x: number, y: number, z: number, rot: number): Matrix4 {
  _q.setFromAxisAngle(UP, rot)
  return new Matrix4().compose(_p.set(x, y, z), _q, _s)
}

/** Aplica placement(local) dentro de um grupo ja posicionado. */
export function place(g: BufferGeometry, group: Matrix4, lx: number, ly: number, lz: number): BufferGeometry {
  _m.makeTranslation(lx, ly, lz)
  g.applyMatrix4(new Matrix4().multiplyMatrices(group, _m))
  return g
}
