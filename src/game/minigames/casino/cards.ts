import { shuffle } from './random'

/** Naipes: 0 paus, 1 ouros, 2 copas, 3 espadas. Valor: 2..14 (14 = Ás). */
export type Suit = 0 | 1 | 2 | 3
export interface Card {
  r: number
  s: Suit
}

export const SUIT_NAME = ['Paus', 'Ouros', 'Copas', 'Espadas'] as const
export const SUIT_RED = (s: Suit) => s === 1 || s === 2
export const RANK_LABEL: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }
export const rankLabel = (r: number) => RANK_LABEL[r] ?? String(r)
export const cardKey = (c: Card) => `${rankLabel(c.r)}${'cdhs'[c.s]}`

export function freshDeck(): Card[] {
  const d: Card[] = []
  for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) d.push({ r, s: s as Suit })
  return d
}

/** Sapato com N baralhos e carta de corte (reembaralha na rodada seguinte). */
export class Shoe {
  cards: Card[] = []
  cut = 0
  readonly decks: number
  readonly penetration: number
  constructor(decks = 6, penetration = 0.75) {
    this.decks = decks
    this.penetration = penetration
    this.reshuffle()
  }
  reshuffle() {
    const all: Card[] = []
    for (let i = 0; i < this.decks; i++) all.push(...freshDeck())
    this.cards = shuffle(all)
    // carta de corte entre 70% e 80% do sapato (posição fixa depois de embaralhar)
    this.cut = Math.floor(this.cards.length * (1 - this.penetration))
  }
  draw(): Card {
    if (this.cards.length === 0) this.reshuffle()
    return this.cards.pop() as Card
  }
  /** a carta de corte apareceu: reembaralhar antes da próxima rodada */
  get needsShuffle() {
    return this.cards.length <= this.cut
  }
  get remaining() {
    return this.cards.length
  }
}

/** Baralho simples embaralhado (pôquer). */
export function shuffledDeck(): Card[] {
  return shuffle(freshDeck())
}
