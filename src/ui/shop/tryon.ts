import type { Appearance, ItemRef } from '../../shared/appearance'
import { useAppearanceStore } from '../../state/appearanceStore'
import { editionBaseItemIds } from '../../game/economy/api'
import { useProfileStore } from '../../state/profileStore'
import { getCatalogItem } from '../../game/character/catalog'
import { equip, isEquipped, unequip } from '../../game/character/outfit'
import { getWearable } from '../../game/character/items'
import { create } from 'zustand'

/**
 * "Provar": veste uma peca que ainda nao e sua so para ver. Guarda uma foto da aparencia no inicio da
 * prova; ao terminar (fechar a loja/guarda-roupa) as pecas provadas saem e o que estava antes volta.
 * Comprar a peca a "confirma" (`commitTried`). Nada disso e salvo no look.
 */
interface TryState {
  tried: string[]
}
export const useTryStore = create<TryState>()(() => ({ tried: [] }))

let snapshot: Appearance | null = null

const slotOf = (id: string) => (getWearable(id)?.slot === 'hair' ? 'hair' : (getCatalogItem(id)?.slot ?? null))

function refIn(a: Appearance, slot: string): ItemRef | null {
  if (slot === 'hair') return a.hair.id ? { id: a.hair.id, colors: [a.hair.color] } : null
  const o = a.outfit[slot as keyof Appearance['outfit']]
  if (o) return o
  return a.accessories.find((r) => getCatalogItem(r.id)?.slot === slot) ?? null
}

/** Veste/tira uma peca em prova. */
export function toggleTry(id: string): void {
  const store = useAppearanceStore.getState()
  const slot = slotOf(id)
  if (!slot) return
  if (!snapshot) snapshot = store.appearance
  const tried = useTryStore.getState().tried
  if (isEquipped(store.appearance, id)) {
    // tira a peca; se havia uma anterior no slot, ela volta
    let a = unequip(store.appearance, slot as never)
    const prev = snapshot ? refIn(snapshot, slot) : null
    if (prev && prev.id !== id) a = restoreRef(a, slot, prev)
    store.setAppearance(a)
    useTryStore.setState({ tried: tried.filter((x) => x !== id) })
    if (tried.length <= 1) snapshot = null
    return
  }
  store.setAppearance(equip(store.appearance, id))
  useTryStore.setState({ tried: tried.includes(id) ? tried : [...tried, id] })
}

function restoreRef(a: Appearance, slot: string, ref: ItemRef): Appearance {
  if (slot === 'hair') return { ...a, hair: { id: ref.id, color: ref.colors?.[0] ?? a.hair.color } }
  const it = getCatalogItem(ref.id)
  if (!it) return a
  if (it.kind === 'garment') {
    if (slot === 'dress') return { ...a, outfit: { ...a.outfit, dress: ref, top: undefined, bottom: undefined } }
    if ((slot === 'top' || slot === 'bottom') && a.outfit.dress) return a
    return { ...a, outfit: { ...a.outfit, [slot]: ref } }
  }
  return { ...a, accessories: [...a.accessories.filter((r) => getCatalogItem(r.id)?.slot !== slot), ref] }
}

/** A compra "confirma" a peca: ela deixa de ser uma prova e fica vestida. */
export function commitTried(id: string): void {
  const tried = useTryStore.getState().tried
  if (!tried.includes(id)) return
  useTryStore.setState({ tried: tried.filter((x) => x !== id) })
  if (tried.length <= 1) snapshot = null
}

/** Termina a prova: tira o que nao e da jogadora e devolve as pecas de antes. */
export function endTryOn(): void {
  const tried = useTryStore.getState().tried
  if (!tried.length || !snapshot) {
    useTryStore.setState({ tried: [] })
    snapshot = null
    return
  }
  const store = useAppearanceStore.getState()
  const owned = new Set([...useProfileStore.getState().owned, ...editionBaseItemIds()])
  let a = store.appearance
  const slots = new Set<string>()
  for (const id of tried) {
    if (owned.has(id)) continue
    const s = slotOf(id)
    if (s) {
      a = unequip(a, s as never)
      slots.add(s)
    }
  }
  // devolve o que estava no slot antes da prova (se for da jogadora)
  for (const s of [...slots, 'top', 'bottom']) {
    const prev = refIn(snapshot, s)
    if (prev && owned.has(prev.id) && !refIn(a, s)) a = restoreRef(a, s, prev)
  }
  store.setAppearance(a)
  useTryStore.setState({ tried: [] })
  snapshot = null
}

/** Pecas da aparencia atual que a jogadora nao possui. */
export function unownedWorn(a: Appearance): string[] {
  const owned = new Set([...useProfileStore.getState().owned, ...editionBaseItemIds()])
  const ids = [a.hair.id, ...Object.values(a.outfit).map((r) => r?.id), ...a.accessories.map((r) => r.id)]
  return ids.filter((x): x is string => !!x && !owned.has(x))
}
