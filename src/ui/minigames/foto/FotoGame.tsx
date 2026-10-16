import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import { isMuted, playSfx, setMuted } from '../../../game/minigames/audio'
import { PhotoStudio3D } from '../../../game/minigames/foto/PhotoStudio3D'
import { live } from '../../../game/minigames/foto/live'
import { ASPECT, halfH } from '../../../game/minigames/foto/logic'
import { useFotoStore } from '../../../game/minigames/foto/store'
import type { Difficulty } from '../../../game/minigames/shared/competition'
import { Controls, ZoomRow } from './Controls'
import { Hud } from './Hud'
import { IcCamera, IcHelp, IcPause, IcClose, IcSkip, IcSound, IcTimer } from './icons'
import { Avatar, Between, BriefCard, HowTo, Intro, PauseModal, Results, Tutorial } from './Screens'
import './foto.css'

class SceneBoundary extends Component<{ onExit: () => void; children: ReactNode }, { err: string | null }> {
  state = { err: null as string | null }
  static getDerivedStateFromError(e: unknown) {
    return { err: e instanceof Error ? e.message : String(e) }
  }
  render() {
    if (!this.state.err) return this.props.children
    return (
      <div className="fg-center">
        <div className="fg-card">
          <h2 className="fg-h">Ops, o estúdio travou</h2>
          <p className="fg-note">{this.state.err}</p>
          <div className="fg-actions"><button className="fg-btn primary" onClick={this.props.onExit}>Voltar</button></div>
        </div>
      </div>
    )
  }
}

const Q = new URLSearchParams(window.location.search)

/** Só em dev: `?fotophase=shoot&fotodiff=normal` pula direto para o ensaio (capturas). */
function devJump() {
  if (!import.meta.env.DEV) return
  ;(window as unknown as { __foto: typeof useFotoStore }).__foto = useFotoStore
  const ph = Q.get('fotophase')
  if (!ph) return
  const st = useFotoStore.getState()
  st.start((Q.get('fotodiff') as Difficulty) ?? 'normal', Q.get('fotodaily') === '1')
  if (ph === 'shoot') {
    useFotoStore.getState().beginShoot()
    if (Q.get('fototut') !== '1') useFotoStore.getState().skipTutorial()
  }
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.ceil(s) % 60).padStart(2, '0')}`

function useFit(ref: React.RefObject<HTMLDivElement | null>) {
  const [box, setBox] = useState({ w: 320, h: 400 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const aw = el.clientWidth - 16
      const ah = el.clientHeight - 16
      if (aw <= 0 || ah <= 0) return
      const w = aw / ah > ASPECT ? ah * ASPECT : aw
      setBox({ w: Math.floor(w), h: Math.floor(w / ASPECT) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return box
}

/** Minijogo "Ensaio Fotográfico" em tela cheia. `onExit` fecha (o host devolve o jogo). */
export function FotoGame({ onExit }: { onExit: () => void }) {
  const phase = useFotoStore((s) => s.phase)
  const paused = useFotoStore((s) => s.paused)
  const client = useFotoStore((s) => s.clients[s.ci])
  const ci = useFotoStore((s) => s.ci)
  const total = useFotoStore((s) => s.clients.length)
  const timeLeft = useFotoStore((s) => s.timeLeft)
  const film = useFotoStore((s) => s.film)
  const pending = useFotoStore((s) => s.pending)
  const [muted, setMutedState] = useState(isMuted())
  const [help, setHelp] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const box = useFit(stage)
  const ptrs = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef(0)

  useEffect(() => {
    useFotoStore.getState().enter()
    devJump()
  }, [])

  const shooting = phase === 'shoot' && !paused

  // gestos: arrastar move a câmera, pinça aproxima
  const onDown = (e: React.PointerEvent) => {
    if (!shooting) return
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()]
      pinch.current = Math.hypot(a.x - b.x, a.y - b.y)
    }
  }
  const onMove = (e: React.PointerEvent) => {
    const p = ptrs.current.get(e.pointerId)
    if (!p || !shooting) return
    const st = useFotoStore.getState()
    const h = halfH(live.cam.zoom)
    if (ptrs.current.size === 1) {
      const dx = e.clientX - p.x
      const dy = e.clientY - p.y
      st.setCam({ cx: st.cam.cx - (dx / box.w) * 2 * h * ASPECT, cy: st.cam.cy + (dy / box.h) * 2 * h })
    }
    p.x = e.clientX
    p.y = e.clientY
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinch.current > 0) st.setCam({ zoom: st.cam.zoom * (d / pinch.current) })
      pinch.current = d
    }
  }
  const onUp = (e: React.PointerEvent) => {
    ptrs.current.delete(e.pointerId)
    pinch.current = 0
  }

  useEffect(() => {
    const el = frame.current
    if (!el) return
    const wheel = (e: WheelEvent) => {
      const st = useFotoStore.getState()
      if (st.phase !== 'shoot' || st.paused) return
      e.preventDefault()
      st.setCam({ zoom: st.cam.zoom * Math.exp(-e.deltaY * 0.0014) })
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, [])

  // teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useFotoStore.getState()
      if (e.code === 'Escape') {
        if (st.phase === 'intro' || st.phase === 'results') onExit()
        else if (st.phase === 'shoot') st.setPaused(!st.paused)
        e.stopPropagation()
        return
      }
      if (st.phase !== 'shoot' || st.paused) return
      const h = halfH(st.cam.zoom) * 0.06
      let used = true
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA': st.setCam({ cx: st.cam.cx - h }); break
        case 'ArrowRight': case 'KeyD': st.setCam({ cx: st.cam.cx + h }); break
        case 'ArrowUp': case 'KeyW': st.setCam({ cy: st.cam.cy + h }); break
        case 'ArrowDown': case 'KeyS': st.setCam({ cy: st.cam.cy - h }); break
        case 'Equal': case 'NumpadAdd': case 'KeyE': st.setCam({ zoom: st.cam.zoom * 1.06 }); break
        case 'Minus': case 'NumpadSubtract': case 'KeyQ': st.setCam({ zoom: st.cam.zoom / 1.06 }); break
        case 'Space': case 'Enter': if (!e.repeat) st.shoot(); break
        case 'KeyP': st.setPaused(true); break
        default: used = false
      }
      if (used) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onExit])

  const intro = phase === 'intro'
  return (
    <div className="fg-root" data-phase={phase}>
      <div className="fg-topbar">
        <span className="fg-brand"><IcCamera size={18} /> <span className="fg-brand-t">Ensaio Fotográfico</span></span>
        {phase === 'shoot' && (
          <span className="fg-timer" data-low={timeLeft < 15 ? '1' : '0'}><IcTimer size={16} /> {fmt(timeLeft)} <small>Cliente {ci + 1}/{total}</small></span>
        )}
        <span className="fg-spacer" />
        <button className="fg-icon" aria-label="Como jogar" onClick={() => setHelp(true)}><IcHelp /></button>
        <button
          className="fg-icon" aria-label={muted ? 'Ligar o som' : 'Silenciar'}
          onClick={() => { setMuted(!muted); setMutedState(!muted); if (muted) playSfx('click') }}
        >
          <IcSound off={muted} />
        </button>
        {phase === 'shoot' ? (
          <button className="fg-icon" aria-label="Pausar" onClick={() => useFotoStore.getState().setPaused(true)}><IcPause /></button>
        ) : (
          <button className="fg-icon" aria-label="Sair" onClick={onExit}><IcClose /></button>
        )}
      </div>

      <div className="fg-main" data-shoot={phase === 'shoot' ? '1' : '0'}>
        <div className="fg-stage" ref={stage}>
          <div
            className="fg-frame" ref={frame} style={{ width: box.w, height: box.h }}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
            data-active={shooting ? '1' : '0'}
          >
            <SceneBoundary onExit={onExit}>
              <Canvas
                className="fg-canvas" shadows dpr={[1, 1.75]}
                camera={{ position: [0, 1, 4.6], fov: 30, near: 0.1, far: 80 }}
                gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace }}
                onCreated={({ gl }) => { gl.toneMappingExposure = 1 }}
              >
                <Suspense fallback={null}>
                  <PhotoStudio3D />
                </Suspense>
              </Canvas>
            </SceneBoundary>
            <Hud />
            {phase === 'shoot' && <Tutorial />}
          </div>
        </div>

        {phase === 'shoot' && client && (
          <div className="fg-side">
            <div className="fg-minibrief">
              <Avatar client={client} />
              <div><b>{client.name}</b><p>{client.text}</p></div>
            </div>
            <ZoomRow />
            <Controls />
            <div className="fg-shutterrow">
              <div className="fg-film" aria-label={`${film} poses restantes`}>
                {Array.from({ length: 5 }, (_, i) => <i key={i} className={i < film ? 'on' : ''} />)}
              </div>
              <button className="fg-shutter" aria-label="Tirar a foto" disabled={!shooting || film <= 0 || pending} onClick={() => useFotoStore.getState().shoot()}>
                <span className="fg-shutter-ring" />
                <IcCamera size={26} />
              </button>
              <button className="fg-btn ghost small" onClick={() => useFotoStore.getState().endClient()} aria-label="Passar para o próximo cliente">
                <IcSkip size={14} /> Próximo
              </button>
            </div>
          </div>
        )}
      </div>

      {intro && <Intro onExit={onExit} />}
      {phase === 'brief' && <BriefCard />}
      {phase === 'between' && <Between />}
      {phase === 'results' && <Results onExit={onExit} />}
      {paused && phase === 'shoot' && <PauseModal onExit={onExit} />}
      {help && !intro && <HowTo onClose={() => setHelp(false)} />}
    </div>
  )
}
