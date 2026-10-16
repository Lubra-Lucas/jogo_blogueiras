import { useMemo } from 'react'
import { BoxGeometry, CanvasTexture, CircleGeometry, CylinderGeometry, Matrix4, PlaneGeometry, Quaternion, RepeatWrapping, SphereGeometry, SRGBColorSpace, Vector3, type BufferGeometry } from 'three'
import { CITY } from './layout'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { merge, paint, ribbon } from './geo'

/** Junta geometrias mantendo uv (merge() so guarda position/normal/color). */
const mergeUV = (l: BufferGeometry[]) => mergeGeometries(l, false)
import { BEDS, LAGO, PRAC_JARDIM, BRIDGE } from './romantic'

/** Chao do Parque do Lago e da pracinha do Jardim: gramado em listras, trilhas de ladrilho pastel, canteiros de flores-bolha, piso da pracinha. */

const canvas = (w: number, h: number) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function lawnTexture(): CanvasTexture {
  const S = 1024
  const c = canvas(S, (S * 2) / 3)
  const g = c.getContext('2d')!
  const px = S / 96 // px por metro (96 x 64 m)
  g.fillStyle = '#8fc16c'
  g.fillRect(0, 0, c.width, c.height)
  // faixas de corte alternadas, bem suaves
  for (let i = 0; i < 16; i++) {
    g.fillStyle = i % 2 ? 'rgba(255,255,255,0.10)' : 'rgba(110,170,80,0.16)'
    g.fillRect(i * 6 * px, 0, 6 * px, c.height)
  }
  // manchas macias de sage e menta
  let s = 7
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < 46; i++) {
    const x = rnd() * c.width
    const y = rnd() * c.height
    const r = (3 + rnd() * 6) * px
    const gr = g.createRadialGradient(x, y, 0, x, y, r)
    const sage = rnd() < 0.5
    gr.addColorStop(0, sage ? 'rgba(160,214,180,0.35)' : 'rgba(225,255,240,0.45)')
    gr.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = gr
    g.fillRect(x - r, y - r, r * 2, r * 2)
  }
  // halo claro em volta do lago
  const lx = (LAGO.cx + 48) * px
  const ly = (LAGO.cz - 62) * px
  const hg = g.createRadialGradient(lx, ly, LAGO.r * px, lx, ly, (LAGO.r + 9) * px)
  hg.addColorStop(0, 'rgba(255,248,236,0.55)')
  hg.addColorStop(1, 'rgba(255,248,236,0)')
  g.fillStyle = hg
  g.fillRect(0, 0, c.width, c.height)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  return t
}

function pavingTexture(): CanvasTexture {
  const S = 256
  const c = canvas(S, S)
  const g = c.getContext('2d')!
  g.fillStyle = '#d9d2c0'
  g.fillRect(0, 0, S, S)
  const cols = ['#cfc6b2', '#c4cab4', '#d6cdb6', '#bfbfb8']
  const n = 4
  const w = S / n
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      g.fillStyle = cols[(i + j * 2 + (j % 2)) % 4]
      const x = i * w + 4
      const y = j * w + 4
      const r = 14
      g.beginPath()
      g.moveTo(x + r, y)
      g.arcTo(x + w - 8, y, x + w - 8, y + w - 8, r)
      g.arcTo(x + w - 8, y + w - 8, x, y + w - 8, r)
      g.arcTo(x, y + w - 8, x, y, r)
      g.arcTo(x, y, x + w - 8, y, r)
      g.closePath()
      g.fill()
    }
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.wrapS = t.wrapT = RepeatWrapping
  t.anisotropy = 8
  return t
}

function plazaTexture(): CanvasTexture {
  const S = 1024
  const R = PRAC_JARDIM.r
  const px = S / (R * 2)
  const c = canvas(S, S)
  const g = c.getContext('2d')!
  const C = S / 2
  g.fillStyle = '#dcd5c6'
  g.fillRect(0, 0, S, S)
  const sector = (r0: number, r1: number, a0: number, a1: number, col: string) => {
    g.beginPath()
    g.arc(C, C, r1 * px, a0, a1)
    g.arc(C, C, r0 * px, a1, a0, true)
    g.closePath()
    g.fillStyle = col
    g.fill()
  }
  const fan = ['#d9cdb8', '#cdd6c0', '#d2d2cc', '#e0d6bc']
  for (const [r0, r1, n] of [[3.9, 5.6, 16], [5.8, 7.4, 24], [7.6, 8.5, 32]] as const) {
    for (let i = 0; i < n; i++) sector(r0, r1, ((i + 0.02) / n) * Math.PI * 2, ((i + 0.98) / n) * Math.PI * 2, fan[(i + (r0 > 5 ? 1 : 0)) % 4])
  }
  sector(0, 3.7, 0, Math.PI * 2, '#d8d0bf')
  for (let i = 0; i < 12; i++) sector(2.4, 3.5, ((i + 0.04) / 12) * Math.PI * 2, ((i + 0.96) / 12) * Math.PI * 2, i % 2 ? '#e6dfd0' : '#cfc6b0')
  for (const [r, col, w] of [[3.8, '#c9a15a', 0.18], [5.7, '#fff', 0.12], [7.5, '#fff', 0.12], [8.62, '#c9a15a', 0.22]] as const) {
    g.beginPath()
    g.arc(C, C, r * px, 0, Math.PI * 2)
    g.lineWidth = w * px
    g.strokeStyle = col
    g.stroke()
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  return t
}

const FLOWER_SETS = [
  ['#d9503f', '#e8705a', '#f2a58f'], // coral
  ['#f2c230', '#f7d85a', '#fbe99a'], // limao
  ['#8f6fc4', '#b49be0', '#f2eef8'], // lilas
]

/**
 * Canteiros: meio-fio de pedra em blocos (com juntas), terra, moita de folhas irregulares (varios lobos) e flores com caule:
 * miolo alto de margaridas + corola de tulipas baixas, em coral / limao / lilas (so um pouco de rosa).
 */
export function bedsGeometry(): BufferGeometry {
  const list: BufferGeometry[] = []
  const M = new Matrix4()
  const q = new Quaternion()
  const up = new Vector3(0, 1, 0)
  let seed = 11
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (const b of BEDS) {
    M.compose(new Vector3(b.x, 0, b.z), q.setFromAxisAngle(up, b.rot), new Vector3(1, 1, 1))
    const add = (g: BufferGeometry, color: string) => {
      paint(g, color)
      g.applyMatrix4(M)
      list.push(g)
    }
    // meio-fio: 20 blocos de pedra ao longo da elipse (2.0 x 1.05)
    const NB = 20
    for (let i = 0; i < NB; i++) {
      const a = ((i + 0.5) / NB) * Math.PI * 2
      const blk = new BoxGeometry(0.5, 0.2, 0.2)
      blk.rotateY(Math.atan2(-1.05 * Math.cos(a), -2.0 * Math.sin(a)))
      blk.translate(Math.cos(a) * 2.0, 0.1, Math.sin(a) * 1.05)
      add(blk, i % 3 === 0 ? '#c6bda8' : '#d6cfbd')
    }
    const soil = new CylinderGeometry(1, 1, 0.08, 20)
    soil.scale(1.95, 1, 1.0)
    soil.translate(0, 0.09, 0)
    add(soil, '#5a4330')
    // moita: lobos de folhas achatados e irregulares
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + rnd()
      const lobe = new SphereGeometry(0.46 + rnd() * 0.12, 8, 5)
      lobe.scale(1.25, 0.55, 1)
      lobe.translate(Math.cos(a) * 1.05, 0.28, Math.sin(a) * 0.5)
      add(lobe, ['#4f8f45', '#5f9a4f', '#46843f'][i % 3])
    }
    const core = new SphereGeometry(0.7, 9, 5)
    core.scale(1.5, 0.6, 0.85)
    core.translate(0, 0.32, 0)
    add(core, '#548f48')
    // flores: caule + corola (disco) + miolo; as altas no centro, as baixas na borda
    const set = FLOWER_SETS[b.hue % 3]
    for (let i = 0; i < 15; i++) {
      const a = (i / 15) * Math.PI * 2 + b.hue
      const tall = i < 5
      const rr = tall ? 0.28 : 0.78
      const fx = Math.cos(a) * rr * 1.7
      const fz = Math.sin(a) * rr * 0.82
      const h = tall ? 0.62 : 0.36
      const stem = new CylinderGeometry(0.014, 0.018, h, 4)
      stem.translate(fx, 0.34 + h / 2, fz)
      add(stem, '#3f7a3a')
      const bloom = new CylinderGeometry(tall ? 0.15 : 0.12, 0.05, 0.06, 7)
      bloom.rotateX((rnd() - 0.5) * 0.5)
      bloom.translate(fx, 0.36 + h, fz)
      add(bloom, set[i % 3])
      const eye = new SphereGeometry(0.045, 6, 4)
      eye.translate(fx, 0.4 + h, fz)
      add(eye, tall ? '#f2c230' : '#fff3d0')
    }
  }
  return merge(list)
}

export function ParqueDeco({ shadows }: { shadows: boolean }) {
  const d = useMemo(() => {
    const paths = CITY.roads.filter((r) => r.kind === 'path')
    const bridgePath = { points: [[BRIDGE.x, 66], [BRIDGE.x, BRIDGE.z0 + 0.6]] as [number, number][], width: 4 }
    const all = [...paths.map((p) => ({ points: p.points, width: p.width })), bridgePath]
    return {
      lawn: lawnTexture(),
      pave: pavingTexture(),
      plaza: plazaTexture(),
      tiles: mergeUV(all.map((p, i) => ribbon(p.points, p.width, i === all.length - 1 ? 0.0412 : 0.04, 2))),
      edge: merge([...all.map((p) => paint(ribbon(p.points, p.width + 0.9, 0.032), '#bfb59c')), ...all.map((p) => paint(ribbon(p.points, p.width + 0.55, 0.036), '#e2dccb'))]),
      lawnGeo: new PlaneGeometry(96, 64).rotateX(-Math.PI / 2),
      plazaGeo: new CircleGeometry(PRAC_JARDIM.r, 96).rotateX(-Math.PI / 2),
    }
  }, [])
  const walk = { walkable: true }
  return (
    <group>
      <mesh geometry={d.lawnGeo} position={[0, 0.014, 94]} receiveShadow={shadows}>
        <meshPhysicalMaterial map={d.lawn} roughness={0.5} clearcoat={0.25} clearcoatRoughness={0.4} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
      </mesh>
      <mesh geometry={d.edge} receiveShadow={shadows} userData={walk}>
        <meshPhysicalMaterial vertexColors roughness={0.3} clearcoat={0.8} clearcoatRoughness={0.2} polygonOffset polygonOffsetFactor={-5} polygonOffsetUnits={-5} />
      </mesh>
      <mesh geometry={d.tiles} receiveShadow={shadows} userData={walk}>
        <meshPhysicalMaterial map={d.pave} roughness={0.32} clearcoat={0.8} clearcoatRoughness={0.2} polygonOffset polygonOffsetFactor={-7} polygonOffsetUnits={-7} />
      </mesh>
      <mesh geometry={d.plazaGeo} position={[PRAC_JARDIM.x, 0.058, PRAC_JARDIM.z]} receiveShadow={shadows} userData={walk} renderOrder={6}>
        <meshPhysicalMaterial map={d.plaza} roughness={0.4} clearcoat={0.7} clearcoatRoughness={0.25} polygonOffset polygonOffsetFactor={-8} polygonOffsetUnits={-8} />
      </mesh>
    </group>
  )
}
