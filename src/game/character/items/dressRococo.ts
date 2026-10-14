import { BufferGeometry, Float32BufferAttribute, Mesh, Vector3 } from 'three'
import { TORSO_DEPTH, TORSO_PROFILE } from '../body'
import { Batch, lathe, profileAt, taperedTube } from '../geometry'
import { fabricMaterial, goldMaterial } from '../materials'
import { registerItem } from './registry'
import { buildSkirt, SKIRT_DEFAULTS } from './skirtParametric'
import type { BuiltPart, ItemSpec } from './types'

const BODICE_BOTTOM = -0.07 // y local da junta spine
const BODICE_TOP = 0.222
const OFFSET = 0.007

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Altura da borda superior por azimute: decote coracao (pico em cada seio, vale no centro). */
function topY(phi: number): number {
  const aa = Math.abs(Math.atan2(Math.sin(phi), Math.cos(phi)))
  const f = smooth(1.5, 0.9, aa)
  return BODICE_TOP + f * (0.018 - 0.042 * Math.exp(-((aa / 0.3) ** 2)))
}

/** Raio do corpete a altura y (corpo + folga, cintura apertada). */
function bodiceR(y: number): number {
  return profileAt(TORSO_PROFILE, y) + OFFSET - 0.004 * Math.exp(-((y / 0.06) ** 2))
}

/** Ponto na superficie do corpete (azimute 0 = frente). */
function bodicePoint(phi: number, y: number, out = 0.0): Vector3 {
  const r = bodiceR(y) + out
  return new Vector3(r * Math.sin(phi), y, r * Math.cos(phi) * TORSO_DEPTH)
}

function bodiceGeometry(): BufferGeometry {
  const cols = 40
  const rows = 10
  const pos: number[] = []
  const idx: number[] = []
  for (let k = 0; k <= rows; k++) {
    for (let j = 0; j < cols; j++) {
      const phi = (j / cols) * Math.PI * 2
      const y = BODICE_BOTTOM + ((topY(phi) - BODICE_BOTTOM) * k) / rows
      const p = bodicePoint(phi, y)
      pos.push(p.x, p.y, p.z)
    }
  }
  for (let k = 0; k < rows; k++) {
    for (let j = 0; j < cols; j++) {
      const j2 = (j + 1) % cols
      const a = k * cols + j
      const b = k * cols + j2
      const c = (k + 1) * cols + j
      const d = (k + 1) * cols + j2
      idx.push(a, c, b, b, c, d)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function ring(yAt: (phi: number) => number, tube: number, out: number): BufferGeometry {
  const seg = 36
  const pts: Vector3[] = []
  const hints: Vector3[] = []
  for (let j = 0; j < seg; j++) {
    const phi = (j / seg) * Math.PI * 2
    pts.push(bodicePoint(phi, yAt(phi), out))
    hints.push(new Vector3(0, 1, 0))
  }
  return taperedTube(pts, () => tube, { radial: 4, closed: true, hint: hints })
}

function seam(phi: number, y0: number, y1: number, out: number): BufferGeometry {
  const pts: Vector3[] = []
  const n = 10
  for (let i = 0; i < n; i++) pts.push(bodicePoint(phi, y0 + ((y1 - y0) * i) / (n - 1), out))
  return taperedTube(pts, () => 0.0019, { radial: 4, hint: new Vector3(Math.sin(phi), 0, Math.cos(phi)), capEnd: false })
}

function line(a: Vector3, b: Vector3, r: number): BufferGeometry {
  const mid = a.clone().lerp(b, 0.5)
  mid.z += Math.sign(mid.z || -1) * 0.0012
  return taperedTube([a, mid, b], () => r, { radial: 4, hint: new Vector3(0, 0, -1), capEnd: false })
}

/** Corpete com fitas douradas: [mesh tecido, mesh ouro]. */
function bodice(colors: string[]): BuiltPart[] {
  const cloth = new Mesh(bodiceGeometry(), fabricMaterial(colors[0], { roughness: 0.42 }))
  cloth.name = 'bodice'
  const gold = new Batch()
  gold.add(ring(topY, 0.0042, 0.003))
  gold.add(ring(() => BODICE_BOTTOM + 0.004, 0.0042, 0.003))
  // costuras frontais (princesa)
  for (const phi of [-1.0, -0.5, 0.5, 1.0]) gold.add(seam(phi, BODICE_BOTTOM + 0.01, topY(phi) - 0.008, 0.0015))
  // cadarco cruzado nas costas
  const back = Math.PI
  const eyelets = 7
  for (let k = 0; k < eyelets - 1; k++) {
    const y0 = -0.045 + k * 0.04
    const y1 = y0 + 0.04
    const l0 = bodicePoint(back - 0.1, y0, 0.002)
    const r0 = bodicePoint(back + 0.1, y0, 0.002)
    const l1 = bodicePoint(back - 0.1, y1, 0.002)
    const r1 = bodicePoint(back + 0.1, y1, 0.002)
    gold.add(line(l0, r1, 0.0014))
    gold.add(line(r0, l1, 0.0014))
  }
  gold.add(seam(back - 0.1, -0.05, 0.2, 0.002))
  gold.add(seam(back + 0.1, -0.05, 0.2, 0.002))
  const goldMesh = new Mesh(gold.build(), goldMaterial(colors[2]))
  goldMesh.name = 'bodice.gold'
  return [
    { joint: 'spine', object: cloth },
    { joint: 'spine', object: goldMesh },
  ]
}

/** Manga bufante curta (espaco da junta upperArm: y=0 no ombro, desce pelo braco). */
function sleeves(colors: string[]): BuiltPart[] {
  const parts: BuiltPart[] = []
  for (const joint of ['upperArmL', 'upperArmR'] as const) {
    const puff = new Batch()
    puff.add(
      lathe(
        [
          [0.062, 0.0],
          [0.058, 0.03],
          [0.04, 0.062],
          [0.0, 0.085],
          [-0.04, 0.086],
          [-0.075, 0.069],
          [-0.1, 0.05],
          [-0.108, 0.046],
        ],
        28,
      ),
    )
    // babado na barra da manga
    puff.add(
      lathe(
        [
          [-0.1, 0.046],
          [-0.118, 0.064],
          [-0.138, 0.07],
        ],
        28,
      ),
    )
    const cloth = new Mesh(puff.build(), fabricMaterial(colors[0], { double: true }))
    cloth.name = 'sleeve'
    const ringGeo = taperedTube(
      Array.from({ length: 20 }, (_, i) => {
        const a = (i / 20) * Math.PI * 2
        return new Vector3(Math.sin(a) * 0.048, -0.106, Math.cos(a) * 0.048)
      }),
      () => 0.0042,
      { radial: 4, closed: true, hint: new Vector3(0, 1, 0) },
    )
    const edge = taperedTube(
      Array.from({ length: 20 }, (_, i) => {
        const a = (i / 20) * Math.PI * 2
        return new Vector3(Math.sin(a) * 0.071, -0.138, Math.cos(a) * 0.071)
      }),
      () => 0.0032,
      { radial: 4, closed: true, hint: new Vector3(0, 1, 0) },
    )
    const gold = new Mesh(new Batch().add(ringGeo).add(edge).build(), goldMaterial(colors[2]))
    gold.name = 'sleeve.gold'
    parts.push({ joint, object: cloth }, { joint, object: gold })
  }
  return parts
}

function paramsOf(spec: ItemSpec) {
  return spec.params
}

registerItem({
  id: 'top.corset',
  slot: 'top',
  attachTo: ['spine', 'upperArmL', 'upperArmR'],
  defaultColors: ['#ffb6cf', '#fff3e6', '#e6b84f'],
  defaultParams: {},
  build: (spec) => [...bodice(spec.colors), ...sleeves(spec.colors)],
})

registerItem({
  id: 'dress.rococo',
  slot: 'dress',
  attachTo: ['spine', 'upperArmL', 'upperArmR', 'hips'],
  defaultColors: ['#ffb6cf', '#fff3e6', '#e6b84f'],
  defaultParams: { ...SKIRT_DEFAULTS },
  build: (spec) => [...bodice(spec.colors), ...sleeves(spec.colors), ...buildSkirt(paramsOf(spec), spec.colors)],
})
