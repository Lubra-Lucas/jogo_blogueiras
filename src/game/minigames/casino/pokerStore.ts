import { create } from 'zustand'
import { useAchievements } from '../../casino/achievements'
import { useChips } from '../../casino/chips'
import { finishRound, type RoundReport } from '../../casino/report'
import type { Difficulty } from '../shared/competition'
import { categoryOf } from './pokerEval'
import { BOT_STYLES, decideBot } from './pokerBots'
import { PokerEngine, type Action } from './pokerEngine'
import { casinoSfx } from './sfx'
import { rand, shuffle } from './random'

export type PokerMode = 'cash' | 'sng'
export const SNG = {
  players: 5,
  buyIn: 200,
  stack: 1500,
  prizes: [550, 300, 150],
  handsPerLevel: 6,
  levels: [[15, 30], [25, 50], [50, 100], [75, 150], [100, 200], [150, 300], [200, 400], [300, 600]] as [number, number][],
}
export const CASH = { sb: 10, bb: 20, buyIns: [400, 1000, 2000] }

interface PokerState {
  mode: PokerMode
  stage: 'setup' | 'playing' | 'ended'
  eng: PokerEngine | null
  tick: number
  nBots: number
  buyIn: number
  difficulty: Difficulty
  waiting: boolean
  thinking: number
  awaitNext: boolean
  message: string
  level: number
  places: Record<number, number>
  prize: number
  report: RoundReport | null
  sessionNet: number
  handWon: number
  revealed: boolean
  setup: (p: Partial<Pick<PokerState, 'mode' | 'nBots' | 'buyIn' | 'difficulty'>>) => void
  start: () => boolean
  humanAct: (a: Action) => void
  nextHand: () => void
  leave: () => void
  toSetup: () => void
}

let gen = 0
const later = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export const usePoker = create<PokerState>()((set, get) => {
  const bump = () => set((s) => ({ tick: s.tick + 1 }))

  async function run(my: number) {
    const e = get().eng
    if (!e) return
    for (;;) {
      if (my !== gen) return
      if (e.phase === 'done') {
        await handDone(my)
        return
      }
      if (e.phase === 'runout') {
        set({ message: 'Todos all-in: as cartas serão reveladas.', revealed: true })
        await later(1200)
        if (my !== gen) return
        e.runoutStep()
        casinoSfx('card')
        bump()
        continue
      }
      const seat = e.seats[e.toAct]
      if (!seat) return
      if (seat.human) {
        set({ waiting: true, thinking: -1, message: 'Sua vez.' })
        return
      }
      const fast = e.seats[0].folded ? 0.45 : 1
      set({ thinking: seat.id })
      await later((520 + rand() * 800) * fast)
      if (my !== gen) return
      const d = decideBot(e, seat.id, get().difficulty)
      const boardBefore = e.board.length
      seat.expr = d.expr
      e.act(seat.id, d.action)
      casinoSfx(d.action.type === 'fold' ? 'fold' : d.action.type === 'check' ? 'tick' : 'chip')
      set({ thinking: -1 })
      bump()
      if (e.board.length !== boardBefore) {
        casinoSfx('card')
        await later(650 * fast)
      }
    }
  }

  async function handDone(my: number) {
    const s = get()
    const e = s.eng as PokerEngine
    set({ waiting: false, thinking: -1, revealed: e.showdown })
    if (e.showdown) casinoSfx('flip')
    const won = e.won[0] ?? 0
    for (const seat of e.seats) {
      if (seat.out) continue
      seat.expr = (e.won[seat.id] ?? 0) > 0 ? 'happy' : seat.folded ? 'neutral' : 'sad'
    }
    const winnerNames = e.pots.length ? [...new Set(e.pots.flatMap((p) => p.winners))].map((i) => e.seats[i].name) : []
    const label = e.pots.find((p) => p.handLabel)?.handLabel ?? ''
    const msg = won > 0
      ? `Você ganhou ${won.toLocaleString('pt-BR')} fichas${label ? ` com ${label}` : ''}.`
      : `${winnerNames.join(' e ')} ${winnerNames.length > 1 ? 'dividem' : 'leva'} o pote${label ? ` (${label})` : ''}.`
    const ach = useAchievements.getState()
    if (won > 0) {
      casinoSfx(won > e.bb * 20 ? 'big' : 'win')
      ach.award('poker_hand')
      const sc = e.lastScores[0]
      if (e.showdown && sc !== undefined && categoryOf(sc) >= 6) ach.award('poker_showdown')
    } else casinoSfx('lose')
    bump()
    set({ message: msg, handWon: won })
    await later(900)
    if (my !== gen) return

    const st = get()
    if (st.mode === 'cash') {
      const report = finishRound('poker', st.difficulty, won)
      const humanOut = e.seats[0].stack <= 0
      set({ report, sessionNet: st.sessionNet + won, awaitNext: !humanOut })
      if (humanOut) endCash(my)
      return
    }
    // sit & go: eliminações por ordem de fichas no começo da mão
    const alive = e.seats.filter((x) => !x.out).length
    const places = { ...st.places }
    const busted = e.seats
      .filter((x) => x.stack <= 0 && !places[x.id])
      .sort((a, b) => (startStacks[a.id] ?? 0) - (startStacks[b.id] ?? 0))
    let rem = alive
    for (const b of busted) places[b.id] = rem--
    const left = e.seats.filter((x) => x.stack > 0)
    if (left.length === 1 && !places[left[0].id]) places[left[0].id] = 1
    set({ places })
    if (places[0]) endSng(places[0])
    else set({ awaitNext: true })
  }

  function endCash(my: number) {
    if (my !== gen) return
    set({ stage: 'ended', awaitNext: false, message: 'Suas fichas da mesa acabaram.' })
  }

  function endSng(place: number) {
    const prize = SNG.prizes[place - 1] ?? 0
    if (prize) useChips.getState().collect(prize)
    const report = finishRound('poker', get().difficulty, prize - SNG.buyIn)
    if (place === 1) useAchievements.getState().award('poker_sng')
    casinoSfx(place === 1 ? 'big' : place <= 3 ? 'win' : 'lose')
    set({ stage: 'ended', prize, report, awaitNext: false, message: `Você terminou em ${place}º lugar.` })
  }

  const startStacks: Record<number, number> = {}

  function beginHand() {
    const s = get()
    const e = s.eng as PokerEngine
    if (s.mode === 'sng') {
      const lvl = Math.min(SNG.levels.length - 1, Math.floor((e.handNo) / SNG.handsPerLevel))
      e.setBlinds(...SNG.levels[lvl])
      set({ level: lvl })
    } else {
      // bots que ficaram sem fichas voltam à mesa com a mesma compra
      for (const seat of e.seats) if (!seat.human && seat.stack < e.bb * 4) {
        seat.stack = s.buyIn
        seat.out = false
      }
    }
    for (const seat of e.seats) startStacks[seat.id] = seat.stack
    if (!e.startHand()) {
      set({ stage: 'ended' })
      return
    }
    casinoSfx('card')
    set({ awaitNext: false, waiting: false, revealed: false, handWon: 0, message: `Mão ${e.handNo}`, thinking: -1 })
    bump()
    void run(gen)
  }

  return {
    mode: 'cash', stage: 'setup', eng: null, tick: 0, nBots: 4, buyIn: 1000, difficulty: 'normal', waiting: false, thinking: -1,
    awaitNext: false, message: '', level: 0, places: {}, prize: 0, report: null, sessionNet: 0, handWon: 0, revealed: false,
    setup: (p) => set(p),
    start: () => {
      const s = get()
      const chips = useChips.getState()
      const cost = s.mode === 'sng' ? SNG.buyIn : s.buyIn
      if (!chips.wager(cost)) {
        set({ message: 'Fichas insuficientes para entrar. Peça as fichas do dia no lobby.' })
        return false
      }
      gen++
      const n = s.mode === 'sng' ? SNG.players - 1 : s.nBots
      const styles = shuffle(BOT_STYLES.map((_, i) => i)).slice(0, n)
      const stack = s.mode === 'sng' ? SNG.stack : s.buyIn
      const cfg = [{ name: 'Você', human: true, stack, style: 0 }, ...styles.map((i) => ({ name: BOT_STYLES[i].name, human: false, stack, style: i }))]
      const [sb, bb] = s.mode === 'sng' ? SNG.levels[0] : [CASH.sb, CASH.bb]
      set({ eng: new PokerEngine(cfg, sb, bb), stage: 'playing', places: {}, prize: 0, report: null, sessionNet: 0, level: 0, tick: 0 })
      beginHand()
      return true
    },
    humanAct: (a) => {
      const s = get()
      const e = s.eng
      if (!e || !s.waiting || e.toAct !== 0) return
      const ok = e.act(0, a)
      if (!ok) return
      casinoSfx(a.type === 'fold' ? 'fold' : a.type === 'check' ? 'tick' : 'chips')
      const board = e.board.length
      set({ waiting: false })
      bump()
      void (async () => {
        const my = gen
        if (e.board.length !== board) await later(500)
        void run(my)
      })()
    },
    nextHand: () => {
      if (get().stage !== 'playing' || !get().awaitNext) return
      beginHand()
    },
    leave: () => {
      const s = get()
      const e = s.eng
      gen++
      if (s.stage === 'playing' && e) {
        if (s.mode === 'cash') {
          // devolve as fichas da mesa (a mão em andamento, se houver, fica perdida)
          const mid = e.phase !== 'done' && e.phase !== 'idle'
          const back = mid ? Math.max(0, e.seats[0].stack) : e.seats[0].stack
          useChips.getState().collect(back)
        } else {
          // desistir do torneio: perde a inscrição
          finishRound('poker', s.difficulty, -SNG.buyIn)
        }
      }
      set({ stage: 'setup', eng: null, waiting: false, thinking: -1, awaitNext: false })
    },
    toSetup: () => {
      gen++
      set({ stage: 'setup', eng: null, waiting: false, awaitNext: false })
    },
  }
})
