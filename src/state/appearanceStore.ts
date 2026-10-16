import { create } from 'zustand'
import { ALT_APPEARANCE, DEFAULT_APPEARANCE, type Appearance } from '../shared/appearance'
import { getWearable, resolveHairId } from '../game/character/items'

/** Aparencia do jogador local (JSON). Trocar de look = chamar `setAppearance`. */
interface AppearanceState {
  appearance: Appearance
  setAppearance: (a: Appearance) => void
}

/** `?look=2` carrega o look alternativo de teste. */
const query = new URLSearchParams(window.location.search)
const base: Appearance = query.get('look') === '2' ? ALT_APPEARANCE : DEFAULT_APPEARANCE

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

export const useAppearanceStore = create<AppearanceState>()((set) => ({
  appearance: initial,
  setAppearance: (appearance) => set({ appearance }),
}))
