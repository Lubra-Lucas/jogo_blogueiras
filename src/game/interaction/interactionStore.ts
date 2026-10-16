import { create } from 'zustand'
import { useMinigameStore, type MinigameId } from '../minigames/minigameStore'

/** Porta (POI da cidade) -> minijogo que ela abre. Portas fora da lista mostram "Em breve". */
export const POI_MINIGAMES: Record<string, MinigameId> = {
  'cafe-rose': 'cafe',
  // TODO: trocar por um POI dedicado "Passarela" na Avenida da Moda (por ora, a porta da Boutique)
  boutique: 'desfile',
}

export interface NearbyPoi {
  id: string
  name: string
  minigame: MinigameId | null
}

interface InteractionState {
  nearby: NearbyPoi | null
}

export const useInteractionStore = create<InteractionState>()(() => ({ nearby: null }))

/** Aperta [E] / toca em "Jogar": abre o minijogo da porta mais proxima (se houver). */
export function interact(): boolean {
  const n = useInteractionStore.getState().nearby
  if (!n?.minigame) return false
  useMinigameStore.getState().open(n.minigame)
  return true
}
