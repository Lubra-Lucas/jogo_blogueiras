import { Component, Suspense, useState, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import { sanitizeAppearance } from '../../../shared/appearance'
import { currentCharId } from '../../../net/save'
import { lookToAppearance } from '../../../game/minigames/desfile/adapters'
import type { Look } from '../../../game/minigames/desfile/types'
import { Doll, GradientBackdrop, StudioEnv } from '../../../game/minigames/desfile/sceneKit'
import { parseMatchData } from '../../../game/minigames/estilista/matchData'
import { useEstilistaStore } from '../../../game/minigames/estilista/store'
import type { Client } from '../../../game/minigames/estilista/types'
import { standings, useVersusStore } from '../../../game/net/versus'

const BACK: [number, string][] = [[0, '#e9e3d6'], [0.55, '#f6f1e7'], [1, '#dfe9f2']]
const MAX_DOLLS = 4

// um look estranho de outra jogadora nao derruba a tela de resultados
class DollBoundary extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false }
  static getDerivedStateFromError() {
    return { err: true }
  }
  render() {
    return this.state.err ? <p className="es-note">Não foi possível mostrar estes looks.</p> : this.props.children
  }
}

interface Entry {
  id: string
  name: string
  look: object
  points: number
}

function Dolls({ entries, client }: { entries: Entry[]; client: Client }) {
  const n = entries.length
  return (
    <>
      {entries.map((e, k) => {
        const app = sanitizeAppearance(lookToAppearance(e.look as Look, client.base))
        return app ? <Doll key={e.id} appearance={app} clip="idle" position={[(k - (n - 1) / 2) * 1.05, 0, 0]} /> : null
      })}
    </>
  )
}

/** Resultado da competição: placar geral + os looks de cada participante, cliente a cliente. */
export function MatchResults() {
  const match = useVersusStore((s) => s.match)
  const scores = useVersusStore((s) => s.scores)
  const clients = useEstilistaStore((s) => s.clients)
  const mine = useEstilistaStore((s) => s.results)
  const [tab, setTab] = useState(0)
  if (!match) return null
  const me = currentCharId()
  const rows = standings(match.players, scores)

  // minha jogada vem do estado local; as demais, do placar final (validado)
  const client = clients[tab]
  const entries: Entry[] = []
  if (client) {
    for (const r of [...rows].sort((a, b) => Number(b.id === me) - Number(a.id === me))) {
      const e = r.id === me ? (mine[tab] ? { look: mine[tab].look, points: mine[tab].points } : null) : r.done ? parseMatchData(r.data)[tab] : null
      if (e) entries.push({ id: r.id, name: r.name, ...e })
    }
  }
  const shown = entries.slice(0, MAX_DOLLS)

  return (
    <>
      <div className="es-sub">Resultado da competição</div>
      <ol className="es-board">
        {rows.map((r, i) => (
          <li key={r.id} className={r.id === me ? 'you' : ''}>
            <span>{i + 1}º</span>
            <b>{r.name} · {r.done ? r.detail : 'jogando…'}</b>
            <em>{Math.round(r.score)}</em>
          </li>
        ))}
      </ol>

      <div className="es-sub">Looks por cliente</div>
      <div className="es-seg es-tabs" role="tablist">
        {clients.map((c, i) => (
          <button key={c.id} role="tab" aria-selected={i === tab} className={i === tab ? 'on' : ''} onClick={() => setTab(i)}>
            {i + 1}. {c.name}
          </button>
        ))}
      </div>
      {client && (
        <>
          <p className="es-note small">&ldquo;{client.brief}&rdquo;</p>
          <div className="es-vs-stage">
            <DollBoundary key={`${tab}:${shown.map((e) => e.id).join()}`}>
              <Canvas
                dpr={[1, 1.5]}
                camera={{ position: [0, 1, 3.8], fov: 36, near: 0.1, far: 100 }}
                gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace }}
                onCreated={({ camera }) => camera.lookAt(0, 0.9, 0)}
              >
                <Suspense fallback={null}>
                  <GradientBackdrop stops={BACK} />
                  <StudioEnv />
                  <hemisphereLight args={['#fff8ec', '#d6cdb8', 0.7]} />
                  <directionalLight position={[2.5, 4, 3]} intensity={1.4} color="#fff3e0" />
                  <Dolls entries={shown} client={client} />
                </Suspense>
              </Canvas>
            </DollBoundary>
          </div>
          <ul className="es-vs-names">
            {shown.map((e) => (
              <li key={e.id} className={e.id === me ? 'you' : ''}>
                <b>{e.name}</b>
                <em>{e.points} pts</em>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
