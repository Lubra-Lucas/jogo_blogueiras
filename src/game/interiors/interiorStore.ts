import { create } from 'zustand'
import { CITY } from '../world/city/layout'
import { navBridge, navStore } from '../navigation/navStore'
import { clearMoveTarget } from '../input/intent'
import { useMinigameStore } from '../minigames/minigameStore'
import { useShopStore } from '../../ui/shop/shopStore'
import { interiorBridge } from './interiorBridge'
import { loadCatalog, loadPiece, pieceUrl } from './catalog'
import { ROOMS_BY_POI, ROOMS_BY_ID } from './rooms'
import { resolveRoom, roomOrigin, type Resolved, type Spot } from './resolve'
import type { RoomLayout } from './types'

export { interiorBridge }

export interface PromptState {
  key: string
  label: string
  spot: Spot
  d2: number
}

interface InteriorState {
  roomId: string | null
  loading: boolean
  prompt: PromptState | null
  /** mensagem curta ("Bom dia!") */
  msg: { id: number; text: string; sub?: string } | null
  /** fade escuro do sono (0|1) */
  dark: number
}

export const useInteriorStore = create<InteriorState>()(() => ({ roomId: null, loading: false, prompt: null, msg: null, dark: 0 }))

let msgId = 0
export function showMsg(text: string, sub?: string) {
  const id = ++msgId
  useInteriorStore.setState({ msg: { id, text, sub } })
  window.setTimeout(() => {
    if (useInteriorStore.getState().msg?.id === id) useInteriorStore.setState({ msg: null })
  }, 4200)
}

export const hasInterior = (poiId: string) => !!ROOMS_BY_POI[poiId]
export const currentRoom = (): RoomLayout | null => {
  const id = useInteriorStore.getState().roomId
  return id ? ROOMS_BY_ID[id] : null
}

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))
const frames = (n: number) =>
  new Promise<void>((r) => {
    const step = (k: number) => (k <= 0 ? r() : requestAnimationFrame(() => step(k - 1)))
    step(n)
  })
let busy = false
export const isTransitioning = () => busy

const resolvedCache = new Map<string, Resolved>()

/** Carrega catalogo + GLBs da sala e resolve colisores/assentos/pontos de uso (cacheado). */
export async function prepareRoom(l: RoomLayout): Promise<Resolved> {
  const hit = resolvedCache.get(l.id)
  if (hit) return hit
  const cat = await loadCatalog()
  const urls = new Set<string>()
  for (const it of l.items) {
    const info = cat.pieces[it.p]
    if (info) urls.add(pieceUrl(it.p, info))
  }
  await Promise.all([...urls].map((u) => loadPiece(u).catch((e) => console.warn('[interiors] falha ao carregar', u, e))))
  const r = resolveRoom(l, cat, l.actions)
  resolvedCache.set(l.id, r)
  return r
}

function outsidePoint(poiId: string): { x: number; z: number; yaw: number } {
  const poi = CITY.pois.find((p) => p.id === poiId)
  if (!poi) return { x: 0, z: 9, yaw: 0 }
  return { x: poi.x + Math.sin(poi.facing) * 2.2, z: poi.z + Math.cos(poi.facing) * 2.2, yaw: poi.facing }
}

/** Entrar na sala da porta `poiId` (fade, carrega, teletransporta). */
export async function enterRoom(poiId: string): Promise<void> {
  const l = ROOMS_BY_POI[poiId]
  if (!l || busy || interiorBridge.active) return
  busy = true
  try {
    useInteriorStore.setState({ loading: true })
    navStore.setState({ fade: 1 })
    const [r] = await Promise.all([prepareRoom(l), sleep(240)])
    interiorBridge.room = r
    interiorBridge.ceiling = l.h
    interiorBridge.active = true
    const poi = CITY.pois.find((q) => q.id === l.poi)
    interiorBridge.mapPos = poi ? { x: poi.x, z: poi.z } : null
    useInteriorStore.setState({ roomId: l.id, prompt: null })
    await frames(3) // monta a sala (e compila os shaders) atras do fade
    await sleep(220) // colisores prontos antes de a jogadora aparecer
    navBridge.teleport = { x: r.spawn.x, z: r.spawn.z, yaw: r.spawn.yaw }
    clearMoveTarget()
    interiorBridge.snapZoom = 3.4
    await frames(3)
    await sleep(120)
    navStore.setState({ fade: 0 })
  } finally {
    useInteriorStore.setState({ loading: false })
    busy = false
  }
}

/** Sair para a porta da cidade. `instant` = sem fade (teleporte externo). */
export async function exitRoom(instant = false): Promise<void> {
  const l = currentRoom()
  if (!l || (busy && !instant)) return
  if (instant) {
    clearRoom()
    return
  }
  busy = true
  try {
    navStore.setState({ fade: 1 })
    await sleep(240)
    const o = outsidePoint(l.poi)
    navBridge.teleport = { x: o.x, z: o.z, yaw: o.yaw }
    clearMoveTarget()
    await sleep(90)
    clearRoom()
    await sleep(200)
    navStore.setState({ fade: 0 })
  } finally {
    busy = false
  }
}

function clearRoom() {
  interiorBridge.active = false
  interiorBridge.room = null
  interiorBridge.mapPos = null
  interiorBridge.overview = null
  useInteriorStore.setState({ roomId: null, prompt: null })
}

/** Dormir: avanca para as 07:00 com fade aconchegante. */
export async function sleepUntilMorning(setHour: (h: number) => void): Promise<void> {
  if (busy) return
  busy = true
  try {
    useInteriorStore.setState({ dark: 1 })
    await sleep(1400)
    setHour(7)
    await sleep(900)
    useInteriorStore.setState({ dark: 0 })
    showMsg('Bom dia!', 'Você dormiu bem e acordou às 07:00.')
  } finally {
    busy = false
  }
}

export function canInteract(): boolean {
  return !busy && !useMinigameStore.getState().active && !useShopStore.getState().open
}

export { roomOrigin }

if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).__interior = { enter: enterRoom, exit: exitRoom, store: useInteriorStore, bridge: interiorBridge, ov: (a: number[] | null) => { interiorBridge.overview = a }, door: (poi: string) => { const p = CITY.pois.find((q) => q.id === poi); if (p) navBridge.teleport = { x: p.x + Math.sin(p.facing) * 1.8, z: p.z + Math.cos(p.facing) * 1.8, yaw: p.facing + Math.PI } }, tp: (x: number, z: number, yaw = Math.PI) => { const r = interiorBridge.room; if (r) navBridge.teleport = { x: r.ox + x, z: r.oz + z, yaw } } }
}
