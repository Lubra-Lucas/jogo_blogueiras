import { create } from 'zustand'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../../net/supabase'
import { sanitizeAppearance, type Appearance } from '../../shared/appearance'
import { cleanInput, filterProfanity, newMessageId, type ChatMessage, type ChatTransport } from '../../shared/chat'
import { usePlayerStore } from '../../state/playerStore'
import { useProfileStore } from '../../state/profileStore'
import { useAppearanceStore } from '../../state/appearanceStore'
import { setChatTransport } from '../../state/chatStore'
import { useInteriorStore } from '../interiors/interiorStore'
import { useTravelStore } from '../travel/travelStore'
import { PLAYER } from '../player/config'

/**
 * Multiplayer pelo Supabase Realtime, num canal unico "cidade":
 * - Presence (quem esta online): nome, look salvo e zona (cidade + sala). Quem esta em outra zona nao aparece.
 * - Broadcast "p": posicao dos pes, giro e velocidade, ~5x/s andando e a cada 3 s parada.
 * - Broadcast "chat": mensagens do chat (o ChatTransport do jogo).
 * shortcut: o cliente decide a propria posicao (sem servidor autoritativo); serve para o teste da equipe, nao contra trapaca.
 */
export interface Peer {
  name: string
  appearance: Appearance
  zone: string
}

/** amostra de movimento de um jogador remoto; mutada no lugar (sem re-render) */
export interface Motion {
  x: number
  y: number
  z: number
  yaw: number
  speed: number
  /** chegou em (performance.now) */
  at: number
  /** intervalo ate a amostra anterior (ms): duracao da interpolacao */
  span: number
  has: boolean
}

export const useNetStore = create<{ peers: Record<string, Peer>; myZone: string }>()(() => ({ peers: {}, myZone: '' }))
export const motions = new Map<string, Motion>()
export const bubbles = new Map<string, { text: string; until: number }>()

const SEND_MS = 200
const IDLE_MS = 3000
const BUBBLE_MS = 5000
const FEET = PLAYER.halfHeight + PLAYER.radius

const zone = () => `${useTravelStore.getState().cityId}|${useInteriorStore.getState().roomId ?? ''}`
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const r2 = (v: number) => Math.round(v * 100) / 100

class NetChat implements ChatTransport {
  private listeners = new Set<(m: ChatMessage) => void>()
  constructor(
    private ch: RealtimeChannel,
    private me: string,
  ) {}
  send(author: string, text: string) {
    this.emit({ id: newMessageId(), kind: 'player', author, text, ts: Date.now(), self: true })
    void this.ch.send({ type: 'broadcast', event: 'chat', payload: { c: this.me, a: author, t: text } })
  }
  subscribe(l: (m: ChatMessage) => void) {
    this.listeners.add(l)
    return () => void this.listeners.delete(l)
  }
  emit(m: ChatMessage) {
    this.listeners.forEach((l) => l(m))
  }
}

export function startNet(me: string) {
  const ch = supabase.channel('cidade', { config: { presence: { key: me } } })
  const chat = new NetChat(ch, me)

  ch.on('presence', { event: 'sync' }, () => {
    const peers: Record<string, Peer> = {}
    for (const [id, metas] of Object.entries(ch.presenceState<{ name?: unknown; appearance?: unknown; zone?: unknown }>())) {
      const m = metas[0]
      // dado de outro cliente: valida antes de montar a boneca
      const appearance = id !== me && m ? sanitizeAppearance(m.appearance) : null
      if (appearance) peers[id] = { name: String(m.name ?? '').slice(0, 20) || 'Blogueira', appearance, zone: String(m.zone ?? '') }
    }
    for (const id of motions.keys()) if (!peers[id]) motions.delete(id)
    useNetStore.setState({ peers })
  })

  ch.on('broadcast', { event: 'p' }, ({ payload }) => {
    const id = String(payload?.c ?? '')
    const p = payload?.p
    if (!id || id === me || !Array.isArray(p)) return
    const now = performance.now()
    const m = motions.get(id)
    const next: Motion = { x: num(p[0]), y: num(p[1]), z: num(p[2]), yaw: num(p[3]), speed: num(p[4]), at: now, span: m?.has ? Math.min(now - m.at, 400) : 0, has: true }
    motions.set(id, next)
  })

  ch.on('broadcast', { event: 'chat' }, ({ payload }) => {
    const id = String(payload?.c ?? '')
    const text = filterProfanity(cleanInput(String(payload?.t ?? '')))
    if (!id || id === me || !text) return
    const author = useNetStore.getState().peers[id]?.name ?? (String(payload?.a ?? '').slice(0, 20) || 'Blogueira')
    chat.emit({ id: newMessageId(), kind: 'player', author, text, ts: Date.now() })
    bubbles.set(id, { text, until: performance.now() + BUBBLE_MS })
  })

  let tracked = ''
  const track = () => {
    const meta = { name: useProfileStore.getState().name, appearance: useAppearanceStore.getState().saved, zone: zone() }
    const key = JSON.stringify(meta)
    if (key === tracked) return
    tracked = key
    useNetStore.setState({ myZone: meta.zone })
    void ch.track(meta)
  }

  let lastSent = 0
  let sent = { x: 0, z: 0, yaw: 0 }
  const tick = () => {
    track()
    const s = usePlayerStore.getState()
    const now = performance.now()
    const moved = Math.abs(s.position.x - sent.x) + Math.abs(s.position.z - sent.z) > 0.02 || Math.abs(s.yaw - sent.yaw) > 0.02
    if (!moved && now - lastSent < IDLE_MS) return
    lastSent = now
    sent = { x: s.position.x, z: s.position.z, yaw: s.yaw }
    void ch.send({ type: 'broadcast', event: 'p', payload: { c: me, p: [r2(s.position.x), r2(s.position.y - FEET), r2(s.position.z), r2(s.yaw), r2(moved ? s.speed : 0)] } })
  }

  ch.subscribe((status) => {
    if (status !== 'SUBSCRIBED') return
    tracked = '' // reconectou: presence precisa ser refeito
    setChatTransport(chat)
  })
  window.setInterval(() => ch.state === 'joined' && tick(), SEND_MS)
}
