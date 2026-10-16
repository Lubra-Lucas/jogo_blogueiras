import { create } from 'zustand'
import { clearMoveTarget, setKeyboardAxis, setKeyboardCameraYaw, setStickAxis } from '../input/intent'

/** id de um minijogo do registro (src/ui/minigames/registry.ts) */
export type MinigameId = string

interface MinigameState {
  active: MinigameId | null
  open: (id: MinigameId) => void
  close: () => void
}

/**
 * Minijogo aberto no momento (null = nenhum). Enquanto aberto o jogador fica parado: o overlay
 * cobre o canvas (nenhum ponteiro chega ao mundo) e o MinigameHost bloqueia o teclado.
 */
export const useMinigameStore = create<MinigameState>()((set, get) => ({
  active: null,
  open: (id) => {
    if (get().active) return
    // para o personagem: zera teclado/joystick/destino
    setKeyboardAxis(0, 0, false)
    setStickAxis(0, 0, false)
    setKeyboardCameraYaw(0)
    clearMoveTarget()
    set({ active: id })
  },
  close: () => set({ active: null }),
}))

export const isMinigameOpen = () => useMinigameStore.getState().active !== null

if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as Record<string, unknown>).__mg = useMinigameStore
