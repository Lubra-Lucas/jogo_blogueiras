import { Component, Suspense, useEffect, useState, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import { isMuted, setMuted } from '../../../game/minigames/audio'
import { LANE_KEYS } from '../../../game/minigames/dj/chart'
import {
  dev, finish, laneFor, live, padDown, padUp, pause, quitToMenu, resume, scratchInput, session, startSong, tick, useDjStore,
} from '../../../game/minigames/dj/controller'
import { getCtx } from '../../../game/minigames/dj/engine'
import { DjScene3D } from '../../../game/minigames/dj/DjScene3D'
import { endMatch, leaveLobby, reportScore, setPlaying, useVersusStore } from '../../../game/net/versus'
import { SONGS } from '../../../game/minigames/dj/songs'
import { getQuality } from '../../../game/systems/quality'
import { useAppearanceStore } from '../../../state/appearanceStore'
import { Highway } from './Highway'
import { Hud, Pads } from './Hud'
import { IcClose, IcPause, IcSound } from './icons'
import { Menu } from './Menu'
import { Calibrate, Pause, Results, Tutorial } from './Panels'
import './dj.css'

class SceneBoundary extends Component<{ children: ReactNode }, { err: string | null }> {
  state = { err: null as string | null }
  static getDerivedStateFromError(e: unknown) {
    return { err: e instanceof Error ? e.message : String(e) }
  }
  render() {
    if (!this.state.err) return this.props.children
    return null
  }
}

const Q = new URLSearchParams(window.location.search)
const CROWD_MAX = { low: 3, medium: 5, high: 8 } as const

/** Minijogo "DJ da Noite" (ritmo em 4 pistas) em tela cheia. */
export function DjGame({ onExit }: { onExit: () => void }) {
  const phase = useDjStore((s) => s.phase)
  const showHelp = useDjStore((s) => s.showHelp)
  const tutorialSeen = useDjStore((s) => s.tutorialSeen)
  const result = useDjStore((s) => s.result)
  const lanes = session?.chart.laneCount ?? 4
  const [calibrating, setCalibrating] = useState(false)
  const [muted, setMutedState] = useState(isMuted())
  const [colors, setColors] = useState(live.colors)
  const appearance = useAppearanceStore((s) => s.appearance)
  const crowdMax = CROWD_MAX[getQuality()]
  const runId = useDjStore((s) => s.runId)

  // início: sempre no menu; em dev, ?djsong=&djdiff=&djbot= pula direto
  useEffect(() => {
    quitToMenu()
    if (import.meta.env.DEV) {
      const bot = Number(Q.get('djbot'))
      if (bot > 0) dev.bot = bot
      if (Q.get('djplay')) {
        getCtx()
        startSong({
          songId: Q.get('djsong') ?? undefined,
          difficulty: (Q.get('djdiff') as never) ?? undefined,
          daily: Q.get('djdaily') === '1',
        })
      }
    }
    return () => {
      quitToMenu()
      leaveLobby()
    }
  }, [])

  // competicao: contagem ate o inicio combinado, depois toca a musica escolhida pela anfitria
  const match = useVersusStore((s) => s.match)
  const [left, setLeft] = useState(0)
  useEffect(() => {
    if (!match) return
    const cfg = match.config as { songId?: unknown; difficulty?: unknown } | null
    const songId = SONGS.find((s) => s.id === cfg?.songId)?.id
    const difficulty = (['facil', 'normal', 'dificil', 'estrela'] as const).find((d) => d === cfg?.difficulty)
    if (!songId || !difficulty) return endMatch() // dado de outra jogadora: ignora partida invalida
    const id = window.setInterval(() => {
      const ms = match.startAt - Date.now()
      setLeft(Math.ceil(ms / 1000))
      if (ms > 0) return
      window.clearInterval(id)
      startSong({ songId, difficulty, daily: false })
    }, 100)
    return () => window.clearInterval(id)
  }, [match?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setPlaying(phase !== 'menu'), [phase])

  // competicao: placar parcial a cada 1 s e o final quando a musica acaba
  const inMatch = match !== null
  useEffect(() => {
    if (!inMatch || (phase !== 'playing' && phase !== 'paused')) return
    const id = window.setInterval(() => reportScore(live.score, `${Math.round(live.accuracy)}%`, false), 1000)
    return () => window.clearInterval(id)
  }, [inMatch, phase])
  useEffect(() => {
    if (inMatch && result) reportScore(result.score, `${Math.round(result.accuracy)}% · combo ${result.maxCombo}`, true)
  }, [inMatch, result])

  useEffect(() => {
    if (session) setColors(session.song.colors)
  }, [runId])

  // relógio da partida: um laço por quadro
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      tick(dt)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  // teclado
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return
      const st = useDjStore.getState().phase
      if (e.code === 'Escape') {
        if (st === 'playing') pause()
        else if (st === 'paused') resume()
        else if (st === 'menu' && !calibrating) onExit()
        return
      }
      if (st !== 'playing' || !session) return
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault()
        scratchInput(e.code === 'ArrowLeft' ? -1 : 1, e.timeStamp)
        return
      }
      const lane = laneFor(e.code, session.chart.laneCount)
      if (lane >= 0) {
        e.preventDefault()
        padDown(lane, e.timeStamp)
      }
    }
    const up = (e: KeyboardEvent) => {
      if (!session) return
      const lane = laneFor(e.code, session.chart.laneCount)
      if (lane >= 0) padUp(lane, e.timeStamp)
    }
    window.addEventListener('keydown', down, true)
    window.addEventListener('keyup', up, true)
    return () => {
      window.removeEventListener('keydown', down, true)
      window.removeEventListener('keyup', up, true)
    }
  }, [onExit, calibrating])

  // aba em segundo plano: pausa
  useEffect(() => {
    const vis = () => document.hidden && pause()
    document.addEventListener('visibilitychange', vis)
    return () => document.removeEventListener('visibilitychange', vis)
  }, [])

  const playing = phase === 'playing' || phase === 'paused'
  const begin = () => {
    getCtx()
    if (!useDjStore.getState().tutorialSeen) useDjStore.setState({ showHelp: true })
    else startSong()
  }
  const keyLabel = LANE_KEYS[lanes].map((k) => k[0].replace('Key', '')).join(' ')
  void keyLabel

  return (
    <div className="dj-root" data-phase={phase} data-lanes={lanes}>
      <SceneBoundary>
        <Canvas
          className="dj-canvas"
          dpr={[1, 1.5]}
          camera={{ position: [0, 2.4, 4], fov: 44, near: 0.1, far: 60 }}
          gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace }}
          onCreated={({ gl }) => {
            gl.toneMappingExposure = 1
          }}
        >
          <Suspense fallback={null}>
            <DjScene3D crowdMax={crowdMax} appearance={appearance} colors={colors} />
          </Suspense>
        </Canvas>
      </SceneBoundary>
      <div className="dj-vignette" />

      <div className="dj-topbar">
        {playing && (
          <button className="dj-icon" aria-label="Pausar" onClick={() => (phase === 'playing' ? pause() : resume())}>
            <IcPause size={20} />
          </button>
        )}
        <span className="dj-spacer" />
        <button
          className="dj-icon"
          aria-label={muted ? 'Ligar o som' : 'Silenciar'}
          onClick={() => {
            setMuted(!muted)
            setMutedState(!muted)
            session?.player.setMuted(!muted)
          }}
        >
          <IcSound size={20} off={muted} />
        </button>
        {!playing && phase !== 'results' && (
          <button className="dj-icon" aria-label="Sair" onClick={onExit}>
            <IcClose size={20} />
          </button>
        )}
        {phase === 'results' && (
          <button className="dj-icon" aria-label="Sair" onClick={onExit}>
            <IcClose size={20} />
          </button>
        )}
      </div>

      {playing && (
        <div className="dj-play" data-lanes={lanes}>
          <Highway />
          <Pads lanes={lanes} />
          <Hud />
        </div>
      )}
      {playing && import.meta.env.DEV && Q.get('djbot') && (
        <button className="dj-dev" onClick={finish}>
          fim
        </button>
      )}

      {match && phase === 'menu' && (
        <div className="dj-modal">
          <div className="dj-card narrow">
            <h2>Competição em {Math.max(1, left)}…</h2>
          </div>
        </div>
      )}
      {phase === 'menu' && !match && !calibrating && !showHelp && <Menu onPlay={begin} onCalibrate={() => setCalibrating(true)} />}
      {phase === 'menu' && calibrating && <Calibrate onClose={() => setCalibrating(false)} />}
      {showHelp && (
        <Tutorial
          onDone={() => {
            const first = !tutorialSeen
            useDjStore.getState().finishTutorial()
            if (first && useDjStore.getState().phase === 'menu') startSong()
          }}
        />
      )}
      {phase === 'paused' && <Pause onResume={resume} onRestart={() => startSong()} onQuit={() => {
          endMatch()
          quitToMenu()
        }} />}
      {phase === 'results' && result && <Results r={result} />}
    </div>
  )
}
