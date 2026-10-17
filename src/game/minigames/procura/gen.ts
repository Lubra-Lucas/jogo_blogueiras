/**
 * "Cadê a Blogueira?": geração procedural das cenas e dos alvos (pura, sem React).
 * Tudo sai de uma semente: o Desafio do dia gera exatamente as mesmas cenas para todas as jogadoras.
 */
import { rng, type Difficulty } from '../shared/competition'

export type ThemeId = 'praca' | 'avenida' | 'praia' | 'shopping' | 'palco'
export const THEMES: ThemeId[] = ['praca', 'avenida', 'praia', 'shopping', 'palco']
export const THEME_NAME: Record<ThemeId, string> = {
  praca: 'Praça Central em festival',
  avenida: 'Avenida da Moda em dia de desfile',
  praia: 'Praia de Miami',
  shopping: 'Shopping Vitrine',
  palco: 'Pista do Palco Neon',
}

// ---------------------------------------------------------------- paletas
export interface ColorDef { m: string; f: string; hex: string; w: number }
/** Cores do mundo real; rosa entra só como acento raro (peso baixo). */
export const COLORS: ColorDef[] = [
  { m: 'vermelho', f: 'vermelha', hex: '#b3262f', w: 1 },
  { m: 'azul-marinho', f: 'azul-marinho', hex: '#1e2f5a', w: 1 },
  { m: 'mostarda', f: 'mostarda', hex: '#d19a26', w: 1 },
  { m: 'verde', f: 'verde', hex: '#2a7a58', w: 1 },
  { m: 'preto', f: 'preta', hex: '#1b1b20', w: 1 },
  { m: 'branco', f: 'branca', hex: '#f1ede3', w: 1 },
  { m: 'dourado', f: 'dourada', hex: '#d4a93c', w: 0.8 },
  { m: 'camelo', f: 'camelo', hex: '#b88a5a', w: 1 },
  { m: 'turquesa', f: 'turquesa', hex: '#23a0a0', w: 0.9 },
  { m: 'bordô', f: 'bordô', hex: '#6d1a2c', w: 0.9 },
  { m: 'cinza', f: 'cinza', hex: '#8a8f99', w: 0.8 },
  { m: 'laranja', f: 'laranja', hex: '#e0702a', w: 0.8 },
  { m: 'roxo', f: 'roxa', hex: '#6b3f98', w: 0.7 },
  { m: 'azul-claro', f: 'azul-claro', hex: '#79a9d6', w: 0.8 },
  { m: 'rosa', f: 'rosa', hex: '#e58aa8', w: 0.25 },
]
export const SKINS = ['#f6d9c3', '#efc3a0', '#e0a97c', '#c98b5e', '#a86a43', '#7d4a2e', '#5a3420', '#3f2316']
export const HAIR_COLORS = [
  { m: 'preto', hex: '#17120f' },
  { m: 'castanho', hex: '#4e3022' },
  { m: 'loiro', hex: '#d9b36a' },
  { m: 'ruivo', hex: '#a8431f' },
  { m: 'grisalho', hex: '#b9b6b0' },
]
export const BOW_COLORS = [0, 1, 2, 9, 5, 14, 8, 12]

export type HairStyle = 'short' | 'bob' | 'long' | 'bun' | 'pony' | 'curly'
export type HatKind = 'none' | 'sun' | 'beret' | 'cap' | 'beanie' | 'fedora'
export type GlassesKind = 'none' | 'round' | 'cat' | 'aviator' | 'square'
export type BagKind = 'none' | 'tote' | 'clutch' | 'mini'
export type Outfit = 'dress' | 'topbottom' | 'jumpsuit'
export type BottomKind = 'skirt' | 'pants' | 'shorts'
export type Pose = 'stand' | 'walk' | 'photo' | 'sit'
export type Pattern = 'none' | 'stripes' | 'dots'

export const HAIR_NAME: Record<HairStyle, string> = { short: 'curto', bob: 'chanel', long: 'longo', bun: 'com coque', pony: 'com rabo de cavalo', curly: 'cacheado' }
export const HAT_NAME: Record<Exclude<HatKind, 'none'>, [string, 'm' | 'f']> = {
  sun: ['chapéu de aba larga', 'm'],
  beret: ['boina', 'f'],
  cap: ['boné', 'm'],
  beanie: ['gorro', 'm'],
  fedora: ['chapéu fedora', 'm'],
}
export const GLASSES_NAME: Record<Exclude<GlassesKind, 'none'>, string> = { round: 'óculos redondo', cat: 'óculos gatinho', aviator: 'óculos aviador', square: 'óculos quadrado' }
export const BAG_NAME: Record<Exclude<BagKind, 'none'>, string> = { tote: 'bolsa grande', clutch: 'clutch', mini: 'bolsa pequena a tiracolo' }

export interface Look {
  skin: number
  hairStyle: HairStyle
  hairColor: number
  hat: HatKind
  hatColor: number
  glasses: GlassesKind
  bag: BagKind
  bagColor: number
  outfit: Outfit
  bottom: BottomKind
  topColor: number
  bottomColor: number
  pattern: Pattern
  scarf: number // -1 = sem cachecol
  build: 0 | 1 | 2
  /** câmera pendurada (turista) */
  tourist: boolean
  /** fotógrafo profissional: câmera grande com lente longa e colete escuro */
  pro: boolean
}

export interface Person { kind: 'person'; id: number; x: number; y: number; s: number; pose: Pose; flip: boolean; look: Look }
export interface Pet { kind: 'pet'; id: number; x: number; y: number; s: number; flip: boolean; species: 'dog' | 'cat'; coat: number; bow: number }
export type Entity = Person | Pet

export interface Rect { x0: number; y0: number; x1: number; y1: number }
export interface Prop { type: string; x: number; y: number; s: number; v: number }

export interface SceneTarget {
  id: number
  kind: 'person' | 'group' | 'role'
  /** "Ache a blogueira de ..." */
  text: string
  /** descrição curta, sem depender de cor, mostrada na lista */
  count: number
  ids: number[]
  /** entidade usada no retrato da lista */
  sample: Entity
  /** alvo-pessoa: o look de referência e os atributos exigidos (para conferir a unicidade) */
  ref?: Look
  reqs?: ReqKey[]
}

export interface Scene {
  theme: ThemeId
  seed: number
  W: number
  H: number
  horizon: number
  props: Prop[]
  entities: Entity[]
  targets: SceneTarget[]
}

// ---------------------------------------------------------------- utilidades
type R = () => number
const pick = <T,>(r: R, a: readonly T[]): T => a[Math.floor(r() * a.length) % a.length]
function pickColor(r: R, not: number[] = []): number {
  const pool = COLORS.map((c, i) => ({ i, w: not.includes(i) ? 0 : c.w }))
  const tot = pool.reduce((s, p) => s + p.w, 0)
  let t = r() * tot
  for (const p of pool) {
    t -= p.w
    if (t <= 0) return p.i
  }
  return 0
}

export function randomLook(r: R): Look {
  const outfit: Outfit = pick(r, ['dress', 'dress', 'topbottom', 'topbottom', 'topbottom', 'jumpsuit'])
  return {
    skin: Math.floor(r() * SKINS.length),
    hairStyle: pick(r, ['short', 'bob', 'long', 'long', 'bun', 'pony', 'curly']),
    hairColor: Math.floor(r() * HAIR_COLORS.length),
    hat: r() < 0.3 ? pick(r, ['sun', 'beret', 'cap', 'beanie', 'fedora']) : 'none',
    hatColor: pickColor(r),
    glasses: r() < 0.32 ? pick(r, ['round', 'cat', 'aviator', 'square']) : 'none',
    bag: r() < 0.5 ? pick(r, ['tote', 'clutch', 'mini']) : 'none',
    bagColor: pickColor(r),
    outfit,
    bottom: pick(r, ['skirt', 'pants', 'pants', 'shorts']),
    topColor: pickColor(r),
    bottomColor: pickColor(r),
    pattern: r() < 0.28 ? pick(r, ['stripes', 'dots']) : 'none',
    scarf: r() < 0.14 ? pickColor(r) : -1,
    build: pick(r, [0, 1, 1, 2] as const),
    tourist: r() < 0.06,
    pro: false,
  }
}

// ---------------------------------------------------------------- requisitos de um alvo-pessoa
export type ReqKey = 'hat' | 'bag' | 'glasses' | 'top' | 'scarf' | 'hair'
const feminine = (c: ColorDef | undefined, g: 'm' | 'f') => (c ? (g === 'f' ? c.f : c.m) : '')

export function reqPhrase(k: ReqKey, l: Look): string {
  switch (k) {
    case 'hat': {
      const [n, g] = HAT_NAME[l.hat as Exclude<HatKind, 'none'>]
      return `${n} ${feminine(COLORS[l.hatColor], g)}`
    }
    case 'bag':
      return `${BAG_NAME[l.bag as Exclude<BagKind, 'none'>]} ${feminine(COLORS[l.bagColor], 'f')}`
    case 'glasses':
      return GLASSES_NAME[l.glasses as Exclude<GlassesKind, 'none'>]
    case 'scarf':
      return `cachecol ${feminine(COLORS[l.scarf], 'm')}`
    case 'hair':
      return `cabelo ${HAIR_NAME[l.hairStyle]} ${HAIR_COLORS[l.hairColor].m}`
    case 'top': {
      const pat = l.pattern === 'stripes' ? ' listrado' : l.pattern === 'dots' ? ' de bolinhas' : ''
      if (l.outfit === 'dress') return `vestido ${feminine(COLORS[l.topColor], 'm')}${pat}`
      if (l.outfit === 'jumpsuit') return `macacão ${feminine(COLORS[l.topColor], 'm')}${pat}`
      return `blusa ${feminine(COLORS[l.topColor], 'f')}${pat}`
    }
  }
}

function sameReq(k: ReqKey, a: Look, b: Look): boolean {
  switch (k) {
    case 'hat': return a.hat === b.hat && a.hatColor === b.hatColor
    case 'bag': return a.bag === b.bag && a.bagColor === b.bagColor
    case 'glasses': return a.glasses === b.glasses
    case 'scarf': return a.scarf === b.scarf
    case 'hair': return a.hairStyle === b.hairStyle && a.hairColor === b.hairColor
    case 'top': return a.topColor === b.topColor && a.pattern === b.pattern && (a.outfit === 'topbottom') === (b.outfit === 'topbottom')
  }
}

const matchesAll = (l: Look, ref: Look, reqs: ReqKey[]) => !l.pro && reqs.every((k) => sameReq(k, l, ref))

/** Muda um atributo requerido para algo diferente. `subtle` = só a cor, mantendo o formato (mais difícil). */
function breakReq(r: R, k: ReqKey, l: Look, subtle: boolean) {
  const swapColor = (cur: number) => pickColor(r, [cur])
  switch (k) {
    case 'hat':
      if (subtle) l.hatColor = swapColor(l.hatColor)
      else if (r() < 0.5) l.hatColor = swapColor(l.hatColor)
      else l.hat = pick(r, (['sun', 'beret', 'cap', 'beanie', 'fedora'] as HatKind[]).filter((h) => h !== l.hat))
      break
    case 'bag':
      if (subtle || r() < 0.5) l.bagColor = swapColor(l.bagColor)
      else l.bag = pick(r, (['tote', 'clutch', 'mini'] as BagKind[]).filter((b) => b !== l.bag))
      break
    case 'glasses':
      l.glasses = pick(r, (['none', 'round', 'cat', 'aviator', 'square'] as GlassesKind[]).filter((g) => g !== l.glasses))
      break
    case 'scarf':
      l.scarf = r() < 0.4 ? -1 : swapColor(l.scarf)
      break
    case 'hair':
      if (subtle || r() < 0.5) l.hairColor = (l.hairColor + 1 + Math.floor(r() * 4)) % HAIR_COLORS.length
      else l.hairStyle = pick(r, (['short', 'bob', 'long', 'bun', 'pony', 'curly'] as HairStyle[]).filter((h) => h !== l.hairStyle))
      break
    case 'top':
      if (subtle || r() < 0.6) l.topColor = swapColor(l.topColor)
      else l.pattern = l.pattern === 'none' ? 'stripes' : 'none'
      break
  }
}

// ---------------------------------------------------------------- layout dos cenários
export interface Layout { horizon: number; minY: number; props: Prop[]; blocked: Rect[] }

export function themeLayout(theme: ThemeId, W: number, H: number, seed: number): Layout {
  const r = rng(seed ^ 0x9e3779b1)
  const props: Prop[] = []
  const blocked: Rect[] = []
  const horizon = { praca: 0.34, avenida: 0.36, praia: 0.33, shopping: 0.3, palco: 0.34 }[theme] * H
  const FLAT = new Set(['shop', 'stage', 'boat', 'speaker'])
  const add = (type: string, x: number, y: number, s: number, v = 0, block?: [number, number, number, number]) => {
    const se = FLAT.has(type) ? s : s * depthScale(y, horizon, H)
    props.push({ type, x, y, s: se, v })
    if (block) blocked.push({ x0: x - block[0] * se, y0: y - block[1] * se, x1: x + block[2] * se, y1: y + block[3] * se })
  }
  const span = (n: number, f: (i: number, x: number) => void) => {
    for (let i = 0; i < n; i++) f(i, ((i + 0.5 + (r() - 0.5) * 0.5) / n) * W)
  }
  const gy = (t: number) => horizon + (H - horizon) * t
  if (theme === 'praca') {
    add('fountain', W * 0.5, gy(0.5), 1.5, 0, [140, 44, 140, 46])
    span(Math.round(W / 330), (i, x) => add('stall', x, gy(0.12 + r() * 0.05), 0.85, i, [60, 14, 60, 14]))
    span(Math.round(W / 260), (_i, x) => add('tree', x, gy(0.1 + r() * 0.08), 1 + r() * 0.3, Math.floor(r() * 3)))
    span(Math.round(W / 420), (i, x) => add('stall', x + 60, gy(0.88 + r() * 0.06), 1.1, i + 3, [60, 14, 60, 14]))
    span(Math.round(W / 300), (_i, x) => add('lamp', x, gy(0.3 + r() * 0.5), 1))
  } else if (theme === 'avenida') {
    span(Math.round(W / 300), (i, x) => add('mannequin', x, gy(0.08), 1, i))
    span(Math.round(W / 280), (_i, x) => add('lamp', x, gy(0.16), 1.1))
    span(Math.round(W / 230), (i, x) => add('stanchion', x, gy(0.46), 1, i))
    span(Math.round(W / 230), (i, x) => add('stanchion', x, gy(0.74), 1, i))
    span(Math.round(W / 380), (_i, x) => add('planter', x, gy(0.95), 1.1))
  } else if (theme === 'praia') {
    span(Math.round(W / 300), (i, x) => add('umbrella', x, gy(0.38 + r() * 0.5), 1 + r() * 0.25, i))
    span(Math.round(W / 220), (i, x) => add('towel', x, gy(0.34 + r() * 0.6), 1, i))
    span(Math.round(W / 420), (_i, x) => add('palm', x, gy(0.2 + r() * 0.1), 1.2 + r() * 0.4, Math.floor(r() * 2)))
    add('tower', W * (0.2 + r() * 0.6), gy(0.24), 1.1, 0, [50, 10, 50, 20])
    add('boat', W * (0.15 + r() * 0.2), horizon * 0.82, 1, 0)
    add('boat', W * (0.62 + r() * 0.25), horizon * 0.9, 0.8, 1)
    add('net', W * 0.5, gy(0.7), 1.2, 0)
  } else if (theme === 'shopping') {
    span(Math.round(W / 420), (i, x) => add('shop', x, horizon, 1, i))
    span(Math.round(W / 480), (_i, x) => add('pillar', x + 80, gy(0.1), 1))
    span(Math.round(W / 360), (i, x) => add('planter', x, gy(0.25 + r() * 0.15), 1.2, i))
    add('kiosk', W * (0.3 + r() * 0.4), gy(0.55), 1.2, 0, [70, 20, 70, 24])
    span(Math.round(W / 520), (_i, x) => add('bench', x + 40, gy(0.88), 1.1))
  } else {
    add('stage', W * 0.5, horizon, 1, 0)
    span(Math.round(W / 320), (i, x) => add('speaker', x, gy(0.06), 1, i))
    span(Math.round(W / 280), (i, x) => add('spot', x, gy(0.2 + r() * 0.7), 1, i))
    span(Math.round(W / 460), (_i, x) => add('lamp', x, gy(0.9), 1.1))
  }
  const minY = horizon + (theme === 'praia' ? (H - horizon) * 0.17 : 30)
  return { horizon, minY, props, blocked }
}

// ---------------------------------------------------------------- dificuldade
export interface DiffCfg {
  time: number
  crowd: number
  reqs: number
  nearMiss: number
  subtle: boolean
  hints: number
  penaltySec: number
  sizeScale: number
  breakCount: number
}
export const DIFF_CFG: Record<Difficulty, DiffCfg> = {
  facil: { time: 150, crowd: 44, reqs: 2, nearMiss: 3, subtle: false, hints: 3, penaltySec: 2, sizeScale: 0.85, breakCount: 2 },
  normal: { time: 130, crowd: 80, reqs: 3, nearMiss: 7, subtle: false, hints: 2, penaltySec: 3, sizeScale: 1, breakCount: 1 },
  dificil: { time: 110, crowd: 120, reqs: 3, nearMiss: 13, subtle: true, hints: 1, penaltySec: 4, sizeScale: 1.15, breakCount: 1 },
  estrela: { time: 95, crowd: 165, reqs: 4, nearMiss: 20, subtle: true, hints: 0, penaltySec: 5, sizeScale: 1.3, breakCount: 1 },
}
export const ROUNDS = 3
const ROUND_SIZE = [1500, 1850, 2250]
const ROUND_CROWD = [0.8, 1, 1.2]

export const ROUND_TARGETS: Array<Array<SceneTarget['kind']>> = [
  ['person', 'group'],
  ['person', 'role'],
  ['person', 'group', 'role'],
]

const REQ_POOL: ReqKey[] = ['hat', 'bag', 'glasses', 'top', 'scarf', 'hair']

const UNIT = 1.25
/** altura do desenho de uma pessoa (unidades de mundo) na escala s */
export const personHeight = (s: number) => 100 * UNIT * s
export const depthScale = (y: number, horizon: number, H: number) => 0.55 + 0.7 * Math.max(0, Math.min(1, (y - horizon) / (H - horizon)))

// ---------------------------------------------------------------- geração da cena
export function generateScene(seed: number, round: number, difficulty: Difficulty, theme: ThemeId): Scene {
  const cfg = DIFF_CFG[difficulty]
  const r = rng(seed ^ (round * 7919) ^ 0x51ed270b)
  const W = Math.round(ROUND_SIZE[round] * cfg.sizeScale)
  const H = Math.round(W * 0.62)
  const lay = themeLayout(theme, W, H, seed + round * 31)
  const entities: Entity[] = []
  const targets: SceneTarget[] = []
  let nextId = 1

  const taken: Array<[number, number, number]> = [] // x, y, raio
  const free = (x: number, y: number, rad: number) =>
    !lay.blocked.some((b) => x > b.x0 - 14 && x < b.x1 + 14 && y > b.y0 && y < b.y1 + 8) && taken.every(([tx, ty, tr]) => Math.hypot((tx - x) * 1, (ty - y) * 2.4) > (tr + rad) * 0.62)

  const place = (): { x: number; y: number; s: number } => {
    let best = { x: W / 2, y: H * 0.8, s: 1 }
    for (let t = 0; t < 30; t++) {
      const y = lay.minY + r() * (H - lay.minY - 6)
      const x = 40 + r() * (W - 80)
      const s = depthScale(y, lay.horizon, H)
      best = { x, y, s }
      if (free(x, y, 38 * s * UNIT)) break
    }
    taken.push([best.x, best.y, 38 * best.s * UNIT])
    return best
  }

  const addPerson = (look: Look, pose?: Pose): Person => {
    const p = place()
    const pz: Pose = pose ?? pick(r, ['stand', 'stand', 'stand', 'walk', 'walk', 'walk', 'photo', 'sit'] as const)
    const e: Person = { kind: 'person', id: nextId++, x: p.x, y: p.y, s: p.s, pose: pz, flip: r() < 0.5, look }
    entities.push(e)
    return e
  }
  const addPet = (species: 'dog' | 'cat', bow: number): Pet => {
    const p = place()
    const e: Pet = { kind: 'pet', id: nextId++, x: p.x, y: p.y, s: p.s, flip: r() < 0.5, species, coat: Math.floor(r() * 5), bow }
    entities.push(e)
    return e
  }

  const kinds = ROUND_TARGETS[round]
  const personReqsList: Array<{ ref: Look; reqs: ReqKey[]; id: number }> = []
  const usedDescriptions = new Set<string>()

  // ---- alvos
  let tid = 1
  for (const kind of kinds) {
    if (kind === 'person') {
      const ref = randomLook(r)
      const reqs = [...REQ_POOL].sort(() => r() - 0.5).slice(0, cfg.reqs)
      // garante os acessórios exigidos
      if (reqs.includes('hat') && ref.hat === 'none') ref.hat = pick(r, ['sun', 'beret', 'cap', 'beanie', 'fedora'])
      if (reqs.includes('bag') && ref.bag === 'none') ref.bag = pick(r, ['tote', 'clutch', 'mini'])
      if (reqs.includes('glasses') && ref.glasses === 'none') ref.glasses = pick(r, ['round', 'cat', 'aviator', 'square'])
      if (reqs.includes('scarf') && ref.scarf < 0) ref.scarf = pickColor(r)
      const ordered: ReqKey[] = ['hat', 'bag', 'glasses', 'scarf', 'top', 'hair'].filter((k) => reqs.includes(k as ReqKey)) as ReqKey[]
      const text = `Ache a blogueira de ${joinPt(ordered.map((k) => reqPhrase(k, ref)))}.`
      if (usedDescriptions.has(text)) continue
      usedDescriptions.add(text)
      const sample = { kind: 'person', id: -1, x: 0, y: 0, s: 1, pose: 'stand', flip: false, look: ref } as Person
      const t: SceneTarget = { id: tid++, kind, text, count: 1, ids: [], sample, ref, reqs: ordered }
      targets.push(t)
      personReqsList.push({ ref, reqs: ordered, id: t.id })
    } else if (kind === 'group') {
      const count = difficulty === 'facil' ? 2 : difficulty === 'estrela' ? 4 : 3
      const bowSpecific = difficulty === 'dificil' || difficulty === 'estrela'
      const bow = pick(r, BOW_COLORS)
      const text = bowSpecific ? `Ache ${count} cachorrinhos com laço ${COLORS[bow].m}.` : `Ache ${count} cachorrinhos de laço.`
      const sample: Pet = { kind: 'pet', id: -1, x: 0, y: 0, s: 1, flip: false, species: 'dog', coat: 0, bow }
      targets.push({ id: tid++, kind, text, count, ids: [], sample })
    } else {
      const sample = { kind: 'person', id: -1, x: 0, y: 0, s: 1, pose: 'photo', flip: false, look: { ...randomLook(r), pro: true, hat: 'cap', glasses: 'none', bag: 'none', scarf: -1, outfit: 'topbottom', bottom: 'pants', topColor: 4, bottomColor: 4, pattern: 'none' } } as Person
      targets.push({ id: tid++, kind, text: 'Ache o fotógrafo: câmera grande com lente longa e colete escuro.', count: 1, ids: [], sample })
    }
  }

  // ---- alvos-pessoa e seus quase-iguais
  for (const pr of personReqsList) {
    const t = targets.find((x) => x.id === pr.id)!
    const look = { ...pr.ref }
    const e = addPerson(look, pick(r, ['stand', 'walk', 'stand'] as const))
    t.ids.push(e.id)
    for (let n = 0; n < Math.round(cfg.nearMiss * (round === 0 ? 0.7 : 1)); n++) {
      const l = { ...pr.ref, skin: Math.floor(r() * SKINS.length), build: pick(r, [0, 1, 2] as const), pro: false }
      // varia o que não é exigido, para que a "cara" mude, e quebra de 1 a 2 requisitos
      l.hairStyle = pr.reqs.includes('hair') ? l.hairStyle : pick(r, ['short', 'bob', 'long', 'bun', 'pony', 'curly'])
      l.hairColor = pr.reqs.includes('hair') ? l.hairColor : Math.floor(r() * HAIR_COLORS.length)
      const toBreak = [...pr.reqs].sort(() => r() - 0.5).slice(0, Math.min(pr.reqs.length, cfg.breakCount))
      for (const k of toBreak) breakReq(r, k, l, cfg.subtle)
      addPerson(l)
    }
  }

  // ---- grupos de cachorros
  for (const t of targets.filter((x) => x.kind === 'group')) {
    const bow = (t.sample as Pet).bow
    const bowSpecific = difficulty === 'dificil' || difficulty === 'estrela'
    for (let i = 0; i < t.count; i++) t.ids.push(addPet('dog', bow).id)
    const decoys = Math.round(cfg.nearMiss * 0.9)
    for (let i = 0; i < decoys; i++) {
      const m = i % 3
      if (m === 0) addPet('dog', -1)
      else if (m === 1) addPet('cat', pick(r, BOW_COLORS))
      else addPet('dog', bowSpecific ? pick(r, BOW_COLORS.filter((c) => c !== bow)) : -1)
    }
  }

  // ---- fotógrafo
  for (const t of targets.filter((x) => x.kind === 'role')) {
    const l = randomLook(r)
    Object.assign(l, { pro: true, tourist: false, hat: r() < 0.5 ? 'cap' : 'none', glasses: 'none', bag: 'none', scarf: -1, outfit: 'topbottom', bottom: 'pants', topColor: 4, bottomColor: pick(r, [4, 1, 10]), pattern: 'none' })
    t.ids.push(addPerson(l, 'photo').id)
    const decoys = Math.round(cfg.nearMiss * 0.8) + 2
    for (let i = 0; i < decoys; i++) {
      const d = randomLook(r)
      if (i % 2 === 0) d.tourist = true // câmera pequena pendurada
      addPerson(d, i % 3 === 0 ? 'stand' : 'photo') // com celular
    }
  }

  // ---- multidão
  const crowd = Math.round(cfg.crowd * ROUND_CROWD[round])
  const petsExtra = Math.round(crowd * 0.04)
  while (entities.filter((e) => e.kind === 'person').length < crowd) {
    const l = randomLook(r)
    // ninguém combina com um alvo-pessoa
    for (const pr of personReqsList) {
      let guard = 0
      while (matchesAll(l, pr.ref, pr.reqs) && guard++ < 8) breakReq(r, pick(r, pr.reqs), l, cfg.subtle)
    }
    addPerson(l)
  }
  for (let i = 0; i < petsExtra; i++) addPet(r() < 0.6 ? 'dog' : 'cat', r() < 0.2 ? pick(r, BOW_COLORS) : -1)

  // ---- confere unicidade dos alvos-pessoa (extras viram quase-iguais)
  for (const pr of personReqsList) {
    const t = targets.find((x) => x.id === pr.id)!
    for (const e of entities) {
      if (e.kind !== 'person' || t.ids.includes(e.id)) continue
      let guard = 0
      while (matchesAll(e.look, pr.ref, pr.reqs) && guard++ < 8) breakReq(r, pick(r, pr.reqs), e.look, cfg.subtle)
    }
  }
  // grupo: cachorros extras com laço igual ao pedido não podem existir fora do grupo
  for (const t of targets.filter((x) => x.kind === 'group')) {
    const bow = (t.sample as Pet).bow
    const bowSpecific = difficulty === 'dificil' || difficulty === 'estrela'
    for (const e of entities) {
      if (e.kind === 'pet' && e.species === 'dog' && !t.ids.includes(e.id) && e.bow >= 0 && (!bowSpecific || e.bow === bow)) e.bow = -1
    }
  }

  // ordem de desenho: de trás para a frente
  entities.sort((a, b) => a.y - b.y)
  return { theme, seed, W, H, horizon: lay.horizon, props: lay.props, entities, targets }
}

function joinPt(parts: string[]): string {
  if (parts.length <= 1) return parts.join('')
  return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`
}

/** Pontuação e tempo (puros, para testar). */
export const SCORE = { found: 150, combo: 25, comboMax: 100, roundDone: 60, wrong: 40, hint: 80, timeBonus: 3 }
export const STAR_TH: readonly [number, number, number] = [800, 1350, 1800]
export const TYPICAL: Record<Difficulty, number> = { facil: 1500, normal: 1350, dificil: 1200, estrela: 1050 }

export function themeFor(seed: number, round: number): ThemeId {
  const r = rng(seed ^ 0xabc123)
  const start = Math.floor(r() * THEMES.length)
  return THEMES[(start + round * 2) % THEMES.length]
}

/** Quantas pessoas da cena combinam com a descrição de um alvo-pessoa (deve ser exatamente 1). */
export function countMatches(scene: Scene, t: SceneTarget): number {
  if (!t.ref || !t.reqs) return t.ids.length
  const { ref, reqs } = t
  return scene.entities.filter((e) => e.kind === 'person' && matchesAll(e.look, ref, reqs)).length
}
