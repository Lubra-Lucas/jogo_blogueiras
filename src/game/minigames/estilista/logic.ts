/**
 * Regras do "Estilista Personal" (puras, sem React/three).
 * Reaproveita do Passarela: `colors.ts` (harmonia, distância), `adapters.ts` (catálogo de peças com tags) e `types.ts`.
 *
 * Nota de uma cliente (0..100), média ponderada de seis critérios (0..1); critérios ausentes (sem orçamento / sem
 * pedido especial) saem da conta e os pesos são renormalizados:
 *   ocasião 30  : tags das peças vs. tags da ocasião (0,65) + formalidade (0,35); peça que falta conta zero
 *   cores   25  : preferências (odeia/adora/quente-frio/claro-escuro) x 0,55 + harmonia (colors.ts) x 0,45
 *   orçamento 15: dentro = 1; estourar cai 2,5x o excesso relativo
 *   coerência 12: dispersão de formalidade entre as peças + look completo
 *   surpresa 8  : raridade média + variedade de estilos, limitada pela nota de ocasião (não vale só exagerar)
 *   especial 10 : a preferência escondida da cliente (pergunta 3)
 * + até 4 pontos pelo tempo que sobrou (só se a nota base passa de 40).
 */
import type { ItemSlot } from '../../character/catalog'
import { catalogItem, getCatalog } from '../desfile/adapters'
import { harmony } from '../desfile/colors'
import type { CatalogItem, Look, StyleTag } from '../desfile/types'
import { DIFFICULTY_REWARD, type Difficulty } from '../shared/competition'
import { COOL, familyOf, lightnessOf, NEUTRAL, WARM } from './palette'
import { occasionById } from './occasions'
import type { Breakdown, Client, ClientResult, Criterion, Evaluation, Mood } from './types'

export const WEIGHTS: Record<Criterion, number> = { occasion: 30, colors: 25, budget: 15, coherence: 12, surprise: 8, special: 10 }
export const HAPPY_AT = 75
export const NEUTRAL_AT = 50

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

// ----------------------------------------------------------------- preços e estoque

const PRICE_BASE: Partial<Record<ItemSlot, number>> = { hair: 35, top: 50, bottom: 55, dress: 110, gloves: 30, legwear: 20, neck: 35, ears: 25, head: 40, wrist: 30, finger: 25 }

/** Preço em Brilhos (base do lugar x fator de raridade). */
export function priceOf(item: CatalogItem): number {
  const base = PRICE_BASE[item.slot] ?? 30
  return Math.round((base * (0.6 + 0.4 * item.rarity)) / 5) * 5
}

/** Tiers de estoque/clientes pelo XP de Estilista. */
export const TIER_XP = [0, 60, 150]
export const tierOf = (xp: number) => (xp >= TIER_XP[2] ? 2 : xp >= TIER_XP[1] ? 1 : 0)
const TIER_MAX_RARITY = [2, 3, 4]
export const isUnlocked = (item: CatalogItem, tier: number) => item.rarity <= TIER_MAX_RARITY[tier]
export const VIP_TIER = 2

/** Peças que passam a existir quando o XP cruza um tier. */
export function newlyUnlocked(xpBefore: number, xpAfter: number): CatalogItem[] {
  const a = tierOf(xpBefore)
  const b = tierOf(xpAfter)
  if (b <= a) return []
  return getCatalog().filter((i) => !isUnlocked(i, a) && isUnlocked(i, b))
}

/** Custo do look (o cabelo original da cliente é de graça). */
export function lookCost(look: Look, client: Client): number {
  let sum = 0
  const add = (id: string | null | undefined) => {
    const it = catalogItem(id)
    if (it) sum += priceOf(it)
  }
  if (look.hairId !== client.look0.hairId) add(look.hairId)
  add(look.top?.id)
  add(look.bottom?.id)
  add(look.dress?.id)
  for (const p of look.jewelry) add(p.id)
  for (const p of look.accessories) add(p.id)
  return sum
}

// ----------------------------------------------------------------- critérios

interface Piece {
  tags: StyleTag[]
  weight: number
  formality: number
  rarity: number
}

function pieces(look: Look): Piece[] {
  const list: Piece[] = []
  const add = (it: CatalogItem | undefined, weight: number) => {
    if (it) list.push({ tags: it.tags, weight, formality: it.formality, rarity: it.rarity })
    return !!it
  }
  add(catalogItem(look.hairId), 1)
  const dress = catalogItem(look.dress?.id)
  if (dress) {
    add(dress, 1.5)
    add(dress, 1.5)
  } else {
    if (!add(catalogItem(look.top?.id), 1.5)) list.push({ tags: [], weight: 1.5, formality: 0.1, rarity: 0 })
    if (!add(catalogItem(look.bottom?.id), 1.5)) list.push({ tags: [], weight: 1.5, formality: 0.1, rarity: 0 })
  }
  for (const p of look.jewelry) add(catalogItem(p.id), 0.6)
  for (const p of look.accessories) add(catalogItem(p.id), 0.8)
  return list
}

function tagMatch(tags: StyleTag[], want: Client['tags']): number {
  const ws = tags.map((t) => want[t] ?? 0).sort((x, y) => y - x)
  if (!ws.length) return 0
  return Math.min(1, ws[0] + 0.15 * (ws[1] ?? 0))
}

/** Cores com peso (o que a cliente "vê" no look). */
function coloredPieces(look: Look): { hex: string; w: number; garment: boolean }[] {
  const out: { hex: string; w: number; garment: boolean }[] = [{ hex: look.hairColor, w: 0.5, garment: false }]
  let suit = 0
  if (look.dress) out.push({ hex: look.dress.color, w: 2.5, garment: true })
  else {
    if (look.top) out.push({ hex: look.top.color, w: 1.5, garment: true })
    else suit += 0.9
    if (look.bottom) out.push({ hex: look.bottom.color, w: 1.5, garment: true })
    else suit += 0.9
  }
  suit += 0.2
  out.push({ hex: look.suitColor, w: suit, garment: true })
  for (const p of look.accessories) {
    const s = catalogItem(p.id)?.slot
    if (s === 'gloves' || s === 'legwear') out.push({ hex: p.color, w: 0.6, garment: true })
  }
  return out
}

const hasSlot = (look: Look, slot: ItemSlot) => [...look.jewelry, ...look.accessories].some((p) => catalogItem(p.id)?.slot === slot)

function secretScore(client: Client, look: Look): number | null {
  const s = client.secret
  if (!s) return null
  const extra = look.jewelry.length + look.accessories.length
  switch (s.kind) {
    case 'want': return hasSlot(look, s.slot!) ? 1 : 0
    case 'avoid': return hasSlot(look, s.slot!) ? 0 : 1
    case 'minimal': return extra <= 2 ? 1 : extra === 3 ? 0.5 : 0
    case 'loud': {
      const items = [...look.jewelry, ...look.accessories].map((p) => catalogItem(p.id)).filter((x): x is CatalogItem => !!x)
      const topItems = [look.top, look.bottom, look.dress].map((p) => catalogItem(p?.id)).filter((x): x is CatalogItem => !!x)
      const all = [...items, ...topItems]
      if (!all.length) return 0
      return clamp01((all.reduce((a, b) => a + b.rarity, 0) / all.length - 1) / 1.6)
    }
  }
}

export function evaluate(client: Client, look: Look, timeFrac = 0): Evaluation {
  const list = pieces(look)
  const wsum = list.reduce((s, p) => s + p.weight, 0) || 1
  const tagScore = list.reduce((s, p) => s + p.weight * tagMatch(p.tags, client.tags), 0) / wsum
  const tagged = list.filter((p) => p.tags.length)
  const avgForm = tagged.length ? tagged.reduce((s, p) => s + p.formality, 0) / tagged.length : 0.1
  const formAlign = 1 - Math.min(1, Math.abs(avgForm - client.formality) / 0.6)
  const empty = !look.top && !look.bottom && !look.dress
  const occasion = clamp01((0.65 * tagScore + 0.35 * formAlign) * 1.12 * (empty ? 0.6 : 1))

  // cores
  const cp = coloredPieces(look)
  const cw = cp.reduce((s, p) => s + p.w, 0) || 1
  const fam = cp.map((p) => ({ ...p, f: familyOf(p.hex) }))
  let prefs = 1
  let hated = false
  if (client.hate) {
    const frac = fam.filter((p) => p.f === client.hate).reduce((s, p) => s + p.w, 0) / cw
    hated = fam.some((p) => p.f === client.hate && p.w >= 0.5 && p.garment)
    if (frac > 0) prefs -= Math.min(1, frac * 2.2 + 0.15)
  }
  if (client.love) {
    const frac = fam.filter((p) => p.f === client.love).reduce((s, p) => s + p.w, 0) / cw
    prefs *= 0.7 + 0.3 * Math.min(1, frac * 2.5)
  }
  if (client.palette) {
    const side = client.palette === 'quente' ? WARM : COOL
    const fit = fam.reduce((s, p) => s + p.w * (side.includes(p.f) ? 1 : NEUTRAL.includes(p.f) ? 0.55 : 0), 0) / cw
    prefs *= 0.55 + 0.45 * fit
  }
  if (client.tone) {
    const g = cp.filter((p) => p.garment)
    const gw = g.reduce((s, p) => s + p.w, 0) || 1
    const l = g.reduce((s, p) => s + p.w * lightnessOf(p.hex), 0) / gw
    const fit = client.tone === 'claro' ? clamp01((l - 0.3) / 0.35) : clamp01((0.62 - l) / 0.35)
    prefs *= 0.5 + 0.5 * fit
  }
  const h = harmony(cp.map((p) => p.hex))
  const colors = clamp01(0.55 * clamp01(prefs) + 0.45 * h.score)

  // orçamento
  const cost = lookCost(look, client)
  let budget: number | null = null
  let overBudget = false
  if (client.budget !== null) {
    const ratio = cost / client.budget
    overBudget = ratio > 1
    budget = ratio <= 1 ? 1 : clamp01(1 - (ratio - 1) * 2.5)
  }

  // coerência
  const fs = tagged.map((p) => p.formality)
  const mean = fs.length ? fs.reduce((a, b) => a + b, 0) / fs.length : 0
  const sd = fs.length ? Math.sqrt(fs.reduce((a, b) => a + (b - mean) ** 2, 0) / fs.length) : 0.4
  let coherence = 1 - Math.min(1, sd / 0.4)
  if (empty) coherence *= 0.4
  else if (!look.dress && (!look.top || !look.bottom)) coherence *= 0.7
  if (look.jewelry.length + look.accessories.length > 6) coherence -= 0.15
  coherence = clamp01(coherence)

  // surpresa
  const rar = tagged.length ? tagged.reduce((s, p) => s + p.rarity, 0) / tagged.length / 4 : 0
  const distinct = new Set(list.flatMap((p) => p.tags)).size
  const surprise = clamp01((0.7 * Math.min(1, rar * 1.3) + 0.3 * Math.min(1, distinct / 5)) * (0.4 + 0.6 * occasion))

  const special = secretScore(client, look)
  const breakdown: Breakdown = { occasion, colors, budget, coherence, surprise, special }
  let num = 0
  let den = 0
  for (const k of Object.keys(WEIGHTS) as Criterion[]) {
    const v = breakdown[k]
    if (v === null) continue
    num += WEIGHTS[k] * v
    den += WEIGHTS[k]
  }
  // curva 1,3: looks aleatórios ficam por volta de 48 (indecisa); só combinar de verdade chega a 75+
  const base = Math.round(100 * Math.pow(num / den, 1.3))
  const total = Math.min(100, base + (base > 40 ? Math.round(4 * clamp01(timeFrac)) : 0))
  const mood: Mood = total >= HAPPY_AT ? 'happy' : total >= NEUTRAL_AT ? 'neutral' : 'unhappy'
  return { base, total, breakdown, cost, mood, scheme: h.scheme, hated, overBudget, empty }
}

// ----------------------------------------------------------------- falas

const WORST_CLEAR: Record<Criterion, string[]> = {
  occasion: ['Hmm, não sei se isso combina com a ocasião.', 'Está faltando o clima do evento.'],
  colors: ['As cores não estão me convencendo.', 'Essas cores brigam entre si.'],
  budget: ['Isso passa do que posso gastar!'],
  coherence: ['As peças parecem de lugares diferentes.', 'Está meio desencontrado, né?'],
  surprise: ['Está certinho, mas sem graça.', 'Faltou uma peça que me surpreenda.'],
  special: ['Ainda falta aquilo que eu faço questão.', 'Você ouviu o que eu mais queria?'],
}
const GENERIC_BAD = ['Hmm…', 'Não sei…', 'Ainda não é isso.']
const GOOD = ['Isso sim é a minha cara!', 'Amei, estou me sentindo ótima!', 'Perfeito, você leu a minha mente!']
const OK = ['Está no caminho.', 'Gostei, mas dá para melhorar.', 'Quase lá!']

/** Comentário ao vivo. Em dificuldades altas só dá o clima, sem apontar o problema. */
export function liveComment(_client: Client, ev: Evaluation, difficulty: Difficulty, salt = 0): string {
  const vague = difficulty === 'estrela' || difficulty === 'dificil'
  const pickS = (a: string[]) => a[salt % a.length]
  if (ev.empty) return vague ? pickS(GENERIC_BAD) : 'Estou meio sem roupa aqui, não?'
  if (ev.mood === 'happy') return pickS(GOOD)
  if (vague) return ev.mood === 'neutral' ? pickS(OK) : pickS(GENERIC_BAD)
  if (ev.hated) return 'Esse tom eu não uso de jeito nenhum.'
  if (ev.overBudget) return pickS(WORST_CLEAR.budget)
  const order: Criterion[] = ['occasion', 'colors', 'budget', 'special', 'coherence', 'surprise']
  let worst: Criterion = 'occasion'
  let wv = 2
  for (const k of order) {
    const v = ev.breakdown[k]
    if (v !== null && v < wv) {
      wv = v
      worst = k
    }
  }
  return ev.mood === 'neutral' ? pickS(OK) : pickS(WORST_CLEAR[worst])
}

const QUOTE_HAPPY = ['"Saí da loja me sentindo a estrela da festa!"', '"Você entendeu o que eu nem sabia explicar. Voltarei sempre."', '"Nota dez, até meus amigos perguntaram onde comprei."']
const QUOTE_OK: Record<Criterion, string> = {
  occasion: '"Bonito, mas não era bem o clima da ocasião."',
  colors: '"Gostei das peças, só queria cores mais a minha cara."',
  budget: '"Ficou lindo, mas o orçamento doeu um pouquinho."',
  coherence: '"Cada peça é boa, mas juntas ficaram confusas."',
  surprise: '"Correto, só faltou aquele toque ousado."',
  special: '"Ótimo, só faltou aquilo que eu tinha pedido com carinho."',
}
const QUOTE_BAD = ['"Não foi dessa vez... espero uma segunda chance."', '"Acho que você não ouviu o que eu disse."', '"Vou pensar com carinho antes de voltar."']

export function testimonial(_client: Client, ev: Evaluation, salt = 0): string {
  if (ev.mood === 'happy') return QUOTE_HAPPY[salt % QUOTE_HAPPY.length]
  if (ev.mood === 'unhappy') return ev.hated ? '"Eu disse que não queria essa cor!"' : QUOTE_BAD[salt % QUOTE_BAD.length]
  let worst: Criterion = 'occasion'
  let wv = 2
  for (const k of Object.keys(WEIGHTS) as Criterion[]) {
    const v = ev.breakdown[k]
    if (v !== null && v < wv) {
      wv = v
      worst = k
    }
  }
  return QUOTE_OK[worst]
}

/** O que a cliente teria dito sobre o pedido, para o "o que eu queria" da tela de resultado. */
export function wishSummary(client: Client): string[] {
  const occ = occasionById(client.occasion)
  const out = [occ.name]
  if (client.hate) out.push(`odeia ${client.hate}`)
  if (client.love) out.push(`adora ${client.love}`)
  if (client.palette) out.push(`tons ${client.palette === 'quente' ? 'quentes' : 'frios'}`)
  if (client.tone) out.push(client.tone === 'claro' ? 'algo claro' : 'algo escuro')
  if (client.budget !== null) out.push(`até ${client.budget} Brilhos`)
  if (client.secret) out.push(client.secret.text.replace(/\.$/, '').toLowerCase())
  return out
}

// ----------------------------------------------------------------- rodada

export const COMBO_STEP = 0.1
export const COMBO_MAX = 4
export const comboMult = (combo: number) => 1 + COMBO_STEP * Math.min(COMBO_MAX, combo)

export function roundStats(results: ClientResult[]) {
  const avg = results.length ? results.reduce((s, r) => s + r.eval.total, 0) / results.length : 0
  const stars = avg >= 82 ? 3 : avg >= 62 ? 2 : 1
  const points = Math.round(results.reduce((s, r) => s + r.points, 0))
  const bestCombo = results.reduce((m, r) => Math.max(m, r.comboAt), 0)
  return { avg: Math.round(avg), stars, points, bestCombo }
}

/** Pontuação "típica" por dificuldade (para gerar os rivais do ranking). */
export const TYPICAL_POINTS: Record<Difficulty, number> = { facil: 190, normal: 250, dificil: 270, estrela: 340 }

export function rewardsFor(stars: number, avg: number, bestCombo: number, difficulty: Difficulty) {
  const m = DIFFICULTY_REWARD[difficulty]
  return {
    coins: Math.round((avg * 0.9 + stars * 12) * m),
    xp: Math.round((12 + avg / 5 + stars * 4) * m),
    professionXp: Math.round((8 + stars * 6 + bestCombo * 2) * m),
  }
}
