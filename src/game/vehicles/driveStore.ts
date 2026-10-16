import { create } from 'zustand'
import { Vector3 } from 'three'
import { loadJson, saveJson } from '../../shared/storage'
import { useProfileStore } from '../../state/profileStore'
import { CARS, carBySlug } from './catalog'

/** Carro no mundo (estacionado ou sendo dirigido). Pose em metros / rad. */
export interface CarInst {
  uid: string
  slug: string
  body: string
  rim: string
  x: number
  z: number
  /** yaw (rad); 0 = olhando para +Z */
  yaw: number
  /** 'mine' = o carro da jogadora (garagem); 'street' = carro estacionado emprestado */
  kind: 'mine' | 'street'
}

export interface Paint {
  body: string
  rim: string
}

interface Saved {
  v: 1
  selected: string
  paint: Record<string, Paint>
  station: number
}

const KEY = 'jb.vehicles.v1'
const URL_CARS_ALL = new URLSearchParams(window.location.search).get('cars') === 'all'

function loadSaved(): Saved {
  const s = loadJson<Saved>(KEY)
  return { v: 1, selected: s?.selected ?? 'compacto', paint: s?.paint ?? {}, station: s?.station ?? 0 }
}
const saved = loadSaved()

/** Carros que a jogadora possui: inicial + `car.*` do perfil (economia) + `?cars=all`. */
export function ownedSlugs(owned: readonly string[] = useProfileStore.getState().owned): string[] {
  return CARS.filter((c) => c.inicial || URL_CARS_ALL || owned.includes(c.id)).map((c) => c.slug)
}

export function paintOf(slug: string, paint: Record<string, Paint> = useVehicleStore.getState().paint): Paint {
  const p = paint[slug]
  return { body: p?.body ?? carBySlug(slug).cor, rim: p?.rim ?? '#d9dde6' }
}

interface VehicleState {
  /** carro da garagem selecionado (slug) */
  selected: string
  paint: Record<string, Paint>
  cars: CarInst[]
  drivingUid: string | null
  /** carro ao alcance de "Dirigir [F]" */
  nearbyUid: string | null
  /** 0 = rádio desligado, 1..3 = estação */
  station: number
  garageOpen: boolean
  /** modo de camera: 0 perseguicao, 1 afastada, 2 capo */
  camMode: number
  /** painel de GPS: destino (id do POI) ou null */
  gpsTo: string | null
  /** nome do destino */
  gpsName: string | null
  select: (slug: string) => void
  setPaint: (slug: string, p: Partial<Paint>) => void
  setStation: (n: number) => void
  setGarage: (o: boolean) => void
  cycleCam: () => void
  setGps: (id: string | null, name?: string | null) => void
  patchCar: (uid: string, p: Partial<CarInst>) => void
  setCars: (cars: CarInst[]) => void
}

export const useVehicleStore = create<VehicleState>()((set, get) => ({
  selected: saved.selected,
  paint: saved.paint,
  cars: [],
  drivingUid: null,
  nearbyUid: null,
  station: saved.station,
  garageOpen: false,
  camMode: 0,
  gpsTo: null,
  gpsName: null,
  select: (slug) => {
    set({ selected: slug })
    persist()
  },
  setPaint: (slug, p) => {
    set({ paint: { ...get().paint, [slug]: { ...paintOf(slug, get().paint), ...p } } })
    persist()
  },
  setStation: (n) => {
    set({ station: n })
    persist()
  },
  setGarage: (garageOpen) => set({ garageOpen }),
  cycleCam: () => set({ camMode: (get().camMode + 1) % 3 }),
  setGps: (gpsTo, gpsName = null) => set({ gpsTo, gpsName: gpsTo ? gpsName : null }),
  patchCar: (uid, p) => set({ cars: get().cars.map((c) => (c.uid === uid ? { ...c, ...p } : c)) }),
  setCars: (cars) => set({ cars }),
}))

function persist() {
  const s = useVehicleStore.getState()
  saveJson(KEY, { v: 1, selected: s.selected, paint: s.paint, station: s.station } satisfies Saved)
}

/**
 * Estado de direcao MUTAVEL (lido em useFrame; nao causa re-render). O HUD copia o que precisa a ~15 Hz.
 */
export const drive = {
  /** m/s com sinal (frente positivo) */
  speed: 0,
  /** km/h absoluto */
  kmh: 0,
  /** 0..1 */
  rpm: 0,
  gear: 1,
  throttle: 0,
  brake: 0,
  steer: 0,
  /** 0..1 intensidade da derrapagem */
  drift: 0,
  boosting: false,
  /** 0..1 */
  boost: 1,
  braking: false,
  reversing: false,
  grounded: true,
  /** impacto mais recente (m/s de velocidade perdida), consumido pelo audio/camera */
  impact: 0,
  horn: false,
  lights: false,
  pos: new Vector3(),
  vel: new Vector3(),
  yaw: 0,
  /** raio aproximado do carro para NPCs desviarem */
  radius: 2.4,
}

/**
 * Ponte com o PlayerController / camera / animacao (mutavel, lida em useFrame).
 * `active` = a jogadora esta dentro de um carro.
 */
export const driveBridge = {
  active: false,
  /** posicao de raiz da jogadora (pes) sentada, mundo */
  seatPos: new Vector3(),
  yaw: 0,
  /** saida do carro: teletransporte (consumido pelo PlayerController) */
  exitAt: null as { x: number; z: number; yaw: number } | null,
}
