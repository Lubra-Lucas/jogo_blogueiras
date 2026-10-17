import { create } from 'zustand'
import { loadJson, saveJson } from '../shared/storage'

/** Preferencias de interface (toque): tamanho da UI, estilo do joystick e sensibilidade da camera. */
export type UiSize = 'p' | 'm' | 'g'
export type JoyMode = 'fixed' | 'dynamic'

interface Prefs {
  size: UiSize
  joy: JoyMode
  /** multiplicador do giro de camera por arrasto (0.5 .. 2) */
  camSens: number
}

const KEY = 'jb.uiprefs.v1'
const SCALE: Record<UiSize, number> = { p: 0.86, m: 1, g: 1.2 }
const DEFAULTS: Prefs = { size: 'm', joy: 'fixed', camSens: 1 }

function read(): Prefs {
  const v = loadJson<Partial<Prefs>>(KEY) ?? {}
  return {
    size: v.size === 'p' || v.size === 'g' ? v.size : 'm',
    joy: v.joy === 'dynamic' ? 'dynamic' : 'fixed',
    camSens: typeof v.camSens === 'number' ? Math.min(2, Math.max(0.5, v.camSens)) : DEFAULTS.camSens,
  }
}

interface PrefsState extends Prefs {
  set: (p: Partial<Prefs>) => void
}

export const useUiPrefs = create<PrefsState>()((set, get) => ({
  ...read(),
  set: (p) => {
    set(p)
    const { size, joy, camSens } = get()
    saveJson(KEY, { size, joy, camSens })
  },
}))

export const uiScale = (s: UiSize = useUiPrefs.getState().size) => SCALE[s]

function apply() {
  const { size } = useUiPrefs.getState()
  const root = document.documentElement
  root.style.setProperty('--ui-s', String(SCALE[size]))
  root.dataset.uiSize = size
}
apply()
useUiPrefs.subscribe(apply)
