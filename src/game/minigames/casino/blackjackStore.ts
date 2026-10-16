import { create } from 'zustand'
import { useAchievements } from '../../casino/achievements'
import { useChips } from '../../casino/chips'
import { finishRound, type RoundReport } from '../../casino/report'
import type { Difficulty } from '../shared/competition'
import {
  basicStrategy, dealerShouldHit, handValue, isNaturalBlackjack, judgeHand, payoutFor,
  type BjAction, type BjResult, BJ_RULES,
} from './blackjack'
import { Shoe, type Card } from './cards'
import { casinoSfx } from './sfx'

export interface BjHand {
  cards: Card[]
  bet: number
  doubled: boolean
  split: boolean
  done: boolean
  result?: BjResult
  payout?: number
}

export type BjPhase = 'bet' | 'dealing' | 'player' | 'dealer' | 'done'

/** limite de aposta por mesa (dificuldade) */
export const BJ_MAX_BET: Record<Difficulty, number> = { facil: 200, normal: 500, dificil: 1000, estrela: 2000 }

interface BjState {
  phase: BjPhase
  hands: BjHand[]
  active: number
  dealer: Card[]
  holeHidden: boolean
  bet: number
  lastBet: number
  message: string
  net: number
  streak: number
  report: RoundReport | null
  difficulty: Difficulty
  hint: boolean
  shuffled: boolean
  cardsLeft: number
  setDifficulty: (d: Difficulty) => void
  setHint: (v: boolean) => void
  addBet: (v: number) => void
  clearBet: () => void
  repeatBet: () => void
  deal: () => void
  act: (a: BjAction) => void
  canDouble: () => boolean
  canSplit: () => boolean
  suggestion: () => BjAction | null
  reset: () => void
}

let shoe = new Shoe(BJ_RULES.decks)
let gen = 0
const later = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export const useBlackjack = create<BjState>()((set, get) => {
  const upd = (p: Partial<BjState>) => set(p)
  const setHands = (hands: BjHand[]) => set({ hands: hands.map((h) => ({ ...h })), cardsLeft: shoe.remaining })

  async function drawTo(hands: BjHand[], i: number, my: number) {
    if (my !== gen) return
    hands[i].cards.push(shoe.draw())
    casinoSfx('card')
    setHands(hands)
    await later(360)
  }

  async function settle(my: number) {
    if (my !== gen) return
    const { hands, dealer, difficulty } = get()
    let ret = 0
    let staked = 0
    const out = hands.map((h) => {
      const result = judgeHand(h.cards, dealer, h.split)
      const payout = payoutFor(result, h.bet)
      ret += payout
      staked += h.bet
      return { ...h, result, payout }
    })
    useChips.getState().collect(ret)
    const net = ret - staked
    const report = finishRound('blackjack', difficulty, net)
    const ach = useAchievements.getState()
    const anyWin = out.some((h) => h.result === 'win' || h.result === 'bj')
    if (out.some((h) => h.result === 'bj')) ach.award('bj_natural')
    let streak = get().streak
    if (net > 0) {
      streak++
      ach.award('bj_win')
    } else if (net < 0) streak = 0
    if (streak >= 5) ach.award('bj_streak')
    const msg = out.some((h) => h.result === 'bj')
      ? 'Blackjack! Paga 3 para 2.'
      : net > 0 ? 'Você venceu a rodada!' : net === 0 ? 'Empate: aposta devolvida.' : out.every((h) => h.result === 'bust') ? 'Estourou.' : 'A banca venceu desta vez.'
    casinoSfx(anyWin ? (net >= staked * 1.4 ? 'big' : 'win') : net === 0 ? 'push' : 'lose')
    set({ hands: out, phase: 'done', net, message: msg, report, streak, holeHidden: false })
  }

  async function dealerPlay(my: number) {
    set({ phase: 'dealer', holeHidden: false })
    casinoSfx('flip')
    await later(600)
    if (my !== gen) return
    const { hands } = get()
    const need = hands.some((h) => !handValue(h.cards).bust && !(isNaturalBlackjack(h.cards) && !h.split))
    const dealer = [...get().dealer]
    while (need && dealerShouldHit(dealer)) {
      dealer.push(shoe.draw())
      casinoSfx('card')
      set({ dealer: [...dealer], cardsLeft: shoe.remaining })
      await later(700)
      if (my !== gen) return
    }
    await later(300)
    await settle(my)
  }

  async function advance(my: number) {
    // próxima mão ainda aberta
    let i = get().active
    const hands = get().hands.map((h) => ({ ...h, cards: [...h.cards] }))
    hands[i].done = true
    for (;;) {
      i++
      if (i >= hands.length) break
      if (hands[i].cards.length < 2) {
        set({ active: i })
        await drawTo(hands, i, my)
        if (my !== gen) return
      }
      const v = handValue(hands[i].cards)
      if (hands[i].done || v.total === 21) {
        hands[i].done = true
        setHands(hands)
        continue
      }
      set({ active: i, phase: 'player' })
      setHands(hands)
      return
    }
    setHands(hands)
    await dealerPlay(my)
  }

  return {
    phase: 'bet', hands: [], active: 0, dealer: [], holeHidden: true, bet: 0, lastBet: 0, message: 'Faça sua aposta.', net: 0,
    streak: 0, report: null, difficulty: 'normal', hint: false, shuffled: false, cardsLeft: shoe.remaining,
    setDifficulty: (d) => upd({ difficulty: d, bet: Math.min(get().bet, BJ_MAX_BET[d]) }),
    setHint: (v) => upd({ hint: v }),
    addBet: (v) => {
      const s = get()
      if (s.phase !== 'bet' && s.phase !== 'done') return
      const base = s.phase === 'done' ? 0 : s.bet
      const bal = useChips.getState().balance
      const nb = Math.min(base + v, BJ_MAX_BET[s.difficulty], bal)
      if (nb === base && s.phase !== 'done') return
      casinoSfx('chip')
      upd({ bet: nb, phase: 'bet', hands: s.phase === 'done' ? [] : s.hands, dealer: s.phase === 'done' ? [] : s.dealer, message: 'Faça sua aposta.' })
    },
    clearBet: () => {
      if (get().phase === 'bet') upd({ bet: 0 })
    },
    repeatBet: () => {
      const s = get()
      if (s.phase !== 'bet' && s.phase !== 'done') return
      const bal = useChips.getState().balance
      const b = Math.min(s.lastBet, BJ_MAX_BET[s.difficulty], bal)
      if (b >= 10) upd({ bet: b, phase: 'bet', hands: [], dealer: [], message: 'Faça sua aposta.' })
    },
    canDouble: () => {
      const s = get()
      const h = s.hands[s.active]
      if (s.phase !== 'player' || !h || h.cards.length !== 2) return false
      if (h.split && h.cards[0].r === 14) return false
      return useChips.getState().balance >= h.bet
    },
    canSplit: () => {
      const s = get()
      const h = s.hands[s.active]
      if (s.phase !== 'player' || !h || h.cards.length !== 2 || s.hands.length >= BJ_RULES.maxHands) return false
      const cv = (c: Card) => (c.r >= 10 && c.r <= 13 ? 10 : c.r)
      return cv(h.cards[0]) === cv(h.cards[1]) && useChips.getState().balance >= h.bet
    },
    suggestion: () => {
      const s = get()
      const h = s.hands[s.active]
      if (s.phase !== 'player' || !h || s.dealer.length < 1) return null
      return basicStrategy(h.cards, s.dealer[0], { double: s.canDouble(), split: s.canSplit() })
    },
    deal: () => {
      const s = get()
      if ((s.phase !== 'bet' && s.phase !== 'done') || s.bet < 10) return
      const bet = s.phase === 'done' ? s.lastBet : s.bet
      if (!useChips.getState().wager(bet)) {
        upd({ message: 'Fichas insuficientes. Peça as fichas do dia no lobby.' })
        return
      }
      const my = ++gen
      const reshuffle = shoe.needsShuffle
      if (reshuffle) shoe.reshuffle()
      const hands: BjHand[] = [{ cards: [], bet, doubled: false, split: false, done: false }]
      set({
        phase: 'dealing', hands, dealer: [], holeHidden: true, active: 0, lastBet: bet, bet, net: 0, report: null,
        message: reshuffle ? 'Sapato embaralhado.' : 'Distribuindo…', cardsLeft: shoe.remaining,
      })
      void (async () => {
        const dealer: Card[] = []
        const push = async (to: 'p' | 'd') => {
          if (my !== gen) return
          if (to === 'p') hands[0].cards.push(shoe.draw())
          else dealer.push(shoe.draw())
          casinoSfx('card')
          set({ hands: hands.map((h) => ({ ...h })), dealer: [...dealer], cardsLeft: shoe.remaining })
          await later(380)
        }
        await later(250)
        await push('p')
        await push('d')
        await push('p')
        await push('d')
        if (my !== gen) return
        const pBj = isNaturalBlackjack(hands[0].cards)
        const up = dealer[0]
        const peek = up.r === 14 || up.r >= 10
        const dBj = isNaturalBlackjack(dealer)
        if (pBj || (peek && dBj)) {
          set({ message: dBj ? 'A banca tem blackjack.' : 'Blackjack!' })
          await later(500)
          await dealerPlay(my)
          return
        }
        set({ phase: 'player', message: 'Sua vez.' })
      })()
    },
    act: (a) => {
      const s = get()
      if (s.phase !== 'player') return
      const my = gen
      const hands = s.hands.map((h) => ({ ...h, cards: [...h.cards] }))
      const i = s.active
      const h = hands[i]
      if (a === 'hit') {
        void (async () => {
          set({ phase: 'dealing' })
          await drawTo(hands, i, my)
          if (my !== gen) return
          const v = handValue(hands[i].cards)
          if (v.total >= 21) await advance(my)
          else set({ phase: 'player' })
        })()
      } else if (a === 'stand') {
        set({ phase: 'dealing' })
        void advance(my).then(() => {
          if (my === gen && get().phase === 'dealing') set({ phase: 'player' })
        })
      } else if (a === 'double') {
        if (!s.canDouble() || !useChips.getState().wager(h.bet)) return
        h.bet *= 2
        h.doubled = true
        set({ phase: 'dealing' })
        casinoSfx('chips')
        void (async () => {
          await drawTo(hands, i, my)
          if (my !== gen) return
          await advance(my)
          if (my === gen && get().phase === 'dealing') set({ phase: 'player' })
        })()
      } else if (a === 'split') {
        if (!s.canSplit() || !useChips.getState().wager(h.bet)) return
        const second: BjHand = { cards: [h.cards.pop() as Card], bet: h.bet, doubled: false, split: true, done: false }
        h.split = true
        const aces = h.cards[0].r === 14
        hands.splice(i + 1, 0, second)
        casinoSfx('chips')
        set({ phase: 'dealing' })
        void (async () => {
          setHands(hands)
          await later(250)
          await drawTo(hands, i, my)
          if (my !== gen) return
          if (aces) {
            hands[i].done = true
            hands[i + 1].done = true
          }
          setHands(hands)
          if (aces || handValue(hands[i].cards).total === 21) {
            set({ active: i })
            await advance(my)
            if (my === gen && get().phase === 'dealing') set({ phase: 'player' })
          } else set({ phase: 'player' })
        })()
      }
    },
    reset: () => {
      gen++
      shoe = new Shoe(BJ_RULES.decks)
      // se saiu no meio de uma rodada, a aposta já feita fica perdida (não devolvemos: igual à mesa)
      upd({ phase: 'bet', hands: [], dealer: [], bet: 0, holeHidden: true, message: 'Faça sua aposta.', report: null, net: 0, cardsLeft: shoe.remaining })
    },
  }
})
