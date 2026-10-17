import { create } from 'zustand'
import { loadJson, saveJson } from '../../shared/storage'
import { DESTINATIONS, HOME_ID } from './destinations'

const KEY = 'jdb.travel.v1'

/** Etapas do voo: 'flying' (cena da janela), 'landing' (cidade nova montada, aguardando carregar), 'fade' (some o overlay). */
export type FlightStage = 'flying' | 'landing' | 'fade'

export interface Flight {
  from: string
  to: string
  stage: FlightStage
  /** carimbo (ms) do inicio */
  t0: number
  /** a jogadora pediu para pular a cena */
  skip: boolean
  /** duracao minima da cena (s) */
  seconds: number
}

interface Saved {
  v: 1
  /** cidade onde a jogadora esta (salva: ao reabrir o jogo ela continua la) */
  cityId: string
  /** cidades ja visitadas (inclui a de origem) */
  visited: string[]
}

const params = new URLSearchParams(window.location.search)
const known = (id: unknown): id is string => typeof id === 'string' && DESTINATIONS.some((d) => d.id === id)

function load(): Saved {
  const s = loadJson<Partial<Saved>>(KEY)
  const saved: Saved = {
    v: 1,
    cityId: s && known(s.cityId) ? s.cityId : HOME_ID,
    visited: s && Array.isArray(s.visited) ? s.visited.filter(known) : [HOME_ID],
  }
  if (!saved.visited.includes(HOME_ID)) saved.visited.unshift(HOME_ID)
  // ?city=main|miami forca a cidade ao abrir (testes / links)
  const q = params.get('city')
  if (import.meta.env.DEV && known(q)) {
    saved.cityId = q
    if (!saved.visited.includes(q)) saved.visited.push(q)
  }
  return saved
}

interface TravelState extends Saved {
  flight: Flight | null
  /** mundos 3D que terminaram de montar (todos os GLBs do kit prontos) */
  ready: Record<string, boolean>
  /** painel de destinos do celular aberto */
  panel: boolean
  markReady: (id: string) => void
  setPanel: (o: boolean) => void
}

const initial = load()

export const useTravelStore = create<TravelState>()((set, get) => ({
  ...initial,
  flight: null,
  ready: { main: true },
  panel: false,
  markReady: (id) => set({ ready: { ...get().ready, [id]: true } }),
  setPanel: (panel) => set({ panel }),
}))

export const persistTravel = () => {
  const { v, cityId, visited } = useTravelStore.getState()
  saveJson(KEY, { v, cityId, visited })
}

export const currentCity = () => useTravelStore.getState().cityId

if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as Record<string, unknown>).__travel = useTravelStore
