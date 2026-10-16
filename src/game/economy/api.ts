import { useProfileStore } from '../../state/profileStore'
import { useCatalogStore } from '../character/catalog'
import { WEARABLES } from '../character/items'
import { bigTickets } from './bigTickets'
import { getEdition } from '../market/editions'
import { ownsEditionOfItem, useInventory } from '../market/inventory'

/**
 * API publica e estavel da economia para outros sistemas (veiculos, casas, minijogos).
 *  - ownsItem(id)            : a jogadora possui o item?
 *  - ownedOfCategory(cat)    : ids possuidos de uma categoria ('carros', 'casas', 'roupas', 'joias', 'cabelos')
 *  - grantOwnedItem(id)      : concede um item (missoes/eventos)
 *  - getWalletSnapshot()     : { brilhos, diamantes }
 * Para reagir a mudancas use `useProfileStore((s) => s.owned)`.
 */
export type OwnableCategory = 'roupas' | 'joias' | 'cabelos' | 'carros' | 'casas'

export function ownsItem(id: string): boolean {
  return useProfileStore.getState().owned.includes(id) || ownsEditionOfItem(id)
}

/** ids de item-base de que a jogadora tem alguma edicao limitada */
export function editionBaseItemIds(): string[] {
  return [...new Set(Object.values(useInventory.getState().instances).map((i) => getEdition(i.editionId)?.itemId).filter((x): x is string => !!x))]
}

export function categoryOf(id: string): OwnableCategory | null {
  const big = bigTickets().find((b) => b.id === id)
  if (big) return big.kind === 'car' ? 'carros' : 'casas'
  if (WEARABLES[id]?.slot === 'hair') return 'cabelos'
  const it = useCatalogStore.getState().items[id]
  if (it) return it.kind === 'jewelry' ? 'joias' : 'roupas'
  return null
}

export function ownedOfCategory(cat: OwnableCategory): string[] {
  const ids = [...new Set([...useProfileStore.getState().owned, ...editionBaseItemIds()])]
  return ids.filter((id) => categoryOf(id) === cat)
}

export function grantOwnedItem(id: string): void {
  useProfileStore.getState().grantItem(id)
}

export function getWalletSnapshot() {
  const p = useProfileStore.getState()
  return { brilhos: p.coins, diamantes: p.diamonds }
}
