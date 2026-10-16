import { CITY, type Shape } from '../city/layout'

/** Tipo de piso embaixo de (x, z): decide poeira x folhinhas nos passos e o som. */
export type Ground = 'stone' | 'grass' | 'water'

const inShape = (s: Shape, x: number, z: number) => (s.t === 'circle' ? Math.hypot(x - s.cx, z - s.cz) <= s.r : x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1)

function distSeg(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax
  const dz = bz - az
  const l2 = dx * dx + dz * dz || 1
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2))
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t))
}

export function groundAt(x: number, z: number): Ground {
  const L = CITY.lake
  if (Math.hypot(x - L.cx, z - L.cz) < L.r - 0.3) return 'water'
  for (const r of CITY.roads) {
    const pts = r.points
    const half = r.width / 2
    for (let i = 0; i < pts.length - 1; i++) {
      if (distSeg(x, z, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) <= half) return 'stone'
    }
  }
  for (const a of CITY.areas) if (a.kind === 'praca' && inShape(a.bounds, x, z)) return 'stone'
  for (const a of CITY.areas) if (a.kind === 'parque' && inShape(a.bounds, x, z)) return 'grass'
  const jd = CITY.districts.find((d) => d.id === 'jardim')
  if (jd && inShape(jd.bounds, x, z)) return 'grass'
  return 'stone'
}

/** 0..1: quanto o ponto esta "no verde" (parque/jardim), para sons de passaros e grilos. */
export function greenAt(x: number, z: number): number {
  let g = 0
  for (const a of CITY.areas) {
    if (a.kind === 'parque' || a.kind === 'lago') {
      const b = a.bounds
      if (b.t === 'rect') {
        const dx = Math.max(b.x0 - x, 0, x - b.x1)
        const dz = Math.max(b.z0 - z, 0, z - b.z1)
        g = Math.max(g, 1 - Math.min(1, Math.hypot(dx, dz) / 28))
      } else g = Math.max(g, 1 - Math.min(1, Math.max(0, Math.hypot(x - b.cx, z - b.cz) - b.r) / 28))
    }
  }
  const jd = CITY.districts.find((d) => d.id === 'jardim')
  if (jd && jd.bounds.t === 'rect') {
    const b = jd.bounds
    const dx = Math.max(b.x0 - x, 0, x - b.x1)
    const dz = Math.max(b.z0 - z, 0, z - b.z1)
    g = Math.max(g, 1 - Math.min(1, Math.hypot(dx, dz) / 28))
  }
  return g
}
