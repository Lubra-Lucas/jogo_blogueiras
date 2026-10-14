import { BufferGeometry, Color, Float32BufferAttribute, Mesh, Vector3 } from 'three'
import { headSurface } from '../body'
import { BODY, HEAD } from '../joints'
import { Batch, ellipsoid, paintVertexColors, rng, sampleSpline, taperedTube } from '../geometry'
import { hairMaterial } from '../materials'
import { registerItem } from './registry'
import type { BuiltPart } from './types'

/**
 * Cabelos procedurais (uma unica malha com vertex colors = gradiente raiz -> pontas).
 * Construidos no espaco "centro da cabeca" e deslocados para a junta `head` no final.
 */
interface HairStyle {
  /** coque alto (half-up) com cachos */
  pouf: boolean
  /** fim das mechas de tras (y relativo ao centro da cabeca, negativo) */
  backEnd: number
  backLocks: number
  backCurls: number
  frontCurls: boolean
  seed: number
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

class Palette {
  readonly c1: Color
  readonly c2: Color
  constructor(c1: string, c2?: string) {
    this.c1 = new Color(c1)
    this.c2 = new Color(c2 ?? c1)
  }
  /** cor ao longo da mecha: raiz (t=0) -> ponta (t=1) */
  strand(t: number, jitter: number, out: Color): Color {
    out.copy(this.c1).lerp(this.c2, smooth(0.3, 1, t) * 0.95)
    out.offsetHSL(0, 0.06, jitter - 0.02)
    return out
  }
}

// ------------------------------------------------------------ pecas

/** Linha do cabelo: elevacao do limite inferior da calota por azimute (0 = frente). */
function hairlineE(a: number): number {
  const aa = Math.abs(a)
  return 0.62 - 1.02 * smooth(0, 1.5, aa) - 0.15 * smooth(1.5, 3.1, aa)
}

/** Calota lisa que abraca a cabeca, com borda inferior seguindo a linha do cabelo (sem recortes serrilhados). */
function capGeometry(pal: Palette): BufferGeometry {
  const cols = 56
  const rows = 16
  const pos: number[] = []
  const idx: number[] = []
  const tmp: [number, number, number] = [0, 0, 0]
  for (let r = 0; r <= rows; r++) {
    const u = r / rows
    for (let c = 0; c < cols; c++) {
      const a = -Math.PI + (c / cols) * Math.PI * 2
      const e = Math.PI / 2 - (Math.PI / 2 - hairlineE(a)) * u
      // espessura: mais cheia no alto, afina suave na borda
      const k = 1.02 + 0.03 * smooth(1, 0.6, u) + 0.045 * smooth(0.3, 1.3, e)
      headSurface(a, e, k, tmp)
      pos.push(tmp[0], tmp[1], tmp[2])
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const c2 = (c + 1) % cols
      const i0 = r * cols + c
      const i1 = r * cols + c2
      const i2 = (r + 1) * cols + c
      const i3 = (r + 1) * cols + c2
      idx.push(i0, i1, i2, i1, i3, i2)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  paintVertexColors(g, (p, out) => {
    pal.strand(smooth(0.05, -0.3, p.y / HEAD.ry) * 0.3, 0, out)
  })
  return g
}

/** Raio de uma mecha grossa: leve afinamento e ponta arredondada. */
function clumpRadius(r0: number) {
  return (t: number) => {
    const base = 1 - 0.22 * t
    const tip = t > 0.8 ? Math.sqrt(Math.max(0.03, 1 - ((t - 0.8) / 0.2) ** 2)) : 1
    return r0 * base * tip
  }
}

/** Mecha grossa e redonda ao longo de um caminho, com gradiente. */
function addLock(
  batch: Batch,
  pal: Palette,
  ctrl: Vector3[],
  r0: number,
  flat: number,
  rnd: () => number,
  samples = 18,
  radial = 8,
) {
  const pts = sampleSpline(ctrl, samples)
  const jit = (rnd() - 0.5) * 0.06
  const hints = pts.map((p) => new Vector3(p.x, 0.1, p.z).normalize())
  batch.add(
    taperedTube(pts, clumpRadius(r0), {
      radial,
      flat,
      hint: hints,
      color: (t, _i, out) => {
        pal.strand(t, jit, out)
      },
    }),
  )
}

/** Cacho macio e grosso (uma espiral larga) pendurado em `base`. */
function addCurl(
  batch: Batch,
  pal: Palette,
  base: Vector3,
  len: number,
  rho: number,
  turns: number,
  phase: number,
  r0: number,
  rnd: () => number,
  tint = 0.4,
) {
  const n = 20
  const pts: Vector3[] = []
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1)
    const ang = Math.PI * 2 * turns * u + phase
    const rr = rho * (1 - 0.25 * u)
    pts.push(new Vector3(base.x + Math.cos(ang) * rr, base.y - len * u, base.z + Math.sin(ang) * rr))
  }
  const jit = (rnd() - 0.5) * 0.05
  batch.add(
    taperedTube(pts, clumpRadius(r0), {
      radial: 6,
      color: (t, _i, out) => {
        pal.strand(tint + (1 - tint) * t, jit, out)
      },
    }),
  )
}

function addBlob(batch: Batch, pal: Palette, rx: number, ry: number, rz: number, pos: [number, number, number], tint: number) {
  const g = ellipsoid(rx, ry, rz, 10, 8)
  paintVertexColors(g, (_p, out) => {
    pal.strand(tint, 0, out)
  })
  batch.addAt(g, pos)
}

// ------------------------------------------------------------ montagem

function buildHair(style: HairStyle, c1: string, c2: string | undefined): BuiltPart[] {
  const pal = new Palette(c1, c2)
  const rnd = rng(style.seed)
  const batch = new Batch()
  const tmp: [number, number, number] = [0, 0, 0]
  const V = (x: number, y: number, z: number) => new Vector3(x, y, z)

  batch.add(capGeometry(pal))

  // massa de volume atras da cabeca e das costas (sem falhas)
  addBlob(batch, pal, 0.15, 0.17, 0.1, [0, -0.05, -0.085], 0.08)
  addBlob(batch, pal, 0.13, Math.abs(style.backEnd) * 0.46, 0.07, [0, -0.15 + style.backEnd * 0.42, -0.115], 0.3)

  // grandes mechas atras (ondas suaves), atras dos ombros
  const K = style.backLocks
  for (let i = 0; i < K; i++) {
    const u = (i + 0.5) / K
    const a = Math.PI * (0.46 + 1.08 * u)
    const e0 = 0.1 + 0.15 * Math.cos(a - Math.PI) + (rnd() - 0.5) * 0.1
    const S = headSurface(a, e0, 1.07, tmp)
    const s0 = V(S[0], S[1], S[2])
    const xEnd = Math.max(-0.105, Math.min(0.12, Math.sin(a) * 0.14)) + (rnd() - 0.5) * 0.015
    const zEnd = -0.135 - 0.015 * rnd()
    const yEnd = style.backEnd * (0.68 + 0.4 * rnd())
    const ph = rnd() * 6.28
    const amp = 0.016 + 0.012 * rnd()
    const ctrl: Vector3[] = []
    for (const t of [0, 0.15, 0.35, 0.58, 0.8, 1]) {
      const w = smooth(0, 0.5, t)
      ctrl.push(
        V(
          s0.x + (xEnd - s0.x) * w + amp * t * Math.sin(Math.PI * 2 * 1.2 * t + ph),
          s0.y + (yEnd - s0.y) * t,
          s0.z + (zEnd - s0.z) * w + 0.006 * t * Math.sin(Math.PI * 2 * t + ph),
        ),
      )
    }
    addLock(batch, pal, ctrl, 0.05 + 0.008 * rnd(), 0.85, rnd, 18, 8)
  }
  for (let i = 0; i < style.backCurls; i++) {
    const x = -0.075 + (0.15 * i) / Math.max(1, style.backCurls - 1)
    addCurl(batch, pal, V(x, style.backEnd * 0.88, -0.14), 0.12, 0.03, 2, rnd() * 6, 0.024, rnd, 0.55)
  }

  // mechas laterais: caem grossas e macias na frente dos ombros, terminando em cachos
  for (const s of [-1, 1]) {
    for (let j = 0; j < 2; j++) {
      const S = headSurface(s * (1.5 - j * 0.15), -0.1 + j * 0.1, 1.07, tmp)
      const ctrl = [
        V(S[0], S[1], S[2]),
        V(s * (0.158 - j * 0.02), -0.09, 0.03 + j * 0.01),
        V(s * (0.13 - j * 0.03), -0.18, 0.06 + j * 0.01),
        V(s * (0.108 - j * 0.03), -0.26 + j * 0.03, 0.085),
      ]
      addLock(batch, pal, ctrl, 0.036 - j * 0.004, 0.9, rnd, 14, 8)
      if (style.frontCurls) {
        const end = ctrl[ctrl.length - 1]
        addCurl(batch, pal, V(end.x, end.y + 0.015, end.z), 0.1, 0.026, 1.8, rnd() * 6, 0.022, rnd, 0.5)
      }
    }
  }

  // franja: poucas mechas grossas varridas para os lados
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const a0 = s * (0.06 + 0.3 * i)
      const a1 = s * (0.55 + 0.35 * i)
      const e1 = 0.52 - 0.18 * i
      const ctrl: Vector3[] = []
      for (let k = 0; k < 5; k++) {
        const u = k / 4
        const sc = 1.085 + 0.025 * Math.sin(Math.PI * u)
        const S = headSurface(a0 + (a1 - a0) * Math.pow(u, 1.1), 1.2 + (e1 - 1.2) * Math.pow(u, 0.9), sc, tmp)
        ctrl.push(V(S[0], S[1], S[2]))
      }
      addLock(batch, pal, ctrl, 0.043 - 0.004 * i, 0.55, rnd, 12, 8)
    }
  }

  // coque alto (half-up) com cachos
  if (style.pouf) {
    addBlob(batch, pal, 0.095, 0.085, 0.085, [0, 0.2, -0.07], 0.0)
    addBlob(batch, pal, 0.06, 0.065, 0.06, [0.078, 0.17, -0.05], 0.05)
    addBlob(batch, pal, 0.06, 0.065, 0.06, [-0.078, 0.17, -0.05], 0.05)
    addBlob(batch, pal, 0.065, 0.055, 0.055, [0, 0.25, -0.045], 0.0)
    addBlob(batch, pal, 0.06, 0.06, 0.055, [0.035, 0.15, -0.115], 0.1)
    addBlob(batch, pal, 0.06, 0.06, 0.055, [-0.04, 0.15, -0.11], 0.1)
    for (let i = 0; i < 4; i++) {
      const x = -0.06 + 0.04 * i
      addCurl(batch, pal, V(x, 0.14, -0.13), 0.22 + 0.03 * rnd(), 0.03, 2.4, rnd() * 6, 0.026, rnd, 0.1)
    }
  }

  const geo = batch.build()
  geo.translate(0, BODY.headCenter, 0)
  const mesh = new Mesh(geo, hairMaterial())
  mesh.name = 'hair'
  return [{ joint: 'head', object: mesh }]
}

registerItem({
  id: 'hair.cottonPouf',
  slot: 'hair',
  attachTo: ['head'],
  defaultColors: ['#ffb3d1', '#d9b3ff'],
  defaultParams: {},
  build: (s) =>
    buildHair({ pouf: true, backEnd: -0.6, backLocks: 9, backCurls: 4, frontCurls: true, seed: 11 }, s.colors[0], s.colors[1]),
})

registerItem({
  id: 'hair.softWaves',
  slot: 'hair',
  attachTo: ['head'],
  defaultColors: ['#c9a6ff', '#8fb8ff'],
  defaultParams: {},
  build: (s) =>
    buildHair({ pouf: false, backEnd: -0.44, backLocks: 9, backCurls: 3, frontCurls: false, seed: 29 }, s.colors[0], s.colors[1]),
})
