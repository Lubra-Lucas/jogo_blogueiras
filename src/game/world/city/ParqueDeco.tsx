import { useMemo } from 'react'
import { CanvasTexture, CircleGeometry, Matrix4, PlaneGeometry, Quaternion, RepeatWrapping, SphereGeometry, SRGBColorSpace, TorusGeometry, Vector3, type BufferGeometry } from 'three'
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
  g.fillStyle = '#a9e3c6'
  g.fillRect(0, 0, c.width, c.height)
  // faixas de corte alternadas, bem suaves
  for (let i = 0; i < 16; i++) {
    g.fillStyle = i % 2 ? 'rgba(255,255,255,0.10)' : 'rgba(150,225,190,0.16)'
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
  g.fillStyle = '#fff6ea'
  g.fillRect(0, 0, S, S)
  const cols = ['#f7b8a6', '#a6dec3', '#ffe09a', '#cdb6f0']
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
  g.fillStyle = '#fff1e8'
  g.fillRect(0, 0, S, S)
  const sector = (r0: number, r1: number, a0: number, a1: number, col: string) => {
    g.beginPath()
    g.arc(C, C, r1 * px, a0, a1)
    g.arc(C, C, r0 * px, a1, a0, true)
    g.closePath()
    g.fillStyle = col
    g.fill()
  }
  const fan = ['#fbd3c4', '#cdeedd', '#e3d7f7', '#fff0c8']
  for (const [r0, r1, n] of [[3.9, 5.6, 16], [5.8, 7.4, 24], [7.6, 8.5, 32]] as const) {
    for (let i = 0; i < n; i++) sector(r0, r1, ((i + 0.02) / n) * Math.PI * 2, ((i + 0.98) / n) * Math.PI * 2, fan[(i + (r0 > 5 ? 1 : 0)) % 4])
  }
  sector(0, 3.7, 0, Math.PI * 2, '#fde3ea')
  for (let i = 0; i < 12; i++) sector(2.4, 3.5, ((i + 0.04) / 12) * Math.PI * 2, ((i + 0.96) / 12) * Math.PI * 2, i % 2 ? '#fff6f0' : '#f9c9d9')
  for (const [r, col, w] of [[3.8, '#e6b84f', 0.18], [5.7, '#fff', 0.12], [7.5, '#fff', 0.12], [8.62, '#e6b84f', 0.22]] as const) {
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
  ['#ff8f7a', '#ffb199', '#ffd0c0'], // coral
  ['#ffe27a', '#fff0a0', '#fff6c4'], // limao
  ['#c9a8f0', '#dcc6fa', '#fffaf6'], // lilas
]

/** Canteiros: moldura de perola + monte de folhas menta + flores-bolha em coral / limao / lilas. */
export function bedsGeometry(): BufferGeometry {
  const list: BufferGeometry[] = []
  const M = new Matrix4()
  const q = new Quaternion()
  const up = new Vector3(0, 1, 0)
  for (const b of BEDS) {
    M.compose(new Vector3(b.x, 0, b.z), q.setFromAxisAngle(up, b.rot), new Vector3(1, 1, 1))
    const add = (g: BufferGeometry, color: string) => {
      paint(g, color)
      g.applyMatrix4(M)
      list.push(g)
    }
    const border = new TorusGeometry(1, 0.1, 6, 22).rotateX(Math.PI / 2)
    border.scale(2.0, 1.4, 1.05)
    border.translate(0, 0.11, 0)
    add(border, '#fff4ec')
    const mound = new SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2)
    mound.scale(1.95, 0.42, 0.98)
    add(mound, '#a6e6bd')
    const set = FLOWER_SETS[b.hue % 3]
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + b.hue
      const rr = i < 4 ? 0.28 : 0.8
      const fx = Math.cos(a) * rr * 1.7
      const fz = Math.sin(a) * rr * 0.82
      const f = new SphereGeometry(0.27 - (i % 3) * 0.03, 8, 5)
      f.translate(fx, 0.46 + (i < 4 ? 0.12 : 0), fz)
      add(f, set[i % 3])
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
      edge: merge([...all.map((p) => paint(ribbon(p.points, p.width + 0.9, 0.032), '#f0cf7a')), ...all.map((p) => paint(ribbon(p.points, p.width + 0.55, 0.036), '#fffaf2'))]),
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
