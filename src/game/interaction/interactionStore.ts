import { create } from 'zustand'
import { useMinigameStore } from '../minigames/minigameStore'
import { minigamesAtPoi } from '../../ui/minigames/registry'
import { shopsAtPoi } from '../../ui/shop/registry'
import { useShopStore } from '../../ui/shop/shopStore'
import { interiorBridge } from '../interiors/interiorBridge'
import { enterRoom, isTransitioning } from '../interiors/interiorStore'

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
  /** a porta tem interior jogavel (game/interiors): "Entrar" vem primeiro (tecla E) */
  interior?: boolean
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

/** [E] (index 0), [R] (index 1)... / toque: "Entrar" (se houver interior), minijogos e lojas da porta mais próxima, nessa ordem. */
export function interact(index = 0): boolean {
  if (useShopStore.getState().open) return false
  // dentro de uma sala (ou no fade de entrada/saida) o aviso de porta da cidade nao vale: quem responde e o InteriorHost
  if (interiorBridge.active || isTransitioning()) return false
  const near = useInteractionStore.getState().nearby
  if (!near) return false
  let i = index
  if (near.interior) {
    if (i === 0) {
      void enterRoom(near.id)
      return true
    }
    i -= 1
  }
  const g = near.minigames[i]
  if (g) {
    useMinigameStore.getState().open(g.id)
    return true
  }
  const shop = near.shops?.[i - near.minigames.length]
  if (!shop) return false
  useShopStore.getState().openShop(shop.id as never)
  return true
}

if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as Record<string, unknown>).__ia = useInteractionStore
