import { create } from 'zustand'
import { ALT_APPEARANCE, DEFAULT_APPEARANCE, type Appearance } from '../shared/appearance'
import { getWearable, resolveHairId } from '../game/character/items'
import { loadJson, saveJson, STORAGE_KEYS } from '../shared/storage'

/** Aparencia do jogador local (JSON). Trocar de look = chamar `setAppearance`. */
interface AppearanceState {
  /** aparencia ao vivo (o editor mexe aqui e o personagem reage na hora) */
  appearance: Appearance
  /** ultima aparencia salva (localStorage); `revert` volta para ela */
  saved: Appearance
  setAppearance: (a: Appearance) => void
  save: () => void
  revert: () => void
  /** apaga o save e volta ao look padrao */
  reset: () => void
}

/** Le a aparencia salva (formato v3), sem confiar no conteudo. */
function loadSaved(): Appearance | null {
  const raw = loadJson<{ v?: number; appearance?: Appearance }>(STORAGE_KEYS.appearance)
  const a = raw?.appearance
  if (!raw || raw.v !== 1 || !a || a.v !== 3 || typeof a.morphs !== 'object' || !a.hair || !a.skin || !a.suit) return null
  return { ...DEFAULT_APPEARANCE, ...a, outfit: a.outfit ?? {}, accessories: Array.isArray(a.accessories) ? a.accessories : [] }
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
  return { id, color }
}

const initial: Appearance = {
  ...base,
  morphs: { ...base.morphs, ...morphsFromQuery() },
  // `?nooutfit=1`: so para checar a superficie do corpo (teste de arte)
  outfit: query.get('nooutfit') ? {} : base.outfit,
  // `?nohair=1`: cabelo removido (checar a cabeça); `?hair=<estilo>`: troca o estilo
  hair: hairFromQuery(base),
}

export const useAppearanceStore = create<AppearanceState>()((set, get) => ({
  appearance: initial,
  saved: savedLook ?? initial,
  setAppearance: (appearance) => set({ appearance }),
  save: () => {
    const appearance = get().appearance
    set({ saved: appearance })
    saveJson(STORAGE_KEYS.appearance, { v: 1, appearance })
  },
  revert: () => set({ appearance: get().saved }),
  reset: () => {
    set({ appearance: DEFAULT_APPEARANCE, saved: DEFAULT_APPEARANCE })
    saveJson(STORAGE_KEYS.appearance, { v: 1, appearance: DEFAULT_APPEARANCE })
  },
}))

// dev: acesso pelo console / scripts de captura
if (import.meta.env.DEV) (window as unknown as { __appearance: typeof useAppearanceStore }).__appearance = useAppearanceStore
