/**
 * Logica pura do Cafe Rose (sem React / DOM / relogio): funcoes que recebem um estado e devolvem
 * outro. O tempo entra como `dt`, o acaso vem de uma semente (mulberry32) guardada no estado, entao
 * tudo e deterministico e testavel.
 */
import {
  ACCESSORIES, HAIRS, HAIR_STYLES, SHIRTS, SIZES, SKINS, UNLOCKS, unlockedAt,
  type Accessory, type Base, type HairStyle, type Size, type Sweet, type Topping, type Unlocked,
} from './data'

// ---------------------------------------------------------------- constantes de balanceamento
export const ROUND_SECONDS = 90
export const SLOTS = 3
export const PATIENCE_START = 24 // s (base, no inicio da rodada)
export const PATIENCE_END = 13 // s (no fim)
export const PATIENCE_PER_TOPPING = 2
export const PATIENCE_SWEET = 3
export const ARRIVAL_START = 6 // s entre clientes
export const ARRIVAL_END = 3.4
export const MIN_ARRIVAL_GAP = 1.3 // s: mesmo sem fila, o proximo cliente nao chega antes disso
export const WRONG_PENALTY = 30
export const TIMEOUT_PENALTY = 15
export const LEAVE_SECONDS = 1.1
export const STAR_SCORES = [800, 2500, 5500] as const
export const HEARTS = 4
export const FX_SECONDS = 1.3

// ---------------------------------------------------------------- tipos
export interface Order {
  size: Size
  base: Base
  toppings: Topping[]
  sweet: Sweet | null
}
export interface Tray {
  size: Size | null
  base: Base | null
  toppings: Topping[]
  sweet: Sweet | null
}
export interface Look {
  skin: string
  hair: string
  hairStyle: HairStyle
  shirt: string
  accessory: Accessory
}
export interface Customer {
  id: number
  slot: number
  order: Order
  look: Look
  patience: number
  maxPatience: number
  /** quando vai embora: humor e tempo restante da animacao */
  leaving: { mood: 'happy' | 'angry'; t: number } | null
}
export type FxKind = 'good' | 'tip' | 'bad' | 'combo' | 'info'
export interface Fx {
  id: number
  slot: number // -1 = geral
  text: string
  kind: FxKind
  ttl: number
}
export type Phase = 'intro' | 'playing' | 'paused' | 'done'
export type SoundId = 'tap' | 'serve' | 'tip' | 'bad' | 'trash' | 'done' | 'combo'

export interface CafeState {
  phase: Phase
  rng: number
  nextId: number
  level: number
  unlocked: Unlocked
  time: number
  customers: (Customer | null)[]
  tray: Tray
  score: number
  streak: number
  bestStreak: number
  served: number
  failed: number
  tips: number
  nextArrival: number
  fx: Fx[]
  /** sons pendentes para a UI tocar (consumidos por `drainSounds`) */
  sounds: SoundId[]
}

// ---------------------------------------------------------------- acaso
/** mulberry32 funcional: devolve [valor 0..1, novaSemente]. */
export function rand(seed: number): [number, number] {
  const a = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(a ^ (a >>> 15), 1 | a)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a]
}

export interface RandomSource {
  next(): number
  int(n: number): number
  pick<T>(arr: readonly T[]): T
}

export class Rng implements RandomSource {
  constructor(public seed: number) {}
  next(): number {
    const [v, s] = rand(this.seed)
    this.seed = s
    return v
  }
  int(n: number): number {
    return Math.floor(this.next() * n)
  }
  pick<T>(arr: readonly T[]): T {
    return arr[this.int(arr.length)]
  }
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

// ---------------------------------------------------------------- nivel de Barista
/** XP acumulado necessario para o nivel n: 30*n*(n-1) (60, 180, 360, 600...). */
export function xpForLevel(n: number): number {
  return 30 * n * (n - 1)
}
export function baristaLevel(xp: number): number {
  let n = 1
  while (n < 10 && xp >= xpForLevel(n + 1)) n++
  return n
}
export function newUnlocks(prevLevel: number, level: number) {
  return UNLOCKS.filter((u) => u.level > prevLevel && u.level <= level)
}

// ---------------------------------------------------------------- pedidos
export function progressOf(s: Pick<CafeState, 'time'>): number {
  return clamp01(1 - s.time / ROUND_SECONDS)
}

/** Gera um pedido valido para o que esta liberado; a dificuldade (coberturas, doce) sobe com `progress`. */
export function generateOrder(rng: RandomSource, unlocked: Unlocked, progress: number): Order {
  const size = rng.pick(SIZES)
  const base = rng.pick(unlocked.bases)
  const maxT = Math.min(unlocked.toppings.length, 1 + Math.floor(progress * 2.6))
  const minT = progress < 0.15 ? 0 : 1
  const count = Math.min(maxT, minT + rng.int(maxT - minT + 1))
  const pool = [...unlocked.toppings]
  const toppings: Topping[] = []
  for (let i = 0; i < count; i++) toppings.push(pool.splice(rng.int(pool.length), 1)[0])
  const sweet = unlocked.sweets.length > 0 && rng.next() < 0.35 ? rng.pick(unlocked.sweets) : null
  return { size, base, toppings, sweet }
}

export function ordersMatch(order: Order, tray: Tray): boolean {
  if (tray.size !== order.size || tray.base !== order.base) return false
  if (tray.sweet !== order.sweet) return false
  if (tray.toppings.length !== order.toppings.length) return false
  return order.toppings.every((t) => tray.toppings.includes(t))
}

export function orderBasePoints(o: Order): number {
  return 100 + 20 * o.toppings.length + (o.sweet ? 40 : 0) + (o.size === 'G' ? 20 : o.size === 'M' ? 10 : 0)
}
/** Gorjeta em fracao do valor do pedido segundo a paciencia restante. */
export function tipFraction(patienceFrac: number): number {
  return patienceFrac >= 0.6 ? 0.5 : patienceFrac >= 0.3 ? 0.2 : 0
}
export function comboMultiplier(streak: number): 1 | 2 | 3 {
  return streak >= 6 ? 3 : streak >= 3 ? 2 : 1
}
export function heartsOf(c: Pick<Customer, 'patience' | 'maxPatience'>): number {
  return Math.max(0, Math.ceil(clamp01(c.patience / c.maxPatience) * HEARTS - 1e-6))
}
export function emptyTray(): Tray {
  return { size: null, base: null, toppings: [], sweet: null }
}

// ---------------------------------------------------------------- estado
export function createState(seed: number, baristaXp: number): CafeState {
  const level = baristaLevel(baristaXp)
  return {
    phase: 'intro',
    rng: seed >>> 0,
    nextId: 1,
    level,
    unlocked: unlockedAt(level),
    time: ROUND_SECONDS,
    customers: Array.from({ length: SLOTS }, () => null),
    tray: emptyTray(),
    score: 0,
    streak: 0,
    bestStreak: 0,
    served: 0,
    failed: 0,
    tips: 0,
    nextArrival: 0,
    fx: [],
    sounds: [],
  }
}

function draft(s: CafeState): CafeState {
  return {
    ...s,
    customers: s.customers.slice(),
    tray: { ...s.tray, toppings: s.tray.toppings.slice() },
    fx: s.fx.slice(),
    sounds: s.sounds.slice(),
  }
}

function addFx(s: CafeState, slot: number, text: string, kind: FxKind) {
  s.fx.push({ id: s.nextId++, slot, text, kind, ttl: FX_SECONDS })
}

function spawnCustomer(s: CafeState, rng: Rng): boolean {
  const free = s.customers.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0)
  if (free.length === 0) return false
  const slot = rng.pick(free)
  const p = progressOf(s)
  const order = generateOrder(rng, s.unlocked, p)
  const maxPatience =
    lerp(PATIENCE_START, PATIENCE_END, p) + PATIENCE_PER_TOPPING * order.toppings.length + (order.sweet ? PATIENCE_SWEET : 0)
  const look: Look = {
    skin: rng.pick(SKINS),
    hair: rng.pick(HAIRS),
    hairStyle: rng.pick(HAIR_STYLES),
    shirt: rng.pick(SHIRTS),
    accessory: rng.pick(ACCESSORIES),
  }
  s.customers[slot] = { id: s.nextId++, slot, order, look, patience: maxPatience, maxPatience, leaving: null }
  return true
}

/** Comeca a rodada: zera tudo e ja chama o primeiro cliente. */
export function startRound(s: CafeState, seed?: number): CafeState {
  const n = createState(seed ?? s.rng, 0)
  n.level = s.level
  n.unlocked = s.unlocked
  const rng = new Rng(n.rng)
  n.phase = 'playing'
  spawnCustomer(n, rng)
  n.nextArrival = 2
  n.rng = rng.seed
  return n
}

export function setPhase(s: CafeState, phase: Phase): CafeState {
  return s.phase === phase ? s : { ...s, phase }
}

/** Devolve (e zera) os sons pendentes. */
export function drainSounds(s: CafeState): { state: CafeState; sounds: SoundId[] } {
  if (s.sounds.length === 0) return { state: s, sounds: [] }
  return { state: { ...s, sounds: [] }, sounds: s.sounds }
}

/** Avanca o relogio da rodada em `dt` segundos (so em 'playing'). */
export function tick(state: CafeState, dtIn: number): CafeState {
  if (state.phase !== 'playing') return state
  const dt = Math.min(dtIn, 0.25)
  const s = draft(state)
  const rng = new Rng(s.rng)
  s.time = Math.max(0, s.time - dt)

  for (let i = 0; i < SLOTS; i++) {
    const c = s.customers[i]
    if (!c) continue
    if (c.leaving) {
      const t = c.leaving.t - dt
      s.customers[i] = t <= 0 ? null : { ...c, leaving: { ...c.leaving, t } }
      continue
    }
    const patience = c.patience - dt
    if (patience <= 0) {
      s.customers[i] = { ...c, patience: 0, leaving: { mood: 'angry', t: LEAVE_SECONDS } }
      s.streak = 0
      s.failed++
      s.score = Math.max(0, s.score - TIMEOUT_PENALTY)
      addFx(s, i, `-${TIMEOUT_PENALTY}`, 'bad')
      s.sounds.push('bad')
    } else s.customers[i] = { ...c, patience }
  }

  s.nextArrival -= dt
  const waiting = s.customers.filter((c) => c && !c.leaving).length
  if (waiting === 0) s.nextArrival = Math.min(s.nextArrival, MIN_ARRIVAL_GAP)
  if (s.time > 4 && s.nextArrival <= 0) {
    if (spawnCustomer(s, rng)) {
      s.nextArrival = lerp(ARRIVAL_START, ARRIVAL_END, progressOf(s)) * (0.8 + 0.4 * rng.next())
    } else s.nextArrival = 0.5
  }

  s.fx = s.fx.map((f) => ({ ...f, ttl: f.ttl - dt })).filter((f) => f.ttl > 0)
  s.rng = rng.seed

  if (s.time <= 0) {
    s.phase = 'done'
    s.sounds.push('done')
  }
  return s
}

// ---------------------------------------------------------------- acoes do jogador
export type Ingredient =
  | { kind: 'size'; id: Size }
  | { kind: 'base'; id: Base }
  | { kind: 'topping'; id: Topping }
  | { kind: 'sweet'; id: Sweet }

export function isUnlocked(u: Unlocked, ing: Ingredient): boolean {
  if (ing.kind === 'size') return true
  if (ing.kind === 'base') return u.bases.includes(ing.id)
  if (ing.kind === 'topping') return u.toppings.includes(ing.id)
  return u.sweets.includes(ing.id)
}

/** Toca num ingrediente: tamanho/base trocam; cobertura/doce ligam e desligam. */
export function addIngredient(state: CafeState, ing: Ingredient): CafeState {
  if (state.phase !== 'playing' || !isUnlocked(state.unlocked, ing)) return state
  const s = draft(state)
  s.sounds.push('tap')
  if (ing.kind === 'size') s.tray.size = ing.id
  else if (ing.kind === 'base') s.tray.base = ing.id
  else if (ing.kind === 'topping') {
    const i = s.tray.toppings.indexOf(ing.id)
    if (i >= 0) s.tray.toppings.splice(i, 1)
    else s.tray.toppings.push(ing.id)
  } else s.tray.sweet = s.tray.sweet === ing.id ? null : ing.id
  return s
}

export function trashTray(state: CafeState): CafeState {
  if (state.phase !== 'playing') return state
  const t = state.tray
  if (!t.size && !t.base && !t.toppings.length && !t.sweet) return state
  const s = draft(state)
  s.tray = emptyTray()
  s.sounds.push('trash')
  return s
}

/** Entrega a bandeja ao cliente do balcao `slot`. */
export function serve(state: CafeState, slot: number): CafeState {
  if (state.phase !== 'playing') return state
  const c = state.customers[slot]
  if (!c || c.leaving) return state
  const s = draft(state)
  if (!s.tray.size || !s.tray.base) {
    addFx(s, slot, 'Monte o copo!', 'info')
    s.sounds.push('bad')
    return s
  }
  const ok = ordersMatch(c.order, s.tray)
  s.tray = emptyTray()
  if (ok) {
    const frac = c.patience / c.maxPatience
    const base = orderBasePoints(c.order)
    const tip = Math.round(base * tipFraction(frac))
    s.streak++
    s.bestStreak = Math.max(s.bestStreak, s.streak)
    const mult = comboMultiplier(s.streak)
    const gained = (base + tip) * mult
    s.score += gained
    s.tips += tip * mult
    s.served++
    s.customers[slot] = { ...c, leaving: { mood: 'happy', t: LEAVE_SECONDS } }
    addFx(s, slot, `+${gained}`, 'good')
    if (tip > 0) addFx(s, slot, 'Gorjeta!', 'tip')
    if (mult > 1 && (s.streak === 3 || s.streak === 6)) {
      addFx(s, -1, `Combo x${mult}!`, 'combo')
      s.sounds.push('combo')
    }
    s.sounds.push(tip > 0 ? 'tip' : 'serve')
  } else {
    s.streak = 0
    s.failed++
    s.score = Math.max(0, s.score - WRONG_PENALTY)
    s.customers[slot] = { ...c, leaving: { mood: 'angry', t: LEAVE_SECONDS } }
    addFx(s, slot, 'Pedido errado!', 'bad')
    s.sounds.push('bad')
  }
  return s
}

// ---------------------------------------------------------------- resultado
export interface Results {
  score: number
  stars: 0 | 1 | 2 | 3
  served: number
  failed: number
  bestStreak: number
  tips: number
  coins: number
  xp: number
  baristaXp: number
}
export function starsFor(score: number): 0 | 1 | 2 | 3 {
  return score >= STAR_SCORES[2] ? 3 : score >= STAR_SCORES[1] ? 2 : score >= STAR_SCORES[0] ? 1 : 0
}
export function computeResults(s: CafeState): Results {
  const stars = starsFor(s.score)
  return {
    score: s.score,
    stars,
    served: s.served,
    failed: s.failed,
    bestStreak: s.bestStreak,
    tips: s.tips,
    coins: Math.round(s.score / 60) + stars * 5,
    xp: s.served > 0 ? 10 + stars * 10 + s.served : 0,
    baristaXp: s.served * 3 + stars * 5,
  }
}
