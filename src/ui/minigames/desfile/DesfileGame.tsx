import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import { isMuted, playSfx, setMuted } from '../../../game/minigames/audio'
import { lookToAppearance } from '../../../game/minigames/desfile/adapters'
import { Camarim3D } from '../../../game/minigames/desfile/Camarim3D'
import { Podium3D } from '../../../game/minigames/desfile/Podium3D'
import { Runway3D } from '../../../game/minigames/desfile/Runway3D'
import { useDesfileStore } from '../../../game/minigames/desfile/store'
import { CamarimUI } from './CamarimUI'
import { IntroUI } from './IntroUI'
import { JudgesUI } from './JudgesUI'
import { ResultsUI } from './ResultsUI'
import { RunwayUI } from './RunwayUI'
import './desfile.css'

/** Se algo no 3D falhar (WebGL, asset), mostra uma mensagem em vez de derrubar o jogo. */
class SceneBoundary extends Component<{ onExit: () => void; children: ReactNode }, { err: string | null }> {
  state = { err: null as string | null }
  static getDerivedStateFromError(e: unknown) {
    return { err: e instanceof Error ? e.message : String(e) }
  }
  render() {
    if (!this.state.err) return this.props.children
    return (
      <div className="dz-center">
        <div className="dz-card" style={{ textAlign: 'center' }}>
          <h2 className="dz-title small">Ops, a passarela travou</h2>
          <p style={{ fontSize: '0.8rem', color: '#7d6f93' }}>{this.state.err}</p>
          <div className="dz-row">
            <button className="dz-btn primary" onClick={this.props.onExit}>
              Voltar
            </button>
          </div>
        </div>
      </div>
    )
  }
}

const Q = new URLSearchParams(window.location.search)

/** Só em dev: `?dzphase=camarim|runway|judging|results&dztheme=<id>` pula direto para uma fase (capturas). */
function devJump() {
  if (!import.meta.env.DEV) return
  const st = useDesfileStore.getState()
  const theme = Q.get('dztheme')
  if (theme) st.begin(theme)
  const ph = Q.get('dzphase')
  if (ph === 'camarim') st.enterCamarim()
  else if (ph === 'runway') {
    st.enterCamarim()
    st.finishCamarim()
  } else if (ph === 'judging' || ph === 'results') {
    st.enterCamarim()
    st.finishCamarim()
    st.recordPose('perfect')
    st.recordPose('good')
    st.recordPose('perfect')
    st.finishRunway()
    if (ph === 'results') st.showResults()
  }
}

/** Minijogo "Passarela das Blogueiras" em tela cheia. `onExit` fecha (o host devolve o jogo). */
export function DesfileGame({ onExit }: { onExit: () => void }) {
  const phase = useDesfileStore((s) => s.phase)
  const look = useDesfileStore((s) => s.look)
  const base = useDesfileStore((s) => s.base)
  const result = useDesfileStore((s) => s.result)
  const [muted, setMutedState] = useState(isMuted())
  const canvasEl = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    useDesfileStore.getState().begin(Q.get('dztheme') ?? undefined)
    devJump()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return
      const p = useDesfileStore.getState().phase
      if (p === 'intro' || p === 'results') onExit()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onExit])

  const appearance = useMemo(() => lookToAppearance(look, base), [look, base])
  const scene = phase === 'intro' || phase === 'camarim' ? 'camarim' : phase === 'results' ? 'podium' : 'runway'

  return (
    <div className="dz-root" data-phase={phase}>
      <SceneBoundary onExit={onExit}>
      <Canvas
        className="dz-canvas"
        dpr={[1, 1.75]}
        camera={{ position: [0, 1.2, 3.7], fov: 38, near: 0.1, far: 200 }}
        gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace }}
        onCreated={({ gl }) => {
          canvasEl.current = gl.domElement
          gl.toneMappingExposure = 0.95
        }}
      >
        <Suspense fallback={null}>
          {scene === 'camarim' && <Camarim3D appearance={appearance} spin={phase === 'camarim' || phase === 'intro'} />}
          {scene === 'runway' && <Runway3D appearance={appearance} />}
          {scene === 'podium' && result && <Podium3D ranking={result.ranking} base={base} />}
        </Suspense>
      </Canvas>
      </SceneBoundary>

      <div className="dz-ui" data-phase={phase}>
        <div className="dz-topbar">
          <span className="dz-brand">Passarela das Blogueiras</span>
          <button
            className="dz-icon"
            aria-label={muted ? 'Ligar o som' : 'Silenciar'}
            onClick={() => {
              setMuted(!muted)
              setMutedState(!muted)
              if (muted) playSfx('click')
            }}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          {(phase === 'intro' || phase === 'results') && (
            <button className="dz-icon" aria-label="Sair" onClick={onExit}>
              ✕
            </button>
          )}
        </div>
        {phase === 'intro' && <IntroUI />}
        {phase === 'camarim' && <CamarimUI />}
        {phase === 'runway' && <RunwayUI />}
        {phase === 'judging' && <JudgesUI />}
        {phase === 'results' && <ResultsUI getCanvas={() => canvasEl.current} onExit={onExit} />}
      </div>
    </div>
  )
}
