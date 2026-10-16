import { create } from 'zustand'
import { useMinigameStore } from '../minigames/minigameStore'
import { minigamesAtPoi } from '../../ui/minigames/registry'
import { shopsAtPoi } from '../../ui/shop/registry'
import { useShopStore } from '../../ui/shop/shopStore'

export interface NearbyMinigame {
  id: string
  label: string
}

export interface NearbyShop {
  id: string
  label: string
}

export interface NearbyPoi {
  id: string
  name: string
  /** minijogos desta porta, em ordem; vazio = "Em breve" */
  minigames: NearbyMinigame[]
  /** lojas desta porta (vem depois dos minijogos nas teclas E/R/T) */
  shops?: NearbyShop[]
}

interface InteractionState {
  nearby: NearbyPoi | null
}

export const useInteractionStore = create<InteractionState>()(() => ({ nearby: null }))

/** Minijogos (do registro) ligados a uma porta da cidade. */
export function poiMinigames(poiId: string): NearbyMinigame[] {
  return minigamesAtPoi(poiId).map((m) => ({ id: m.id, label: m.label }))
}

/** Lojas (do registro de lojas) ligadas a uma porta da cidade. */
export function poiShops(poiId: string): NearbyShop[] {
  return shopsAtPoi(poiId).map((s) => ({ id: s.id, label: s.label }))
}

/** [E] (index 0), [R] (index 1)... / toque: abre um minijogo da porta mais próxima. */
export function interact(index = 0): boolean {
  if (useShopStore.getState().open) return false
  const near = useInteractionStore.getState().nearby
  const g = near?.minigames[index]
  if (g) {
    useMinigameStore.getState().open(g.id)
    return true
  }
  const shop = near?.shops?.[index - (near?.minigames.length ?? 0)]
  if (!shop) return false
  useShopStore.getState().openShop(shop.id as never)
  return true
}
