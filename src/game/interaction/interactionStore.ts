import { create } from 'zustand'
import { useMinigameStore } from '../minigames/minigameStore'
import { minigamesAtPoi } from '../../ui/minigames/registry'

export interface NearbyMinigame {
  id: string
  label: string
}

export interface NearbyPoi {
  id: string
  name: string
  /** minijogos desta porta, em ordem; vazio = "Em breve" */
  minigames: NearbyMinigame[]
}

interface InteractionState {
  nearby: NearbyPoi | null
}

export const useInteractionStore = create<InteractionState>()(() => ({ nearby: null }))

/** Minijogos (do registro) ligados a uma porta da cidade. */
export function poiMinigames(poiId: string): NearbyMinigame[] {
  return minigamesAtPoi(poiId).map((m) => ({ id: m.id, label: m.label }))
}

/** [E] (index 0), [R] (index 1)... / toque: abre um minijogo da porta mais próxima. */
export function interact(index = 0): boolean {
  const g = useInteractionStore.getState().nearby?.minigames[index]
  if (!g) return false
  useMinigameStore.getState().open(g.id)
  return true
}
