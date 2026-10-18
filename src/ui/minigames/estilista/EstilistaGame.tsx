import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import { useAppearanceStore } from '../../../state/appearanceStore'
import { useProfileStore } from '../../../state/profileStore'
import { isMuted, playSfx, setMuted } from '../../../game/minigames/audio'
import { lookToAppearance } from '../../../game/minigames/desfile/adapters'
import type { ClipName } from '../../../game/character/animation/animator'
import { evaluate, liveComment } from '../../../game/minigames/estilista/logic'
import { Stage3D } from '../../../game/minigames/estilista/Stage3D'
import { tutorialSeen, useEstilistaStore } from '../../../game/minigames/estilista/store'
import type { Difficulty } from '../../../game/minigames/shared/competition'
import { endMatch, leaveLobby, reportScore, setPlaying, useVersusStore } from '../../../game/net/versus'
import { Face, IcoClose, IcoFlame, IcoPause, IcoPlay, IcoSound } from './icons'
import { BriefScreen, IntroScreen, ReactScreen, ResultsScreen, Tutorial } from './screens'
import { StylingPanel } from './StylingPanel'
import './estilista.css'

class SceneBoundary extends Component<{ onExit: () => void; children: ReactNode }, { err: string | null }> {
  state = { err: null as string | null }
  static getDerivedStateFromError(e: unknown) {
    return { err: e instanceof Error ? e.message : String(e) }
  }
  render() {
    if (!this.state.err) return this.props.children
    return (
      <div className="es-center">
        <div className="es-card" style={{ textAlign: 'center' }}>
          <h2 className="es-title small">Ops, a boutique travou</h2>
          <p className="es-note">{this.state.err}</p>
          <div className="es-row">
            <button className="es-btn primary" onClick={this.props.onExit}>Voltar</button>
          </div>
        </div>
      </div>
    )
  }
}

const Q = new URLSearchParams(window.location.search)

/** Só em dev: `?esphase=brief|style|react|results&esdiff=<dificuldade>&esxp=<n>` pula para uma fase (capturas). */
function devJump() {
  if (!import.meta.env.DEV) return
  const st = useEstilistaStore.getState()
  const diff = Q.get('esdiff') as Difficulty | null
  if (diff) st.setDifficulty(diff)
  const xp = Number(Q.get('esxp'))
  if (xp) useProfileStore.getState().addProfessionXp('Estilista', xp)
  const ph = Q.get('esphase')
  if (!ph) return
  st.setMode('daily')
  st.start()
  if (ph === 'brief') return
  const looks = [
    { top: 'corset', bottom: 'aline', jewelry: ['pearl_studs'], acc: ['hair_bow'] },
    { top: 'corset', bottom: 'tutu', jewelry: [], acc: [] },
    { top: null, bottom: null, jewelry: [], acc: [] },
    { top: 'corset', bottom: 'ballgown', jewelry: ['pearl_choker', 'tennis_bracelet'], acc: ['tiara', 'gloves'] },
    { top: 'corset', bottom: 'aline', jewelry: ['big_hoops'], acc: [] },
  ]
  const colors = ['#f3eddc', '#1f2e4f', '#dcc9a3', '#6b6b3a', '#b07a45']
  const fillAndSubmit = (k: number) => {
    const s = useEstilistaStore.getState()
    s.beginStyling()
    const L = looks[k % looks.length]
    const col = colors[k % colors.length]
    s.patchLook({
      top: L.top ? { id: L.top, color: col } : null,
      bottom: L.bottom ? { id: L.bottom, color: col } : null,
      jewelry: L.jewelry.map((id) => ({ id, color: '#d9c39a' })),
      accessories: L.acc.map((id) => ({ id, color: id === 'gloves' ? '#f3eddc' : '#d9c39a' })),
    })
  }
  if (ph === 'style') {
    st.beginStyling()
    if (Q.get('espause')) useEstilistaStore.setState({ endsAt: performance.now() + 3600e3 })
    return
  }
  const n = useEstilistaStore.getState().clients.length
  for (let k = 0; k < n; k++) {
    fillAndSubmit(k)
    useEstilistaStore.getState().submit(false)
    if (ph === 'react' && k === Math.min(1, n - 1)) return
    useEstilistaStore.getState().next()
  }
}

function useSeconds(endsAt: number, pausedLeft: number | null, active: boolean) {
  const [left, setLeft] = useState(0)
  useEffect(() => {
    if (!active) return
    const tick = () => setLeft(pausedLeft !== null ? Math.ceil(pausedLeft / 1000) : Math.max(0, Math.ceil((endsAt - performance.now()) / 1000)))
    tick()
    const id = window.setInterval(tick, 200)
    return () => window.clearInterval(id)
  }, [endsAt, pausedLeft, active])
  return left
}

/** Minijogo "Estilista Personal" em tela cheia. */
export default function EstilistaGame({ onExit }: { onExit: () => void }) {
  const phase = useEstilistaStore((s) => s.phase)
  const idx = useEstilistaStore((s) => s.idx)
  const clients = useEstilistaStore((s) => s.clients)
  const look = useEstilistaStore((s) => s.look)
  const endsAt = useEstilistaStore((s) => s.endsAt)
  const pausedLeft = useEstilistaStore((s) => s.pausedLeft)
  const difficulty = useEstilistaStore((s) => s.difficulty)
  const combo = useEstilistaStore((s) => s.combo)
  const results = useEstilistaStore((s) => s.results)
  const playerApp = useAppearanceStore((s) => s.appearance)
  const match = useVersusStore((s) => s.match)
  const [count, setCount] = useState(0)
  const [muted, setMutedState] = useState(isMuted())
  const [help, setHelp] = useState(false)
  const [openBubble, setOpenBubble] = useState(false)
  const started = useRef(false)

  const client = clients[idx] ?? null
  const styling = phase === 'style'
  const left = useSeconds(endsAt, pausedLeft, styling)

  useEffect(() => {
    if (started.current) return
    started.current = true
    useEstilistaStore.getState().reset()
    devJump()
    if (!tutorialSeen() && !Q.get('esphase')) setHelp(true)
  }, [])

  // competicao: valida a config (vem de outra jogadora), conta ate o inicio combinado e comeca a rodada com a mesma seed
  useEffect(() => {
    if (!match) return
    const c = match.config as { difficulty?: unknown; seed?: unknown; vip?: unknown } | null
    const diff = (['facil', 'normal', 'dificil', 'estrela'] as const).find((d) => d === c?.difficulty)
    if (!diff || typeof c?.seed !== 'number' || !Number.isFinite(c.seed) || typeof c.vip !== 'boolean') return endMatch()
    const { seed, vip } = c
    const id = window.setInterval(() => {
      const ms = match.startAt - Date.now()
      setCount(Math.ceil(ms / 1000))
      if (ms > 0) return
      window.clearInterval(id)
      setHelp(false)
      useEstilistaStore.getState().start({ difficulty: diff, seed, vip })
    }, 100)
    return () => window.clearInterval(id)
  }, [match?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setPlaying(phase !== 'intro'), [phase])
  useEffect(() => leaveLobby, [])

  // competicao: placar parcial a cada cliente avaliada e o final (com os looks) nos resultados
  const inMatch = match !== null
  useEffect(() => {
    if (!inMatch || results.length === 0) return
    const total = results.reduce((a, r) => a + r.points, 0)
    if (phase === 'results') {
      const avg = Math.round(results.reduce((a, r) => a + r.eval.total, 0) / results.length)
      reportScore(total, `${avg}% média`, true, { looks: results.map((r) => r.look), points: results.map((r) => r.points) })
    } else if (phase === 'react') reportScore(total, `cliente ${results.length}/${clients.length}`, false)
  }, [inMatch, phase, results.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (styling && pausedLeft === null && endsAt > 0 && endsAt - performance.now() <= 0) useEstilistaStore.getState().submit(true)
  }, [styling, left, pausedLeft, endsAt])

  const helpRef = useRef(false)
  helpRef.current = help
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return
      const p = useEstilistaStore.getState().phase
      if (helpRef.current || p === 'intro' || p === 'results') onExit()
      else if (p === 'style') useEstilistaStore.getState().togglePause()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onExit])

  const appearance = useMemo(() => (client ? lookToAppearance(look, client.base) : playerApp), [client, look, playerApp])
  const lastRes = results[results.length - 1]
  const ev = useMemo(() => (client && styling ? evaluate(client, look) : null), [client, look, styling])
  const mood = phase === 'react' && lastRes ? lastRes.eval.mood : (ev?.mood ?? 'neutral')
  const comment = phase === 'react' && lastRes ? '' : ev && client ? liveComment(client, ev, difficulty, Math.floor(ev.base / 6)) : ''
  const clip: ClipName = phase === 'brief' ? 'wave' : phase === 'react' && lastRes ? (lastRes.eval.mood === 'happy' ? 'laugh' : lastRes.eval.mood === 'unhappy' ? 'cry' : 'idle') : 'idle'
  const paused = pausedLeft !== null
  const limit = client?.timeLimit ?? 60

  return (
    <div className="es-root" data-phase={phase}>
      <SceneBoundary onExit={onExit}>
        <Canvas
          className="es-canvas"
          dpr={[1, 1.75]}
          camera={{ position: [0, 1.2, 3.7], fov: 38, near: 0.1, far: 200 }}
          gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace }}
          onCreated={({ gl }) => {
            gl.toneMappingExposure = 0.95
          }}
        >
          <Suspense fallback={null}>
            <Stage3D appearance={appearance} clip={clip} />
          </Suspense>
        </Canvas>
      </SceneBoundary>

      <div className="es-ui">
        <div className="es-topbar">
          {client && phase !== 'results' && (
            <div className="es-who">
              <b>{client.name}</b>
              <span className="es-prog" aria-label={`Cliente ${idx + 1} de ${clients.length}`}>
                {clients.map((c, i) => <i key={c.id} className={i < idx || (i === idx && phase === 'react') ? 'done' : i === idx ? 'now' : ''} />)}
              </span>
              {combo > 0 && <span className="es-combo"><IcoFlame size={14} /> ×{combo}</span>}
            </div>
          )}
          <div className="es-tools">
            {styling && (
              <>
                <div className={`es-timer${left <= 10 ? ' low' : ''}`} role="timer">
                  {left}s<i style={{ width: `${Math.min(100, (left / limit) * 100)}%` }} />
                </div>
                <button className="es-icon" aria-label={paused ? 'Continuar' : 'Pausar'} onClick={() => useEstilistaStore.getState().togglePause()}>
                  {paused ? <IcoPlay size={20} /> : <IcoPause size={20} />}
                </button>
              </>
            )}
            <button className="es-icon" aria-label={muted ? 'Ligar o som' : 'Silenciar'} onClick={() => (setMuted(!muted), setMutedState(!muted), muted && playSfx('click'))}>
              <IcoSound size={20} muted={muted} />
            </button>
            <button className="es-icon" aria-label="Sair" onClick={onExit}>
              <IcoClose size={20} />
            </button>
          </div>
        </div>

        {client && phase === 'style' && (
          <button className={`es-bubble${openBubble ? ' open' : ''}`} onClick={() => setOpenBubble(!openBubble)} aria-expanded={openBubble}>
            <Face mood={mood} size={36} />
            <span className="es-bubble-text">
              {phase === 'style' && comment ? <b>{comment}</b> : null}
              <em>&ldquo;{client.brief}&rdquo;</em>
            </span>
          </button>
        )}

        {match && phase === 'intro' && (
          <div className="es-modal">
            <div className="es-card" style={{ textAlign: 'center' }}>
              <h2 className="es-title small">Competição em {Math.max(1, count)}…</h2>
            </div>
          </div>
        )}
        {phase === 'intro' && !match && <IntroScreen onHelp={() => setHelp(true)} />}
        {phase === 'brief' && <BriefScreen />}
        {phase === 'style' && client && <StylingPanel client={client} secondsLeft={left} paused={paused} />}
        {phase === 'react' && <ReactScreen />}
        {phase === 'results' && <ResultsScreen onExit={onExit} />}

        {paused && (
          <div className="es-modal">
            <div className="es-card" style={{ textAlign: 'center' }}>
              <h2 className="es-title small">Pausado</h2>
              <div className="es-row">
                <button className="es-btn ghost" onClick={onExit}>Sair</button>
                <button className="es-btn primary" onClick={() => useEstilistaStore.getState().togglePause()}>Continuar</button>
              </div>
            </div>
          </div>
        )}
        {help && <Tutorial onDone={() => setHelp(false)} />}
      </div>
    </div>
  )
}
