import { useMemo } from 'react'
import { BufferGeometry, Color, Float32BufferAttribute } from 'three'
import { MARKS, ZEBRAS, asphaltClear, frameAt, half, inLake, inPlaza, roads } from './streetProps'
import { registerWet } from '../environment/registry'
import { MeshStandardMaterial } from 'three'
import { Cull, chunkKey, useCullDist } from './cull'
import { polylineLength } from './layout'
import { addGrain } from './grain'

/** Tinta de rua: faixas de pedestres (zebra) nos cruzamentos e linhas centrais (amarela dupla nas avenidas, branca tracejada nas ruas). Uma malha so. */
const MAT = new MeshStandardMaterial({ vertexColors: true, roughness: 0.65, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
registerWet(MAT, { roughWet: 0.2, ccWet: 0, dark: 0.05 })

/** meio-fio (concreto), grelhas de bueiro e rebaixos de calcada nas travessias; so perto (Cull) */
const CURB_MAT = new MeshStandardMaterial({ vertexColors: true, roughness: 0.78 })
registerWet(CURB_MAT, { roughWet: 0.35, ccWet: 0, dark: 0.12 })
addGrain(CURB_MAT, { bump: 0.05, scale: 3, tone: 0.16, far: 26, channel: 1 })

/** Constroi o mobiliario de chao em celulas: cada celula = uma malha (meio-fio 3D baixo, grelhas, rebaixos coloridos). */
function buildCurbChunks() {
  type B = { pos: number[]; nor: number[]; col: number[]; idx: number[]; cx: number; cz: number; n: number }
  const bins = new Map<number, B>()
  const c = new Color()
  const bin = (x: number, z: number) => {
    const k = chunkKey(x, z)
    let b = bins.get(k)
    if (!b) bins.set(k, (b = { pos: [], nor: [], col: [], idx: [], cx: 0, cz: 0, n: 0 }))
    b.cx += x
    b.cz += z
    b.n++
    return b
  }
  const quad = (b: B, p: number[][], nx: number, ny: number, nz: number, color: string, shade = 1) => {
    const i = b.pos.length / 3
    c.set(color)
    for (const q of p) {
      b.pos.push(q[0], q[1], q[2])
      b.nor.push(nx, ny, nz)
      b.col.push(c.r * shade, c.g * shade, c.b * shade)
    }
    b.idx.push(i, i + 1, i + 2, i, i + 2, i + 3)
  }
  const Y0 = 0.012
  const YT = 0.095
  const zebraCut = (x: number, z: number) => {
    for (const zb of ZEBRAS) {
      const dx = x - zb.x
      const dz = z - zb.z
      const dt = Math.abs(dx * zb.tx + dz * zb.tz)
      const dn = Math.abs(-dx * zb.tz + dz * zb.tx)
      if (dt < 1.15 && Math.abs(dn - zb.w / 2) < 1.0) return true
    }
    return false
  }
  const ok = (x: number, z: number) => asphaltClear(x, z) > -0.04 && !inPlaza(x, z, 0.6) && !inLake(x, z, 0.5) && !zebraCut(x, z)
  for (const r of roads) {
    const H = half(r)
    const L = polylineLength(r.points)
    const step = 2.4
    for (const sg of [-1, 1]) {
      let prev: { x: number; z: number; ex: number; ez: number } | null = null
      let drainAt = 11 + (r.id.length % 5) * 3
      for (let s = 0; s <= L + 1e-6; s += step) {
        const f = frameAt(r.points, Math.min(s, L))
        const nx = -f.tz
        const nz = f.tx
        const ex = f.x + nx * sg * (H + 0.02)
        const ez = f.z + nz * sg * (H + 0.02)
        const good = ok(ex + nx * sg * 0.11, ez + nz * sg * 0.11)
        if (good && prev) {
          const mx = (ex + prev.ex) / 2
          const mz = (ez + prev.ez) / 2
          const b = bin(mx, mz)
          const o = 0.24
          const ax = prev.ex
          const az = prev.ez
          const ox = nx * sg * o
          const oz = nz * sg * o
          // topo
          quad(b, [[ax, YT, az], [ex, YT, ez], [ex + ox, YT, ez + oz], [ax + ox, YT, az + oz]], 0, 1, 0, '#cfcabd')
          // face da pista (mais escura: sombra do meio-fio) e face da calcada
          quad(b, [[ax, Y0, az], [ex, Y0, ez], [ex, YT, ez], [ax, YT, az]], -nx * sg, 0, -nz * sg, '#bdb8ab')
          quad(b, [[ax + ox, YT, az + oz], [ex + ox, YT, ez + oz], [ex + ox, Y0, ez + oz], [ax + ox, Y0, az + oz]], nx * sg, 0, nz * sg, '#d6d1c4')
        }
        prev = good ? { x: f.x, z: f.z, ex, ez } : null
        // grelha de bueiro junto ao meio-fio, a cada ~26 m
        if (good && s > drainAt) {
          drainAt = s + 24 + (Math.floor(s) % 7)
          const gx = f.x + nx * sg * (H - 0.28)
          const gz = f.z + nz * sg * (H - 0.28)
          if (asphaltClear(gx, gz) < -0.2 && !zebraCut(gx, gz)) {
            const b = bin(gx, gz)
            const hl = 0.5
            const hw = 0.2
            const p = (u: number, v: number) => [gx + f.tx * u + nx * v, 0.026, gz + f.tz * u + nz * v]
            quad(b, [p(-hl, -hw), p(hl, -hw), p(hl, hw), p(-hl, hw)], 0, 1, 0, '#2a2c31')
            for (let k = -2; k <= 2; k++) quad(b, [p(k * 0.18 - 0.035, -hw + 0.03), p(k * 0.18 + 0.035, -hw + 0.03), p(k * 0.18 + 0.035, hw - 0.03), p(k * 0.18 - 0.035, hw - 0.03)], 0, 1, 0, '#767a82')
          }
        }
      }
    }
  }
  // rebaixos de calcada (cor de piso tatil) nas duas pontas de cada faixa de pedestres
  for (const zb of ZEBRAS) {
    const nx = -zb.tz
    const nz = zb.tx
    for (const sg of [-1, 1]) {
      const cx = zb.x + nx * sg * (zb.w / 2 + 0.55)
      const cz = zb.z + nz * sg * (zb.w / 2 + 0.55)
      if (inPlaza(cx, cz, 0.3) || inLake(cx, cz)) continue
      const b = bin(cx, cz)
      const p = (u: number, v: number) => [cx + zb.tx * u + nx * v, 0.02, cz + zb.tz * u + nz * v]
      quad(b, [p(-0.85, -0.5), p(0.85, -0.5), p(0.85, 0.5), p(-0.85, 0.5)], 0, 1, 0, '#d9b94e')
      for (let k = -3; k <= 3; k++) quad(b, [p(k * 0.22 - 0.035, -0.45), p(k * 0.22 + 0.035, -0.45), p(k * 0.22 + 0.035, 0.45), p(k * 0.22 - 0.035, 0.45)], 0, 1, 0, '#a98d34')
    }
  }
  return [...bins.values()].map((b) => {
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(b.pos, 3))
    g.setAttribute('normal', new Float32BufferAttribute(b.nor, 3))
    g.setAttribute('color', new Float32BufferAttribute(b.col, 3))
    g.setIndex(b.idx)
    g.computeBoundingSphere()
    return { geo: g, cx: b.cx / b.n, cz: b.cz / b.n, r: g.boundingSphere ? Math.hypot(g.boundingSphere.center.x - b.cx / b.n, g.boundingSphere.center.z - b.cz / b.n) + g.boundingSphere.radius : 40 }
  })
}

export function StreetPaint() {
  const geo = useMemo(() => {
    const pos: number[] = []
    const col: number[] = []
    const idx: number[] = []
    const c = new Color()
    const y = 0.052
    const quad = (ax: number, az: number, bx: number, bz: number, cx: number, cz: number, dx: number, dz: number, color: string) => {
      const i = pos.length / 3
      pos.push(ax, y, az, bx, y, bz, cx, y, cz, dx, y, dz)
      c.set(color)
      for (let k = 0; k < 4; k++) col.push(c.r, c.g, c.b)
      idx.push(i, i + 2, i + 1, i, i + 3, i + 2)
    }
    // faixa de pedestres: barras paralelas a via (comprimento 3 m), espacadas 0.9 m ao longo da travessia
    for (const zb of ZEBRAS) {
      const nx = -zb.tz
      const nz = zb.tx
      const n = Math.floor((zb.w - 0.3) / 0.95)
      for (let i = 0; i < n; i++) {
        const o = (i - (n - 1) / 2) * 0.95
        const cx = zb.x + nx * o
        const cz = zb.z + nz * o
        const hl = 1.5
        const hw = 0.26
        quad(cx - zb.tx * hl - nx * hw, cz - zb.tz * hl - nz * hw, cx + zb.tx * hl - nx * hw, cz + zb.tz * hl - nz * hw, cx + zb.tx * hl + nx * hw, cz + zb.tz * hl + nz * hw, cx - zb.tx * hl + nx * hw, cz - zb.tz * hl + nz * hw, '#f1efe8')
      }
      // linha de retencao
    }
    for (const m of MARKS) {
      const dx = m.x1 - m.x0
      const dz = m.z1 - m.z0
      const l = Math.hypot(dx, dz) || 1
      const nx = (-dz / l) * (m.w / 2)
      const nz = (dx / l) * (m.w / 2)
      quad(m.x0 - nx, m.z0 - nz, m.x1 - nx, m.z1 - nz, m.x1 + nx, m.z1 + nz, m.x0 + nx, m.z0 + nz, m.color)
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(pos, 3))
    g.setAttribute('color', new Float32BufferAttribute(col, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    // normais para cima
    const nrm = g.getAttribute('normal')
    for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0)
    return g
  }, [])
  const dist = useCullDist()
  const curbs = useMemo(buildCurbChunks, [])
  return (
    <>
      <mesh geometry={geo} material={MAT} receiveShadow userData={{ walkable: true }} />
      {curbs.map((c, i) => (
        <Cull key={i} cx={c.cx} cz={c.cz} r={c.r} max={Math.min(75, dist.props)}>
          <mesh geometry={c.geo} material={CURB_MAT} receiveShadow />
        </Cull>
      ))}
    </>
  )
}
