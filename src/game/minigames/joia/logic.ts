/**
 * Lógica pura de "Joia Sob Medida" (sem React/three): pedidos, moldes, esteira, colocação,
 * polimento em combo, pontuação por peça e resultados.
 */
import { DIFFICULTY_REWARD, rng, type Difficulty } from '../shared/competition'
import {
  CHARMS, CLIENTS, COMMENTS, GEM_COLORS, GEM_SHAPES, METALS, PEARLS, PIECE_TYPES, UNLOCKS, unlockedIds,
  type CharmShape, type GemColor, type GemShape, type Metal, type Pattern, type PearlColor, type PieceType,
} from './data'
import type { Sfx } from '../audio'

// ---------------------------------------------------------------- tipos
export type Kind = 'pearl' | 'gem' | 'link' | 'charm' | 'fake'
/** Um componente: tipo + tom (cor/metal) + forma. */
export interface Spec { kind: Kind; tone: string; shape: string }
export const specKey = (s: Spec) => `${s.kind}:${s.tone}:${s.shape}`
export const sameSpec = (a: Spec, b: Spec) => a.kind === b.kind && a.tone === b.tone && a.shape === b.shape

export interface Order {
  type: PieceType
  metal: Metal
  gem: GemColor
  shape: GemShape
  pearl: PearlColor
  charm: CharmShape
  pattern: Pattern
  n: number
  closed: boolean
  client: number
}

export interface SlotDef { spec: Spec; big: boolean; partner: number }
export interface Placed { spec: Spec; ok: boolean }

export interface Piece {
  order: Order
  slots: SlotDef[]
  placed: (Placed | null)[]
  mistakes: number
  removals: number
  startedAt: number
}

export interface BeltItem { id: number; spec: Spec; x: number }
export interface Hand { item: BeltItem; run: number[] }
export interface Fx { id: number; text: string; kind: 'good' | 'bad' | 'combo' | 'info'; life: number }

export interface Delivered {
  order: Order
  specs: (Spec | null)[]
  oks: boolean[]
  fidelity: number
  symmetry: number
  tempo: number
  quality: number
  score: number
  impecavel: boolean
  seconds: number
  comment: string
  complete: boolean
}

export type Phase = 'intro' | 'paused' | 'playing' | 'done'

export interface JoiaState {
  phase: Phase
  difficulty: Difficulty
  daily: boolean
  seed: number
  rng: number
  level: number
  time: number
  total: number
  clock: number
  clientIdx: number
  piece: Piece
  belt: BeltItem[]
  hand: Hand | null
  nextId: number
  spawnT: number
  score: number
  streak: number
  bestStreak: number
  polished: number
  delivered: Delivered[]
  fx: Fx[]
  sounds: Sfx[]
  /** peça acabou de ser entregue (para o aviso de entrega na UI) */
  lastDelivery: Delivered | null
  deliveryT: number
}

export const MAX_CLIENTS = 6
export const ROUND_TIME: Record<Difficulty, number> = { facil: 120, normal: 105, dificil: 100, estrela: 90 }
const BELT_SPEED: Record<Difficulty, number> = { facil: 7, normal: 9, dificil: 11, estrela: 13 }
const NEED_CHANCE: Record<Difficulty, number> = { facil: 0.68, normal: 0.56, dificil: 0.48, estrela: 0.42 }
const PAR_PER_SLOT: Record<Difficulty, number> = { facil: 4.2, normal: 3.4, dificil: 2.8, estrela: 2.4 }
export const TYPICAL: Record<Difficulty, number> = { facil: 3600, normal: 4000, dificil: 4400, estrela: 4800 }
export const STAR_SCORES = [2500, 4500, 6500] as const
export const BELT_GAP = 14

// ---------------------------------------------------------------- nível de joalheira
export const xpForLevel = (l: number) => 25 * (l - 1) * l
export function joalheiraLevel(xp: number): number {
  let l = 1
  while (l < 10 && xp >= xpForLevel(l + 1)) l++
  return l
}
export function newUnlocks(prev: number, now: number) {
  return UNLOCKS.filter((u) => u.level > prev && u.level <= now)
}
export const comboMult = (streak: number) => Math.min(2, 1 + Math.floor(streak / 4) * 0.25)

// ---------------------------------------------------------------- rng no estado
function rnd(s: { rng: number }): number {
  let a = (s.rng = (s.rng + 0x6d2b79f5) >>> 0)
  let t = a
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = <T,>(r: () => number, arr: readonly T[]): T => arr[Math.floor(r() * arr.length) % arr.length]

// ---------------------------------------------------------------- pedido e molde
export function slotCount(type: PieceType, tier: number): number {
  const t = Math.max(0, Math.min(3, tier))
  if (type === 'colar' || type === 'tiara') return 5 + 2 * t
  if (type === 'pulseira') return 6 + 2 * t
  return t < 2 ? 6 : 8
}
const isClosed = (t: PieceType) => t === 'pulseira' || t === 'anel'

export function makeOrder(seed: number, client: number, difficulty: Difficulty, level: number): Order {
  const r = rng((seed + client * 7919) >>> 0)
  const types = unlockedIds(level, 'peça') as PieceType[]
  const prefer = PIECE_TYPES.filter((t) => types.includes(t))
  const type = pick(r, prefer.length ? prefer : (['colar'] as PieceType[]))
  const tierOff = difficulty === 'facil' ? -1 : difficulty === 'normal' ? 0 : 1
  const tier = Math.max(0, Math.min(3, client + tierOff))
  const patterns = unlockedIds(level, 'padrão') as Pattern[]
  const pattern = pick(r, patterns.length ? patterns : (['alternado'] as Pattern[]))
  const pick2 = <T extends string>(all: readonly T[], kind: Parameters<typeof unlockedIds>[1]) => {
    const u = unlockedIds(level, kind)
    const pool = all.filter((x) => u.includes(x))
    return pick(r, pool.length ? pool : all)
  }
  return {
    type,
    metal: pick2(METALS, 'metal'),
    gem: pick2(GEM_COLORS, 'pedra'),
    shape: pick2(GEM_SHAPES, 'lapidação'),
    pearl: pick2(PEARLS, 'pérola'),
    charm: pick(r, CHARMS),
    pattern,
    n: slotCount(type, tier),
    closed: isClosed(type),
    client,
  }
}

/** Sequência de componentes do molde (sempre simétrica). */
export function buildSlots(o: Order): SlotDef[] {
  const { n, closed } = o
  const dist = (i: number) => (closed ? Math.min(i, n - i) : Math.abs(i - (n - 1) / 2))
  const partner = (i: number) => (closed ? (n - i) % n : n - 1 - i)
  const maxD = closed ? n / 2 : (n - 1) / 2
  const pearl: Spec = { kind: 'pearl', tone: o.pearl, shape: 'redonda' }
  const gem: Spec = { kind: 'gem', tone: o.gem, shape: o.shape }
  const link: Spec = { kind: 'link', tone: o.metal, shape: 'elo' }
  const charm: Spec = { kind: 'charm', tone: o.metal, shape: o.charm }
  return Array.from({ length: n }, (_, i) => {
    const d = dist(i)
    let spec: Spec
    let big = false
    switch (o.pattern) {
      case 'alternado':
        spec = i % 2 === 0 ? pearl : gem
        big = spec === gem && Math.abs(d) < 0.01
        break
      case 'simetrico':
        spec = d === 0 ? gem : d <= Math.max(1, Math.round(maxD * 0.6)) ? pearl : link
        big = d === 0
        break
      case 'trio':
        spec = Math.round(d) % 3 === 2 ? gem : pearl
        big = false
        break
      default:
        spec = d === 0 ? charm : Math.round(d) % 2 === 1 ? link : pearl
        big = d === 0
    }
    return { spec, big, partner: partner(i) }
  })
}

// ---------------------------------------------------------------- layout do molde (viewBox 100 x 66)
export interface SlotPos { x: number; y: number; rot: number; size: number }
export const BOARD_W = 100
export const BOARD_H = 66

function sample(fn: (t: number) => [number, number], count: number, closed: boolean): { x: number; y: number; rot: number }[] {
  const M = 400
  const pts: [number, number][] = []
  for (let k = 0; k <= M; k++) pts.push(fn(k / M))
  const cum = [0]
  for (let k = 1; k <= M; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]))
  const total = cum[M]
  const out: { x: number; y: number; rot: number }[] = []
  for (let i = 0; i < count; i++) {
    const target = closed ? (total * i) / count : (total * (i + 0.5)) / count
    let k = 1
    while (k < M && cum[k] < target) k++
    const a = pts[k - 1]
    const b = pts[k]
    const f = (target - cum[k - 1]) / Math.max(1e-6, cum[k] - cum[k - 1])
    out.push({ x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, rot: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI })
  }
  return out
}

/** Curva (caminho) do molde, também usada para desenhar a trilha. */
export function trackFn(type: PieceType): (t: number) => [number, number] {
  switch (type) {
    case 'colar':
      return (t) => [10 + 80 * t, 9 + 44 * (1 - Math.pow(2 * t - 1, 2))]
    case 'tiara':
      return (t) => [10 + 80 * t, 52 - 38 * (1 - Math.pow(2 * t - 1, 2))]
    case 'pulseira':
      return (t) => [50 + 38 * Math.sin(2 * Math.PI * t), 34 - 25 * Math.cos(2 * Math.PI * t)]
    default:
      return (t) => [50 + 23 * Math.sin(2 * Math.PI * t), 34 - 23 * Math.cos(2 * Math.PI * t)]
  }
}

export function slotLayout(type: PieceType, n: number): SlotPos[] {
  const closed = isClosed(type)
  const pts = sample(trackFn(type), n, closed)
  const perim = type === 'colar' || type === 'tiara' ? 100 : type === 'pulseira' ? 175 : 144
  const spacing = perim / n
  const size = Math.max(7.5, Math.min(12.5, spacing * 0.92))
  return pts.map((p) => ({ ...p, size }))
}

// ---------------------------------------------------------------- criação do estado
function newPiece(seed: number, client: number, difficulty: Difficulty, level: number, clock: number): Piece {
  const order = makeOrder(seed, client, difficulty, level)
  const slots = buildSlots(order)
  return { order, slots, placed: slots.map(() => null), mistakes: 0, removals: 0, startedAt: clock }
}

export function createState(seed: number, xp: number, difficulty: Difficulty = 'normal', daily = false, levelOverride?: number): JoiaState {
  const level = levelOverride ?? joalheiraLevel(xp)
  return {
    phase: 'intro', difficulty, daily, seed, rng: seed ^ 0x51ed270b, level,
    time: ROUND_TIME[difficulty], total: ROUND_TIME[difficulty], clock: 0, clientIdx: 0,
    piece: newPiece(seed, 0, difficulty, level, 0),
    belt: [], hand: null, nextId: 1, spawnT: 0.4, score: 0, streak: 0, bestStreak: 0, polished: 0,
    delivered: [], fx: [], sounds: [], lastDelivery: null, deliveryT: 0,
  }
}

export function startRound(s: JoiaState): JoiaState {
  return { ...s, phase: 'playing' }
}
export const setPhase = (s: JoiaState, phase: Phase): JoiaState => ({ ...s, phase })

export function drainSounds(s: JoiaState): { state: JoiaState; sounds: Sfx[] } {
  return s.sounds.length ? { state: { ...s, sounds: [] }, sounds: s.sounds } : { state: s, sounds: [] }
}

// ---------------------------------------------------------------- esteira
const ALL_FAKE_SHAPES = GEM_SHAPES

function junkSpec(s: JoiaState): Spec {
  const o = s.piece.order
  const r = () => rnd(s)
  const needed = new Set(s.piece.slots.map((x) => specKey(x.spec)))
  for (let tries = 0; tries < 12; tries++) {
    const roll = r()
    let spec: Spec
    if (roll < 0.3) spec = { kind: 'gem', tone: pick(r, GEM_COLORS), shape: o.shape }
    else if (roll < 0.45) spec = { kind: 'gem', tone: o.gem, shape: pick(r, GEM_SHAPES) }
    else if (roll < 0.6) spec = { kind: 'pearl', tone: pick(r, PEARLS), shape: 'redonda' }
    else if (roll < 0.75) spec = { kind: 'link', tone: pick(r, METALS), shape: 'elo' }
    else if (roll < 0.87) spec = { kind: 'charm', tone: o.metal, shape: pick(r, CHARMS) }
    else spec = { kind: 'fake', tone: 'opaco', shape: pick(r, ALL_FAKE_SHAPES) }
    if (!needed.has(specKey(spec))) return spec
  }
  return { kind: 'fake', tone: 'opaco', shape: 'redondo' }
}

function neededSpec(s: JoiaState): Spec | null {
  const open: Spec[] = []
  s.piece.slots.forEach((d, i) => {
    const p = s.piece.placed[i]
    if (!p || !p.ok) open.push(d.spec)
  })
  if (!open.length) return null
  return open[Math.floor(rnd(s) * open.length) % open.length]
}

export function beltSpeed(s: JoiaState): number {
  const ramp = 1 + 0.05 * s.clientIdx + 0.35 * (1 - s.time / s.total)
  return BELT_SPEED[s.difficulty] * ramp
}

function spawn(s: JoiaState): void {
  const last = s.belt.reduce((m, b) => Math.max(m, b.x), -99)
  const baseX = Math.max(108, last + BELT_GAP)
  const cluster = s.clientIdx >= 1 && rnd(s) < 0.13
  const items: BeltItem[] = []
  if (cluster) {
    const spec = junkSpec(s)
    for (let k = 0; k < 3; k++) items.push({ id: s.nextId++, spec, x: baseX + k * (BELT_GAP - 1.5) })
  } else {
    const spec = rnd(s) < NEED_CHANCE[s.difficulty] ? neededSpec(s) ?? junkSpec(s) : junkSpec(s)
    items.push({ id: s.nextId++, spec, x: baseX })
  }
  s.belt = [...s.belt, ...items]
  const sp = beltSpeed(s)
  s.spawnT = ((BELT_GAP * (0.95 + rnd(s) * 0.25)) / sp) * (cluster ? 2.6 : 1)
}

const fxPush = (s: JoiaState, text: string, kind: Fx['kind']) => {
  s.fx = [...s.fx.slice(-2), { id: s.nextId++, text, kind, life: 1.5 }]
}

export function tick(prev: JoiaState, dt: number): JoiaState {
  if (prev.phase !== 'playing') return prev
  const s: JoiaState = { ...prev }
  s.time = prev.time - dt
  s.clock = prev.clock + dt
  const sp = beltSpeed(s)
  let moved = false
  const belt: BeltItem[] = []
  for (const b of prev.belt) {
    const x = b.x - sp * dt
    if (x > -10) belt.push({ ...b, x })
    else moved = true
  }
  s.belt = belt
  void moved
  s.spawnT = prev.spawnT - dt
  if (s.spawnT <= 0) {
    const last = s.belt.reduce((m, b) => Math.max(m, b.x), -99)
    if (last <= 108 - BELT_GAP) spawn(s)
    else s.spawnT = 0.06
  }
  if (prev.fx.length) s.fx = prev.fx.map((f) => ({ ...f, life: f.life - dt })).filter((f) => f.life > 0)
  if (prev.deliveryT > 0) {
    s.deliveryT = Math.max(0, prev.deliveryT - dt)
    if (s.deliveryT === 0) s.lastDelivery = null
  }
  if (s.time <= 0) return finishRound(s)
  return s
}

// ---------------------------------------------------------------- ações
function runAround(belt: BeltItem[], id: number): number[] {
  const sorted = [...belt].sort((a, b) => a.x - b.x)
  const i = sorted.findIndex((b) => b.id === id)
  if (i < 0) return []
  const key = specKey(sorted[i].spec)
  let a = i
  let b = i
  while (a > 0 && specKey(sorted[a - 1].spec) === key) a--
  while (b < sorted.length - 1 && specKey(sorted[b + 1].spec) === key) b++
  return sorted.slice(a, b + 1).map((x) => x.id)
}

/** Ids da esteira que formam uma sequência de 3+ iguais (para o brilho de aviso). */
export function polishableIds(belt: BeltItem[]): Set<number> {
  const out = new Set<number>()
  const sorted = [...belt].sort((a, b) => a.x - b.x)
  let i = 0
  while (i < sorted.length) {
    let j = i
    while (j + 1 < sorted.length && specKey(sorted[j + 1].spec) === specKey(sorted[i].spec)) j++
    if (j - i >= 2) for (let k = i; k <= j; k++) out.add(sorted[k].id)
    i = j + 1
  }
  return out
}

export function grab(prev: JoiaState, id: number): JoiaState {
  if (prev.phase !== 'playing') return prev
  const item = prev.belt.find((b) => b.id === id)
  if (!item) return prev
  const run = runAround(prev.belt, id)
  const s: JoiaState = { ...prev }
  let belt = prev.belt.filter((b) => b.id !== id)
  if (prev.hand) belt = [...belt, { ...prev.hand.item, x: item.x }]
  s.belt = belt
  s.hand = { item, run }
  s.sounds = [...prev.sounds, 'tap']
  return s
}

export function dropHand(prev: JoiaState): JoiaState {
  return prev.hand ? { ...prev, hand: null, belt: [...prev.belt, { ...prev.hand.item, x: Math.max(4, prev.belt.length ? 6 : 50) }] } : prev
}

export function placeHand(prev: JoiaState, slot: number): JoiaState {
  if (prev.phase !== 'playing' || !prev.hand) return prev
  const piece = prev.piece
  if (slot < 0 || slot >= piece.slots.length) return prev
  const cur = piece.placed[slot]
  if (cur && cur.ok) return prev
  const spec = prev.hand.item.spec
  const ok = sameSpec(spec, piece.slots[slot].spec)
  const s: JoiaState = { ...prev }
  if (!ok && prev.difficulty === 'facil') {
    s.piece = { ...piece, mistakes: piece.mistakes + 0.5 }
    s.streak = 0
    s.sounds = [...prev.sounds, 'bad']
    fxPush(s, 'Não é essa peça', 'bad')
    return s
  }
  const placed = piece.placed.slice()
  placed[slot] = { spec, ok }
  s.hand = null
  if (ok) {
    s.streak = prev.streak + 1
    s.bestStreak = Math.max(prev.bestStreak, s.streak)
    const gain = Math.round(25 * comboMult(s.streak))
    s.score = prev.score + gain
    s.sounds = [...prev.sounds, s.streak % 4 === 0 ? 'combo' : 'serve']
    if (s.streak >= 4 && s.streak % 4 === 0) fxPush(s, `Combo x${comboMult(s.streak)}`, 'combo')
    s.piece = { ...piece, placed }
  } else {
    s.streak = 0
    s.sounds = [...prev.sounds, 'bad']
    fxPush(s, 'Peça errada', 'bad')
    s.piece = { ...piece, placed, mistakes: piece.mistakes + 1 }
  }
  if (s.piece.placed.every((p) => p && p.ok)) return deliver(s)
  return s
}

/** Tira uma peça errada do molde (perde a peça). */
export function clearSlot(prev: JoiaState, slot: number): JoiaState {
  const p = prev.piece.placed[slot]
  if (prev.phase !== 'playing' || !p || p.ok) return prev
  const placed = prev.piece.placed.slice()
  placed[slot] = null
  return { ...prev, piece: { ...prev.piece, placed, removals: prev.piece.removals + 1 }, sounds: [...prev.sounds, 'trash'] }
}

export function polishHand(prev: JoiaState): JoiaState {
  if (prev.phase !== 'playing' || !prev.hand) return prev
  const s: JoiaState = { ...prev, hand: null }
  const run = prev.hand.run.filter((id) => id === prev.hand!.item.id || prev.belt.some((b) => b.id === id))
  if (run.length >= 3) {
    const set = new Set(run)
    s.belt = prev.belt.filter((b) => !set.has(b.id))
    s.streak = prev.streak + 1
    s.bestStreak = Math.max(prev.bestStreak, s.streak)
    s.polished = prev.polished + 1
    s.score = prev.score + Math.round(60 * run.length * comboMult(s.streak))
    s.sounds = [...prev.sounds, 'combo']
    fxPush(s, `Polido x${run.length}!`, 'combo')
  } else {
    s.sounds = [...prev.sounds, 'trash']
  }
  return s
}

// ---------------------------------------------------------------- pontuação da peça
export function scorePiece(piece: Piece, clock: number, difficulty: Difficulty): Omit<Delivered, 'comment'> {
  const n = piece.slots.length
  const correct = piece.placed.filter((p) => p?.ok).length
  const fidelity = correct / n
  let units = 0
  let good = 0
  for (let i = 0; i < n; i++) {
    const j = piece.slots[i].partner
    if (j < i) continue
    units++
    const a = piece.placed[i]
    const b = piece.placed[j]
    if (a && b && sameSpec(a.spec, b.spec)) good++
  }
  const symmetry = units ? good / units : 0
  const seconds = Math.max(1, clock - piece.startedAt)
  const par = n * PAR_PER_SLOT[difficulty]
  const tempo = Math.max(0.2, Math.min(1, par / seconds))
  const quality = Math.max(0.2, 1 - 0.1 * piece.mistakes - 0.03 * piece.removals)
  const complete = correct === n
  const impecavel = complete && symmetry === 1 && piece.mistakes === 0 && piece.removals === 0
  const base = 1000 * (0.4 * fidelity + 0.2 * symmetry + 0.2 * tempo + 0.2 * quality) * (1 + 0.08 * piece.order.client)
  const score = Math.round(base + (impecavel ? 250 : 0))
  return {
    order: piece.order,
    specs: piece.placed.map((p) => p?.spec ?? null),
    oks: piece.placed.map((p) => !!p?.ok),
    fidelity, symmetry, tempo, quality, score, impecavel, seconds, complete,
  }
}

function commentFor(d: Omit<Delivered, 'comment'>, seed: number): string {
  const r = rng(seed)
  if (d.impecavel) return pick(r, COMMENTS.perfect)
  const avg = 0.4 * d.fidelity + 0.2 * d.symmetry + 0.2 * d.tempo + 0.2 * d.quality
  if (avg >= 0.82) return d.tempo < 0.5 ? pick(r, COMMENTS.late) : pick(r, COMMENTS.good)
  if (avg >= 0.55) return pick(r, COMMENTS.ok)
  return pick(r, COMMENTS.bad)
}

function deliver(prev: JoiaState): JoiaState {
  const s: JoiaState = { ...prev }
  const raw = scorePiece(prev.piece, prev.clock, prev.difficulty)
  const d: Delivered = { ...raw, comment: commentFor(raw, prev.seed + prev.clientIdx * 31) }
  s.delivered = [...prev.delivered, d]
  s.score = prev.score + d.score
  s.hand = null
  s.lastDelivery = d
  s.deliveryT = 2.6
  s.sounds = [...prev.sounds, d.impecavel ? 'done' : 'tip']
  const nextIdx = prev.clientIdx + 1
  s.clientIdx = nextIdx
  if (nextIdx >= MAX_CLIENTS) {
    s.score += Math.round(Math.max(0, prev.time) * 4)
    return { ...s, phase: 'done' }
  }
  s.time = Math.min(prev.total, prev.time + (d.impecavel ? 6 : 3))
  s.piece = newPiece(prev.seed, nextIdx, prev.difficulty, prev.level, prev.clock)
  s.belt = prev.belt.filter((b) => b.x > 30)
  s.spawnT = 0.5
  return s
}

/** Entrega a peça como está (mesmo incompleta). */
export function deliverNow(prev: JoiaState): JoiaState {
  if (prev.phase !== 'playing') return prev
  if (!prev.piece.placed.some((p) => p)) return prev
  return deliver(prev)
}

/** Fim do tempo: a peça em andamento é entregue como está. */
function finishRound(prev: JoiaState): JoiaState {
  const s: JoiaState = { ...prev, phase: 'done', hand: null }
  if (prev.piece.placed.some((p) => p)) {
    const raw = scorePiece(prev.piece, prev.clock, prev.difficulty)
    const d: Delivered = { ...raw, comment: commentFor(raw, prev.seed + prev.clientIdx * 31) }
    s.delivered = [...prev.delivered, d]
    s.score = prev.score + d.score
  }
  s.time = 0
  s.sounds = [...prev.sounds, 'done']
  return s
}

// ---------------------------------------------------------------- resultados
export interface Results {
  score: number
  stars: number
  pieces: Delivered[]
  fidelity: number
  symmetry: number
  tempo: number
  quality: number
  impecaveis: number
  bestStreak: number
  polished: number
  coins: number
  xp: number
  joiaXp: number
  difficulty: Difficulty
}

export function computeResults(s: JoiaState): Results {
  const pieces = s.delivered
  const avg = (k: 'fidelity' | 'symmetry' | 'tempo' | 'quality') => (pieces.length ? pieces.reduce((a, p) => a + p[k], 0) / pieces.length : 0)
  const score = Math.round(s.score)
  const stars = score >= STAR_SCORES[2] ? 3 : score >= STAR_SCORES[1] ? 2 : score >= STAR_SCORES[0] ? 1 : 0
  const mult = DIFFICULTY_REWARD[s.difficulty]
  return {
    score, stars, pieces,
    fidelity: avg('fidelity'), symmetry: avg('symmetry'), tempo: avg('tempo'), quality: avg('quality'),
    impecaveis: pieces.filter((p) => p.impecavel).length,
    bestStreak: s.bestStreak, polished: s.polished,
    coins: Math.round((score / 45) * mult),
    xp: Math.round((20 + score / 90) * mult),
    joiaXp: Math.round((18 + score / 55) * mult),
    difficulty: s.difficulty,
  }
}

export const clientOf = (idx: number) => CLIENTS[idx % CLIENTS.length]
