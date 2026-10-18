import { create } from 'zustand'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { OFFLINE, supabase } from '../../net/supabase'
import { currentCharId } from '../../net/save'
import { useProfileStore } from '../../state/profileStore'
import type { VersusPlayer, VersusScore } from './standings'

export { standings } from './standings'
export type { VersusPlayer, VersusScore }

/**
 * Competicao ao vivo entre jogadoras, reutilizavel por qualquer minijogo: um canal Realtime "mg:<jogo>".
 * - Presence: nome e se a jogadora esta ocupada numa partida; a sala (lobby) e quem esta livre.
 * - Broadcast "start": inicia a partida para quem estava na sala; "score": placar parcial/final de cada uma.
 * shortcut: o inicio usa o relogio de cada aparelho (diferencas de ~1 s entre aparelhos); cada jogadora toca a propria musica, entao so muda a sensacao, nao o placar.
 * shortcut: o placar vem do navegador de cada jogadora (sem anticheat), ok para o teste da equipe.
 */
export interface VersusMatch {
  id: string
  startAt: number
  config: unknown
  players: VersusPlayer[]
}

export const useVersusStore = create<{
  gameId: string | null
  lobby: VersusPlayer[]
  match: VersusMatch | null
  scores: Record<string, VersusScore>
}>()(() => ({ gameId: null, lobby: [], match: null, scores: {} }))

/** carga extra do placar final: so se couber em 16000 caracteres de JSON */
const validData = (d: unknown) => {
  try {
    return d !== undefined && JSON.stringify(d).length <= 16000
  } catch {
    return false
  }
}

export const versusAvailable = () => !OFFLINE && currentCharId() !== null

let ch: RealtimeChannel | null = null
let me = ''

let playing = false
const meta = () => ({ name: useProfileStore.getState().name, busy: playing || useVersusStore.getState().match !== null })
const track = () => void ch?.track(meta())

/** O minijogo avisa quando sai do menu (jogando sozinha, resultados...): fica fora da sala e nao e puxada para uma partida. */
export function setPlaying(b: boolean) {
  if (b === playing) return
  playing = b
  track()
}

export function joinLobby(gameId: string) {
  const id = currentCharId()
  if (ch || !id) return
  me = id
  const c = supabase.channel(`mg:${gameId}`, { config: { presence: { key: me }, broadcast: { self: true } } })
  ch = c
  useVersusStore.setState({ gameId })

  c.on('presence', { event: 'sync' }, () => {
    const lobby: VersusPlayer[] = []
    for (const [pid, metas] of Object.entries(c.presenceState<{ name?: unknown; busy?: unknown }>())) {
      const m = metas[0]
      if (m && !m.busy) lobby.push({ id: pid, name: String(m.name ?? '').slice(0, 20) || 'Blogueira' })
    }
    useVersusStore.setState({ lobby })
  })

  c.on('broadcast', { event: 'start' }, ({ payload }) => {
    const { id: mid, startAt, config, players } = payload ?? {}
    if (typeof mid !== 'string' || typeof startAt !== 'number' || !Array.isArray(players)) return
    const list: VersusPlayer[] = players
      .filter((p) => p && typeof p.id === 'string')
      .map((p) => ({ id: p.id, name: String(p.name ?? '').slice(0, 20) || 'Blogueira' }))
    if (playing || useVersusStore.getState().match || !list.some((p) => p.id === me)) return
    useVersusStore.setState({ match: { id: mid, startAt, config, players: list }, scores: {} })
    track()
  })

  c.on('broadcast', { event: 'score' }, ({ payload }) => {
    const { s: sender, matchId, score, detail, done, data } = payload ?? {}
    const match = useVersusStore.getState().match
    const player = match?.players.find((p) => p.id === sender)
    if (!match || !player || matchId !== match.id || typeof score !== 'number' || !Number.isFinite(score) || score < 0 || typeof detail !== 'string') return
    useVersusStore.setState((st) => ({
      scores: { ...st.scores, [player.id]: { name: player.name, score, detail: detail.slice(0, 40), done: done === true, ...(done === true && validData(data) ? { data } : {}) } },
    }))
  })

  c.subscribe((status) => status === 'SUBSCRIBED' && track())
}

export function leaveLobby() {
  if (ch) void supabase.removeChannel(ch)
  ch = null
  playing = false
  useVersusStore.setState({ gameId: null, lobby: [], match: null, scores: {} })
}

export function startMatch(config: unknown) {
  void ch?.send({
    type: 'broadcast',
    event: 'start',
    payload: { id: Math.random().toString(36).slice(2, 10), startAt: Date.now() + 4000, config, players: useVersusStore.getState().lobby },
  })
}

export function reportScore(score: number, detail: string, done: boolean, data?: unknown) {
  const match = useVersusStore.getState().match
  if (match) void ch?.send({ type: 'broadcast', event: 'score', payload: { s: me, matchId: match.id, score, detail, done, ...(validData(data) ? { data } : {}) } })
}

export function endMatch() {
  useVersusStore.setState({ match: null, scores: {} })
  track()
}
