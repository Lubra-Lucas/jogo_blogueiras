import { create } from 'zustand'
import { ALT_APPEARANCE, DEFAULT_APPEARANCE, type Appearance } from '../shared/appearance'

/** Aparencia do jogador local (JSON). Trocar de look = chamar `setAppearance`. */
interface AppearanceState {
  appearance: Appearance
  setAppearance: (a: Appearance) => void
}

/** `?look=2` carrega o look alternativo de teste. */
const initial: Appearance =
  new URLSearchParams(window.location.search).get('look') === '2' ? ALT_APPEARANCE : DEFAULT_APPEARANCE

export const useAppearanceStore = create<AppearanceState>()((set) => ({
  appearance: initial,
  setAppearance: (appearance) => set({ appearance }),
}))
