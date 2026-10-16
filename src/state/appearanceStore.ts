import { create } from 'zustand'
import { ALT_APPEARANCE, DEFAULT_APPEARANCE, normalizeAppearance, type Appearance } from '../shared/appearance'
import { getWearable, resolveHairId } from '../game/character/items'
import { loadJson, saveJson, STORAGE_KEYS } from '../shared/storage'

/** Um look guardado em um dos 5 espacos (local). */
export interface LookSlot {
  name: string
  at: number
  appearance: Appearance
}
export const LOOK_SLOTS = 5
const HISTORY_MAX = 80

/** Aparencia do jogador local (JSON). Trocar de look = chamar `setAppearance`. */
interface AppearanceState {
  /** aparencia ao vivo (o editor mexe aqui e o personagem reage na hora) */
  appearance: Appearance
  /** ultima aparencia salva (localStorage); `revert` volta para ela */
  saved: Appearance
  /** historico (desfazer/refazer) das edicoes do criador */
  past: Appearance[]
  future: Appearance[]
  /** 5 espacos de looks guardados */
  slots: Array<LookSlot | null>
  /** antes/depois: o visualizador mostra o look salvo enquanto true */
  compare: boolean
  setCompare: (v: boolean) => void
  /**
   * Edita a aparencia. `group` junta edicoes seguidas do mesmo controle (arrastar um slider) em UMA entrada do
   * historico (janela de 700 ms).
   */
  setAppearance: (a: Appearance, group?: string) => void
  undo: () => void
  redo: () => void
  save: () => void
  revert: () => void
  /** apaga o save e volta ao look padrao */
  reset: () => void
  saveSlot: (i: number, name?: string) => void
  loadSlot: (i: number) => void
  deleteSlot: (i: number) => void
  renameSlot: (i: number, name: string) => void
}

/** Le a aparencia salva (v3 ou v4), sem confiar no conteudo; v3 migra para v4. */
function loadSaved(): Appearance | null {
  const raw = loadJson<{ v?: number; appearance?: Omit<Appearance, 'v'> & { v: number } }>(STORAGE_KEYS.appearance)
  const a = raw?.appearance
  if (!raw || raw.v !== 1 || !a || (a.v !== 3 && a.v !== 4) || typeof a.morphs !== 'object' || !a.hair || !a.skin || !a.suit) return null
  return normalizeAppearance(a)
}

function loadSlots(): Array<LookSlot | null> {
  const raw = loadJson<{ v?: number; slots?: Array<LookSlot | null> }>(STORAGE_KEYS.looks)
  const out: Array<LookSlot | null> = Array.from({ length: LOOK_SLOTS }, () => null)
  if (raw?.v === 1 && Array.isArray(raw.slots))
    raw.slots.slice(0, LOOK_SLOTS).forEach((s, i) => {
      if (s && typeof s === 'object' && s.appearance && typeof s.appearance === 'object' && s.appearance.hair) out[i] = { name: String(s.name ?? `Look ${i + 1}`).slice(0, 24), at: Number(s.at) || 0, appearance: normalizeAppearance(s.appearance) }
    })
  return out
}

/** `?look=2` carrega o look alternativo de teste. */
const query = new URLSearchParams(window.location.search)
const savedLook = loadSaved()
const base: Appearance = query.get('look') === '2' ? ALT_APPEARANCE : (savedLook ?? DEFAULT_APPEARANCE)

/** `?morph=bustBig:1,waistThin:0.5` sobrescreve morphs (teste de arte). */
function morphsFromQuery(): Record<string, number> {
  const out: Record<string, number> = {}
  for (const part of (query.get('morph') ?? '').split(',')) {
    const [name, v] = part.split(':')
    const n = Number(v)
    if (name && Number.isFinite(n)) out[name] = Math.min(1, Math.max(0, n))
  }
  return out
}

/** `?hair=chestnutWaves` escolhe o cabelo (cor padrao do estilo, salvo `?look=2` ou `?haircolor=%23rrggbb`). */
function hairFromQuery(b: Appearance): Appearance['hair'] {
  if (query.get('nohair')) return { ...b.hair, id: null }
  const id = resolveHairId(query.get('hair'))
  if (!id) return b.hair
  const color = query.get('haircolor') ?? (query.get('look') === '2' ? b.hair.color : getWearable(id)!.defaultColor)
  return { ...b.hair, id, color }
}

const initial: Appearance = {
  ...base,
  morphs: { ...base.morphs, ...morphsFromQuery() },
  // `?nooutfit=1`: so para checar a superficie do corpo (teste de arte)
  outfit: query.get('nooutfit') ? {} : base.outfit,
  // `?nohair=1`: cabelo removido (checar a cabeça); `?hair=<estilo>`: troca o estilo
  hair: hairFromQuery(base),
}

let lastGroup = ''
let lastAt = 0

export const useAppearanceStore = create<AppearanceState>()((set, get) => ({
  appearance: initial,
  saved: savedLook ?? initial,
  past: [],
  future: [],
  slots: loadSlots(),
  compare: false,
  setCompare: (compare) => set({ compare }),
  setAppearance: (appearance, group) => {
    const cur = get().appearance
    if (appearance === cur) return
    const now = performance.now()
    const merge = !!group && group === lastGroup && now - lastAt < 700
    lastGroup = group ?? ''
    lastAt = now
    set({ appearance, past: merge ? get().past : [...get().past, cur].slice(-HISTORY_MAX), future: [] })
  },
  undo: () => {
    const { past, appearance, future } = get()
    if (!past.length) return
    lastGroup = ''
    set({ appearance: past[past.length - 1], past: past.slice(0, -1), future: [appearance, ...future].slice(0, HISTORY_MAX) })
  },
  redo: () => {
    const { past, appearance, future } = get()
    if (!future.length) return
    lastGroup = ''
    set({ appearance: future[0], future: future.slice(1), past: [...past, appearance].slice(-HISTORY_MAX) })
  },
  save: () => {
    const appearance = get().appearance
    set({ saved: appearance })
    saveJson(STORAGE_KEYS.appearance, { v: 1, appearance })
  },
  revert: () => {
    const { appearance, saved, past } = get()
    if (appearance === saved) return
    set({ appearance: saved, past: [...past, appearance].slice(-HISTORY_MAX), future: [] })
  },
  reset: () => {
    set({ appearance: DEFAULT_APPEARANCE, saved: DEFAULT_APPEARANCE, past: [], future: [] })
    saveJson(STORAGE_KEYS.appearance, { v: 1, appearance: DEFAULT_APPEARANCE })
  },
  saveSlot: (i, name) => {
    const slots = [...get().slots]
    slots[i] = { name: (name ?? slots[i]?.name ?? `Look ${i + 1}`).slice(0, 24), at: Date.now(), appearance: get().appearance }
    set({ slots })
    saveJson(STORAGE_KEYS.looks, { v: 1, slots })
  },
  loadSlot: (i) => {
    const s = get().slots[i]
    if (s) get().setAppearance(s.appearance)
  },
  renameSlot: (i, name) => {
    const slots = get().slots.map((x, j) => (j === i && x ? { ...x, name: name.slice(0, 24) || x.name } : x))
    set({ slots })
    saveJson(STORAGE_KEYS.looks, { v: 1, slots })
  },
  deleteSlot: (i) => {
    const slots = [...get().slots]
    slots[i] = null
    set({ slots })
    saveJson(STORAGE_KEYS.looks, { v: 1, slots })
  },
}))

// dev: acesso pelo console / scripts de captura
if (import.meta.env.DEV) (window as unknown as { __appearance: typeof useAppearanceStore }).__appearance = useAppearanceStore
