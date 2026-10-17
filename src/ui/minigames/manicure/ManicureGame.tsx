import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { create } from 'zustand'
import { isMuted, playSfx, setMuted } from '../../../game/minigames/audio'
import { DIFFICULTY_LABEL, type Difficulty } from '../../../game/minigames/shared/competition'
import {
  DECALS, DECAL_BY_ID, DECAL_COLORS, DIFF, FINGERS, NAIL_H, NAIL_W, POLISH_BY_ID, PROFESSION, salonLevel, xpForLevel,
  type DecalKind,
} from '../../../game/minigames/manicure/data'
import { NAIL_PATH } from '../../../game/minigames/manicure/geometry'
import { comboMult, decalPool, type NailDesign } from '../../../game/minigames/manicure/logic'
import { TUTORIAL_STEPS, useManicureStore } from '../../../game/minigames/manicure/store'
import { getProfessionXp } from '../../../game/minigames/rewards'
import {
  Coin, DecalGlyph, FingerBase, Hand, HeartIcon, IcBottle, IcCheck, IcClock, IcClose, IcHelp, IcPause, IcRotL, IcRotR,
  IcSound, IcSpark, IcSun, IcTrash, ManiDefs, MiniNail, StarIcon, Swatch,
} from './art'
import './manicure.css'

const TUTORIAL_TEXT = [
  { title: 'Escolha o esmalte', body: 'O cartão mostra o modelo da cliente. Toque na cor certa: cor errada tira pontos. Algumas unhas têm cor de destaque.' },
  { title: 'Pinte devagar', body: 'Arraste o pincel para cobrir a unha sem passar para a pele. Traço muito rápido deixa falhas e a tinta acaba: molhe o pincel no frasco.' },
  { title: 'Detalhes e verniz', body: 'Coloque adesivos no lugar e na direção do modelo. No fim, segure para passar o verniz e solte na zona verde.' },
] as const

const STEP_NAME: Record<string, string> = { base: 'Escolha a cor', paint: 'Pintar', art: 'Detalhes', top: 'Verniz', between: 'Cliente pronta' }

export function ManicureGame({ onExit }: { onExit: () => void }) {
  const phase = useManicureStore((s) => s.phase)
  const step = useManicureStore((s) => s.step)
  const time = useManicureStore((s) => s.time)
  const score = useManicureStore((s) => s.score)
  const combo = useManicureStore((s) => s.combo)
  const diff = useManicureStore((s) => s.diff)
  const tutorial = useManicureStore((s) => s.tutorial)
  const results = useManicureStore((s) => s.results)
  const [muted, setMutedState] = useState(isMuted())

  useEffect(() => {
    useManicureStore.getState().enter()
  }, [])

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.25, (now - last) / 1000)
      last = now
      useManicureStore.getState().step_(dt)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const onHide = () => {
      if (document.hidden) useManicureStore.getState().pause()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const st = useManicureStore.getState()
      if (e.code === 'Escape') {
        if (st.tutorial !== null) onExit()
        else if (st.phase === 'playing') st.pause()
        else if (st.phase === 'paused' && st.tutorial === null) st.resume()
        return
      }
      if (e.code === 'Space' && st.phase === 'playing' && st.step === 'top' && !e.repeat) {
        e.preventDefault()
        st.holdGloss(true)
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') useManicureStore.getState().holdGloss(false)
    }
    window.addEventListener('keydown', down, true)
    window.addEventListener('keyup', up, true)
    return () => {
      window.removeEventListener('keydown', down, true)
      window.removeEventListener('keyup', up, true)
    }
  }, [])

  const cfg = DIFF[diff]
  const lowTime = time <= 15 && phase === 'playing'
  const playing = phase === 'playing' || phase === 'paused'

  return (
    <div className="mn-root" data-phase={phase} data-step={step}>
      <ManiDefs />
      <header className="mn-top">
        <button className="mn-iconbtn" aria-label="Sair" onClick={() => (playSfx('click'), onExit())}><IcClose /></button>
        <div className="mn-title"><span>Manicure Perfeita</span>{playing && <small>{STEP_NAME[step]}</small>}</div>
        <div className={`mn-chip${lowTime ? ' mn-chip--low' : ''}`} aria-label="Tempo"><IcClock />{Math.ceil(time)}s</div>
        <div className="mn-chip mn-chip--score" aria-label="Pontos"><span key={score} className="mn-bump">{score}</span><small>pts</small></div>
        <div className={`mn-combo${combo > 0 ? ' mn-combo--on' : ''}`} key={`c${combo}`}>x{comboMult(combo).toFixed(1)}<small>{combo > 0 ? `${combo} perfeitas` : 'combo'}</small></div>
        <button className="mn-iconbtn" aria-label={muted ? 'Ligar som' : 'Desligar som'} onClick={() => { setMuted(!muted); setMutedState(!muted); playSfx('click') }}><IcSound off={muted} /></button>
        <button className="mn-iconbtn" aria-label="Pausar" disabled={phase !== 'playing'} onClick={() => useManicureStore.getState().pause()}><IcPause /></button>
      </header>
      <div className="mn-timebar" aria-hidden>
        <div className={`mn-timebar-fill${lowTime ? ' mn-timebar-fill--low' : ''}`} style={{ transform: `scaleX(${Math.max(0, Math.min(1, time / cfg.seconds))})` }} />
      </div>

      {playing && <PlayArea />}

      {phase === 'intro' && <IntroCard onExit={onExit} />}
      {tutorial !== null && <TutorialCard step={tutorial} />}
      {phase === 'paused' && tutorial === null && (
        <Overlay>
          <h2>Pausado</h2>
          <p>O salão espera por você.</p>
          <div className="mn-actions">
            <button className="mn-cta" onClick={() => useManicureStore.getState().resume()}>Continuar</button>
            <button className="mn-cta mn-cta--ghost" onClick={onExit}>Sair</button>
          </div>
        </Overlay>
      )}
      {phase === 'done' && results && <ResultsCard onExit={onExit} />}
    </div>
  )
}

// ---------------------------------------------------------------- área de jogo
function PlayArea() {
  const step = useManicureStore((s) => s.step)
  return (
    <main className="mn-play">
      <DesignCard />
      <section className="mn-center">
        {step === 'base' || step === 'top' || step === 'between' ? <HandView /> : <NailStage />}
      </section>
      <section className="mn-controls">
        {step === 'base' && <BasePanel />}
        {step === 'paint' && <PaintPanel />}
        {step === 'art' && <ArtPanel />}
        {step === 'top' && <TopPanel />}
        {step === 'between' && <BetweenPanel />}
      </section>
    </main>
  )
}

function useClientPolishes() {
  const client = useManicureStore((s) => s.client)
  return (n: NailDesign) => POLISH_BY_ID[n.base === 'accent' && client.accentId ? client.accentId : client.baseId]
}

function DesignCard() {
  const client = useManicureStore((s) => s.client)
  const step = useManicureStore((s) => s.step)
  const nailIdx = useManicureStore((s) => s.nailIdx)
  const doneNails = useManicureStore((s) => s.doneNails)
  const artDone = useManicureStore((s) => s.artDone)
  const diff = useManicureStore((s) => s.diff)
  const polishFor = useClientPolishes()
  const pickable = step === 'paint' || step === 'art'
  const showNames = diff === 'facil' || diff === 'normal'
  const base = POLISH_BY_ID[client.baseId]
  return (
    <section className="mn-card-model" aria-label="Modelo da cliente">
      <div className="mn-model-head">
        <b>{client.name}</b>
        <span>Modelo{showNames ? `: ${base.name}${client.accentId ? ` e ${POLISH_BY_ID[client.accentId].name}` : ''}` : ''}</span>
      </div>
      <div className="mn-model-row">
        {client.nails.map((n, i) => {
          const done = step === 'art' ? artDone[i] : doneNails[i]
          return (
            <button
              key={i}
              className={`mn-model-nail${pickable && nailIdx === i ? ' mn-model-nail--on' : ''}`}
              disabled={!pickable}
              onClick={() => useManicureStore.getState().selectNail(i)}
              aria-label={`Unha ${FINGERS[n.finger]}${done ? ' pronta' : ''}`}
            >
              <MiniNail nail={n} polish={polishFor(n)} size={40} selected={pickable && nailIdx === i} />
              <small>{FINGERS[n.finger]}</small>
              {pickable && done && <span className="mn-tick"><IcCheck /></span>}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function HandView() {
  const client = useManicureStore((s) => s.client)
  const doneNails = useManicureStore((s) => s.doneNails)
  const step = useManicureStore((s) => s.step)
  const gloss = useManicureStore((s) => s.gloss)
  const choice = useManicureStore((s) => s.choice)
  const polishFor = useClientPolishes()
  const chosen = (n: NailDesign) => POLISH_BY_ID[(n.base === 'accent' ? choice.accent : choice.main) ?? ''] ?? null
  const shine = step === 'top' && gloss.quality !== null
  return (
    <div className={`mn-hand-wrap${shine ? ' mn-hand-wrap--shine' : ''}`}>
      <Hand
        skin={client.skin}
        nails={client.nails}
        polishFor={step === 'base' ? () => null : (n) => chosen(n) ?? polishFor(n)}
        done={step === 'base' ? client.nails.map(() => false) : client.nails.map(() => true)}
        selected={-1}
        onPick={() => undefined}
        working={doneNails}
      />
      {shine && <div className="mn-sweep" aria-hidden />}
    </div>
  )
}

// ---------------------------------------------------------------- escolha de cor
function BasePanel() {
  const client = useManicureStore((s) => s.client)
  const choice = useManicureStore((s) => s.choice)
  const diff = useManicureStore((s) => s.diff)
  const [slot, setSlot] = useState<'main' | 'accent'>('main')
  const need = client.accentId ? 2 : 1
  const ready = !!choice.main && (!client.accentId || !!choice.accent)
  const names = diff !== 'estrela'
  return (
    <div className="mn-panel">
      {need === 2 && (
        <div className="mn-seg" role="tablist">
          <button role="tab" aria-selected={slot === 'main'} className={slot === 'main' ? 'on' : ''} onClick={() => setSlot('main')}>
            Unhas {choice.main && <i style={{ background: POLISH_BY_ID[choice.main].c1 }} />}
          </button>
          <button role="tab" aria-selected={slot === 'accent'} className={slot === 'accent' ? 'on' : ''} onClick={() => setSlot('accent')}>
            Destaque {choice.accent && <i style={{ background: POLISH_BY_ID[choice.accent].c1 }} />}
          </button>
        </div>
      )}
      <div className="mn-palette">
        {client.palette.map((id) => {
          const p = POLISH_BY_ID[id]
          const on = choice[slot] === id
          return (
            <button
              key={id}
              className={`mn-pol${on ? ' mn-pol--on' : ''}`}
              aria-pressed={on}
              onClick={() => {
                useManicureStore.getState().pickColor(slot, id)
                if (slot === 'main' && need === 2 && !choice.accent) setSlot('accent')
              }}
            >
              <Swatch p={p} size={34} />
              {names && <span>{p.name}</span>}
            </button>
          )
        })}
      </div>
      <button className="mn-cta" disabled={!ready} onClick={() => useManicureStore.getState().confirmBase()}>
        {ready ? 'Começar a pintar' : need === 2 ? 'Escolha as duas cores' : 'Escolha uma cor'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------- palco da unha
function NailStage() {
  const step = useManicureStore((s) => s.step)
  const nailIdx = useManicureStore((s) => s.nailIdx)
  const diff = useManicureStore((s) => s.diff)
  const client = useManicureStore((s) => s.client)
  const placed = useManicureStore((s) => s.placed[s.nailIdx])
  const selDecal = useManicureStore((s) => s.selDecal)
  const doneNail = useManicureStore((s) => s.doneNails[s.nailIdx])
  useManicureStore((s) => s.rev)
  const cfg = DIFF[diff]
  const nail = client.nails[nailIdx]
  const tool = useToolState()
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const drag = useRef<{ kind: 'brush' } | { kind: 'decal'; i: number; dx: number; dy: number } | null>(null)
  const [cursor, setCursor] = useState<{ x: number; y: number; heat: number } | null>(null)
  const [cov, setCov] = useState(0)
  const [flash, setFlash] = useState(0)

  // desenha as camadas de tinta no canvas de exibição
  useEffect(() => {
    let raf = 0
    const ctx = canvas.current?.getContext('2d')
    const loop = () => {
      const l = useManicureStore.getState().layers[useManicureStore.getState().nailIdx]
      if (ctx && l) {
        ctx.clearRect(0, 0, NAIL_W * 2, NAIL_H * 2)
        ctx.drawImage(l.base.render(), 0, 0)
        if (l.tip) ctx.drawImage(l.tip.render(), 0, 0)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    setCov(useManicureStore.getState().layers[nailIdx]?.base.score().coverage ?? 0)
    if (doneNail) setFlash((f) => f + 0)
  }, [nailIdx, doneNail])

  const toLocal = (e: React.PointerEvent, lift = false) => {
    const r = wrap.current!.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * NAIL_W
    const k = NAIL_H / r.height
    const y = (e.clientY - r.top) * k - (lift && e.pointerType === 'touch' ? 48 * k : 0)
    return { x, y }
  }

  const activeLayer = () => {
    const l = useManicureStore.getState().layers[nailIdx]
    if (!l) return null
    if (step === 'paint') return doneNail ? null : l.base
    if (step === 'art' && tool.tool === 'tip') return l.tip
    return null
  }

  const onDown = (e: React.PointerEvent) => {
    const st = useManicureStore.getState()
    try {
      wrap.current?.setPointerCapture(e.pointerId)
    } catch {
      /* captura indisponível */
    }
    const brush = activeLayer()
    if (brush) {
      const { x, y } = toLocal(e, true)
      if (brush.ink <= 0.02) {
        playSfx('bad')
        return
      }
      brush.begin(x, y, e.timeStamp)
      drag.current = { kind: 'brush' }
      setCursor({ x, y, heat: 0 })
      return
    }
    if (step === 'art' && tool.tool === 'decal') {
      const { x, y } = toLocal(e)
      const list = st.placed[nailIdx] ?? []
      let hit = -1
      let hd = Infinity
      list.forEach((d, i) => {
        const dd = Math.hypot(d.x - x, d.y - y)
        if (dd < 26 * d.scale + 6 && dd < hd) {
          hit = i
          hd = dd
        }
      })
      if (hit >= 0) {
        st.selectDecal(hit)
        drag.current = { kind: 'decal', i: hit, dx: list[hit].x - x, dy: list[hit].y - y }
      } else if (list.length < nail.decals.length + 1) {
        const scale = tool.armedScale
        st.addDecal({ kind: tool.armed, x: Math.round(x), y: Math.round(y), rot: 0, color: tool.color, scale })
        drag.current = { kind: 'decal', i: list.length, dx: 0, dy: 0 }
      }
    }
  }

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) {
      if (e.pointerType === 'mouse' && activeLayer()) {
        const { x, y } = toLocal(e, true)
        setCursor({ x, y, heat: 0 })
      }
      return
    }
    if (d.kind === 'brush') {
      const layer = activeLayer()
      if (!layer) return
      const events = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() ?? []
      const list = events.length ? events : [e.nativeEvent as PointerEvent]
      for (const ev of list) {
        const r = wrap.current!.getBoundingClientRect()
        const k = NAIL_H / r.height
        const x = ((ev.clientX - r.left) / r.width) * NAIL_W
        const y = (ev.clientY - r.top) * k - (e.pointerType === 'touch' ? 48 * k : 0)
        layer.move(x, y, ev.timeStamp)
      }
      const { x, y } = toLocal(e, true)
      setCursor({ x, y, heat: layer.heat })
      if (layer === useManicureStore.getState().layers[nailIdx]?.base) setCov(layer.score().coverage)
    } else {
      const { x, y } = toLocal(e)
      useManicureStore.getState().patchDecal(d.i, { x: Math.round(x + d.dx), y: Math.round(y + d.dy) })
    }
  }

  const onUp = () => {
    const d = drag.current
    drag.current = null
    if (d?.kind === 'brush') {
      const layer = activeLayer()
      layer?.end()
      setCursor(null)
      if (layer && step === 'paint') {
        const sc = layer.score()
        setCov(sc.coverage)
        if (sc.coverage >= cfg.autoDone) {
          setFlash((f) => f + 1)
          useManicureStore.getState().nailPainted(nailIdx)
        }
      }
    }
  }

  const heat = cursor?.heat ?? 0
  const ringColor = heat < 0.75 ? '#ffffff' : heat < 1 ? '#f0c36a' : '#e0566a'
  const showTipGuide = step === 'art' && tool.tool === 'tip' && cfg.guides
  const hint = cfg.decalHint

  return (
    <div className="mn-stagewrap">
      <div
        ref={wrap}
        className="mn-stage"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerLeave={() => !drag.current && setCursor(null)}
      >
        <svg viewBox={`0 0 ${NAIL_W} ${NAIL_H}`} className="mn-layer" aria-hidden>
          <FingerBase skin={client.skin} />
        </svg>
        <canvas ref={canvas} width={NAIL_W * 2} height={NAIL_H * 2} className="mn-layer mn-paint" />
        <svg viewBox={`0 0 ${NAIL_W} ${NAIL_H}`} className="mn-layer" aria-label="Unha">
          <clipPath id="mn-nailclip"><path d={NAIL_PATH} /></clipPath>
          {cfg.guides && step === 'paint' && !doneNail && <path d={NAIL_PATH} fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="7 7" opacity="0.9" />}
          {showTipGuide && <path d="M 52 90 Q 120 136 188 90" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="7 7" />}
          {(doneNail || step === 'art') && <path d={NAIL_PATH} fill="url(#mp-gloss)" opacity="0.5" />}
          {step === 'art' && tool.tool === 'decal' &&
            nail.decals.map((d, i) =>
              hint === 'ghost' ? <DecalGlyph key={`g${i}`} {...d} color="#ffffff" ghost /> : hint === 'dot' ? <circle key={`g${i}`} cx={d.x} cy={d.y} r="6" fill="none" stroke="#fff" strokeWidth="2.4" strokeDasharray="3 3" /> : null,
            )}
          {step === 'art' && (placed ?? []).map((d, i) => (
            <g key={i}>
              <DecalGlyph {...d} />
              {selDecal === i && <circle cx={d.x} cy={d.y} r={26 * d.scale + 4} fill="none" stroke="#d9b35f" strokeWidth="2.4" strokeDasharray="5 4" />}
            </g>
          ))}
          {flash > 0 && <rect key={flash} className="mn-shine" x="-40" y="0" width="60" height={NAIL_H} fill="url(#mp-shine)" clipPath="url(#mn-nailclip)" />}
          {cursor && (
            <g pointerEvents="none">
              <circle cx={cursor.x} cy={cursor.y} r={cfg.brush} fill="none" stroke={ringColor} strokeWidth="2.4" />
              <circle cx={cursor.x} cy={cursor.y} r="2" fill={ringColor} />
            </g>
          )}
        </svg>
        {step === 'paint' && cfg.showCoverage && !doneNail && <div className="mn-cov">{Math.round(cov * 100)}%</div>}
        {heat > 1 && <div className="mn-warn">Devagar!</div>}
      </div>
    </div>
  )
}

// estado local compartilhado entre palco e painel de arte
interface ToolState {
  tool: 'tip' | 'decal'
  armed: DecalKind
  armedScale: number
  color: string
  set: (p: Partial<ToolState>) => void
}
const useToolStore = create<ToolState>()((set) => ({
  tool: 'decal', armed: 'pearl', armedScale: 1, color: DECAL_COLORS[0], set: (p) => set(p),
}))
function useToolState() {
  const t = useToolStore()
  const nailIdx = useManicureStore((s) => s.nailIdx)
  const nail = useManicureStore((s) => s.client.nails[s.nailIdx])
  useEffect(() => {
    const wantTip = !!nail?.tip && !useManicureStore.getState().artDone[nailIdx]
    useToolStore.setState({ tool: wantTip ? 'tip' : 'decal' })
  }, [nailIdx, nail])
  return t
}

// ---------------------------------------------------------------- painéis
function InkMeter() {
  const nailIdx = useManicureStore((s) => s.nailIdx)
  const step = useManicureStore((s) => s.step)
  const tool = useToolStore((s) => s.tool)
  const [ink, setInk] = useState(1)
  useEffect(() => {
    let raf = 0
    const loop = () => {
      const l = useManicureStore.getState().layers[nailIdx]
      const layer = step === 'art' && tool === 'tip' ? l?.tip : l?.base
      if (layer) setInk((v) => (Math.abs(v - layer.ink) > 0.01 ? layer.ink : v))
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [nailIdx, step, tool])
  const dip = () => {
    const l = useManicureStore.getState().layers[nailIdx]
    const layer = step === 'art' && tool === 'tip' ? l?.tip : l?.base
    if (!layer) return
    layer.dip()
    playSfx('tap')
    setInk(1)
  }
  return (
    <button className={`mn-dip${ink < 0.2 ? ' mn-dip--low' : ''}`} onClick={dip} aria-label="Molhar o pincel no esmalte">
      <IcBottle />
      <span className="mn-ink"><i style={{ transform: `scaleX(${ink})` }} /></span>
      <b>{ink < 0.2 ? 'Molhe o pincel!' : 'Molhar pincel'}</b>
    </button>
  )
}

function PaintPanel() {
  const nailIdx = useManicureStore((s) => s.nailIdx)
  const cleanups = useManicureStore((s) => s.cleanups)
  const doneNail = useManicureStore((s) => s.doneNails[s.nailIdx])
  const diff = useManicureStore((s) => s.diff)
  const cfg = DIFF[diff]
  return (
    <div className="mn-panel">
      <p className="mn-hint">Arraste o pincel sobre a unha{cfg.maxSpeed < 2 ? ', devagar' : ''} e sem sair da borda.</p>
      <InkMeter />
      <div className="mn-actions">
        {cfg.cleanups > 0 && (
          <button className="mn-cta mn-cta--ghost" disabled={cleanups <= 0} onClick={() => useManicureStore.getState().useCleanup()}>
            <IcTrash /> Limpar borrão ({cleanups})
          </button>
        )}
        <button className="mn-cta" disabled={doneNail} onClick={() => useManicureStore.getState().nailPainted(nailIdx)}>
          <IcCheck /> Unha pronta
        </button>
      </div>
    </div>
  )
}

function ArtPanel() {
  const nailIdx = useManicureStore((s) => s.nailIdx)
  const nail = useManicureStore((s) => s.client.nails[s.nailIdx])
  const placed = useManicureStore((s) => s.placed[s.nailIdx]) ?? []
  const selDecal = useManicureStore((s) => s.selDecal)
  const level = useManicureStore((s) => s.level)
  const t = useToolStore()
  const kinds = useMemo(() => decalPool(level), [level])
  const both = !!nail.tip && nail.decals.length > 0
  const sel = selDecal !== null ? placed[selDecal] : undefined
  const sym = (k: DecalKind) => DECAL_BY_ID[k].symmetric
  const rot = (delta: number) => {
    if (selDecal === null || !sel) return
    let r = sel.rot + delta
    if (r > 180) r -= 360
    if (r <= -180) r += 360
    useManicureStore.getState().patchDecal(selDecal, { rot: r })
    playSfx('tap')
  }
  return (
    <div className="mn-panel">
      {both && (
        <div className="mn-seg">
          <button className={t.tool === 'tip' ? 'on' : ''} onClick={() => t.set({ tool: 'tip' })}>Ponta francesa</button>
          <button className={t.tool === 'decal' ? 'on' : ''} onClick={() => t.set({ tool: 'decal' })}>Adesivos</button>
        </div>
      )}
      {t.tool === 'tip' && nail.tip ? (
        <>
          <p className="mn-hint">Pinte só a ponta da unha, seguindo o formato de sorriso.</p>
          <InkMeter />
        </>
      ) : (
        <>
          <p className="mn-hint">Toque na unha para colocar o adesivo. Arraste para ajustar e gire até ficar como no modelo.</p>
          <div className="mn-tray">
            {DECALS.filter((d) => kinds.includes(d.id)).map((d) => (
              <button key={d.id} className={`mn-decal${t.armed === d.id ? ' on' : ''}`} onClick={() => { t.set({ armed: d.id, armedScale: 1 }); playSfx('tap') }} aria-label={d.name} aria-pressed={t.armed === d.id}>
                <svg viewBox="-26 -26 52 52" width="34" height="34"><DecalGlyph kind={d.id} color={t.color} /></svg>
              </button>
            ))}
          </div>
          <div className="mn-row2">
            <div className="mn-colors">
              {DECAL_COLORS.map((c) => (
                <button
                  key={c}
                  className={`mn-dot${t.color === c ? ' on' : ''}`}
                  style={{ background: c }}
                  aria-label="Cor do adesivo"
                  onClick={() => {
                    t.set({ color: c })
                    if (selDecal !== null) useManicureStore.getState().patchDecal(selDecal, { color: c })
                  }}
                />
              ))}
              <button className={`mn-tiny${t.armedScale < 1 ? ' on' : ''}`} onClick={() => t.set({ armedScale: t.armedScale < 1 ? 1 : 0.62 })} aria-label="Adesivo pequeno" aria-pressed={t.armedScale < 1}>P</button>
            </div>
            <div className="mn-tools">
              <button className="mn-iconbtn mn-iconbtn--sm" onClick={() => rot(-15)} disabled={!sel || sym(sel.kind)} aria-label="Girar para a esquerda"><IcRotL /></button>
              <button className="mn-iconbtn mn-iconbtn--sm" onClick={() => rot(15)} disabled={!sel || sym(sel.kind)} aria-label="Girar para a direita"><IcRotR /></button>
              <button className="mn-iconbtn mn-iconbtn--sm" onClick={() => selDecal !== null && useManicureStore.getState().removeDecal(selDecal)} disabled={!sel} aria-label="Remover adesivo"><IcTrash /></button>
            </div>
          </div>
        </>
      )}
      <button className="mn-cta" onClick={() => useManicureStore.getState().finishArt(nailIdx)}><IcCheck /> Detalhes prontos</button>
    </div>
  )
}

function TopPanel() {
  const gloss = useManicureStore((s) => s.gloss)
  const diff = useManicureStore((s) => s.diff)
  const [z0, z1] = gloss.zone
  const q = gloss.quality
  const label = q === null ? null : q >= 0.95 ? 'Brilho perfeito!' : q > 0.6 ? 'Quase na zona verde' : gloss.level > 1 ? 'Passou do ponto' : 'Verniz fraquinho'
  const fillPct = Math.min(1, gloss.level) * 100
  void diff
  return (
    <div className="mn-panel">
      <p className="mn-hint">Segure para passar o verniz e solte quando o brilho chegar na faixa dourada.</p>
      <div className="mn-gloss" aria-hidden>
        <div className="mn-gloss-zone" style={{ left: `${z0 * 100}%`, width: `${(z1 - z0) * 100}%` }} />
        <div className="mn-gloss-fill" style={{ width: `${fillPct}%` }} />
        <div className="mn-gloss-mark" style={{ left: `${fillPct}%` }} />
      </div>
      <div className="mn-gloss-label">{label ?? (gloss.holding ? 'Aplicando...' : '')}</div>
      <button
        className={`mn-hold${gloss.holding ? ' on' : ''}`}
        disabled={q !== null}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); useManicureStore.getState().holdGloss(true) }}
        onPointerUp={() => useManicureStore.getState().holdGloss(false)}
        onPointerCancel={() => useManicureStore.getState().holdGloss(false)}
      >
        <IcSpark /> {q === null ? 'Segure para o verniz' : 'Secando...'}
      </button>
    </div>
  )
}

function BetweenPanel() {
  const c = useManicureStore((s) => s.lastClient)
  if (!c) return null
  return (
    <div className="mn-panel mn-between">
      <b>{c.name}</b>
      <div className="mn-hearts">{Array.from({ length: 5 }, (_, i) => <HeartIcon key={i} full={i < c.hearts} size={26} />)}</div>
      <p>{c.comment}</p>
      <div className="mn-between-pts">+{c.points} pontos{c.perfects > 0 ? ` · ${c.perfects} perfeita${c.perfects > 1 ? 's' : ''}` : ''}</div>
    </div>
  )
}

// ---------------------------------------------------------------- cartões
function Overlay({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className="mn-overlay">
      <div className={`mn-card ${className}`}>{children}</div>
    </div>
  )
}

const DIFFS: Difficulty[] = ['facil', 'normal', 'dificil', 'estrela']
const DIFF_BLURB: Record<Difficulty, string> = {
  facil: 'Mais tempo, guias e uma limpeza grátis.',
  normal: 'Equilíbrio entre guias e precisão.',
  dificil: 'Pincel fino, sem guias na unha.',
  estrela: 'Sem dicas, tempo curto e tinta contada.',
}

function IntroCard({ onExit }: { onExit: () => void }) {
  const diff = useManicureStore((s) => s.diff)
  const best = useManicureStore((s) => s.best)
  const xp = getProfessionXp(PROFESSION)
  const level = salonLevel(xp)
  const next = xpForLevel(level + 1)
  const prev = xpForLevel(level)
  const pct = level >= 10 ? 100 : Math.max(0, Math.min(100, ((xp - prev) / (next - prev)) * 100))
  return (
    <Overlay className="mn-card--intro">
      <div className="mn-intro-hand">
        <svg viewBox="0 0 120 120" width="96" height="96" aria-hidden>
          <path d={NAIL_PATH} transform="translate(18 4) scale(0.38)" fill="#7a1f33" stroke="#17141a" strokeWidth="4" />
          <path d={NAIL_PATH} transform="translate(18 4) scale(0.38)" fill="url(#mp-gloss)" opacity="0.6" />
          <g transform="translate(52 42) scale(0.5)"><DecalGlyph kind="pearl" color="#fff" /></g>
        </svg>
      </div>
      <h1>Manicure Perfeita</h1>
      <p className="mn-sub">Escolha o esmalte, pinte sem borrar, coloque os detalhes e finalize com verniz. Cada cliente traz um modelo para copiar.</p>
      <div className="mn-seg mn-seg--diff" role="tablist" aria-label="Dificuldade">
        {DIFFS.map((d) => (
          <button key={d} role="tab" aria-selected={diff === d} className={diff === d ? 'on' : ''} onClick={() => (playSfx('tap'), useManicureStore.getState().setDiff(d))}>
            {DIFFICULTY_LABEL[d]}
          </button>
        ))}
      </div>
      <div className="mn-blurb">{DIFF_BLURB[diff]} Rodada de {DIFF[diff].seconds}s.</div>
      <div className="mn-stats">
        <div><b>Nível {level}</b><small>Cabeleireira</small><div className="mn-meter"><i style={{ width: `${pct}%` }} /></div></div>
        <div><b>{best}</b><small>Melhor pontuação</small></div>
      </div>
      <div className="mn-actions">
        <button className="mn-cta" onClick={() => (playSfx('click'), useManicureStore.getState().start('free'))}>Jogar</button>
        <button className="mn-cta mn-cta--brass" onClick={() => (playSfx('click'), useManicureStore.getState().start('daily'))}><IcSun /> Desafio do dia</button>
      </div>
      <div className="mn-actions mn-actions--small">
        <button className="mn-link" onClick={() => useManicureStore.setState({ tutorial: 0 })}><IcHelp /> Como jogar</button>
        <button className="mn-link" onClick={onExit}>Sair</button>
      </div>
    </Overlay>
  )
}


function TutorialCard({ step }: { step: number }) {
  const t = TUTORIAL_TEXT[step]
  const phase = useManicureStore((s) => s.phase)
  return (
    <div className="mn-overlay mn-overlay--tut">
      <div className="mn-card mn-card--tut">
        <div className="mn-dots">{Array.from({ length: TUTORIAL_STEPS }, (_, i) => <i key={i} className={i === step ? 'on' : ''} />)}</div>
        <h3>{t.title}</h3>
        <p>{t.body}</p>
        <button
          className="mn-cta"
          onClick={() => {
            playSfx('click')
            const st = useManicureStore.getState()
            if (phase === 'intro') {
              // aberto pelo "Como jogar" na tela inicial
              if (step + 1 >= TUTORIAL_STEPS) useManicureStore.setState({ tutorial: null })
              else useManicureStore.setState({ tutorial: step + 1 })
            } else st.nextTutorial()
          }}
        >
          {step + 1 === TUTORIAL_STEPS ? 'Entendi' : 'Próximo'}
        </button>
      </div>
    </div>
  )
}

function useCountUp(target: number, ms = 900) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const f = (now: number) => {
      const k = Math.min(1, (now - t0) / ms)
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(f)
    }
    raf = requestAnimationFrame(f)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

const pctOf = (v: number) => `${Math.round(v * 100)}%`

function ResultsCard({ onExit }: { onExit: () => void }) {
  const r = useManicureStore((s) => s.results)!
  const mode = useManicureStore((s) => s.mode)
  const diff = useManicureStore((s) => s.diff)
  const score = useCountUp(r.score)
  const xp = getProfessionXp(PROFESSION)
  const lvl = salonLevel(xp)
  const pct = lvl >= 10 ? 100 : ((xp - xpForLevel(lvl)) / (xpForLevel(lvl + 1) - xpForLevel(lvl))) * 100
  const msg = ['Quase lá, a cliente voltou depois', 'Bom trabalho!', 'Que mãos incríveis!', 'Manicure perfeita!'][r.stars]
  const rows: [string, number, string][] = [
    ['Precisão', r.precision, pctOf(r.precision)],
    ['Limpeza', r.clean, pctOf(r.clean)],
    ['Fidelidade ao modelo', r.fidelity, pctOf(r.fidelity)],
    ['Brilho do verniz', r.gloss, pctOf(r.gloss)],
    ['Tempo sobrando', Math.min(1, r.timeLeft / 30), `${r.timeLeft}s`],
  ]
  return (
    <Overlay className="mn-card--results">
      <div className="mn-res-tag">{mode === 'daily' ? 'Desafio do dia' : 'Modo livre'} · {DIFFICULTY_LABEL[diff]}</div>
      <h2>{msg}</h2>
      <div className="mn-stars">
        {[0, 1, 2].map((i) => (
          <span key={i} className={i < r.stars ? 'mn-star-pop' : ''} style={{ animationDelay: `${0.25 + i * 0.28}s` }}><StarIcon on={i < r.stars} size={56} /></span>
        ))}
      </div>
      <div className="mn-big">{score}<small>pontos</small></div>
      {r.newBest ? <div className="mn-newbest">Novo recorde!</div> : <div className="mn-bestline">Recorde: {r.best}</div>}

      <div className="mn-break">
        {rows.map(([n, v, t]) => (
          <div key={n} className="mn-bar"><span>{n}</span><div><i style={{ width: `${Math.max(3, v * 100)}%` }} /></div><b>{t}</b></div>
        ))}
      </div>

      <div className="mn-rewards">
        <div className="mn-reward"><Coin size={26} /><b>+{r.coins}</b><small>Brilhos</small></div>
        <div className="mn-reward"><IcSpark /><b>+{r.xp}</b><small>XP</small></div>
        <div className="mn-reward"><IcBottle /><b>+{r.salonXp}</b><small>XP Cabeleireira</small></div>
      </div>
      <div className="mn-lvl">Cabeleireira nível {lvl}<div className="mn-meter"><i style={{ width: `${pct}%` }} /></div></div>
      {r.unlocked.length > 0 && (
        <div className="mn-unlock"><b>Novo item desbloqueado!</b><span>{r.unlocked.join(', ')}</span></div>
      )}

      <h4>Jurados</h4>
      <ul className="mn-judges">
        {r.judges.map((j) => (
          <li key={j.name}><b>{j.name}</b><em>{j.role}</em><span>{j.text}</span></li>
        ))}
      </ul>

      <h4>Clientes</h4>
      <ul className="mn-clients">
        {r.clients.map((c, i) => (
          <li key={i}><b>{c.name}</b><span className="mn-hearts">{Array.from({ length: 5 }, (_, k) => <HeartIcon key={k} full={k < c.hearts} size={14} />)}</span><em>{c.points} pts</em></li>
        ))}
      </ul>

      <h4>Ranking do dia · posição {r.rank}</h4>
      <ol className="mn-board">
        {r.board.map((e, i) => (
          <li key={i} className={e.you ? 'you' : ''}><i>{i + 1}</i><span>{e.name}</span><b>{e.score}</b></li>
        ))}
      </ol>

      <div className="mn-actions">
        <button className="mn-cta" onClick={() => (playSfx('click'), useManicureStore.getState().start(mode))}>Jogar de novo</button>
        <button className="mn-cta mn-cta--ghost" onClick={() => useManicureStore.getState().enter()}>Menu</button>
        <button className="mn-cta mn-cta--ghost" onClick={onExit}>Sair</button>
      </div>
    </Overlay>
  )
}

