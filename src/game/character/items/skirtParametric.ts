import { BufferGeometry, Float32BufferAttribute, Mesh, Vector3 } from 'three'
import { Batch, taperedTube } from '../geometry'
import { fabricMaterial, goldMaterial } from '../materials'
import { registerItem } from './registry'
import type { BuiltPart, ItemSpec } from './types'

/**
 * Saia parametrica em camadas com babados (peca-chave do guarda-roupa).
 * Espaco local: junta `hips`. y=0 e o centro da pelve; o topo (cintura) fica em `TOP`.
 */
export interface SkirtParams {
  /** cintura -> barra (m). Joelho ~ 0.5 */
  length: number
  /** raio da barra (m) */
  flare: number
  /** numero de camadas (1-4) */
  tiers: number
  /** ondas do babado ao redor da barra */
  ruffleWaves: number
  /** amplitude do babado (m) */
  ruffleDepth: number
  /** raio da cintura (m) */
  waistRadius: number
  /** raio no quadril (m) */
  hipRadius: number
}

export const SKIRT_DEFAULTS: SkirtParams = {
  length: 0.5,
  flare: 0.52,
  tiers: 3,
  ruffleWaves: 14,
  ruffleDepth: 0.026,
  waistRadius: 0.108,
  hipRadius: 0.166,
}

const TOP = 0.062 // altura da cintura da saia na junta hips
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function resolveSkirtParams(p: Partial<SkirtParams>): SkirtParams {
  const r = { ...SKIRT_DEFAULTS, ...p }
  r.tiers = Math.min(4, Math.max(1, Math.round(r.tiers)))
  r.ruffleWaves = Math.max(3, Math.round(r.ruffleWaves))
  r.length = Math.max(0.15, r.length)
  r.flare = Math.max(r.hipRadius * 0.9, r.flare)
  return r
}

/** Raio do "sino" da saia na posicao s (0 = cintura, 1 = barra). */
function bell(p: SkirtParams, s: number): number {
  const hips = p.waistRadius + (p.hipRadius - p.waistRadius) * smooth(0, 0.16, s)
  return hips + (p.flare - p.hipRadius) * Math.pow(s, 1.25)
}

function tierGeometry(p: SkirtParams, i: number): BufferGeometry {
  const n = p.tiers
  const seg = Math.min(120, Math.max(48, p.ruffleWaves * 8))
  const rows = 4
  const sNom = i / n
  const sBot = (i + 1) / n
  const sTop = i === 0 ? 0 : Math.max(0, sNom - Math.min(0.1, 0.45 / n))
  const flareBoost = 0.018 + 0.03 / n
  const pos: number[] = []
  const idx: number[] = []
  for (let k = 0; k <= rows; k++) {
    const u = k / rows
    const s = sTop + (sBot - sTop) * u
    const w = Math.pow(u, 2.2) // ruffle so perto da barra
    const tuck = i > 0 ? 0.014 * Math.pow(1 - u, 3) : 0
    const zs = 0.8 + 0.2 * smooth(0, 0.8, s)
    for (let j = 0; j < seg; j++) {
      const th = (j / seg) * Math.PI * 2
      const wave = th * p.ruffleWaves
      const r = bell(p, s) + flareBoost * u * u - tuck + p.ruffleDepth * w * Math.sin(wave)
      const y = TOP - s * p.length - p.ruffleDepth * 1.0 * w * (0.5 + 0.5 * Math.sin(wave + 0.6))
      pos.push(r * Math.sin(th), y, r * Math.cos(th) * zs)
    }
  }
  for (let k = 0; k < rows; k++) {
    for (let j = 0; j < seg; j++) {
      const j2 = (j + 1) % seg
      const a = k * seg + j
      const b = k * seg + j2
      const c = (k + 1) * seg + j
      const d = (k + 1) * seg + j2
      idx.push(a, c, b, b, c, d)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** Friso dourado na barra da camada i (acompanha o babado). */
function hemTrim(p: SkirtParams, i: number): BufferGeometry {
  const n = p.tiers
  const seg = Math.min(120, Math.max(48, p.ruffleWaves * 8))
  const s = (i + 1) / n
  const flareBoost = 0.018 + 0.03 / n
  const zs = 0.8 + 0.2 * smooth(0, 0.8, s)
  const pts: Vector3[] = []
  const hints: Vector3[] = []
  for (let j = 0; j < seg; j++) {
    const th = (j / seg) * Math.PI * 2
    const wave = th * p.ruffleWaves
    const r = bell(p, s) + flareBoost + p.ruffleDepth * Math.sin(wave) + 0.002
    const y = TOP - s * p.length - p.ruffleDepth * 1.0 * (0.5 + 0.5 * Math.sin(wave + 0.6))
    pts.push(new Vector3(r * Math.sin(th), y, r * Math.cos(th) * zs))
    hints.push(new Vector3(Math.sin(th), 0, Math.cos(th)))
  }
  return taperedTube(pts, () => 0.0042, { radial: 4, closed: true, hint: hints })
}

/** Gera as partes da saia (todas na junta hips). colors = [camada A, camada B, friso]. */
export function buildSkirt(params: Partial<SkirtParams>, colors: string[]): BuiltPart[] {
  const p = resolveSkirtParams(params)
  const a = new Batch()
  const b = new Batch()
  const trim = new Batch()
  for (let i = 0; i < p.tiers; i++) {
    ;(i % 2 === 0 ? a : b).add(tierGeometry(p, i))
    trim.add(hemTrim(p, i))
  }
  const parts: BuiltPart[] = []
  const mk = (batch: Batch, mat: ReturnType<typeof fabricMaterial>, name: string) => {
    if (batch.empty) return
    const m = new Mesh(batch.build(), mat)
    m.name = name
    parts.push({ joint: 'hips', object: m })
  }
  mk(a, fabricMaterial(colors[0], { double: true }), 'skirt.a')
  mk(b, fabricMaterial(colors[1], { double: true }), 'skirt.b')
  mk(trim, goldMaterial(colors[2]), 'skirt.trim')
  return parts
}

function paramsFrom(spec: ItemSpec): Partial<SkirtParams> {
  return spec.params
}

registerItem({
  id: 'bottom.skirt',
  slot: 'bottom',
  attachTo: ['hips'],
  defaultColors: ['#ffb6cf', '#fff3e6', '#e6b84f'],
  defaultParams: { ...SKIRT_DEFAULTS },
  build: (spec) => buildSkirt(paramsFrom(spec), spec.colors),
})
