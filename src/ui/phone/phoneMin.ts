import { create } from 'zustand'
import { useUiStore, type PhoneApp } from '../../state/uiStore'

/**
 * Celular minimizado: o aparelho some para uma abinha no canto, mas a tela atual (app) e guardada e volta igual.
 * Minimizado = `phoneOpen` falso (o resto do jogo -- chat, emotes, carros -- volta a receber teclas) e `min` verdadeiro.
 * Fechar de verdade = `closePhone()` + `min` falso (a tela volta ao inicio).
 */
interface PhoneMinState {
  min: boolean
  saved: PhoneApp
}
export const usePhoneMin = create<PhoneMinState>()(() => ({ min: false, saved: 'home' }))

export function minimizePhone() {
  const ui = useUiStore.getState()
  if (!ui.phoneOpen) return
  usePhoneMin.setState({ min: true, saved: ui.phoneApp })
  useUiStore.setState({ phoneOpen: false }) // mantem phoneApp (closePhone() o zeraria)
}

export function restorePhone() {
  const { min, saved } = usePhoneMin.getState()
  if (!min) return
  usePhoneMin.setState({ min: false })
  useUiStore.setState({ phoneOpen: true, phoneApp: saved, menuOpen: false, emoteWheel: false })
}

/** Fecha de vez (zera a tela). */
export function dismissPhone() {
  usePhoneMin.setState({ min: false, saved: 'home' })
  useUiStore.getState().closePhone()
}

// openPhone() de fora (botao do dock, loja...) com o celular minimizado: restaura a tela guardada em vez de ir ao inicio.
useUiStore.subscribe((s, prev) => {
  const st = usePhoneMin.getState()
  if (!st.min || !s.phoneOpen || prev.phoneOpen) return
  usePhoneMin.setState({ min: false })
  if (s.phoneApp === 'home' && st.saved !== 'home') useUiStore.setState({ phoneApp: st.saved })
})
