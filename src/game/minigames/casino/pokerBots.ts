import type { Difficulty } from '../shared/competition'
import { freshDeck as shuffledDeckOrdered, type Card } from './cards'
import { evaluate } from './pokerEval'
import type { Action, Expression, PokerEngine, Seat } from './pokerEngine'
import { rand } from './random'

/**
 * Jogadoras NPC do pôquer, cada uma com estilo próprio.
 *  - tight: quão seletiva é (0 joga quase tudo, 1 só mãos fortes)
 *  - aggr: quão agressiva (aposta e aumenta em vez de só pagar)
 *  - bluff: frequência de blefe
 *  - tell: quanto a expressão do rosto revela a força da mão (0 nada, 1 sempre)
 *  - reverse: finge o contrário (blefadora que sorri quando está fraca)
 */
export interface BotStyle {
  name: string
  title: string
  blurb: string
  tight: number
  aggr: number
  bluff: number
  tell: number
  reverse: boolean
  /** matiz do cabelo/roupa para o avatar */
  hair: string
  accent: string
}

export const BOT_STYLES: BotStyle[] = [
  { name: 'Madame Rubi', title: 'Seletiva e agressiva', blurb: 'Joga poucas mãos, mas aposta forte quando entra.', tight: 0.72, aggr: 0.75, bluff: 0.08, tell: 0.25, reverse: false, hair: '#2a1a1a', accent: '#8f1d2c' },
  { name: 'Tio Gil', title: 'Solto e passivo', blurb: 'Paga quase tudo, raramente aumenta. Difícil de tirar da mão.', tight: 0.2, aggr: 0.15, bluff: 0.03, tell: 0.55, reverse: false, hair: '#9a9a9a', accent: '#41566e' },
  { name: 'Vivi Blefe', title: 'Solta e agressiva', blurb: 'Aposta muito e blefa bastante. O sorriso nem sempre é de verdade.', tight: 0.3, aggr: 0.85, bluff: 0.34, tell: 0.5, reverse: true, hair: '#c58b3a', accent: '#b4872f' },
  { name: 'Dona Cora', title: 'Seletiva e passiva', blurb: 'Só aposta com mão boa e paga na dúvida. Quase nunca blefa.', tight: 0.7, aggr: 0.2, bluff: 0.02, tell: 0.7, reverse: false, hair: '#e1d6c3', accent: '#4a6b57' },
  { name: 'Rafa', title: 'Equilibrado', blurb: 'Mistura apostas fortes e alguns blefes. O mais difícil de ler.', tight: 0.5, aggr: 0.5, bluff: 0.15, tell: 0.12, reverse: false, hair: '#3b2a20', accent: '#3d4b78' },
]

/** Pontuação de mão inicial (fórmula de Chen) normalizada para 0..1. */
export function preflopStrength(c: Card[]): number {
  const [a, b] = c[0].r >= c[1].r ? [c[0], c[1]] : [c[1], c[0]]
  const pts = (r: number) => (r === 14 ? 10 : r === 13 ? 8 : r === 12 ? 7 : r === 11 ? 6 : r === 10 ? 5 : r / 2)
  let s = pts(a.r)
  if (a.r === b.r) s = Math.max(5, s * 2)
  else {
    if (a.s === b.s) s += 2
    const gap = a.r - b.r - 1
    s -= gap === 0 ? 0 : gap === 1 ? 1 : gap === 2 ? 2 : gap === 3 ? 4 : 5
    if (gap <= 1 && a.r < 12) s += 1
  }
  return Math.max(0, Math.min(1, (s + 1) / 21))
}

/** Equidade aproximada (Monte Carlo) contra `opps` mãos aleatórias. Só estima: não sorteia cartas do jogo. */
export function equity(hole: Card[], board: Card[], opps: number, sims = 120): number {
  opps = Math.max(1, Math.min(opps, 4))
  const known = new Set([...hole, ...board].map((c) => c.r * 4 + c.s))
  const base = shuffledDeckOrdered().filter((c) => !known.has(c.r * 4 + c.s))
  const need = 5 - board.length + opps * 2
  let wins = 0
  for (let n = 0; n < sims; n++) {
    // embaralhamento parcial: só as primeiras `need` posições
    for (let i = 0; i < need; i++) {
      const j = i + Math.floor(Math.random() * (base.length - i))
      const t = base[i]
      base[i] = base[j]
      base[j] = t
    }
    const boardFull = [...board]
    let k = 0
    while (boardFull.length < 5) boardFull.push(base[k++])
    const mine = evaluate([...hole, ...boardFull])
    let best = true
    let tie = 1
    for (let o = 0; o < opps; o++) {
      const sc = evaluate([base[k++], base[k++], ...boardFull])
      if (sc > mine) {
        best = false
        break
      }
      if (sc === mine) tie++
    }
    if (best) wins += 1 / tie
  }
  return wins / sims
}

export interface BotDecision {
  action: Action
  strength: number
  bluffing: boolean
  expr: Expression
}

const NOISE: Record<Difficulty, number> = { facil: 0.2, normal: 0.11, dificil: 0.06, estrela: 0.02 }
const BLUFF_MULT: Record<Difficulty, number> = { facil: 0.4, normal: 0.8, dificil: 1, estrela: 1.2 }

/** Força da mão (0..1) já considerando mesa e rua. */
export function handStrength(eng: PokerEngine, seat: Seat): number {
  const opps = eng.seats.filter((s) => !s.folded && !s.out && s.id !== seat.id).length
  if (eng.board.length === 0) {
    // contra mais oponentes a mão precisa ser melhor
    return preflopStrength(seat.cards) * (1 - 0.04 * Math.max(0, opps - 1))
  }
  return equity(seat.cards, eng.board, opps)
}

export function decideBot(eng: PokerEngine, id: number, diff: Difficulty): BotDecision {
  const seat = eng.seats[id]
  const st = BOT_STYLES[seat.style % BOT_STYLES.length]
  const o = eng.options(id)
  const noise = (rand() - 0.5) * 2 * NOISE[diff]
  const pre = eng.board.length === 0
  const raw = handStrength(eng, seat)
  const strength = Math.max(0, Math.min(1, raw + noise))
  const pot = eng.pot
  const potOdds = o.toCall / (pot + o.toCall || 1)
  const bluffRoll = rand() < st.bluff * BLUFF_MULT[diff] * (pre ? 0.5 : 1)
  const aggrRoll = rand() < st.aggr
  const bb = eng.bb
  const roundTo = (v: number) => Math.round(v / (bb / 2 || 1)) * (bb / 2 || 1)

  // limiares: seletiva exige mais; com aposta a pagar, compara com as chances do pote
  const playThreshold = pre ? 0.12 + st.tight * 0.3 : 0.28 + st.tight * 0.28
  const raiseThreshold = pre ? 0.4 + st.tight * 0.22 : 0.62 + st.tight * 0.1

  const mkRaise = (frac: number): Action => {
    const target = roundTo(eng.currentBet + Math.max(eng.minRaise, pot * frac))
    return { type: 'raise', to: Math.max(o.minRaiseTo, Math.min(o.maxRaiseTo, target)) }
  }
  // nunca coloca quase todo o stack com mão média (a menos que seja forte)
  const shove = (a: Action): Action => {
    if (a.type === 'raise' && (a.to ?? 0) >= o.maxRaiseTo * 0.7 && strength < 0.75 && !pre) return o.toCall > 0 ? { type: 'call' } : { type: 'check' }
    return a
  }

  let action: Action
  let bluffing = false
  if (o.toCall === 0) {
    if (o.canRaise && strength >= raiseThreshold && (aggrRoll || strength > 0.85)) action = shove(mkRaise(0.45 + strength * 0.5))
    else if (o.canRaise && bluffRoll && !pre && eng.street !== 'river') {
      action = mkRaise(0.5)
      bluffing = true
    } else action = { type: 'check' }
  } else {
    const need = potOdds + (pre ? 0 : 0.02) - (st.tight < 0.4 ? 0.06 : 0) + st.tight * 0.07
    if (o.canRaise && strength >= raiseThreshold + 0.05 && aggrRoll) action = shove(mkRaise(0.6 + strength * 0.6))
    else if (o.canRaise && bluffRoll && o.toCall <= pot * 0.6 && strength < 0.4) {
      action = mkRaise(0.9)
      bluffing = true
    } else if (strength >= Math.max(playThreshold * (pre ? 0.9 : 0.6), need)) action = { type: 'call' }
    else action = { type: 'fold' }
  }
  // não desiste de graça
  if (action.type === 'fold' && o.canCheck) action = { type: 'check' }

  // expressão do rosto (tells-lite)
  let expr: Expression = 'neutral'
  const reveal = rand() < st.tell
  if (reveal) {
    const shown = bluffing && st.reverse ? 0.9 : st.reverse ? 1 - strength : strength
    expr = shown > 0.7 ? 'confident' : shown > 0.45 ? 'happy' : shown < 0.22 ? 'worried' : 'thinking'
  } else if (rand() < 0.35) expr = 'thinking'
  return { action, strength, bluffing, expr }
}

/** Dica para a jogadora no modo Fácil (nunca no Estrela). */
export function hintFor(eng: PokerEngine, id: number): { equity: number; text: string } {
  const seat = eng.seats[id]
  const o = eng.options(id)
  const opps = eng.seats.filter((s) => !s.folded && !s.out && s.id !== id).length
  const eq = eng.board.length === 0 ? preflopStrength(seat.cards) : equity(seat.cards, eng.board, opps, 200)
  const potOdds = o.toCall / (eng.pot + o.toCall || 1)
  let text: string
  if (o.toCall === 0) text = eq > 0.62 ? 'Mão forte: vale apostar.' : 'Sem custo: passe e veja a próxima carta.'
  else if (eq > potOdds + 0.15) text = 'As chances do pote compensam: pague ou aumente.'
  else if (eq > potOdds) text = 'Dá para pagar, mas sem exagero.'
  else text = 'Pagar custa mais do que a mão vale: desistir é razoável.'
  return { equity: eq, text }
}
