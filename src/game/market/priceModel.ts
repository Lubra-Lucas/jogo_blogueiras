import { clamp, gauss, type Rng } from './rng.ts'
import type { EditionDef, Hype, Rarity } from './types.ts'

/**
 * Modelo de preco (em Brilhos). Preco = reversao a media em torno de um VALOR JUSTO + choques.
 *
 * Valor justo F(dia) = base(raridade) x prestigio x escassez(teto) x oferta restante x vintage x (1+hype) x (1+humor)
 *  - escassez: tetos pequenos valem mais (500/cap)^0,3, limitado a [0,75; 1,9]
 *  - oferta restante: quanto mais cunhada, ate +18% (a "ultima copia" e mais disputada)
 *  - aposentada: +20% e depois "vintage" +10% x ln(1 + dias/30), limitado a +25%
 *  - hype: soma de eventos que decaem pela metade a cada `halfLife` dias; limitado a [-35%, +80%]
 *  - humor: fator de mercado comum a todas, AR(1) limitado a +-12%
 * Preco P: ln P' = ln P + k (ln F - ln P) + sigma N(0,1), com k = 0,12/dia; P preso a [0,55 F; 1,8 F].
 * Isso mantem os precos num tubo ao redor de F (nao ha inflacao descontrolada) e F so se move por fatores acima.
 */
export const BASE_BY_RARITY: Record<Rarity, number> = { comum: 200, raro: 600, epico: 1700, lendario: 4500 }
const VOL_BY_RARITY: Record<Rarity, number> = { comum: 0.9, raro: 1, epico: 1.15, lendario: 1.3 }
export const REVERSION_K = 0.12
export const BASE_SIGMA = 0.028

export const capFactor = (cap: number) => clamp(Math.pow(500 / cap, 0.3), 0.75, 1.9)
export const baseValue = (d: EditionDef) => BASE_BY_RARITY[d.rarity] * d.prestige * capFactor(d.cap)

export function hypeSum(list: Hype[], day: number): number {
  let s = 0
  for (const h of list) s += h.amount * Math.pow(0.5, Math.max(0, day - h.startDay) / h.halfLife)
  return clamp(s, -0.35, 0.8)
}

export interface FairInput {
  minted: number
  retired: boolean
  /** dias desde a aposentadoria (0 se nao aposentada) */
  retiredFor: number
  hype: number
  mood: number
}

export function fairValue(d: EditionDef, i: FairInput): number {
  const remaining = clamp(1 - i.minted / d.cap, 0, 1)
  const scarcity = 1 + 0.18 * (1 - remaining)
  const vintage = i.retired ? 1.2 * Math.min(1.25, 1 + 0.1 * Math.log(1 + i.retiredFor / 30)) : 1
  return baseValue(d) * scarcity * vintage * (1 + i.hype) * (1 + i.mood)
}

export const volatility = (d: EditionDef) => BASE_SIGMA * VOL_BY_RARITY[d.rarity] * (d.cap < 150 ? 1.25 : d.cap < 300 ? 1.1 : 1)

/** um passo diario do preco de mercado */
export function stepPrice(P: number, F: number, d: EditionDef, r: Rng): number {
  const lnP = Math.log(P) + REVERSION_K * (Math.log(F) - Math.log(P)) + volatility(d) * gauss(r)
  return clamp(Math.exp(lnP), 0.55 * F, 1.8 * F)
}

/** negocios esperados por dia (liquidez maior em tetos maiores e com hype) */
export function expectedTrades(d: EditionDef, hype: number): number {
  const liq = 1.1 + 3.4 * Math.log10(Math.max(1, d.cap / 80))
  return Math.max(0.4, liq * (1 + 2 * Math.abs(hype)))
}

const NPCS = ['Madame Valentina', 'Lulu Prado', 'Kiki Andrade']

/** sorteia (ou nao) um evento de hype do dia */
export function rollHype(d: EditionDef, retired: boolean, announced: boolean, remainingPct: number, day: number, r: Rng): Hype | null {
  const roll = r()
  const npc = NPCS[Math.floor(r() * NPCS.length)]
  if (roll < 0.035) {
    return { kind: 'celebridade', amount: 0.1 + 0.2 * r(), startDay: day, halfLife: 3, text: `${npc} apareceu com "${d.name}" no desfile` }
  }
  if (roll < 0.05) return { kind: 'critica', amount: -(0.06 + 0.08 * r()), startDay: day, halfLife: 2.5, text: `O look de ${npc} com "${d.name}" dividiu opiniões` }
  if (!retired && roll < 0.062 && d.origin === 'temporada') {
    return { kind: 'fim_temporada', amount: 0.08 + 0.08 * r(), startDay: day, halfLife: 4, text: `Fim de temporada: "${d.name}" sai de circulação em breve` }
  }
  if (!retired && !announced && (remainingPct < 0.2 ? roll < 0.1 : roll < 0.053)) {
    return { kind: 'aposentadoria', amount: 0.22 + 0.15 * r(), startDay: day, halfLife: 5, text: `Anunciado: "${d.name}" será aposentada em 3 dias` }
  }
  if (!retired && roll < 0.078) {
    return { kind: 'reedicao', amount: -(0.1 + 0.08 * r()), startDay: day, halfLife: 3.5, text: `Rumores de reedição de "${d.name}"` }
  }
  return null
}
