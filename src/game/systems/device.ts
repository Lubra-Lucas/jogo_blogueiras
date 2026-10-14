import { create } from 'zustand'

interface DeviceState {
  /** true = mostrar controles de toque (joystick etc.). Muda dinamicamente (hibridos). */
  isTouch: boolean
}

function detectTouch(): boolean {
  if (typeof window === 'undefined') return false
  return (
    (window.matchMedia?.('(pointer: coarse)').matches ?? false) ||
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0
  )
}

export const useDeviceStore = create<DeviceState>(() => ({ isTouch: detectTouch() }))

function setTouch(v: boolean) {
  if (useDeviceStore.getState().isTouch !== v) useDeviceStore.setState({ isTouch: v })
}

/**
 * Liga a deteccao dinamica: um toque real liga a UI de toque, um mouse real (mover/clicar) desliga
 * (notebooks hibridos). Tambem bloqueia gestos de zoom do iOS Safari. Devolve a funcao de limpeza.
 */
export function initDeviceDetection(): () => void {
  const onPointer = (e: PointerEvent) => {
    if (e.pointerType === 'touch') setTouch(true)
    else if (e.pointerType === 'mouse') setTouch(false)
  }
  const prevent = (e: Event) => e.preventDefault()
  const opts = { capture: true, passive: true } as const
  window.addEventListener('pointerdown', onPointer, opts)
  window.addEventListener('pointermove', onPointer, opts)
  // iOS Safari: pinca/duplo toque da pagina (mesmo com user-scalable=no)
  const gestures = ['gesturestart', 'gesturechange', 'gestureend', 'dblclick'] as const
  gestures.forEach((n) => document.addEventListener(n, prevent, { passive: false }))
  return () => {
    window.removeEventListener('pointerdown', onPointer, opts)
    window.removeEventListener('pointermove', onPointer, opts)
    gestures.forEach((n) => document.removeEventListener(n, prevent))
  }
}
