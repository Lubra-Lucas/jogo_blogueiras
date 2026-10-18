import { create } from 'zustand'
import { loadJson, saveJson, STORAGE_KEYS } from '../shared/storage'
import { QUESTS } from './quests'
import { STARTER_ITEMS } from '../game/economy/prices'
import { emitEconomy } from '../game/economy/events'
import type { Currency, LedgerEntry } from '../game/economy/types'

/** Nome da moeda do jogo (troque aqui para renomear em toda a UI). */
export const CURRENCY_NAME = 'Brilhos'

/** nivel de profissao (1..10) a partir do XP acumulado: 30*n*(n-1) */
export function professionLevel(xp: number): number {
  let n = 1
  while (n < 10 && xp >= 30 * (n + 1) * n) n++
  return n
}

export const PROFESSIONS = ['Barista', 'Cabeleireira', 'Fotógrafa', 'Modelo', 'Estilista', 'DJ', 'Joalheira'] as const
export const NO_PROFESSION = 'Sem profissão'

/** XP necessario para sair do nivel `level` para o proximo. */
export function xpToNext(level: number): number {
  return Math.round(80 + 45 * Math.pow(level - 1, 1.5))
}

/** Titulo de fama por nivel. */
export function fameTitle(level: number): string {
  if (level >= 25) return 'Ícone'
  if (level >= 16) return 'Celebridade'
  if (level >= 11) return 'It Girl'
  if (level >= 7) return 'Blogueira'
  if (level >= 4) return 'Micro-influencer'
  if (level >= 2) return 'Iniciante'
  return 'Anônima'
}

export interface Toast {
  id: number
  kind: 'xp' | 'level' | 'quest'
  text: string
  sub?: string
}

interface Saved {
  v: 1
  name: string
  named: boolean
  level: number
  xp: number
  coins: number
  profession: string | null
  status: string
  visited: string[]
  done: string[]
  /** Fama acumulada (minigames) */
  fame: number
  /** missao acompanhada (linha sob o minimapa) */
  tracked: string | null
  /** XP por profissao (minigames) */
  professionXp: Record<string, number>
  /** Diamantes (moeda premium) */
  diamonds: number
  /** ids de itens possuidos (inventario) */
  owned: string[]
  /** extrato: ultimas 50 transacoes (transparencia; NAO e anti-fraude, ver economy/service.ts) */
  ledger: LedgerEntry[]
}

const DEFAULTS: Saved = {
  v: 1,
  name: 'Blogueira',
  named: false,
  level: 1,
  xp: 0,
  coins: 50,
  profession: null,
  status: 'Pronta para brilhar',
  visited: [],
  done: [],
  fame: 0,
  tracked: null,
  professionXp: {},
  diamonds: 0,
  owned: [...STARTER_ITEMS],
  ledger: [],
}

function load(): Saved {
  const s = loadJson<Partial<Saved>>(STORAGE_KEYS.profile)
  if (!s || s.v !== 1) return { ...DEFAULTS }
  return {
    ...DEFAULTS,
    ...s,
    name: typeof s.name === 'string' && s.name.trim() ? s.name.slice(0, 20) : DEFAULTS.name,
    level: Math.max(1, Math.floor(Number(s.level) || 1)),
    xp: Math.max(0, Number(s.xp) || 0),
    coins: Math.max(0, Math.floor(Number(s.coins) || 0)),
    visited: Array.isArray(s.visited) ? s.visited.filter((x) => typeof x === 'string') : [],
    done: Array.isArray(s.done) ? s.done.filter((x) => typeof x === 'string') : [],
    fame: Math.max(0, Number(s.fame) || 0),
    tracked: typeof s.tracked === 'string' ? s.tracked : null,
    professionXp: s.professionXp && typeof s.professionXp === 'object' ? s.professionXp : {},
    diamonds: Math.max(0, Math.floor(Number(s.diamonds) || 0)),
    owned: [...new Set([...STARTER_ITEMS, ...(Array.isArray(s.owned) ? s.owned.filter((x) => typeof x === 'string') : [])])],
    ledger: Array.isArray(s.ledger) ? s.ledger.filter((e) => e && typeof e.amount === 'number').slice(0, 50) : [],
  }
}

interface ProfileState extends Saved {
  toast: Toast | null
  setName: (n: string) => void
  setStatus: (s: string) => void
  addXp: (n: number) => void
  addCoins: (n: number, reason?: string, opts?: { silent?: boolean }) => void
  /** entrada de moeda com registro no extrato */
  /** opts.silent: nao conta como 'ganho' para missoes/conquistas (ex.: vendas no Mercado) */
  credit: (currency: Currency, n: number, reason: string, opts?: { silent?: boolean }) => void
  /** saida de moeda; false se saldo insuficiente (nada muda) */
  debit: (currency: Currency, n: number, reason: string) => boolean
  /** adiciona item ao inventario */
  grantItem: (id: string) => void
  /** recompensa de minigame (Brilhos, XP, XP de profissao) */
  grantRewards: (r: { coins?: number; xp?: number; professionXp?: Record<string, number> }) => void
  addProfessionXp: (name: string, n: number) => void
  addFame: (n: number) => void
  /** registra que o jogador esteve numa area (id do `locate`); conclui missoes de visita */
  visit: (areaId: string) => void
  /** conclui uma missao (recompensa + aviso); ignora se ja concluida */
  completeQuest: (id: string) => void
  track: (id: string | null) => void
  reset: () => void
  /**
   * MODO TESTE (ver game/testMode.ts): garante minimos sem rebaixar. Uma unica gravacao, sem avisos de nivel,
   * no maximo uma linha no extrato. Devolve true se algo mudou.
   */
  testGrant: (g: { level: number; coins: number; diamonds: number; professionXp: Record<string, number>; owned: string[] }) => boolean
}

let toastId = 0
let ledgerId = Date.now()
const entry = (currency: Currency, amount: number, reason: string, balance: number): LedgerEntry => ({ id: ++ledgerId, t: Date.now(), currency, amount, reason, balance })
const persist = (s: ProfileState) => {
  const { v, name, named, level, xp, coins, profession, status, visited, done, fame, professionXp, tracked, diamonds, owned, ledger } = s
  saveJson(STORAGE_KEYS.profile, { v, name, named, level, xp, coins, profession, status, visited, done, fame, professionXp, tracked, diamonds, owned, ledger })
}

export const useProfileStore = create<ProfileState>()((set, get) => ({
  ...load(),
  toast: null,
  setName: (n) => {
    const name = n.replace(/\s+/g, ' ').trim().slice(0, 20) || DEFAULTS.name
    set({ name, named: true })
    persist(get())
  },
  setStatus: (s) => {
    set({ status: s.slice(0, 60) })
    persist(get())
  },
  addXp: (n) => {
    let { level, xp } = get()
    const before = level
    xp += n
    while (xp >= xpToNext(level)) {
      xp -= xpToNext(level)
      level++
    }
    set({ level, xp, toast: level > before ? { id: ++toastId, kind: 'level', text: `Nível ${level}!`, sub: fameTitle(level) } : get().toast })
    persist(get())
    for (let l = before + 1; l <= level; l++) emitEconomy({ type: 'level', level: l })
  },
  addCoins: (n, reason = 'Recompensa', opts) => {
    const coins = Math.max(0, get().coins + n)
    set({ coins, ledger: n ? [entry('brilhos', n, reason, coins), ...get().ledger].slice(0, 50) : get().ledger })
    persist(get())
    if (n > 0 && !opts?.silent) emitEconomy({ type: 'earn', amount: n })
  },
  credit: (currency, n, reason, opts) => {
    if (!(n > 0)) return
    if (currency === 'brilhos') return get().addCoins(n, reason, opts)
    const diamonds = get().diamonds + Math.floor(n)
    set({ diamonds, ledger: [entry('diamantes', Math.floor(n), reason, diamonds), ...get().ledger].slice(0, 50) })
    persist(get())
  },
  debit: (currency, n, reason) => {
    n = Math.floor(n)
    if (!(n > 0)) return false
    const key = currency === 'brilhos' ? 'coins' : 'diamonds'
    const cur = get()[key]
    if (cur < n) return false
    set({ [key]: cur - n, ledger: [entry(currency, -n, reason, cur - n), ...get().ledger].slice(0, 50) } as Partial<ProfileState>)
    persist(get())
    return true
  },
  grantItem: (id) => {
    if (get().owned.includes(id)) return
    set({ owned: [...get().owned, id] })
    persist(get())
    emitEconomy({ type: 'item', itemId: id })
  },
  grantRewards: (r) => {
    if (r.coins) get().addCoins(r.coins, 'Recompensa de minijogo')
    if (r.xp) get().addXp(r.xp)
    if (r.coins || r.xp) emitEconomy({ type: 'round' })
    for (const [k, v] of Object.entries(r.professionXp ?? {})) get().addProfessionXp(k, v)
  },
  addProfessionXp: (name, n) => {
    set({ professionXp: { ...get().professionXp, [name]: (get().professionXp[name] ?? 0) + n } })
    persist(get())
  },
  addFame: (n) => {
    set({ fame: get().fame + n })
    persist(get())
  },
  visit: (areaId) => {
    const s = get()
    if (!s.visited.includes(areaId)) set({ visited: [...s.visited, areaId] })
    for (const q of QUESTS) if (q.trigger === 'visit' && q.area === areaId) get().completeQuest(q.id)
    persist(get())
  },
  completeQuest: (id) => {
    const q = QUESTS.find((x) => x.id === id)
    if (!q || get().done.includes(id)) return
    set({ done: [...get().done, id], tracked: get().tracked === id ? null : get().tracked, toast: { id: ++toastId, kind: 'quest', text: `Missão concluída: ${q.title}`, sub: `+${q.xp} XP · +${q.coins} ${CURRENCY_NAME}` } })
    get().addCoins(q.coins, `Missão: ${q.title}`)
    if (q.rewardItem) get().grantItem(q.rewardItem)
    if (q.rewardEdition) {
      const ed = q.rewardEdition
      void import('../game/market/api').then((m) => m.grantEdition(ed, 'missao_dificil')).catch(() => undefined)
    }
    get().addXp(q.xp) // se subir de nivel, o aviso de nivel substitui o da missao
    persist(get())
  },
  track: (id) => {
    set({ tracked: id })
    persist(get())
  },
  reset: () => {
    set({ ...DEFAULTS, owned: [...STARTER_ITEMS], ledger: [], toast: null })
    persist(get())
    void import('../game/testMode').then((m) => m.applyTestMode()).catch(() => undefined)
  },
  testGrant: (g) => {
    const s = get()
    const patch: Partial<Saved> = {}
    const levelUp = s.level < g.level
    if (levelUp) {
      patch.level = g.level
      patch.xp = 0
    }
    const dCoins = Math.max(0, g.coins - s.coins)
    const dDiamonds = Math.max(0, g.diamonds - s.diamonds)
    if (dCoins) patch.coins = g.coins
    if (dDiamonds) patch.diamonds = g.diamonds
    if (dCoins || dDiamonds) {
      const line = dCoins ? entry('brilhos', dCoins, 'Modo teste', g.coins) : entry('diamantes', dDiamonds, 'Modo teste', g.diamonds)
      patch.ledger = [line, ...s.ledger].slice(0, 50)
    }
    const px = { ...s.professionXp }
    let pxChanged = false
    for (const [k, v] of Object.entries(g.professionXp)) if ((px[k] ?? 0) < v) ((px[k] = v), (pxChanged = true))
    if (pxChanged) patch.professionXp = px
    const have = new Set(s.owned)
    const add = g.owned.filter((id) => !have.has(id))
    if (add.length) patch.owned = [...s.owned, ...add]
    if (!Object.keys(patch).length) return false
    set(patch)
    persist(get())
    if (levelUp) emitEconomy({ type: 'level', level: g.level })
    else if (add.length) emitEconomy({ type: 'item', itemId: add[0] })
    return true
  },
}))

// recompensas de minigames acumuladas antes do perfil existir (chave 'jdb.pendingRewards')
try {
  const raw = window.localStorage.getItem('jdb.pendingRewards')
  if (raw) {
    const r = JSON.parse(raw) as { coins?: number; xp?: number }
    window.localStorage.removeItem('jdb.pendingRewards')
    useProfileStore.getState().grantRewards({ coins: Number(r.coins) || 0, xp: Number(r.xp) || 0 })
  }
} catch {
  /* sem storage */
}
if (import.meta.env.DEV) (window as unknown as { __profile: typeof useProfileStore }).__profile = useProfileStore
