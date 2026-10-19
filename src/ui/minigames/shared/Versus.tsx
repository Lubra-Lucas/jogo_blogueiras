import { useEffect, useRef, useState } from 'react'
import { endMatch, joinLobby, leaveLobby, standings, startMatch, useVersusStore, versusAvailable } from '../../../game/net/versus'
import { Overlay } from './kit'

/** Sala da competicao ao vivo no menu: Competir -> Na sala -> Comecar. `onStart` devolve a config da partida (dificuldade, seed...). */
export function VersusLobby({ gameId, onStart }: { gameId: string; onStart: () => unknown }) {
  const lobby = useVersusStore((s) => s.lobby)
  const inLobby = useVersusStore((s) => s.gameId) !== null
  if (!versusAvailable()) return null
  return (
    <div className="nj-col">
      <div className="nj-subtitle">Competição ao vivo</div>
      {inLobby ? (
        <>
          <div className="nj-keys">Na sala: {lobby.map((p) => p.name).join(', ')}</div>
          <div className="nj-actions">
            <button className="nj-cta" disabled={lobby.length < 2} onClick={() => startMatch(onStart())}>Começar competição</button>
            <button className="nj-cta nj-cta--ghost" onClick={leaveLobby}>Sair da sala</button>
          </div>
        </>
      ) : (
        <div className="nj-actions"><button className="nj-cta nj-cta--ghost" onClick={() => joinLobby(gameId)}>Competir</button></div>
      )}
    </div>
  )
}

/**
 * Quando chega uma partida: valida a config (vem de outra jogadora; invalida -> endMatch), conta ate `startAt` e chama `go(config)`.
 * Sai da sala ao desmontar. Devolve os segundos que faltam (0 sem partida).
 */
export function useVersusStart<T>(parse: (c: unknown) => T | null, go: (c: T) => void) {
  const match = useVersusStore((s) => s.match)
  const [count, setCount] = useState(0)
  const goRef = useRef(go)
  goRef.current = go
  const parseRef = useRef(parse)
  parseRef.current = parse
  useEffect(() => {
    if (!match) return
    const cfg = parseRef.current(match.config)
    if (!cfg) return endMatch()
    const id = window.setInterval(() => {
      const ms = match.startAt - Date.now()
      setCount(Math.ceil(ms / 1000))
      if (ms > 0) return
      window.clearInterval(id)
      goRef.current(cfg)
    }, 100)
    return () => window.clearInterval(id)
  }, [match?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => leaveLobby, [])
  return match ? count : 0
}

export function VersusCountdown({ count }: { count: number }) {
  return (
    <Overlay>
      <h2>Competição em {Math.max(1, count)}…</h2>
      <p>Todas jogam a mesma partida. Boa sorte!</p>
    </Overlay>
  )
}

/** Classificacao ao vivo/final da competicao; "jogando…" para quem ainda nao terminou. */
export function VersusStandings() {
  const match = useVersusStore((s) => s.match)
  const scores = useVersusStore((s) => s.scores)
  if (!match) return null
  return (
    <div className="nj-rank">
      <div className="nj-subtitle">Resultado da competição</div>
      {standings(match.players, scores).map((r, i) => (
        <div key={r.id}><span>{i + 1}</span><em>{r.name} · {r.done ? r.detail : 'jogando…'}</em><b>{r.score}</b></div>
      ))}
    </div>
  )
}
