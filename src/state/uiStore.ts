import { create } from 'zustand'

export type MenuTab = 'perfil' | 'aparencia' | 'guardaroupa' | 'config'
export type PhoneApp = 'home' | 'missoes' | 'blogram' | 'mensagens' | 'loja'

interface UiState {
  menuOpen: boolean
  tab: MenuTab
  chatOpen: boolean
  phoneOpen: boolean
  phoneApp: PhoneApp
  bigMapOpen: boolean
  /** modo camera (viewfinder) ligado */
  cameraMode: boolean
  emoteWheel: boolean
  /** contador: cada incremento dispara a transicao de viagem rapida */
  travelFade: number
  openMenu: (tab?: MenuTab) => void
  closeMenu: () => void
  toggleMenu: () => void
  setTab: (t: MenuTab) => void
  setChatOpen: (o: boolean) => void
  openPhone: (app?: PhoneApp) => void
  closePhone: () => void
  setPhoneApp: (a: PhoneApp) => void
  setBigMap: (o: boolean) => void
  setCameraMode: (o: boolean) => void
  setEmoteWheel: (o: boolean) => void
}

export const useUiStore = create<UiState>()((set, get) => ({
  menuOpen: false,
  tab: 'perfil',
  chatOpen: false,
  phoneOpen: false,
  phoneApp: 'home',
  bigMapOpen: false,
  cameraMode: false,
  emoteWheel: false,
  travelFade: 0,
  openMenu: (tab) => set({ menuOpen: true, phoneOpen: false, tab: tab ?? get().tab }),
  closeMenu: () => set({ menuOpen: false }),
  toggleMenu: () => set({ menuOpen: !get().menuOpen }),
  setTab: (tab) => set({ tab }),
  setChatOpen: (chatOpen) => set({ chatOpen }),
  openPhone: (app) => set({ phoneOpen: true, phoneApp: app ?? 'home', menuOpen: false, emoteWheel: false }),
  closePhone: () => set({ phoneOpen: false, phoneApp: 'home' }),
  setPhoneApp: (phoneApp) => set({ phoneApp }),
  setBigMap: (bigMapOpen) => set({ bigMapOpen }),
  setCameraMode: (cameraMode) => set({ cameraMode, phoneOpen: cameraMode ? false : get().phoneOpen }),
  setEmoteWheel: (emoteWheel) => set({ emoteWheel }),
}))
