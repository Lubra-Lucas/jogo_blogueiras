import { create } from 'zustand'
import { loadJson, saveJson } from '../../shared/storage'
import { MARKET_CFG, STORAGE } from './cfg.ts'
import { getEdition } from './editions.ts'
import type { EditionInstance } from './types.ts'

/**
 * Inventario de INSTANCIAS (copias numeradas). Separado do `owned` do perfil (que guarda ids de itens do catalogo).
 * Persistido em localStorage. Num servidor, e a tabela `edition_instances` (dono unico, serial unico por edicao).
 */
interface InvSave {
  v: 1
  instances: Record<string, EditionInstance>
  vitrine: string[]
  claimedSets: string[]
  titles: string[]
  badges: string[]
  equippedTitle: string | null
}

interface InvState extends InvSave {
  add: (i: EditionInstance) => void
  remove: (id: string) => EditionInstance | null
  setListing: (id: string, listingId: string | undefined) => void
  setVitrine: (ids: string[]) => void
  claimSet: (setId: string, title: string, badge: string) => void
  equipTitle: (t: string | null) => void
}

function load(): InvSave {
  const s = loadJson<Partial<InvSave>>(STORAGE.inv)
  const instances: Record<string, EditionInstance> = {}
  for (const [k, i] of Object.entries(s?.instances ?? {})) if (i && getEdition(i.editionId) && Number.isInteger(i.serial)) instances[k] = i
  return {
    v: 1,
    instances,
    vitrine: (s?.vitrine ?? []).filter((id) => instances[id]).slice(0, MARKET_CFG.maxVitrine),
    claimedSets: s?.claimedSets ?? [],
    titles: s?.titles ?? [],
    badges: s?.badges ?? [],
    equippedTitle: s?.equippedTitle ?? null,
  }
}

const persist = (s: InvState) => {
  const { v, instances, vitrine, claimedSets, titles, badges, equippedTitle } = s
  saveJson(STORAGE.inv, { v, instances, vitrine, claimedSets, titles, badges, equippedTitle })
}

export const useInventory = create<InvState>()((set, get) => ({
  ...load(),
  add: (i) => {
    set({ instances: { ...get().instances, [i.id]: i } })
    persist(get())
  },
  remove: (id) => {
    const cur = get().instances[id]
    if (!cur) return null
    const rest = { ...get().instances }
    delete rest[id]
    set({ instances: rest, vitrine: get().vitrine.filter((x) => x !== id) })
    persist(get())
    return cur
  },
  setListing: (id, listingId) => {
    const cur = get().instances[id]
    if (!cur) return
    set({ instances: { ...get().instances, [id]: { ...cur, listingId } } })
    persist(get())
  },
  setVitrine: (ids) => {
    const inst = get().instances
    set({ vitrine: [...new Set(ids)].filter((id) => inst[id]).slice(0, MARKET_CFG.maxVitrine) })
    persist(get())
  },
  claimSet: (setId, title, badge) => {
    const s = get()
    if (s.claimedSets.includes(setId)) return
    set({ claimedSets: [...s.claimedSets, setId], titles: [...new Set([...s.titles, title])], badges: [...new Set([...s.badges, badge])], equippedTitle: s.equippedTitle ?? title })
    persist(get())
  },
  equipTitle: (t) => {
    set({ equippedTitle: t })
    persist(get())
  },
}))

export const newInstanceId = () => `i${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`

/* ------- consultas (para outros sistemas) ------- */
export const listOwnedEditions = (): EditionInstance[] => Object.values(useInventory.getState().instances).sort((a, b) => a.editionId.localeCompare(b.editionId) || a.serial - b.serial)
export const ownsEdition = (editionId: string): boolean => Object.values(useInventory.getState().instances).some((i) => i.editionId === editionId)
/** possui alguma edicao deste item-base? (gancho para `ownsItem` da economia / guarda-roupa) */
export const ownsEditionOfItem = (itemId: string): boolean => Object.values(useInventory.getState().instances).some((i) => getEdition(i.editionId)?.itemId === itemId)
export const isTradable = (i: EditionInstance, now = Date.now()): boolean => now >= i.tradableAt && !i.listingId
export const tradeLockLeft = (i: EditionInstance, now = Date.now()): number => Math.max(0, i.tradableAt - now)
