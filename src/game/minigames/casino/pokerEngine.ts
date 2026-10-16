import { shuffledDeck, type Card } from './cards'
import { evaluate, handName } from './pokerEval'

/**
 * Motor do Texas Hold'em sem limite (no-limit). Sem React e sem timers: o chamador (store/UI)
 * decide o ritmo. Fluxo de uma mão:
 *   startHand() -> act()... -> (runoutStep()...) -> mão termina em phase 'done'
 */
export type Street = 'preflop' | 'flop' | 'turn' | 'river'
export type Phase = 'idle' | 'betting' | 'runout' | 'done'
export type ActionType = 'fold' | 'check' | 'call' | 'raise'
export interface Action {
  type: ActionType
  /** só em 'raise': o total da aposta nesta rodada ("aumentar para") */
  to?: number
}
export type Expression = 'neutral' | 'confident' | 'worried' | 'happy' | 'thinking' | 'sad'

export interface Seat {
  id: number
  name: string
  human: boolean
  stack: number
  bet: number
  total: number
  cards: Card[]
  folded: boolean
  allIn: boolean
  acted: boolean
  out: boolean
  last: string
  expr: Expression
  /** índice do estilo do bot (ver pokerBots.ts) */
  style: number
}

export interface PotResult {
  amount: number
  eligible: number[]
  winners: number[]
  handLabel: string
}

export interface Options {
  toCall: number
  canCheck: boolean
  canRaise: boolean
  minRaiseTo: number
  maxRaiseTo: number
}

export class PokerEngine {
  seats: Seat[]
  sb: number
  bb: number
  button = -1
  board: Card[] = []
  deck: Card[] = []
  street: Street = 'preflop'
  phase: Phase = 'idle'
  toAct = -1
  currentBet = 0
  minRaise = 0
  handNo = 0
  /** resultados do showdown / prêmios por pote */
  pots: PotResult[] = []
  /** ganho líquido de cada lugar nesta mão */
  won: Record<number, number> = {}
  /** houve showdown (as cartas dos que seguiram são mostradas) */
  showdown = false
  lastScores: Record<number, number> = {}

  constructor(seats: Pick<Seat, 'name' | 'human' | 'stack' | 'style'>[], sb: number, bb: number) {
    this.seats = seats.map((s, i) => ({
      id: i,
      name: s.name,
      human: s.human,
      stack: s.stack,
      style: s.style,
      bet: 0,
      total: 0,
      cards: [],
      folded: false,
      allIn: false,
      acted: false,
      out: false,
      last: '',
      expr: 'neutral',
    }))
    this.sb = sb
    this.bb = bb
    this.minRaise = bb
  }

  get pot() {
    return this.seats.reduce((a, s) => a + s.total, 0)
  }

  private next(from: number, pred: (s: Seat) => boolean): number {
    const n = this.seats.length
    for (let k = 1; k <= n; k++) {
      const i = (from + k + n * 2) % n
      if (pred(this.seats[i])) return i
    }
    return -1
  }

  setBlinds(sb: number, bb: number) {
    this.sb = sb
    this.bb = bb
  }

  startHand(): boolean {
    for (const s of this.seats) if (s.stack <= 0) s.out = true
    const live = this.seats.filter((s) => !s.out)
    if (live.length < 2) {
      this.phase = 'idle'
      return false
    }
    this.handNo++
    this.deck = shuffledDeck()
    this.board = []
    this.pots = []
    this.won = {}
    this.showdown = false
    this.lastScores = {}
    for (const s of this.seats) {
      s.bet = 0
      s.total = 0
      s.cards = []
      s.folded = s.out
      s.allIn = false
      s.acted = false
      s.last = ''
      s.expr = 'neutral'
    }
    this.button = this.next(this.button, (s) => !s.out)
    let sbIdx: number
    let bbIdx: number
    if (live.length === 2) {
      sbIdx = this.button
      bbIdx = this.next(this.button, (s) => !s.out)
    } else {
      sbIdx = this.next(this.button, (s) => !s.out)
      bbIdx = this.next(sbIdx, (s) => !s.out)
    }
    this.post(sbIdx, this.sb)
    this.post(bbIdx, this.bb)
    this.currentBet = Math.max(this.seats[sbIdx].bet, this.seats[bbIdx].bet)
    this.minRaise = this.bb
    for (let round = 0; round < 2; round++) {
      let i = this.button
      for (let k = 0; k < live.length; k++) {
        i = this.next(i, (s) => !s.out)
        this.seats[i].cards.push(this.deck.pop() as Card)
      }
    }
    this.street = 'preflop'
    this.phase = 'betting'
    this.toAct = this.firstToAct(bbIdx)
    if (this.toAct < 0) this.afterBetting()
    return true
  }

  private post(i: number, amount: number) {
    const s = this.seats[i]
    const a = Math.min(amount, s.stack)
    s.stack -= a
    s.bet += a
    s.total += a
    if (s.stack === 0) s.allIn = true
  }

  private firstToAct(after: number): number {
    return this.next(after, (s) => !s.folded && !s.allIn && !s.out)
  }

  options(i: number): Options {
    const s = this.seats[i]
    const toCall = Math.max(0, Math.min(this.currentBet - s.bet, s.stack))
    const maxRaiseTo = s.bet + s.stack
    const minRaiseTo = Math.min(maxRaiseTo, this.currentBet + this.minRaise)
    return {
      toCall,
      canCheck: this.currentBet - s.bet <= 0,
      canRaise: s.stack > this.currentBet - s.bet,
      minRaiseTo,
      maxRaiseTo,
    }
  }

  act(i: number, a: Action): boolean {
    if (this.phase !== 'betting' || i !== this.toAct) return false
    const s = this.seats[i]
    const o = this.options(i)
    switch (a.type) {
      case 'fold':
        s.folded = true
        s.last = 'Desistiu'
        break
      case 'check':
        if (!o.canCheck) return false
        s.last = 'Passou'
        break
      case 'call': {
        const amt = o.toCall
        s.stack -= amt
        s.bet += amt
        s.total += amt
        if (s.stack === 0) s.allIn = true
        s.last = amt === 0 ? 'Passou' : s.allIn ? 'All-in' : 'Pagou'
        break
      }
      case 'raise': {
        if (!o.canRaise) return false
        let to = Math.round(a.to ?? o.minRaiseTo)
        to = Math.max(o.minRaiseTo, Math.min(o.maxRaiseTo, to))
        const pay = to - s.bet
        const raiseBy = to - this.currentBet
        s.stack -= pay
        s.bet = to
        s.total += pay
        if (s.stack === 0) s.allIn = true
        if (raiseBy >= this.minRaise) this.minRaise = raiseBy
        const had = this.currentBet > 0
        this.currentBet = Math.max(this.currentBet, to)
        for (const o2 of this.seats) if (o2 !== s) o2.acted = false
        s.last = s.allIn ? 'All-in' : had ? 'Aumentou' : 'Apostou'
        break
      }
    }
    s.acted = true
    this.advance(i)
    return true
  }

  private advance(from: number) {
    const alive = this.seats.filter((s) => !s.folded && !s.out)
    if (alive.length === 1) {
      this.collectBets()
      this.awardUncontested(alive[0])
      return
    }
    const nxt = this.next(from, (s) => !s.folded && !s.allIn && !s.out && (!s.acted || s.bet < this.currentBet))
    if (nxt >= 0 && nxt !== from) {
      this.toAct = nxt
      return
    }
    this.afterBetting()
  }

  private collectBets() {
    for (const s of this.seats) {
      s.bet = 0
      s.acted = false
    }
    this.currentBet = 0
    this.minRaise = this.bb
  }

  /** rodada de apostas terminou: próxima rua, ou mostrar as cartas */
  private afterBetting() {
    this.collectBets()
    this.toAct = -1
    if (this.street === 'river') {
      this.doShowdown()
      return
    }
    const canAct = this.seats.filter((s) => !s.folded && !s.allIn && !s.out)
    if (canAct.length <= 1) {
      this.phase = 'runout'
      return
    }
    this.dealStreet()
    this.toAct = this.firstToAct(this.button)
    this.phase = 'betting'
  }

  private dealStreet() {
    if (this.street === 'preflop') {
      this.board.push(this.deck.pop() as Card, this.deck.pop() as Card, this.deck.pop() as Card)
      this.street = 'flop'
    } else if (this.street === 'flop') {
      this.board.push(this.deck.pop() as Card)
      this.street = 'turn'
    } else if (this.street === 'turn') {
      this.board.push(this.deck.pop() as Card)
      this.street = 'river'
    }
  }

  /** Durante o "runout" (todos all-in): vira uma rua por chamada; no fim faz o showdown. */
  runoutStep() {
    if (this.phase !== 'runout') return
    if (this.street === 'river') {
      this.doShowdown()
      return
    }
    this.dealStreet()
  }

  private awardUncontested(w: Seat) {
    const amount = this.pot
    w.stack += amount
    this.won = {}
    for (const s of this.seats) this.won[s.id] = s.id === w.id ? amount - s.total : -s.total
    this.pots = [{ amount, eligible: [w.id], winners: [w.id], handLabel: '' }]
    this.showdown = false
    this.phase = 'done'
    this.toAct = -1
  }

  private doShowdown() {
    this.showdown = true
    const alive = this.seats.filter((s) => !s.folded && !s.out)
    for (const s of alive) this.lastScores[s.id] = evaluate([...s.cards, ...this.board])
    // pote principal e laterais, nível a nível de contribuição
    const levels = [...new Set(this.seats.filter((s) => s.total > 0).map((s) => s.total))].sort((a, b) => a - b)
    let prev = 0
    const gain: Record<number, number> = {}
    this.pots = []
    const n = this.seats.length
    for (const lvl of levels) {
      let amount = 0
      for (const s of this.seats) amount += Math.max(0, Math.min(s.total, lvl) - prev)
      prev = lvl
      const eligible = alive.filter((s) => s.total >= lvl).map((s) => s.id)
      if (amount <= 0) continue
      if (eligible.length === 0) {
        const back = this.seats.find((s) => s.total >= lvl && !s.out)
        if (back) gain[back.id] = (gain[back.id] ?? 0) + amount
        continue
      }
      let best = -1
      for (const id of eligible) best = Math.max(best, this.lastScores[id])
      const winners = eligible.filter((id) => this.lastScores[id] === best)
      const share = Math.floor(amount / winners.length)
      let rem = amount - share * winners.length
      const ordered = [...winners].sort((a, b) => ((a - this.button + n) % n) - ((b - this.button + n) % n))
      for (const id of ordered) {
        gain[id] = (gain[id] ?? 0) + share + (rem > 0 ? 1 : 0)
        if (rem > 0) rem--
      }
      this.pots.push({ amount, eligible, winners, handLabel: handName(best) })
    }
    for (const s of this.seats) {
      const g = gain[s.id] ?? 0
      s.stack += g
      this.won[s.id] = g - s.total
    }
    this.phase = 'done'
    this.toAct = -1
  }
}
