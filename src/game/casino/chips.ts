import { create } from 'zustand'

/**
 * FICHAS do Lounge de Jogos.
 *
 * Regras de design (público familiar, inclui menores):
 *  - Fichas NÃO são compradas com dinheiro real nem com Diamantes, NÃO se convertem em Brilhos ou
 *    Diamantes (e vice-versa) e NÃO podem ser trocadas entre jogadoras. Por isso ficam aqui, em
 *    armazenamento próprio (`jdb.casino.v1`), e nunca passam pela carteira da economia.
 *  - Ganhos viram só STATUS: ranking, títulos e itens de aparência (ver achievements.ts).
 *  - Fichas grátis todo dia (e um pedido extra por dia se acabarem).
 */
const KEY = 'jdb.casino.v1'

export const START_CHIPS = 2000
export const DAILY_CHIPS = 1000
export const ASK_CHIPS = 500
/** abaixo disso a jogadora pode "pedir fichas" (uma vez por dia) */
export const ASK_BELOW = 200

export type GameId = 'blackjack' | 'poker' | 'roleta' | 'slots'
export const GAME_LABEL: Record<GameId, string> = {
  blackjack: 'Blackjack',
  poker: 'Pôquer',
  roleta: 'Roleta',
  slots: 'Caça-níqueis',
}

interface Saved {
  balance: number
  lastDaily: string
  lastAsk: string
  day: string
  /** ganho líquido de hoje por jogo */
  net: Partial<Record<GameId, number>>
  rounds: number
}

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function load(): Saved {
  const base: Saved = { balance: START_CHIPS, lastDaily: '', lastAsk: '', day: today(), net: {}, rounds: 0 }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return base
    const s = JSON.parse(raw) as Partial<Saved>
    const out: Saved = {
      balance: Math.max(0, Math.floor(Number(s.balance) || 0)),
      lastDaily: typeof s.lastDaily === 'string' ? s.lastDaily : '',
      lastAsk: typeof s.lastAsk === 'string' ? s.lastAsk : '',
      day: typeof s.day === 'string' ? s.day : today(),
      net: s.net && typeof s.net === 'object' ? s.net : {},
      rounds: Math.max(0, Math.floor(Number(s.rounds) || 0)),
    }
    if (out.day !== today()) {
      out.day = today()
      out.net = {}
    }
    return out
  } catch {
    return base
  }
}

function save(s: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* armazenamento indisponível */
  }
}

interface ChipsState extends Saved {
  /** pode receber as fichas do dia */
  canClaimDaily: () => boolean
  canAsk: () => boolean
  claimDaily: () => boolean
  askChips: () => boolean
  /** tira fichas da carteira para apostar; false se não houver saldo */
  wager: (n: number) => boolean
  /** devolve/entrega fichas (prêmio ou troco) */
  collect: (n: number) => void
  /** registra uma rodada concluída (ganho líquido do jogo) para o ranking do dia */
  recordRound: (game: GameId, net: number) => void
  dayNet: (game: GameId) => number
}

const init = load()

export const useChips = create<ChipsState>()((set, get) => {
  const commit = (patch: Partial<Saved>) => {
    const cur = get()
    const next: Saved = {
      balance: cur.balance, lastDaily: cur.lastDaily, lastAsk: cur.lastAsk, day: cur.day, net: cur.net, rounds: cur.rounds, ...patch,
    }
    save(next)
    set(patch)
  }
  const rollDay = () => {
    const cur = get()
    if (cur.day !== today()) commit({ day: today(), net: {} })
  }
  return {
    ...init,
    canClaimDaily: () => get().lastDaily !== today(),
    canAsk: () => get().lastAsk !== today() && get().balance < ASK_BELOW,
    claimDaily: () => {
      if (get().lastDaily === today()) return false
      commit({ balance: get().balance + DAILY_CHIPS, lastDaily: today() })
      return true
    },
    askChips: () => {
      const s = get()
      if (s.lastAsk === today() || s.balance >= ASK_BELOW) return false
      commit({ balance: s.balance + ASK_CHIPS, lastAsk: today() })
      return true
    },
    wager: (n) => {
      const s = get()
      if (n <= 0 || s.balance < n) return false
      commit({ balance: s.balance - n })
      return true
    },
    collect: (n) => {
      if (n > 0) commit({ balance: get().balance + Math.floor(n) })
    },
    recordRound: (game, net) => {
      rollDay()
      const s = get()
      commit({ net: { ...s.net, [game]: (s.net[game] ?? 0) + net }, rounds: s.rounds + 1 })
    },
    dayNet: (game) => (get().day === today() ? (get().net[game] ?? 0) : 0),
  }
})

/** Lembrete de pausa depois de 20 minutos de sessão no lounge. */
export const BREAK_AFTER_MS = 20 * 60 * 1000

export const fmtChips = (n: number) => Math.round(n).toLocaleString('pt-BR')
