import { create } from 'zustand'

export type MenuTab = 'perfil' | 'aparencia' | 'guardaroupa' | 'missoes' | 'config'

interface UiState {
  menuOpen: boolean
  tab: MenuTab
  chatOpen: boolean
  openMenu: (tab?: MenuTab) => void
  closeMenu: () => void
  toggleMenu: () => void
  setTab: (t: MenuTab) => void
  setChatOpen: (o: boolean) => void
}

export const useUiStore = create<UiState>()((set, get) => ({
  menuOpen: false,
  tab: 'perfil',
  chatOpen: false,
  openMenu: (tab) => set({ menuOpen: true, tab: tab ?? get().tab }),
  closeMenu: () => set({ menuOpen: false }),
  toggleMenu: () => set({ menuOpen: !get().menuOpen }),
  setTab: (tab) => set({ tab }),
  setChatOpen: (chatOpen) => set({ chatOpen }),
}))
