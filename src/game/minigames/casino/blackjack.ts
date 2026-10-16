import type { Card } from './cards'

/**
 * Regras do 21 desta mesa (mostradas em "Como jogar"):
 *  - 6 baralhos, carta de corte a ~75% do sapato.
 *  - A banca PARA em qualquer 17 (inclusive 17 "mole": Ás + 6).
 *  - Blackjack paga 3 para 2. Vitória paga 1 para 1. Empate devolve a aposta.
 *  - Dobrar em qualquer mão de 2 cartas (também depois de dividir, exceto Ases): recebe 1 carta.
 *  - Dividir pares de mesmo valor, até 4 mãos. Ases divididos recebem 1 carta cada; 21 depois
 *    de dividir NÃO conta como blackjack.
 *  - Sem seguro e sem desistência. A banca olha a carta virada (Ás ou 10) antes de você jogar.
 * Com a estratégia básica o custo da casa fica perto de 0,5%.
 */
export const BJ_RULES = {
  decks: 6,
  dealerStandsSoft17: true,
  blackjackPays: 1.5,
  maxHands: 4,
  houseEdgeBasic: '≈ 0,5% com estratégia básica',
} as const

export const cardValue = (c: Card) => (c.r === 14 ? 11 : c.r >= 10 ? 10 : c.r)

export interface HandValue {
  total: number
  soft: boolean
  bust: boolean
}

export function handValue(cards: Card[]): HandValue {
  let total = 0
  let aces = 0
  for (const c of cards) {
    total += cardValue(c)
    if (c.r === 14) aces++
  }
  while (total > 21 && aces > 0) {
    total -= 10
    aces--
  }
  return { total, soft: aces > 0 && total <= 21, bust: total > 21 }
}

export const isNaturalBlackjack = (cards: Card[]) => cards.length === 2 && handValue(cards).total === 21

/** A banca compra enquanto tiver menos de 17 (para no 17 mole). */
export function dealerShouldHit(cards: Card[]): boolean {
  const v = handValue(cards)
  return v.total < 17
}

export type BjResult = 'bj' | 'win' | 'push' | 'lose' | 'bust'

/** Resultado de uma mão contra a banca. */
export function judgeHand(hand: Card[], dealer: Card[], fromSplit: boolean): BjResult {
  const p = handValue(hand)
  if (p.bust) return 'bust'
  const d = handValue(dealer)
  const pBj = !fromSplit && isNaturalBlackjack(hand)
  const dBj = isNaturalBlackjack(dealer)
  if (pBj && dBj) return 'push'
  if (pBj) return 'bj'
  if (dBj) return 'lose'
  if (d.bust) return 'win'
  if (p.total > d.total) return 'win'
  if (p.total < d.total) return 'lose'
  return 'push'
}

/** Quanto volta para a jogadora (aposta inclusa). Apostas são múltiplas de 10. */
export function payoutFor(result: BjResult, bet: number): number {
  switch (result) {
    case 'bj':
      return bet + Math.floor(bet * BJ_RULES.blackjackPays)
    case 'win':
      return bet * 2
    case 'push':
      return bet
    default:
      return 0
  }
}

export type BjAction = 'hit' | 'stand' | 'double' | 'split'

/**
 * Estratégia básica (6 baralhos, banca para no 17 mole, dobrar depois de dividir).
 * `can` indica o que está disponível; a tabela cai para a melhor alternativa.
 */
export function basicStrategy(hand: Card[], dealerUp: Card, can: { double: boolean; split: boolean }): BjAction {
  const up = dealerUp.r === 14 ? 11 : Math.min(10, dealerUp.r)
  const v = handValue(hand)
  const dbl = (fallback: BjAction): BjAction => (can.double ? 'double' : fallback)

  if (hand.length === 2 && cardValue(hand[0]) === cardValue(hand[1]) && can.split) {
    const pv = cardValue(hand[0])
    const sp = (cond: boolean): BjAction | null => (cond ? 'split' : null)
    let a: BjAction | null = null
    switch (pv) {
      case 11:
      case 8:
        a = 'split'
        break
      case 10:
        a = null
        break
      case 9:
        a = sp(up <= 6 || up === 8 || up === 9)
        break
      case 7:
        a = sp(up <= 7)
        break
      case 6:
        a = sp(up <= 6)
        break
      case 5:
        a = null
        break
      case 4:
        a = sp(up === 5 || up === 6)
        break
      default: // 2 e 3
        a = sp(up <= 7)
    }
    if (a) return a
  }

  if (v.soft) {
    const t = v.total
    if (t >= 20) return 'stand'
    if (t === 19) return up === 6 ? dbl('stand') : 'stand'
    if (t === 18) {
      if (up >= 3 && up <= 6) return dbl('stand')
      if (up === 2 || up === 7 || up === 8) return 'stand'
      return 'hit'
    }
    if (t === 17) return up >= 3 && up <= 6 ? dbl('hit') : 'hit'
    if (t === 16 || t === 15) return up >= 4 && up <= 6 ? dbl('hit') : 'hit'
    return up >= 5 && up <= 6 ? dbl('hit') : 'hit' // A,2 e A,3
  }

  const t = v.total
  if (t >= 17) return 'stand'
  if (t >= 13) return up <= 6 ? 'stand' : 'hit'
  if (t === 12) return up >= 4 && up <= 6 ? 'stand' : 'hit'
  if (t === 11) return up <= 10 ? dbl('hit') : 'hit'
  if (t === 10) return up <= 9 ? dbl('hit') : 'hit'
  if (t === 9) return up >= 3 && up <= 6 ? dbl('hit') : 'hit'
  return 'hit'
}

export const ACTION_LABEL: Record<BjAction, string> = {
  hit: 'Pedir carta',
  stand: 'Parar',
  double: 'Dobrar',
  split: 'Dividir',
}
