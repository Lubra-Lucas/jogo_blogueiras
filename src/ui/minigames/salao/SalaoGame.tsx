import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { isMuted, playSfx, setMuted } from '../../../game/minigames/audio'
import { getProfessionXp } from '../../../game/minigames/rewards'
import { DIFFICULTY_LABEL, type Difficulty } from '../../../game/minigames/shared/competition'
import {
  ACC_NAME, DIFF, PIGMENTS, PROFESSION, SPOT_NAME, STEP_NAME, STYLE_NAME, salaoLevel, xpForLevel,
  type AccId, type Recipe, type Spot,
} from '../../../game/minigames/salao/data'
import {
  BRUSH_H, BRUSH_W, GRADE_TEXT, colorScore, comboMult, dryerScore, dryerStep, dryerZone, makePath, mixColor, newDryer,
  newTrace, traceAdd, traceCoverage, traceScore, type Dryer, type Pt, type Trace,
} from '../../../game/minigames/salao/logic'
import { TUTORIAL_STEPS, useSalaoStore, type Client } from '../../../game/minigames/salao/store'
import {
  AccIcon, HairSil, IcoBrush, IcoClose, IcoCoin, IcoDrop, IcoDryer, IcoEye, IcoPause, IcoScissors,
  IcoSound, IcoSpark, IcoStar, SalaoDefs,
} from './art'
import { Portrait, SalaoScene, type Look } from './scene'
import './salao.css'

class SceneBoundary extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false }
  static getDerivedStateFromError() {
    return { err: true }
  }
  render() {
    return this.state.err ? <div className="sl-sceneerr">Não foi possível mostrar o salão em 3D.</div> : this.props.children
  }
}

const Q = new URLSearchParams(window.location.search)
const TUTORIAL_TEXT = [
  { title: 'Veja o pedido', body: 'O cartão mostra o penteado, a cor e o acessório que a cliente quer. Em dificuldades altas ele some depois de poucos segundos: memorize!', pos: 'top' },
  { title: 'Faça cada etapa', body: 'Estilo: toque no penteado certo. Coloração: misture os pigmentos até a cor igualar. Finalização: trace a linha com a escova ou segure o secador na faixa verde.', pos: 'bottom' },
  { title: 'Rápido e preciso', body: 'A paciência da cliente acaba. Clientes perfeitos em sequência formam combo e multiplicam os pontos. Por fim, escolha o acessório e toque no lugar certo.', pos: 'bottom' },
] as const

export function SalaoGame({ onExit }: { onExit: () => void }) {
  const phase = useSalaoStore((s) => s.phase)
  const client = useSalaoStore((s) => s.client)
  const tutorial = useSalaoStore((s) => s.tutorial)
  const sparkle = useSalaoStore((s) => s.sparkle)
  const score = useSalaoStore((s) => s.score)
  const time = useSalaoStore((s) => s.time)
  const streak = useSalaoStore((s) => s.streak)
  const fx = useSalaoStore((s) => s.fx)
  const difficulty = useSalaoStore((s) => s.difficulty)
  const [muted, setMutedState] = useState(isMuted())

  useEffect(() => {
    const st = useSalaoStore.getState()
    st.enter()
    if (import.meta.env.DEV) {
      const d = Q.get('sdiff') as Difficulty | null
      if (d && d in DIFF) st.setDifficulty(d)
      const j = Q.get('sphase')
      if (j) st.devJump(j)
    }
  }, [])

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let acc = 0
    const loop = (now: number) => {
      acc += Math.min(0.25, (now - last) / 1000)
      last = now
      if (acc >= 0.05) {
        useSalaoStore.getState().step(acc)
        acc = 0
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const onHide = () => document.hidden && useSalaoStore.getState().pause()
    document.addEventListener('visibilitychange', onHide)
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return
      const st = useSalaoStore.getState()
      if (st.tutorial !== null) onExit() // Esc sempre sai, também durante o tutorial
      else if (st.phase === 'playing') st.pause()
      else if (st.phase === 'paused' && st.tutorial === null) st.resume()
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [onExit])

  const look: Look = useMemo(
    () => ({
      skin: client?.order.skin ?? '#d9a888',
      suit: client?.order.suit ?? '#2b2622',
      style: client?.style ?? 'hair.chestnutWaves',
      color: client?.hairColor ?? '#6b4a35',
      acc: client?.acc ?? null,
      accColor: client?.order.accColor ?? '#1d1b22',
    }),
    [client?.order, client?.style, client?.hairColor, client?.acc],
  )

  const mult = comboMult(streak + 1 > 1 ? streak : 0)
  const playing = phase === 'playing' || phase === 'paused'
  const hl = tutorial === 0 ? 'ref' : tutorial === 1 ? 'panel' : tutorial === 2 ? 'meter' : ''

  return (
    <div className="sl-root" data-phase={phase} data-hl={hl}>
      <SalaoDefs />
      <header className="sl-top">
        <button className="sl-iconbtn" aria-label="Sair" onClick={() => (playSfx('click'), onExit())}><IcoClose /></button>
        <div className="sl-title">Salão Express</div>
        {playing && (
          <>
            <div className={`sl-chip${time <= 15 ? ' sl-chip--low' : ''}`} aria-label="Tempo"><b>{Math.ceil(time)}</b><small>s</small></div>
            <div className="sl-chip" aria-label="Pontos"><b key={score} className="sl-bump">{score}</b><small>pts</small></div>
            <div className={`sl-combo${streak >= 1 ? ' sl-combo--on' : ''}`}>x{streak >= 2 ? comboMult(streak) : 1}<small>{streak > 0 ? `${streak} perf.` : 'combo'}</small></div>
          </>
        )}
        <button className="sl-iconbtn" aria-label={muted ? 'Ligar som' : 'Desligar som'} onClick={() => { setMuted(!muted); setMutedState(!muted); playSfx('click') }}><IcoSound on={!muted} /></button>
        {playing && <button className="sl-iconbtn" aria-label="Pausar" disabled={phase !== 'playing'} onClick={() => useSalaoStore.getState().pause()}><IcoPause /></button>}
      </header>

      <main className="sl-main">
        <section className="sl-stage">
          <SceneBoundary><SalaoScene look={look} burst={sparkle} /></SceneBoundary>
          {client && playing && (
            <>
              <ReferenceCard client={client} difficulty={difficulty} />
              <div className={`sl-patience${hl === 'meter' ? ' sl-hl' : ''}`} aria-label="Paciência da cliente">
                <span>Paciência</span>
                <div className="sl-meter"><i className={client.patience / client.patienceMax < 0.3 ? 'low' : ''} style={{ transform: `scaleX(${Math.max(0, client.patience / client.patienceMax)})` }} /></div>
              </div>
              <StepDots client={client} />
              <div className="sl-fx-layer">
                {fx.map((f) => <div key={f.id} className={`sl-fx sl-fx--${f.kind}`}>{f.text}</div>)}
              </div>
              {client.done && (
                <div className={`sl-done sl-done--${client.done.grade}`}>
                  <b>{GRADE_TEXT[client.done.grade]}</b>
                  <span>{client.done.pct}%  +{client.done.points}</span>
                  {mult > 1 && client.done.grade === 'perfeito' && <small>Combo x{comboMult(streak)}</small>}
                </div>
              )}
            </>
          )}
        </section>
        <section className={`sl-panel${hl === 'panel' ? ' sl-hl' : ''}`}>
          {playing && client && !client.done && <StepPanel client={client} difficulty={difficulty} />}
          {playing && client?.done && <div className="sl-panel-wait">Próxima cliente chegando...</div>}
        </section>
      </main>

      {phase === 'intro' && <Intro onExit={onExit} />}
      {tutorial !== null && <Tutorial step={tutorial} />}
      {phase === 'paused' && tutorial === null && (
        <Overlay>
          <h2>Pausado</h2>
          <p className="sl-sub">A cliente espera com a toalha no pescoço.</p>
          <div className="sl-actions">
            <button className="sl-cta" onClick={() => useSalaoStore.getState().resume()}>Continuar</button>
            <button className="sl-cta sl-cta--ghost" onClick={onExit}>Sair</button>
          </div>
        </Overlay>
      )}
      {phase === 'done' && <Results onExit={onExit} />}
    </div>
  )
}

// ------------------------------------------------------------------ cartão de referência
function ReferenceCard({ client, difficulty }: { client: Client; difficulty: Difficulty }) {
  const cfg = DIFF[difficulty]
  const o = client.order
  const peeking = client.elapsed < client.peekUntil
  const hidden = cfg.hideAfter > 0 && client.elapsed > cfg.hideAfter && !peeking
  const look: Look = { skin: o.skin, suit: o.suit, style: o.style, color: mixColor(o.colors[0].recipe), acc: o.acc, accColor: o.accColor }
  const hl = useSalaoStore((s) => s.tutorial) === 0
  const left = cfg.hideAfter > 0 && !hidden ? Math.max(0, cfg.hideAfter - client.elapsed) : 0
  return (
    <aside className={`sl-ref${hl ? ' sl-hl' : ''}`} aria-label="Pedido da cliente">
      <div className="sl-ref-head">Pedido</div>
      <div className="sl-ref-photo">
        <Portrait look={look} />
        {hidden && (
          <div className="sl-ref-cover">
            <IcoEye />
            <small>Memorizado</small>
            {cfg.canPeek && <button className="sl-peek" onClick={() => useSalaoStore.getState().peek()}>Espiar (-4%)</button>}
          </div>
        )}
        {left > 0 && <div className="sl-ref-timer"><i style={{ transform: `scaleX(${left / cfg.hideAfter})` }} /></div>}
      </div>
      <div className="sl-ref-sw">
        {o.colors.map((c, i) => (
          <span key={c.id} className="sl-sw" style={{ background: mixColor(c.recipe) }} title={c.name}>
            {o.colors.length > 1 && <small>{i === 0 ? 'raiz' : 'pontas'}</small>}
          </span>
        ))}
      </div>
      {!hidden && (
        <div className="sl-ref-acc">
          <AccIcon id={o.acc} size={26} color={o.accColor} />
          <span>{ACC_NAME[o.acc]}<small>{SPOT_NAME[o.spot]}</small></span>
        </div>
      )}
      {!hidden && <div className="sl-ref-style">{STYLE_NAME[o.style]}<br />{o.colors.map((c) => c.name).join(' + ')}</div>}
    </aside>
  )
}

function StepDots({ client }: { client: Client }) {
  const icons = [<IcoScissors key="a" />, <IcoDrop key="b" />, client.finish === 'brush' ? <IcoBrush key="c" /> : <IcoDryer key="c" />, <IcoSpark key="d" size={22} />]
  return (
    <div className="sl-steps" aria-label="Etapas">
      {icons.map((ic, i) => {
        const done = i < client.steps.length
        return (
          <div key={i} className={`sl-stepdot${done ? ' done' : ''}${client.step === i && !client.done ? ' on' : ''}`} title={STEP_NAME[i]}>
            {ic}
            {done && <em>{client.steps[i]}%</em>}
          </div>
        )
      })}
    </div>
  )
}

// ------------------------------------------------------------------ painel de etapas
function StepPanel({ client, difficulty }: { client: Client; difficulty: Difficulty }) {
  const title = ['Escolha o penteado', 'Misture a cor', client.finish === 'brush' ? 'Escove seguindo a linha' : 'Mantenha na faixa verde', 'Coloque o acessório'][client.step]
  return (
    <div className={`sl-step${client.shake > 0 ? ' sl-shake' : ''}`} key={`${client.index}-${client.step}`}>
      <h3 className="sl-step-title"><span>{client.step + 1}/4</span>{title}</h3>
      {client.step === 0 && <StylePanel client={client} />}
      {client.step === 1 && <ColorPanel client={client} difficulty={difficulty} />}
      {client.step === 2 && (client.finish === 'brush' ? <BrushPanel client={client} difficulty={difficulty} /> : <DryerPanel client={client} difficulty={difficulty} />)}
      {client.step === 3 && <AccPanel client={client} />}
    </div>
  )
}

function StylePanel({ client }: { client: Client }) {
  const opts = client.order.styleOptions
  return (
    <div className="sl-opts" style={{ ['--sl-skin' as string]: client.order.skin }}>
      {opts.map((id) => (
        <button key={id} className="sl-opt" onClick={() => useSalaoStore.getState().pickStyle(id)} aria-label={STYLE_NAME[id]}>
          <HairSil id={id} size={84} />
          <span>{STYLE_NAME[id]}</span>
        </button>
      ))}
    </div>
  )
}

function ColorPanel({ client, difficulty }: { client: Client; difficulty: Difficulty }) {
  const cfg = DIFF[difficulty]
  const target = mixColor(client.order.colors[client.colorStage].recipe)
  const cur = mixColor(client.mix)
  const match = colorScore(cur, target, cfg.deTol)
  const duo = client.order.colors.length > 1
  return (
    <div className="sl-color">
      <div className="sl-cmp">
        <div className="sl-cmp-sw"><i style={{ background: target }} /><small>{duo ? (client.colorStage === 0 ? 'Raiz' : 'Pontas') : 'Alvo'}</small></div>
        <div className="sl-cmp-sw sl-cmp-sw--mine"><i style={{ background: cur }} /><small>Sua mistura</small></div>
        {cfg.liveHint && <div className="sl-match"><b>{match}%</b><small>parecido</small></div>}
      </div>
      <div className="sl-sliders">
        {PIGMENTS.map((p) => (
          <label key={p.key} className="sl-slider">
            <span className="sl-pig" style={{ background: p.color }} />
            <span className="sl-slider-name">{p.name}</span>
            <input
              type="range" min={0} max={100} step={5}
              value={Math.round(client.mix[p.key as keyof Recipe] * 100)}
              onChange={(e) => useSalaoStore.getState().setPigment(p.key as keyof Recipe, Number(e.target.value) / 100)}
              style={{ ['--pig' as string]: p.color }}
              aria-label={p.name}
            />
          </label>
        ))}
      </div>
      <button className="sl-cta" onClick={() => useSalaoStore.getState().submitColor()}>{duo && client.colorStage === 0 ? 'Raiz pronta' : 'Aplicar cor'}</button>
    </div>
  )
}

// ---- escova
const capture = (e: React.PointerEvent) => {
  try {
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  } catch {
    /* ponteiro sintético */
  }
}

function BrushPanel({ client, difficulty }: { client: Client; difficulty: Difficulty }) {
  const cfg = DIFF[difficulty]
  const seed = useSalaoStore((s) => s.seed)
  const path = useMemo(() => makePath(seed, client.index, difficulty), [seed, client.index, difficulty])
  const trace = useRef<Trace>(newTrace(path))
  const [pts, setPts] = useState<Pt[]>([])
  const [cov, setCov] = useState(0)
  const [pos, setPos] = useState<Pt | null>(null)
  const drawing = useRef(false)
  const svg = useRef<SVGSVGElement>(null)
  const sent = useRef(false)

  const submit = () => {
    if (sent.current) return
    sent.current = true
    const r = traceScore(trace.current)
    useSalaoStore.getState().finishGesture(r.score)
  }
  const toPt = (e: React.PointerEvent): Pt => {
    const b = svg.current!.getBoundingClientRect()
    return { x: ((e.clientX - b.left) / b.width) * BRUSH_W, y: ((e.clientY - b.top) / b.height) * BRUSH_H }
  }
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return
    const p = toPt(e)
    traceAdd(trace.current, path, p, cfg.traceR)
    setPos(p)
    setPts((a) => (a.length > 400 ? a.slice(-400) : a).concat(p))
    const c = traceCoverage(trace.current)
    setCov(c)
    if (c >= 0.97) {
      drawing.current = false
      submit()
    }
  }
  const d = path.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  return (
    <div className="sl-brush">
      <svg
        ref={svg} viewBox={`0 0 ${BRUSH_W} ${BRUSH_H}`} className="sl-brush-svg"
        onPointerDown={(e) => { capture(e); drawing.current = true; const p = toPt(e); traceAdd(trace.current, path, p, cfg.traceR); setPos(p); setPts((a) => a.concat(p)) }}
        onPointerMove={move}
        onPointerUp={() => { drawing.current = false; setPos(null); if (traceCoverage(trace.current) >= 0.85) submit() }}
        onPointerCancel={() => { drawing.current = false }}
      >
        <defs>
          <linearGradient id="sl-strand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={client.hairColor} /><stop offset="1" stopColor={client.hairColor} stopOpacity=".55" /></linearGradient>
        </defs>
        <rect x="0" y="0" width={BRUSH_W} height={BRUSH_H} rx="5" fill="url(#sl-strand)" />
        {Array.from({ length: 14 }, (_, i) => <path key={i} d={`M${4 + i * 7.2} 0 Q${8 + i * 7.2} 32 ${3 + i * 7.2} 64`} stroke="rgba(255,255,255,.14)" strokeWidth=".8" fill="none" />)}
        <path d={d} stroke="rgba(255,255,255,.55)" strokeWidth={cfg.traceR * 2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d={d} stroke="#fff" strokeWidth="1.2" strokeDasharray="2.4 2.6" strokeLinecap="round" fill="none" />
        <circle cx={path[0].x} cy={path[0].y} r="2.6" fill="#7d8f7a" stroke="#fff" strokeWidth="1" />
        <circle cx={path[path.length - 1].x} cy={path[path.length - 1].y} r="2.6" fill="#b08d4a" stroke="#fff" strokeWidth="1" />
        {pts.length > 1 && <polyline points={pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} stroke="#2b2622" strokeOpacity=".75" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />}
        {pos && <circle cx={pos.x} cy={pos.y} r={cfg.traceR * 0.8} fill="#e3cf9a" stroke="#2b2622" strokeWidth="1" opacity=".9" />}
      </svg>
      <div className="sl-brush-foot">
        <div className="sl-meter sl-meter--sage"><i style={{ transform: `scaleX(${cov})` }} /></div>
        <button className="sl-cta sl-cta--small" onClick={submit}>Pronto</button>
      </div>
      <p className="sl-hint">Arraste do ponto verde ao dourado sem sair da faixa clara.</p>
    </div>
  )
}

// ---- secador
function DryerPanel({ client, difficulty }: { client: Client; difficulty: Difficulty }) {
  const cfg = DIFF[difficulty]
  const seed = useSalaoStore((s) => s.seed)
  const st = useRef<Dryer>(newDryer(seed + client.index * 97))
  const hold = useRef(false)
  const [view, setView] = useState({ p: 0.3, z: 0.5, t: 0 })
  const sent = useRef(false)
  const phase = useSalaoStore((s) => s.phase)

  useEffect(() => {
    const kd = (e: KeyboardEvent) => { if (e.code === 'Space') { hold.current = true; e.preventDefault() } }
    const ku = (e: KeyboardEvent) => { if (e.code === 'Space') hold.current = false }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku) }
  }, [])

  useEffect(() => {
    if (phase !== 'playing') return
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      st.current = dryerStep(st.current, dt, hold.current, cfg.dryerHalf)
      setView({ p: st.current.p, z: dryerZone(st.current), t: st.current.t })
      if (st.current.t >= cfg.dryerSeconds && !sent.current) {
        sent.current = true
        useSalaoStore.getState().finishGesture(dryerScore(st.current))
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [phase, cfg.dryerHalf, cfg.dryerSeconds])

  const inZone = Math.abs(view.p - view.z) <= cfg.dryerHalf
  return (
    <div className="sl-dryer">
      <div className="sl-gauge" aria-label="Medidor de calor">
        <div className="sl-zone" style={{ left: `${(view.z - cfg.dryerHalf) * 100}%`, width: `${cfg.dryerHalf * 200}%` }} />
        <div className={`sl-needle${inZone ? ' in' : ''}`} style={{ left: `${view.p * 100}%` }} />
        <span className="sl-g-l">Frio</span><span className="sl-g-r">Quente</span>
      </div>
      <div className="sl-meter sl-meter--sage"><i style={{ transform: `scaleX(${Math.min(1, view.t / cfg.dryerSeconds)})` }} /></div>
      <button
        className={`sl-hold${inZone ? ' in' : ''}`}
        onPointerDown={(e) => { capture(e); hold.current = true }}
        onPointerUp={() => { hold.current = false }}
        onPointerCancel={() => { hold.current = false }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <IcoDryer />
        <span>Segure para esquentar</span>
        <small>solte para esfriar (Espaço)</small>
      </button>
    </div>
  )
}

// ---- acessório
const SPOT_POS: Record<Spot, { x: number; y: number }> = { left: { x: 22, y: 30 }, right: { x: 78, y: 30 }, top: { x: 50, y: 8 } }
function AccPanel({ client }: { client: Client }) {
  const o = client.order
  return (
    <div className="sl-acc">
      <div className="sl-acc-pick">
        {o.accOptions.map((id: AccId) => (
          <button key={id} className={`sl-opt sl-opt--sm${client.accPick === id ? ' on' : ''}`} onClick={() => useSalaoStore.getState().pickAcc(id)} aria-pressed={client.accPick === id}>
            <AccIcon id={id} size={46} color={o.accColor} />
            <span>{ACC_NAME[id]}</span>
          </button>
        ))}
      </div>
      <div className={`sl-head${client.accPick ? ' ready' : ''}`} style={{ ['--sl-skin' as string]: o.skin }}>
        <svg viewBox="0 0 100 100" aria-hidden>
          <path d="M20 58C14 22 38 10 50 10s36 12 30 48c-3 18-14 30-30 30S23 76 20 58z" fill="var(--sl-skin)" />
          <path d="M16 56C10 20 34 4 50 4s40 16 34 52c-6-18-12-30-34-30S22 38 16 56z" fill={client.hairColor} />
        </svg>
        {(['left', 'top', 'right'] as Spot[]).map((s) => (
          <button key={s} className="sl-spot" style={{ left: `${SPOT_POS[s].x}%`, top: `${SPOT_POS[s].y}%` }} disabled={!client.accPick} onClick={() => useSalaoStore.getState().tapSpot(s)} aria-label={`Colocar no ${SPOT_NAME[s]}`} />
        ))}
        {!client.accPick && <small className="sl-head-hint">Escolha o acessório</small>}
        {client.accPick && <small className="sl-head-hint">Toque no lugar: {SPOT_NAME[o.spot]}</small>}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ cartões
function Overlay({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className="sl-overlay"><div className={`sl-card ${className}`}>{children}</div></div>
}

function Intro({ onExit }: { onExit: () => void }) {
  const difficulty = useSalaoStore((s) => s.difficulty)
  const daily = useSalaoStore((s) => s.daily)
  const best = useSalaoStore((s) => s.best)
  const xp = getProfessionXp(PROFESSION)
  const level = salaoLevel(xp)
  const prev = xpForLevel(level)
  const next = xpForLevel(level + 1)
  const pct = level >= 8 ? 100 : Math.max(0, Math.min(100, ((xp - prev) / (next - prev)) * 100))
  const [help, setHelp] = useState(false)
  return (
    <Overlay className="sl-card--intro">
      <div className="sl-crest"><IcoScissors /></div>
      <h1>Salão Express</h1>
      <p className="sl-sub">Corte, colora, escove e finalize antes que a paciência acabe. Rodada de {DIFF[difficulty].roundSeconds}s.</p>
      <div className="sl-diffs" role="radiogroup" aria-label="Dificuldade">
        {(Object.keys(DIFF) as Difficulty[]).map((d) => (
          <button key={d} role="radio" aria-checked={d === difficulty} className={`sl-diff${d === difficulty ? ' on' : ''}`} onClick={() => (playSfx('tap'), useSalaoStore.getState().setDifficulty(d))}>
            {DIFFICULTY_LABEL[d]}
          </button>
        ))}
      </div>
      <button className={`sl-daily${daily ? ' on' : ''}`} aria-pressed={daily} onClick={() => useSalaoStore.getState().setDaily(!daily)}>
        <i />Desafio do dia <small>{daily ? 'mesmos pedidos para todas' : 'desligado'}</small>
      </button>
      <div className="sl-stats">
        <div><b>Nível {level}</b><small>{PROFESSION}</small><div className="sl-meter"><i style={{ transform: `scaleX(${pct / 100})` }} /></div></div>
        <div><b>{best}</b><small>Melhor ({DIFFICULTY_LABEL[difficulty]})</small></div>
      </div>
      {help && (
        <ul className="sl-help">
          <li><b>Estilo:</b> toque no penteado do pedido.</li>
          <li><b>Cor:</b> misture tijolo, ocre e marinho; branco clareia, escuro escurece.</li>
          <li><b>Finalização:</b> escova (siga a linha) ou secador (fique na faixa verde).</li>
          <li><b>Acessório:</b> escolha e toque no lugar certo.</li>
        </ul>
      )}
      <div className="sl-actions">
        <button className="sl-cta" onClick={() => useSalaoStore.getState().start()}>Abrir o salão</button>
        <button className="sl-cta sl-cta--ghost" onClick={() => setHelp(!help)}>Como jogar</button>
        <button className="sl-cta sl-cta--ghost" onClick={onExit}>Sair</button>
      </div>
    </Overlay>
  )
}

function Tutorial({ step }: { step: number }) {
  const t = TUTORIAL_TEXT[step]
  return (
    <div className={`sl-dim sl-dim--${t.pos}`}>
      <div className="sl-card sl-card--tut">
        <div className="sl-dots">{Array.from({ length: TUTORIAL_STEPS }, (_, i) => <i key={i} className={i === step ? 'on' : ''} />)}</div>
        <h3>{t.title}</h3>
        <p>{t.body}</p>
        <button className="sl-cta" onClick={() => (playSfx('click'), useSalaoStore.getState().nextTutorial())}>{step + 1 === TUTORIAL_STEPS ? 'Vamos lá' : 'Próximo'}</button>
      </div>
    </div>
  )
}

function useCountUp(target: number, ms = 1000) {
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

function Results({ onExit }: { onExit: () => void }) {
  const r = useSalaoStore((s) => s.results)
  const best = useSalaoStore((s) => s.best)
  const newBest = useSalaoStore((s) => s.newBest)
  const board = useSalaoStore((s) => s.board)
  const rank = useSalaoStore((s) => s.rank)
  const unlocked = useSalaoStore((s) => s.unlockedNow)
  const levelAfter = useSalaoStore((s) => s.levelAfter)
  const difficulty = useSalaoStore((s) => s.difficulty)
  const daily = useSalaoStore((s) => s.daily)
  const score = useCountUp(r?.score ?? 0)
  if (!r) return null
  const title = ['A fila acabou antes da hora', 'Bom trabalho', 'Que atendimento', 'Mãos de ouro'][r.stars]
  return (
    <Overlay className="sl-card--results">
      <h2>{title}</h2>
      <div className="sl-stars">
        {[0, 1, 2].map((i) => <span key={i} className={i < r.stars ? 'pop' : ''} style={{ animationDelay: `${0.25 + i * 0.28}s` }}><IcoStar on={i < r.stars} /></span>)}
      </div>
      <div className="sl-big">{score}<small>pontos · {DIFFICULTY_LABEL[difficulty]}{daily ? ' · desafio do dia' : ''}</small></div>
      {newBest ? <div className="sl-newbest">Novo recorde</div> : <div className="sl-bestline">Recorde: {best}</div>}
      <div className="sl-skills">
        {r.skills.map((v, i) => (
          <div key={i} className="sl-skill">
            <span>{STEP_NAME[i]}</span>
            <div className="sl-meter sl-meter--sage"><i style={{ transform: `scaleX(${v / 100})`, transitionDelay: `${0.2 + i * 0.12}s` }} /></div>
            <b>{v}%</b>
            <em>{r.comments[i].who}: {r.comments[i].text}</em>
          </div>
        ))}
      </div>
      <div className="sl-rewards">
        <div><IcoCoin size={24} /><b>+{r.coins}</b><small>Brilhos</small></div>
        <div><IcoSpark size={22} /><b>+{r.xp}</b><small>XP</small></div>
        <div><IcoScissors /><b>+{r.profXp}</b><small>XP {PROFESSION}</small></div>
      </div>
      <div className="sl-minis">{r.clients} clientes · {r.perfect} perfeitas · melhor combo {r.bestStreak}</div>
      {unlocked.length > 0 && (
        <div className="sl-unlock">
          <b>Novo item desbloqueado</b>
          <span>{unlocked.map((u) => `${u.name} (${u.kind})`).join(', ')} — nível {levelAfter}</span>
        </div>
      )}
      {board.length > 0 && (
        <div className="sl-board">
          <h4>Ranking do dia · posição {rank}</h4>
          <ol>
            {board.slice(0, 6).map((e, i) => <li key={`${e.name}${i}`} className={e.you ? 'you' : ''}><i>{i + 1}</i><span>{e.name}</span><b>{e.score}</b></li>)}
            {rank > 6 && <li className="you"><i>{rank}</i><span>{board[rank - 1].name}</span><b>{board[rank - 1].score}</b></li>}
          </ol>
        </div>
      )}
      <div className="sl-actions">
        <button className="sl-cta" onClick={() => useSalaoStore.getState().start()}>Jogar de novo</button>
        <button className="sl-cta sl-cta--ghost" onClick={() => useSalaoStore.getState().enter()}>Mudar dificuldade</button>
        <button className="sl-cta sl-cta--ghost" onClick={onExit}>Sair</button>
      </div>

    </Overlay>
  )
}
