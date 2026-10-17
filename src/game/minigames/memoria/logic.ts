/**
 * "Memória Fashion": regras puras (sem React/three). Peças do catálogo do jogo, variações de cor,
 * montagem de pares e de looks a partir de uma semente (Desafio do dia = mesma partida para todas).
 */
import type { CatalogItem } from '../../character/catalog'
import type { Difficulty } from '../shared/competition'
import type { ThumbSpec } from '../../../ui/shop/thumbs/thumbRenderer'

export type Rand = () => number
export type MemMode = 'pares' | 'look'

export type PieceSlot = 'top' | 'bottom' | 'dress' | 'shoes' | 'hat' | 'glasses' | 'bag' | 'neck' | 'hair' | 'scarf' | 'head' | 'wrist'

export const SLOT_LABEL: Record<PieceSlot, string> = {
  top: 'Blusa', bottom: 'Saia ou calça', dress: 'Vestido', shoes: 'Sapato', hat: 'Chapéu', glasses: 'Óculos',
  bag: 'Bolsa', neck: 'Colar', hair: 'Cabelo', scarf: 'Lenço', head: 'Tiara', wrist: 'Pulseira',
}
/** Artigo para as perguntas: "Qual era o sapato?" */
export const SLOT_QUESTION: Record<PieceSlot, string> = {
  top: 'a blusa', bottom: 'a saia ou a calça', dress: 'o vestido', shoes: 'o sapato', hat: 'o chapéu', glasses: 'os óculos',
  bag: 'a bolsa', neck: 'o colar', hair: 'o cabelo', scarf: 'o lenço', head: 'a tiara', wrist: 'a pulseira',
}

export interface Piece {
  id: string
  slot: PieceSlot
  label: string
  /** cor da variação (hex) quando diferente da original */
  hex?: string
  /** cores por material (alinhadas aos materiais do catálogo) */
  colors?: string[]
  /** nome da cor da variação (para acessibilidade e dicas) */
  colorName?: string
}

export const HAIR_IDS = ['hair.meshyUpdo', 'hair.chestnutWaves', 'hair.platinumUndercut', 'hair.caramelCurls']
const HAIR_LABEL: Record<string, string> = {
  'hair.meshyUpdo': 'Coque',
  'hair.chestnutWaves': 'Ondas castanhas',
  'hair.platinumUndercut': 'Undercut',
  'hair.caramelCurls': 'Cachos',
}

/** Cores do mundo real, em famílias de tons parecidos (para os pares difíceis). */
export interface Tone { name: string; hex: string }
export const TONE_FAMILIES: Tone[][] = [
  [{ name: 'vermelho', hex: '#a62b32' }, { name: 'vermelho-tijolo', hex: '#c0502f' }, { name: 'vinho', hex: '#6d1a2c' }],
  [{ name: 'azul-marinho', hex: '#1d2a4a' }, { name: 'azul', hex: '#2f5390' }, { name: 'azul-claro', hex: '#6f9fcf' }],
  [{ name: 'verde-floresta', hex: '#1f4a3a' }, { name: 'verde', hex: '#3b7d58' }, { name: 'verde-oliva', hex: '#6b6a3f' }],
  [{ name: 'marfim', hex: '#efe8d8' }, { name: 'areia', hex: '#d8c9a8' }, { name: 'bege', hex: '#b9a888' }],
  [{ name: 'marrom', hex: '#6b4326' }, { name: 'caramelo', hex: '#a8773f' }, { name: 'camelo', hex: '#c9a26b' }],
  [{ name: 'preto', hex: '#1b1b20' }, { name: 'grafite', hex: '#4a4e58' }, { name: 'cinza', hex: '#8a8f99' }],
  [{ name: 'mostarda', hex: '#c8962b' }, { name: 'ocre', hex: '#a8742a' }, { name: 'amarelo', hex: '#e2bf4f' }],
  [{ name: 'turquesa', hex: '#23807f' }, { name: 'petróleo', hex: '#1f5a66' }, { name: 'verde-água', hex: '#7fc4b5' }],
]
const HAIR_TONES: Tone[] = [
  { name: 'castanho', hex: '#4e3022' }, { name: 'loiro', hex: '#d9b36a' }, { name: 'ruivo', hex: '#a8431f' },
  { name: 'preto', hex: '#17120f' }, { name: 'platinado', hex: '#d9d6cf' },
]

export const shuffle = <T,>(a: readonly T[], r: Rand): T[] => {
  const o = [...a]
  for (let i = o.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[o[i], o[j]] = [o[j], o[i]]
  }
  return o
}
const pick = <T,>(a: readonly T[], r: Rand): T => a[Math.floor(r() * a.length) % a.length]

// ---------------------------------------------------------------- catálogo
const SLOTS: PieceSlot[] = ['top', 'bottom', 'dress', 'shoes', 'hat', 'glasses', 'bag', 'neck', 'scarf', 'head', 'wrist']

export interface Pool {
  bySlot: Record<PieceSlot, Piece[]>
  items: Record<string, CatalogItem>
}

export function buildPool(items: Record<string, CatalogItem>): Pool {
  const bySlot = Object.fromEntries([...SLOTS, 'hair' as const].map((s) => [s, [] as Piece[]])) as Record<PieceSlot, Piece[]>
  for (const it of Object.values(items)) {
    if (!(SLOTS as string[]).includes(it.slot)) continue
    bySlot[it.slot as PieceSlot].push({ id: it.id, slot: it.slot as PieceSlot, label: it.label })
  }
  for (const h of HAIR_IDS) bySlot.hair.push({ id: h, slot: 'hair', label: HAIR_LABEL[h] ?? 'Cabelo' })
  return { bySlot, items }
}

/** Índice do material que recebe a cor da variação (o "corpo" da peça, testado nas miniaturas). */
const BODY_ORDER: Record<string, string[]> = {
  hat: ['base', 'ribbon', 'metal'],
  bag: ['base', 'ribbon', 'metal'],
  scarf: ['base', 'ribbon'],
  glasses: ['gem', 'metal'],
  neck: ['pearl', 'ribbon', 'gem', 'metal'],
  head: ['pearl', 'ribbon', 'gem', 'metal'],
  wrist: ['pearl', 'ribbon', 'gem', 'metal'],
}
function baseMatIndex(it: CatalogItem): number {
  for (const id of BODY_ORDER[it.slot] ?? ['base']) {
    const i = it.mats.findIndex((m) => m.id === id)
    if (i >= 0) return i
  }
  return 0
}

export function withTone(p: Piece, tone: Tone, pool: Pool): Piece {
  if (p.slot === 'hair') return { ...p, hex: tone.hex, colorName: tone.name }
  const it = pool.items[p.id]
  if (!it) return { ...p, hex: tone.hex, colorName: tone.name }
  const idx = baseMatIndex(it)
  const colors = it.mats.map((m, i) => (i === idx ? tone.hex : m.color))
  return { ...p, hex: tone.hex, colors, colorName: tone.name }
}

export function thumbSpec(p: Piece): ThumbSpec {
  if (p.slot === 'hair') return { id: p.id, hair: { id: p.id, color: p.hex ?? '#d8b46e' } }
  return p.colors ? { id: p.id, colors: p.colors } : { id: p.id }
}

export const pieceKey = (p: Piece) => `${p.id}|${p.hex ?? ''}`
export const sameShape = (a: Piece, b: Piece) => a.id === b.id

// ---------------------------------------------------------------- pares
export interface Grid { cols: number; rows: number; pairs: number }
export const GRID: Record<Difficulty, Grid> = {
  facil: { cols: 3, rows: 4, pairs: 6 },
  normal: { cols: 4, rows: 4, pairs: 8 },
  dificil: { cols: 4, rows: 5, pairs: 10 },
  estrela: { cols: 6, rows: 6, pairs: 18 },
}
export const GRID_LABEL: Record<Difficulty, string> = { facil: '3 x 4', normal: '4 x 4', dificil: '4 x 5', estrela: '6 x 6' }

export interface PairsCfg { time: number; peek: number; wrongPenalty: number; hideMs: number; families: number; famSize: number }
export const PAIRS_CFG: Record<Difficulty, PairsCfg> = {
  facil: { time: 80, peek: 3, wrongPenalty: 0, hideMs: 1100, families: 0, famSize: 2 },
  normal: { time: 95, peek: 2, wrongPenalty: 10, hideMs: 900, families: 0, famSize: 2 },
  dificil: { time: 120, peek: 1.5, wrongPenalty: 20, hideMs: 800, families: 3, famSize: 2 },
  estrela: { time: 170, peek: 0, wrongPenalty: 30, hideMs: 600, families: 6, famSize: 3 },
}

/** Escolhe os pares: peças diferentes entre categorias; no difícil, a mesma peça em cores parecidas. */
export function pickPairs(pool: Pool, difficulty: Difficulty, r: Rand): Piece[] {
  const { pairs } = GRID[difficulty]
  const cfg = PAIRS_CFG[difficulty]
  const out: Piece[] = []
  const used = new Set<string>()
  const slotOrder = shuffle([...SLOTS.filter((s) => pool.bySlot[s].length), 'hair' as PieceSlot], r)
  const nextBase = (): Piece | null => {
    for (let t = 0; t < 40; t++) {
      const s = slotOrder[(out.length + t) % slotOrder.length]
      const p = pick(pool.bySlot[s], r)
      if (!used.has(p.id)) {
        used.add(p.id)
        return p
      }
    }
    return null
  }
  // famílias: mesma peça, tons parecidos
  for (let f = 0; f < cfg.families && out.length < pairs; f++) {
    const base = nextBase()
    if (!base) break
    const fam = base.slot === 'hair' ? shuffle(HAIR_TONES, r) : shuffle(pick(TONE_FAMILIES, r), r)
    for (let k = 0; k < cfg.famSize && out.length < pairs; k++) out.push(withTone(base, fam[k % fam.length], pool))
  }
  while (out.length < pairs) {
    const base = nextBase()
    if (!base) break
    // peças simples: cor original em uns, tom do mundo real em outros (mais variedade visual)
    out.push(r() < 0.35 && base.slot !== 'hair' ? withTone(base, pick(pick(TONE_FAMILIES, r), r), pool) : base)
  }
  return out
}

export interface Card { uid: number; pair: number; piece: Piece }
export function dealCards(pairs: Piece[], r: Rand): Card[] {
  const cards: Card[] = []
  pairs.forEach((p, i) => {
    cards.push({ uid: i * 2, pair: i, piece: p }, { uid: i * 2 + 1, pair: i, piece: p })
  })
  return shuffle(cards, r)
}

export const PAIR_SCORE = { match: 100, combo: 25, comboMax: 150, timeBonus: 4, wrongBonusLimit: 0 }
export function pairsStarTh(difficulty: Difficulty): readonly [number, number, number] {
  const base = GRID[difficulty].pairs * 100
  return [Math.round(base * 0.9), Math.round(base * 1.4), Math.round(base * 1.9)]
}
export const pairsTypical = (d: Difficulty) => Math.round(GRID[d].pairs * 100 * 1.3)

// ---------------------------------------------------------------- Lembre o look
export interface LookCfg { pieces: number; options: number; similar: number; memorize: number; pick: number; rounds: number }
export const LOOK_CFG: Record<Difficulty, LookCfg> = {
  facil: { pieces: 3, options: 4, similar: 0, memorize: 9, pick: 25, rounds: 4 },
  normal: { pieces: 4, options: 4, similar: 1, memorize: 7, pick: 20, rounds: 5 },
  dificil: { pieces: 5, options: 6, similar: 2, memorize: 6, pick: 16, rounds: 5 },
  estrela: { pieces: 6, options: 6, similar: 3, memorize: 5, pick: 12, rounds: 5 },
}

export interface LookRound {
  /** peças do look na ordem de perguntas */
  pieces: Piece[]
  /** opções por peça (inclui a correta) */
  options: Piece[][]
}

export function buildLook(pool: Pool, difficulty: Difficulty, r: Rand): LookRound {
  const cfg = LOOK_CFG[difficulty]
  const body: PieceSlot[] = r() < 0.45 ? ['dress'] : ['top', 'bottom']
  const accessories = shuffle<PieceSlot>(['bag', 'hat', 'glasses', 'neck', 'scarf'], r)
  const slots = ([...body, 'shoes', ...accessories] as PieceSlot[]).slice(0, cfg.pieces).filter((s) => pool.bySlot[s].length)
  const usedIds = new Set<string>()
  const pieces: Piece[] = slots.map((s) => {
    let p = pick(pool.bySlot[s], r)
    for (let t = 0; t < 10 && usedIds.has(p.id); t++) p = pick(pool.bySlot[s], r)
    usedIds.add(p.id)
    return withTone(p, pick(pick(TONE_FAMILIES, r), r), pool)
  })
  const options = pieces.map((p) => {
    const opts: Piece[] = [p]
    // quase-iguais: a mesma peça em outro tom (da mesma família quando possível)
    const fam = TONE_FAMILIES.find((f) => f.some((t) => t.hex === p.hex)) ?? pick(TONE_FAMILIES, r)
    const otherTones = shuffle(fam.filter((t) => t.hex !== p.hex), r)
    for (let k = 0; k < cfg.similar && k < otherTones.length; k++) opts.push(withTone(p, otherTones[k], pool))
    // distratores: outras peças da mesma categoria
    const same = shuffle(pool.bySlot[p.slot].filter((x) => x.id !== p.id), r)
    for (const d of same) {
      if (opts.length >= cfg.options) break
      opts.push(withTone(d, pick(pick(TONE_FAMILIES, r), r), pool))
    }
    return shuffle(opts, r)
  })
  return { pieces, options }
}

export const LOOK_SCORE = { right: 100, speed: 50, combo: 20, comboMax: 100, perfect: 100 }
export function lookMax(d: Difficulty): number {
  const c = LOOK_CFG[d]
  return c.rounds * (c.pieces * (LOOK_SCORE.right + LOOK_SCORE.speed + 40) + LOOK_SCORE.perfect)
}
export function lookStarTh(d: Difficulty): readonly [number, number, number] {
  const m = lookMax(d)
  return [Math.round(m * 0.35), Math.round(m * 0.55), Math.round(m * 0.75)]
}
export const lookTypical = (d: Difficulty) => Math.round(lookMax(d) * 0.55)
