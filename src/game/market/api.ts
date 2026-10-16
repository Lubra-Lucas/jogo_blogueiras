import type { ItemRef } from '../../shared/appearance'
import { COLLECTIONS, collectionProgress } from './collections.ts'
import { getEdition } from './editions.ts'
import { useInventory } from './inventory.ts'
import { market } from './service.ts'
import type { EditionInstance, Origin, Result } from './types.ts'

/**
 * API publica do mercado para outros sistemas (missoes, minijogos, perfil, guarda-roupa).
 *
 *   await grantEdition('ed.tiara_aurora', 'temporada')   // entrega uma copia numerada (falha se esgotada/aposentada)
 *   ownsEdition(id) / listOwnedEditions() / ownsEditionOfItem(itemId)
 *   editionItemRef(instance)  -> ItemRef (id do item-base + cores exclusivas) para vestir a peca
 *   getVitrine()              -> ate 6 copias em destaque no perfil
 *   equippedTitle()           -> titulo de colecao escolhido
 *   startMarket()             -> liga o relogio do mercado em segundo plano (chamar uma vez na abertura do jogo)
 */
export { ownsEdition, ownsEditionOfItem, listOwnedEditions, isTradable, tradeLockLeft, useInventory } from './inventory.ts'
export { EDITIONS, getEdition, editionsOfItem } from './editions.ts'
export { COLLECTIONS, collectionProgress, claimCompleted } from './collections.ts'
export { market, setMarketService, LocalMarketService, RemoteMarketService } from './service.ts'
export { MARKET_CFG } from './cfg.ts'
export type { EditionDef, EditionInstance, Origin, Result } from './types.ts'

/** Entrega uma copia de edicao limitada (so chamar de fontes confiaveis: missao, evento, ranking). */
export function grantEdition(editionId: string, origin?: Origin): Promise<Result<EditionInstance>> {
  const d = getEdition(editionId)
  return market().grant(editionId, origin ?? d?.origin ?? 'evento')
}

/** ItemRef para vestir a peca com as cores da edicao (o item-base vem do catalogo). */
export function editionItemRef(editionOrInstance: string | EditionInstance): ItemRef | null {
  const id = typeof editionOrInstance === 'string' ? editionOrInstance : editionOrInstance.editionId
  const d = getEdition(id)
  if (!d) return null
  return { id: d.itemId, colors: d.colorway?.colors ? [...d.colorway.colors] : undefined, finishes: d.colorway?.finishes ? [...d.colorway.finishes] : undefined }
}

export function getVitrine(): EditionInstance[] {
  const s = useInventory.getState()
  return s.vitrine.map((id) => s.instances[id]).filter(Boolean)
}

export const equippedTitle = (): string | null => useInventory.getState().equippedTitle
export const ownedTitles = (): string[] => useInventory.getState().titles
export const ownedBadges = (): string[] => useInventory.getState().badges
export const completedCollections = () => collectionProgress().filter((c) => c.complete).length + '/' + COLLECTIONS.length

/** formata o numero de serie: "#037/500" */
export function serialLabel(i: Pick<EditionInstance, 'editionId' | 'serial'>): string {
  const d = getEdition(i.editionId)
  return `#${String(i.serial).padStart(3, '0')}${d ? `/${d.cap}` : ''}`
}

/** Liga o relogio do mercado (leilao/ofertas avancam e notificam mesmo com a tela fechada). */
export function startMarket(): void {
  market()
}
