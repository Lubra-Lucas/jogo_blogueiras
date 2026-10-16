import { useMemo } from 'react'
import { BufferGeometry, Color, Float32BufferAttribute } from 'three'
import { MARKS, ZEBRAS } from './streetProps'
import { registerWet } from '../environment/registry'
import { MeshStandardMaterial } from 'three'

/** Tinta de rua: faixas de pedestres (zebra) nos cruzamentos e linhas centrais (amarela dupla nas avenidas, branca tracejada nas ruas). Uma malha so. */
const MAT = new MeshStandardMaterial({ vertexColors: true, roughness: 0.65, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
registerWet(MAT, { roughWet: 0.2, ccWet: 0, dark: 0.05 })

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
  return <mesh geometry={geo} material={MAT} receiveShadow userData={{ walkable: true }} />
}
