import { CITY, locate, type Poi, type Vec2 } from '../world/city/layout'
import type { Destination } from '../navigation/destinations'
import type { LampSpot } from '../world/environment/lamps'
import type { env } from '../world/environment/envState'
import { useTravelStore } from './travelStore'
import { HOME_ID } from './destinations'
import { MAIN_ARRIVAL } from './airportSite'
import { MIAMI_WORLD } from '../world/miami/def'

/**
 * "Mundo ativo": o que os sistemas compartilhados (portas, navegacao, minimapa, ambiente, nome da area) precisam saber
 * da cidade onde a jogadora esta. A cidade principal e o padrao (usa `CITY` direto); cada cidade nova registra um
 * `WorldDef` com `registerWorld`. So UMA cidade existe na cena por vez (a outra e descarregada).
 */
export interface MapApi {
  /** minimapa redondo centrado na jogadora */
  mini: (g: CanvasRenderingContext2D, px: number, size: number, ox: number, oz: number, yaw: number, radiusM: number) => void
  /** mapa grande */
  big: (g: CanvasRenderingContext2D, px: number, ox: number, oz: number, yaw: number) => void
}

export interface WorldDef {
  id: string
  name: string
  /** portas (lojas, pontos de interesse) */
  doors: Poi[]
  /** pontos de captura para a navegacao/celular: id -> [x, z] */
  spawns: Record<string, Vec2>
  /** onde a jogadora aparece ao chegar de aviao */
  arrival: { x: number; z: number; yaw: number }
  locate: (x: number, z: number) => { id: string; name: string }
  /** sementes do grafo de navegacao (pontos candidatos; o pathfinder descarta os bloqueados) */
  navSeeds: () => [number, number][]
  map: MapApi
  /** postes para a luz noturna */
  lamps?: () => LampSpot[]
  /** ajuste do ambiente (ceu, sol) depois do ciclo dia/noite */
  envHook?: (e: typeof env, hour: number) => void
  /** o pet (seguidor) pode pisar aqui? Sem isto, a cidade nova não restringe o pet */
  petFree?: (x: number, z: number) => boolean
  /** titulo do mapa grande */
  mapTitle: string
}

const worlds = new Map<string, WorldDef>()
export const registerWorld = (w: WorldDef) => void worlds.set(w.id, w)

/** mundo ativo, ou null na cidade principal */
export function activeWorld(): WorldDef | null {
  const id = useTravelStore.getState().cityId
  return id === HOME_ID ? null : (worlds.get(id) ?? null)
}
export const getWorld = (id: string) => worlds.get(id) ?? null

const MAIN_DOORS = CITY.pois.filter((p) => p.kind !== 'spawn')

/** portas da cidade onde a jogadora esta */
export function activeDoors(): Poi[] {
  const w = activeWorld()
  return w ? w.doors : MAIN_DOORS
}

/** chegada de aviao */
export function arrivalOf(cityId: string): { x: number; z: number; yaw: number } {
  const w = worlds.get(cityId)
  return cityId === HOME_ID || !w ? MAIN_ARRIVAL : w.arrival
}

export function activeLocate(x: number, z: number): { id: string; name: string } {
  const w = activeWorld()
  return w ? w.locate(x, z) : locate(x, z)
}

/** destinos de navegacao da cidade nova (null = usa o da principal) */
export function externalDestination(rawId: string): Destination | null | undefined {
  const w = activeWorld()
  if (!w) return undefined
  const id = rawId === 'inicio' ? 'spawn' : rawId
  const poi = w.doors.find((p) => p.id === id)
  if (poi) {
    const sx = Math.sin(poi.facing)
    const sz = Math.cos(poi.facing)
    const at = (d: number): [number, number] => [poi.x + sx * d, poi.z + sz * d]
    const [x, z] = at(1.5)
    return { id, name: poi.name, x, z, yaw: poi.facing + Math.PI, fallbacks: [at(2.5), at(4)] }
  }
  const sp = w.spawns[id]
  if (!sp) return null
  return { id, name: w.locate(sp[0], sp[1]).name, x: sp[0], z: sp[1], yaw: null, fallbacks: [] }
}

/** sementes do grafo de navegacao quando a cidade nova esta ativa (null = grafo da principal) */
export const externalNavSeeds = (): [number, number][] | null => activeWorld()?.navSeeds() ?? null

registerWorld(MIAMI_WORLD)
