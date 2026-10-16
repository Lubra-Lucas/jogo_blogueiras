import { create } from 'zustand'
import { PET_FOOD, type PetAccSlot } from '../economy/prices'

/**
 * Estado dos pets da jogadora (salvo em localStorage). As necessidades sao LEVES e NAO punitivas:
 * caem devagar, nunca abaixo de 20 e nada de ruim acontece (o pet so fica mais "pedinte"). Cuidar rende alegria.
 */
export interface PetNeeds {
  hunger: number // 0-100 (100 = cheio)
  joy: number // 0-100
  t: number
}
export interface PetEquip {
  collar?: string
  bow?: string
  outfit?: string
}

interface PetState {
  /** pet que acompanha a jogadora (id `pet.<raca>.<pelagem>`); null = nenhum */
  active: string | null
  names: Record<string, string>
  needs: Record<string, PetNeeds>
  equip: Record<string, PetEquip>
  food: Record<string, number>
  /** evento recente para a UI/cena (carinho, comida) */
  event: { id: number; kind: 'pet' | 'feed' | 'treat'; pet: string } | null
  setActive: (id: string | null) => void
  rename: (id: string, name: string) => void
  needsOf: (id: string) => PetNeeds
  caress: (id: string) => boolean
  feed: (id: string, foodId: string) => boolean
  addFood: (foodId: string, n: number) => void
  joyBoost: (id: string, n: number) => void
  setEquip: (id: string, slot: PetAccSlot, acc: string | null) => void
}

const KEY = 'jdb.pets.v1'
const FLOOR = 20
/** pontos por hora */
const HUNGER_DROP = 9
const JOY_DROP = 6

interface Saved {
  active: string | null
  names: Record<string, string>
  needs: Record<string, PetNeeds>
  equip: Record<string, PetEquip>
  food: Record<string, number>
}

function load(): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Saved>
    return { active: raw.active ?? null, names: raw.names ?? {}, needs: raw.needs ?? {}, equip: raw.equip ?? {}, food: raw.food ?? { 'food.racao': 2 } }
  } catch {
    return { active: null, names: {}, needs: {}, equip: {}, food: { 'food.racao': 2 } }
  }
}
function save(s: PetState) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ active: s.active, names: s.names, needs: s.needs, equip: s.equip, food: s.food } satisfies Saved))
  } catch {
    /* armazenamento indisponivel */
  }
}
const clamp = (v: number) => Math.max(0, Math.min(100, v))
const decayed = (n: PetNeeds, now: number): PetNeeds => {
  const h = Math.max(0, (now - n.t) / 3600000)
  return { hunger: Math.max(FLOOR, n.hunger - HUNGER_DROP * h), joy: Math.max(FLOOR, n.joy - JOY_DROP * h), t: now }
}

let ev = 0
let lastCaress = 0

export const usePetStore = create<PetState>()((set, get) => ({
  ...load(),
  event: null,
  setActive: (active) => {
    set({ active })
    save(get())
  },
  rename: (id, name) => {
    set((s) => ({ names: { ...s.names, [id]: name.trim().slice(0, 14) } }))
    save(get())
  },
  needsOf: (id) => decayed(get().needs[id] ?? { hunger: 80, joy: 80, t: Date.now() }, Date.now()),
  caress: (id) => {
    const now = Date.now()
    if (now - lastCaress < 900) return false
    lastCaress = now
    const n = get().needsOf(id)
    set((s) => ({ needs: { ...s.needs, [id]: { ...n, joy: clamp(n.joy + 7) } }, event: { id: ++ev, kind: 'pet', pet: id } }))
    save(get())
    return true
  },
  feed: (id, foodId) => {
    const def = PET_FOOD.find((f) => f.id === foodId)
    const have = get().food[foodId] ?? 0
    if (!def || have <= 0) return false
    const n = get().needsOf(id)
    set((s) => ({
      food: { ...s.food, [foodId]: have - 1 },
      needs: { ...s.needs, [id]: { hunger: clamp(n.hunger + def.fill), joy: clamp(n.joy + def.joy), t: Date.now() } },
      event: { id: ++ev, kind: def.fill >= 30 ? 'feed' : 'treat', pet: id },
    }))
    save(get())
    return true
  },
  addFood: (foodId, n) => {
    set((s) => ({ food: { ...s.food, [foodId]: (s.food[foodId] ?? 0) + n } }))
    save(get())
  },
  joyBoost: (id, n) => {
    const cur = get().needsOf(id)
    set((s) => ({ needs: { ...s.needs, [id]: { ...cur, joy: clamp(cur.joy + n) } } }))
    save(get())
  },
  setEquip: (id, slot, acc) => {
    set((s) => ({ equip: { ...s.equip, [id]: { ...(s.equip[id] ?? {}), [slot]: acc ?? undefined } } }))
    save(get())
  },
}))

export const petName = (id: string, fallback: string) => usePetStore.getState().names[id] || fallback

if (import.meta.env.DEV || new URLSearchParams(window.location.search).has('petdebug')) (window as unknown as { __pets: typeof usePetStore }).__pets = usePetStore
