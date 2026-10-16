import { useTravelStore } from '../travel/travelStore'
import { create } from 'zustand'
import { loadJson, saveJson } from '../../shared/storage'
import { useProfileStore } from '../../state/profileStore'
import { useAppearanceStore } from '../../state/appearanceStore'
import { usePhotoStore } from '../../state/photoStore'
import { dayKey, economyNow, hash, monthKey } from './clock'
import { tagsOf } from '../character/itemTags'
import { onEconomyEvent } from './events'
import type { Currency } from './types'

/**
 * Estado da economia que nao e saldo/inventario (esses ficam no perfil): recompensa diaria,
 * missoes do dia, conquistas, limites de gasto e historico de compras de Diamantes (modo de teste).
 * Persistido em localStorage ('jb.economy.v1'). Tudo aqui e confiado ao cliente: ver service.ts.
 */
const KEY = 'jb.economy.v1'

export interface DailyMissionDef {
  id: string
  title: string
  target: number
  counter: 'rounds' | 'earned' | 'buys' | 'photos'
  reward: { currency: Currency; amount: number }
  xp?: number
}

export const DAILY_POOL: DailyMissionDef[] = [
  { id: 'rodadas', title: 'Jogue 2 rodadas de minijogos', target: 2, counter: 'rounds', reward: { currency: 'brilhos', amount: 60 }, xp: 25 },
  { id: 'ganhos', title: 'Ganhe 300 Brilhos', target: 300, counter: 'earned', reward: { currency: 'brilhos', amount: 50 }, xp: 20 },
  { id: 'compra', title: 'Compre uma peça na loja', target: 1, counter: 'buys', reward: { currency: 'brilhos', amount: 40 } },
  { id: 'foto', title: 'Tire uma foto com a câmera', target: 1, counter: 'photos', reward: { currency: 'brilhos', amount: 45 }, xp: 15 },
  { id: 'rodadas4', title: 'Jogue 4 rodadas de minijogos', target: 4, counter: 'rounds', reward: { currency: 'brilhos', amount: 110 }, xp: 40 },
]

export interface AchievementDef {
  id: string
  title: string
  desc: string
  diamonds: number
}

/** Conquistas raras que dao Diamantes. */
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'primeira-compra', title: 'Primeira sacola', desc: 'Faça a primeira compra em uma loja.', diamonds: 5 },
  { id: 'armario-12', title: 'Armário cheio', desc: 'Tenha 12 itens no guarda-roupa.', diamonds: 10 },
  { id: 'armario-25', title: 'Closet de revista', desc: 'Tenha 25 itens no guarda-roupa.', diamonds: 20 },
  { id: 'lendaria', title: 'Peça lendária', desc: 'Conquiste um item lendário.', diamonds: 15 },
  { id: 'rodadas-25', title: 'Mão na massa', desc: 'Jogue 25 rodadas de minijogos.', diamonds: 10 },
  { id: 'brilhos-5000', title: 'Brilho de verdade', desc: 'Ganhe 5.000 Brilhos no total.', diamonds: 15 },
  { id: 'fotos-10', title: 'Feed em dia', desc: 'Tire 10 fotos.', diamonds: 10 },
  { id: 'nivel-10', title: 'It Girl', desc: 'Chegue ao nível 10.', diamonds: 15 },
  { id: 'primeira-viagem', title: 'Primeira viagem', desc: 'Viaje de avião para outra cidade.', diamonds: 8 },
]

/** Recompensa de login: 7 dias, o 7º traz Diamantes. */
export const STREAK_REWARDS: Array<{ brilhos: number; diamantes?: number }> = [{ brilhos: 50 }, { brilhos: 60 }, { brilhos: 75 }, { brilhos: 90 }, { brilhos: 110 }, { brilhos: 140 }, { brilhos: 200, diamantes: 10 }]

export interface PackPurchase {
  id: string
  t: number
  packId: string
  diamonds: number
  /** preco em centavos de real (rotulo de teste) */
  cents: number
  mode: 'teste' | 'real'
}

interface Saved {
  v: 1
  lastClaim: string | null
  streak: number
  day: string
  counters: Record<'rounds' | 'earned' | 'buys' | 'photos', number>
  claimedMissions: string[]
  totals: { rounds: number; earned: number; photos: number }
  achievements: string[]
  finishes: string[]
  grandfathered: boolean
  /** limite mensal de gasto real, em reais (0 = bloqueado, null = sem limite) */
  monthlyLimitBrl: number | null
  purchases: PackPurchase[]
  /** novidades vistas (para o selo "Novo") */
  seenShop: string | null
}

const COUNTERS0 = { rounds: 0, earned: 0, buys: 0, photos: 0 }
const DEFAULTS: Saved = {
  v: 1,
  lastClaim: null,
  streak: 0,
  day: '',
  counters: { ...COUNTERS0 },
  claimedMissions: [],
  totals: { rounds: 0, earned: 0, photos: 0 },
  achievements: [],
  finishes: [],
  grandfathered: false,
  monthlyLimitBrl: 50,
  purchases: [],
  seenShop: null,
}

function load(): Saved {
  const s = loadJson<Partial<Saved>>(KEY)
  if (!s || s.v !== 1) return { ...DEFAULTS, counters: { ...COUNTERS0 }, totals: { ...DEFAULTS.totals } }
  return {
    ...DEFAULTS,
    ...s,
    counters: { ...COUNTERS0, ...(s.counters ?? {}) },
    totals: { ...DEFAULTS.totals, ...(s.totals ?? {}) },
    achievements: Array.isArray(s.achievements) ? s.achievements : [],
    finishes: Array.isArray(s.finishes) ? s.finishes : [],
    claimedMissions: Array.isArray(s.claimedMissions) ? s.claimedMissions : [],
    purchases: Array.isArray(s.purchases) ? s.purchases.slice(0, 100) : [],
    monthlyLimitBrl: s.monthlyLimitBrl === null ? null : typeof s.monthlyLimitBrl === 'number' ? s.monthlyLimitBrl : 50,
  }
}

interface EconomyState extends Saved {
  /** liberacao do portao parental valida ate (ms) */
  gateUntil: number
  /** aviso temporario (recompensa/conquista) */
  notice: { id: number; text: string; sub?: string } | null
  /** quando ha recompensa diaria disponivel */
  dailyAvailable: () => boolean
  claimDaily: () => { brilhos: number; diamantes: number; streak: number } | null
  missionsToday: () => DailyMissionDef[]
  claimMission: (id: string) => boolean
  unlockFinish: (f: string) => void
  setMonthlyLimit: (v: number | null) => void
  recordPack: (p: Omit<PackPurchase, 'id' | 't'>) => void
  spentThisMonthCents: () => number
  openGate: () => void
  gateOpen: () => boolean
  checkAchievements: () => void
  dismissNotice: () => void
}

let noticeId = 0
const persist = (s: EconomyState) => {
  const { v, lastClaim, streak, day, counters, claimedMissions, totals, achievements, finishes, grandfathered, monthlyLimitBrl, purchases, seenShop } = s
  saveJson(KEY, { v, lastClaim, streak, day, counters, claimedMissions, totals, achievements, finishes, grandfathered, monthlyLimitBrl, purchases, seenShop })
}

/** Missoes do dia: 3 sorteadas pela data (semente determinística). */
function pickMissions(day: string): DailyMissionDef[] {
  return [...DAILY_POOL].sort((a, b) => hash(`${day}:${a.id}`) - hash(`${day}:${b.id}`)).slice(0, 3)
}

const yesterdayKey = (t: number) => dayKey(t - 86400000)

export const useEconomyStore = create<EconomyState>()((set, get) => ({
  ...load(),
  gateUntil: 0,
  notice: null,
  dailyAvailable: () => get().lastClaim !== dayKey(),
  claimDaily: () => {
    const today = dayKey()
    const s = get()
    if (s.lastClaim === today) return null
    const streak = s.lastClaim === yesterdayKey(economyNow()) ? s.streak + 1 : 1
    const r = STREAK_REWARDS[(streak - 1) % STREAK_REWARDS.length]
    const p = useProfileStore.getState()
    p.credit('brilhos', r.brilhos, `Recompensa diária (dia ${streak})`)
    if (r.diamantes) p.credit('diamantes', r.diamantes, `Sequência de ${STREAK_REWARDS.length} dias`)
    set({ lastClaim: today, streak })
    persist(get())
    return { brilhos: r.brilhos, diamantes: r.diamantes ?? 0, streak }
  },
  missionsToday: () => pickMissions(dayKey()),
  claimMission: (id) => {
    const def = get().missionsToday().find((m) => m.id === id)
    const s = get()
    if (!def || s.claimedMissions.includes(id) || s.counters[def.counter] < def.target) return false
    const p = useProfileStore.getState()
    p.credit(def.reward.currency, def.reward.amount, `Missão do dia: ${def.title}`)
    if (def.xp) p.addXp(def.xp)
    set({ claimedMissions: [...s.claimedMissions, id] })
    persist(get())
    return true
  },
  unlockFinish: (f) => {
    if (get().finishes.includes(f)) return
    set({ finishes: [...get().finishes, f] })
    persist(get())
  },
  setMonthlyLimit: (v) => {
    set({ monthlyLimitBrl: v })
    persist(get())
  },
  recordPack: (p) => {
    const rec: PackPurchase = { ...p, id: `c${Date.now().toString(36)}`, t: economyNow() }
    set({ purchases: [rec, ...get().purchases].slice(0, 100) })
    persist(get())
  },
  spentThisMonthCents: () => {
    const mk = monthKey()
    return get()
      .purchases.filter((p) => monthKey(p.t) === mk)
      .reduce((n, p) => n + p.cents, 0)
  },
  openGate: () => set({ gateUntil: Date.now() + 10 * 60 * 1000 }),
  gateOpen: () => get().gateUntil > Date.now(),
  checkAchievements: () => {
    const s = get()
    const p = useProfileStore.getState()
    const owned = p.owned.length
    const checks: Record<string, boolean> = {
      'primeira-compra': s.counters.buys > 0 || p.ledger.some((e) => e.amount < 0 && /^Compra:/.test(e.reason)),
      'armario-12': owned >= 12,
      'armario-25': owned >= 25,
      lendaria: p.owned.some((id) => tagsOf(id).rarity === 'lendario'),
      'rodadas-25': s.totals.rounds >= 25,
      'brilhos-5000': s.totals.earned >= 5000,
      'fotos-10': s.totals.photos >= 10,
      'nivel-10': p.level >= 10,
      'primeira-viagem': useTravelStore.getState().visited.some((id) => id !== 'main'),
    }
    const fresh = ACHIEVEMENTS.filter((a) => checks[a.id] && !s.achievements.includes(a.id))
    if (!fresh.length) return
    set({ achievements: [...s.achievements, ...fresh.map((a) => a.id)] })
    for (const a of fresh) {
      p.credit('diamantes', a.diamonds, `Conquista: ${a.title}`)
      set({ notice: { id: ++noticeId, text: `Conquista: ${a.title}`, sub: `+${a.diamonds} Diamantes` } })
    }
    persist(get())
  },
  dismissNotice: () => set({ notice: null }),
}))

/** Renova contadores/missoes quando o dia vira. */
function rollDay() {
  const s = useEconomyStore.getState()
  const today = dayKey()
  if (s.day !== today) {
    useEconomyStore.setState({ day: today, counters: { ...COUNTERS0 }, claimedMissions: [] })
    persist(useEconomyStore.getState())
  }
}
rollDay()

function bump(counter: 'rounds' | 'earned' | 'buys' | 'photos', n: number) {
  rollDay()
  const s = useEconomyStore.getState()
  const totals = { ...s.totals }
  if (counter === 'rounds') totals.rounds += n
  if (counter === 'earned') totals.earned += n
  if (counter === 'photos') totals.photos += n
  useEconomyStore.setState({ counters: { ...s.counters, [counter]: s.counters[counter] + n }, totals })
  persist(useEconomyStore.getState())
  useEconomyStore.getState().checkAchievements()
}

onEconomyEvent((e) => {
  if (e.type === 'round') bump('rounds', 1)
  else if (e.type === 'earn') bump('earned', e.amount)
  else if (e.type === 'buy') bump('buys', 1)
  else if (e.type === 'item') useEconomyStore.getState().checkAchievements()
  else if (e.type === 'level') {
    // a cada 5 niveis, uma pequena quantia de Diamantes
    if (e.level % 5 === 0) {
      useProfileStore.getState().credit('diamantes', 3, `Nível ${e.level}`)
      useEconomyStore.setState({ notice: { id: ++noticeId, text: `Nível ${e.level}`, sub: '+3 Diamantes' } })
    }
    useEconomyStore.getState().checkAchievements()
  }
})

// fotos tiradas: o feed ganha uma foto
let lastPhotos = usePhotoStore.getState().photos.length
usePhotoStore.subscribe((st) => {
  const n = st.photos.length
  if (n > lastPhotos) bump('photos', n - lastPhotos)
  lastPhotos = n
})

/**
 * Migracao: quem ja tinha um look salvo antes da economia nao perde as pecas (e acabamentos)
 * que veste. Roda uma unica vez.
 */
function grandfather() {
  const s = useEconomyStore.getState()
  if (s.grandfathered) return
  const a = useAppearanceStore.getState().saved
  const ids = [a.hair.id, ...Object.values(a.outfit).map((r) => r?.id), ...a.accessories.map((r) => r.id)].filter((x): x is string => !!x)
  const fins = new Set<string>()
  for (const r of [...Object.values(a.outfit), ...a.accessories]) for (const f of r?.finishes ?? []) fins.add(f)
  for (const id of ids) useProfileStore.getState().grantItem(id)
  useEconomyStore.setState({ grandfathered: true, finishes: [...new Set([...s.finishes, ...fins])] })
  persist(useEconomyStore.getState())
}
grandfather()
