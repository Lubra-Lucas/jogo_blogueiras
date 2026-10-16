import { rng } from '../shared/competition'
import type { Difficulty } from '../shared/competition'
import {
  DECALS, DECAL_COLORS, DIFF, POLISHES, POLISH_BY_ID, SKIN_TONES, type DecalKind, type DiffCfg, type Polish,
} from './data'

export interface Decal {
  kind: DecalKind
  x: number
  y: number
  /** graus, múltiplos de 15 */
  rot: number
  color: string
  scale: number
}

export interface NailDesign {
  finger: number
  /** 'main' usa a cor base, 'accent' a cor de destaque */
  base: 'main' | 'accent'
  /** cor da ponta (francesinha) ou null */
  tip: string | null
  decals: Decal[]
}

export interface ClientDesign {
  index: number
  name: string
  skin: string
  baseId: string
  accentId: string | null
  tipColor: string | null
  nails: NailDesign[]
  /** alternativas oferecidas na paleta */
  palette: string[]
}

const NAMES = ['Helena', 'Marina', 'Beatriz', 'Aline', 'Camila', 'Renata', 'Júlia', 'Sônia', 'Paula', 'Isadora', 'Tereza', 'Vitória', 'Nicole', 'Carla']
const SOLID_TIPS = ['#f6f3ee', '#17141a', '#b3131f', '#d8b45a']

export function poolFor(level: number): Polish[] {
  return POLISHES.filter((p) => p.level <= level)
}
export function decalPool(level: number): DecalKind[] {
  return DECALS.filter((d) => d.level <= level).map((d) => d.id)
}

type R = () => number
const pick = <T,>(r: R, a: readonly T[]): T => a[Math.floor(r() * a.length) % a.length]

/** Gera a cliente `index` (0..). Mesma semente + mesmo nível = mesma cliente. */
export function makeClient(seed: number, index: number, diff: Difficulty, level: number): ClientDesign {
  const cfg = DIFF[diff]
  const r = rng((seed + index * 7919) >>> 0)
  const pool = poolFor(level)
  const solids = pool.filter((p) => p.kind === 'solid')
  const specials = pool.filter((p) => p.kind !== 'solid')
  const complexity = Math.min(1, 0.12 + index * 0.2 + (diff === 'estrela' ? 0.15 : diff === 'dificil' ? 0.08 : 0))
  const count = cfg.nails[Math.min(index, cfg.nails.length - 1)]
  const fingers = [0, 1, 2, 3, 4]
  while (fingers.length > count) fingers.splice(Math.floor(r() * fingers.length), 1)

  const useSpecial = specials.length > 0 && r() < 0.15 + complexity * 0.45
  const base = useSpecial ? pick(r, specials) : pick(r, solids)
  const twoTone = count >= 4 && r() < complexity * 0.7 && base.kind === 'solid'
  const accent = twoTone ? pick(r, solids.filter((p) => p.id !== base.id)) : null
  const tipColor = r() < complexity * 0.5 && base.kind !== 'ombre' ? pick(r, SOLID_TIPS) : null
  const kinds = decalPool(level)
  const tiny = complexity > 0.55

  const nails: NailDesign[] = fingers.map((finger, k) => {
    const isAccent = !!accent && k === Math.floor(count / 2)
    const hasTip = !!tipColor && r() < 0.8
    const hasArt = r() < 0.12 + complexity * 0.75
    const decals: Decal[] = []
    if (hasArt) {
      const n = 1 + Math.floor(r() * (1 + complexity * 2.4))
      const style = r()
      if (style < 0.22 && kinds.includes('dot')) {
        // linha de pontos
        const x0 = 80 + r() * 20
        const slope = (r() - 0.5) * 60
        const col = pick(r, DECAL_COLORS)
        for (let i = 0; i < 3; i++) decals.push({ kind: 'dot', x: x0 + i * 38, y: 180 + (i - 1) * slope * 0.5, rot: 0, color: col, scale: 0.7 })
      } else {
        for (let i = 0; i < n && decals.length < 4; i++) {
          const kind = pick(r, kinds.filter((kd) => kd !== 'dot'))
          let x = 0
          let y = 0
          for (let tries = 0; tries < 20; tries++) {
            x = 72 + r() * 96
            y = 100 + r() * 150
            if (hasTip && y < 130) continue
            if (decals.every((d) => Math.hypot(d.x - x, d.y - y) > 52)) break
          }
          decals.push({
            kind, x: Math.round(x), y: Math.round(y),
            rot: Math.floor(r() * 24) * 15 - 180,
            color: pick(r, DECAL_COLORS),
            scale: tiny && r() < 0.5 ? 0.62 : 1,
          })
        }
      }
    }
    return { finger, base: isAccent ? 'accent' : 'main', tip: hasTip ? tipColor : null, decals }
  })

  // paleta: as cores certas + distratores parecidos
  const need = new Set<string>([base.id])
  if (accent) need.add(accent.id)
  const others = pool.filter((p) => !need.has(p.id))
  const pal = [...need]
  while (pal.length < Math.max(cfg.choices, need.size) && others.length) {
    const i = Math.floor(r() * others.length)
    pal.push(others[i].id)
    others.splice(i, 1)
  }
  for (let i = pal.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[pal[i], pal[j]] = [pal[j], pal[i]]
  }
  return {
    index, name: pick(r, NAMES), skin: pick(r, SKIN_TONES), baseId: base.id, accentId: accent?.id ?? null,
    tipColor: nails.some((n) => n.tip) ? tipColor : null, nails, palette: pal,
  }
}

// ---------------------------------------------------------------- pontuação
function hexRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1, 7), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const dist = (a: string, b: string) => {
  const [r1, g1, b1] = hexRgb(a)
  const [r2, g2, b2] = hexRgb(b)
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2)
}

/** Fidelidade da cor escolhida: 1 se certa; parecida vale até 0,55; errada cai. */
export function colorFidelity(chosenId: string | null, targetId: string): number {
  if (!chosenId) return 0
  if (chosenId === targetId) return 1
  const a = POLISH_BY_ID[chosenId]
  const b = POLISH_BY_ID[targetId]
  if (!a || !b) return 0
  let d = dist(a.c1, b.c1)
  if (a.c2 && b.c2) d = (d + dist(a.c2, b.c2)) / 2
  let f = 0.55 * Math.max(0, 1 - d / 300)
  if (a.kind !== b.kind) f *= 0.6
  return f
}

const angDiff = (a: number, b: number) => {
  let d = Math.abs(a - b) % 360
  if (d > 180) d = 360 - d
  return d
}

export interface ArtResult {
  score: number
  hits: number
  extras: number
}

/** Compara adesivos colocados com os do modelo (posição, giro e tipo). */
export function scoreDecals(targets: Decal[], placed: Decal[], cfg: Pick<DiffCfg, 'decalTol' | 'rotTol'>): ArtResult {
  if (targets.length === 0) return { score: placed.length ? Math.max(0, 1 - placed.length * 0.25) : 1, hits: 0, extras: placed.length }
  const used = new Set<number>()
  let sum = 0
  let hits = 0
  for (const t of targets) {
    let best = -1
    let bestD = Infinity
    placed.forEach((p, i) => {
      if (used.has(i) || p.kind !== t.kind) return
      const d = Math.hypot(p.x - t.x, p.y - t.y)
      if (d < bestD) {
        bestD = d
        best = i
      }
    })
    if (best < 0) continue
    used.add(best)
    const p = placed[best]
    const pos = Math.max(0, Math.min(1, 1 - (bestD - cfg.decalTol * 0.4) / (cfg.decalTol * 2.2)))
    const sym = DECALS.find((d) => d.id === t.kind)!.symmetric
    const rot = sym ? 1 : Math.max(0, Math.min(1, 1 - (angDiff(p.rot, t.rot) - cfg.rotTol * 0.3) / (cfg.rotTol * 2.5)))
    const col = p.color === t.color ? 1 : 0.75
    const s = pos * (0.65 + 0.35 * rot) * col
    sum += s
    if (s > 0.7) hits++
  }
  const extras = placed.length - used.size
  return { score: Math.max(0, sum / targets.length - extras * 0.12), hits, extras }
}

/** Fidelidade da francesinha: cobertura e limpeza viram nota, como a base. */
export interface NailResult {
  finger: number
  precision: number
  clean: number
  fidelity: number
  gloss: number
  score: number
  points: number
  perfect: boolean
}

export function nailScore(p: {
  coverage: number
  clean: number
  tipCoverage: number | null
  tipClean: number | null
  color: number
  art: number | null
  gloss: number
}): { precision: number; clean: number; fidelity: number; score: number } {
  const precision = p.tipCoverage === null ? p.coverage : p.coverage * 0.65 + p.tipCoverage * 0.35
  const clean = p.tipClean === null ? p.clean : p.clean * 0.65 + p.tipClean * 0.35
  const fidelity = p.art === null ? p.color : p.color * 0.45 + p.art * 0.55
  const score = 100 * (0.32 * precision + 0.2 * clean + 0.28 * fidelity + 0.2 * (0.2 + 0.8 * p.gloss))
  return { precision, clean, fidelity, score }
}

export const PERFECT_NAIL = 90
export const comboMult = (combo: number) => 1 + 0.1 * Math.min(combo, 6)
export const nailPoints = (score: number, combo: number) => Math.round(score * 8 * comboMult(combo))

/** Qualidade do verniz: 1 na zona verde, cai com a distância; passar de 1 = excesso. */
export function glossQuality(level: number, zoneStart: number, zoneEnd: number): number {
  if (level >= zoneStart && level <= zoneEnd) return 1
  if (level > 1) return 0.25
  const d = level < zoneStart ? zoneStart - level : level - zoneEnd
  return Math.max(0.25, 1 - d * 2.2)
}

export function starsFor(score: number, diff: Difficulty): number {
  const s = DIFF[diff].stars
  return score >= s[2] ? 3 : score >= s[1] ? 2 : score >= s[0] ? 1 : 0
}

export function happinessHearts(avgScore: number): number {
  return avgScore >= 93 ? 5 : avgScore >= 82 ? 4 : avgScore >= 68 ? 3 : avgScore >= 50 ? 2 : 1
}

export const clientComment = (hearts: number) =>
  ['Ai, minhas mãos...', 'Podia ter ficado melhor.', 'Gostei, obrigada!', 'Ficou lindo!', 'Perfeito, volto sempre!'][hearts - 1]

export interface Judge {
  name: string
  role: string
  text: string
}

/** Comentários de jurados a partir das médias (0..1). */
export function judgeComments(precision: number, clean: number, fidelity: number, gloss: number): Judge[] {
  const t = (v: number, a: string, b: string, c: string) => (v >= 0.9 ? a : v >= 0.7 ? b : c)
  return [
    {
      name: 'Madame Odete', role: 'Precisão',
      text: t(precision, 'Cobertura impecável, nem um fio de cutícula à mostra.', 'Boa cobertura, mas sobraram uns cantinhos.', 'Faltou tinta: vá com calma e passe de novo.'),
    },
    {
      name: 'Chef Rafaela', role: 'Limpeza',
      text: t(clean, 'Pele limpa como num catálogo.', 'Alguns borrões na pele, nada grave.', 'O algodão com acetona agradece a visita.'),
    },
    {
      name: 'Dona Lourdes', role: 'Fidelidade',
      text: t(fidelity, 'Idêntico ao modelo, parabéns!', 'Parecido, mas confira cor e posição dos detalhes.', 'Isso não se parece com o modelo da cliente.'),
    },
    {
      name: 'Léo Brilho', role: 'Acabamento',
      text: t(gloss, 'Brilho de espelho. Segura, que vai ser capa.', 'Brilho bonito, falta só acertar a camada.', 'O verniz precisa de mais atenção: solte na zona verde.'),
    },
  ]
}
