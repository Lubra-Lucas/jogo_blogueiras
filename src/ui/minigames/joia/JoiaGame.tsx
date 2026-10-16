import { lazy, memo, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { isMuted, playSfx, setMuted } from '../../../game/minigames/audio'
import { DIFFICULTY_LABEL, type Difficulty } from '../../../game/minigames/shared/competition'
import {
  CHARM_NAME, GEM_NAME, METAL_HEX, METAL_NAME, PATTERN_HELP, PATTERN_NAME, PEARL_NAME, PIECE_NAME, SHAPE_NAME, UNLOCKS, modelFor,
} from '../../../game/minigames/joia/data'
import {
  BOARD_H, BOARD_W, MAX_CLIENTS, buildSlots, ROUND_TIME, STAR_SCORES, clientOf, comboMult, joalheiraLevel, polishableIds,
  slotLayout, trackFn, xpForLevel,
  type Delivered, type Order, type Placed, type SlotDef, type Spec,
} from '../../../game/minigames/joia/logic'
import { PROFESSION, TUTORIAL_STEPS, useJoiaStore } from '../../../game/minigames/joia/store'
import { getProfessionXp } from '../../../game/minigames/rewards'
import {
  ClientFace, CoinIcon, IcoBrush, IcoClock, IcoClose, IcoGive, IcoHelp, IcoLock, IcoPause, IcoSound, IcoTweezers,
  Item, JoiaDefs, Silhouette, StarIcon,
} from './art'
import './joia.css'

const Showcase3D = lazy(() => import('../../../game/minigames/joia/Showcase3D').then((m) => ({ default: m.Showcase3D })))

const DIFFS: Difficulty[] = ['facil', 'normal', 'dificil', 'estrela']
const DIFF_HINT: Record<Difficulty, string> = {
  facil: 'Mais tempo, molde com as peças desenhadas e erros não entram no molde.',
  normal: 'Molde com a silhueta de cada peça.',
  dificil: 'Sem dicas no molde: siga a receita do pedido.',
  estrela: 'Sem dicas e sem receita: só o nome do padrão. Esteira mais rápida.',
}

const TUTORIAL_TEXT = [
  { title: 'Leia o pedido', body: 'A cliente pede uma peça: metal, pedra, pérola e padrão. O molde mostra onde cada componente vai, sempre simétrico.', pos: 'top' },
  { title: 'Pegue e encaixe', body: 'Arraste os componentes da esteira até o lugar certo no molde. Também dá para tocar na peça e depois no encaixe. Errou? Toque na peça errada para tirá-la.', pos: 'bottom' },
  { title: 'Polir e entregar', body: 'Três peças iguais lado a lado na esteira brilham: arraste uma para o Polir e as três somem em combo. Entregue quando quiser, rápido rende bônus.', pos: 'bottom' },
] as const

export function JoiaGame({ onExit }: { onExit: () => void }) {
  const phase = useJoiaStore((st) => st.s.phase)
  const tutorial = useJoiaStore((st) => st.tutorial)
  const results = useJoiaStore((st) => st.results)
  const [muted, setMutedState] = useState(isMuted())
  const [cursor, setCursor] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    useJoiaStore.getState().enter()
  }, [])

  // relógio por quadro
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      useJoiaStore.getState().step(dt)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const onHide = () => {
      if (document.hidden) useJoiaStore.getState().pause()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [])

  // teclado (PC): setas escolhem o encaixe, Tab/Q pega a próxima peça da esteira, Espaço encaixa
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useJoiaStore.getState()
      if (e.code === 'Escape') {
        if (st.s.phase === 'playing') st.pause()
        else if (st.s.phase === 'paused' && st.tutorial === null) st.resume()
        return
      }
      if (st.s.phase !== 'playing') return
      const n = st.s.piece.slots.length
      switch (e.code) {
        case 'ArrowLeft':
          setCursor((c) => (c + n - 1) % n)
          break
        case 'ArrowRight':
          setCursor((c) => (c + 1) % n)
          break
        case 'Tab':
        case 'KeyQ':
        case 'ArrowDown': {
          e.preventDefault()
          const sorted = [...st.s.belt].filter((b) => b.x < 98).sort((a, b) => a.x - b.x)
          if (!sorted.length) break
          const cur = st.s.hand
          // alterna: pega a mais próxima da saída que não seja a anterior
          const target = sorted[0]
          if (cur && cur.item.id === target.id) break
          st.grab(target.id)
          break
        }
        case 'Space':
        case 'Enter':
        case 'ArrowUp':
          e.preventDefault()
          if (st.s.hand) {
            setCursor((c) => {
              st.place(c)
              return c
            })
          } else if (e.code === 'Enter') st.deliver()
          break
        case 'Backspace':
        case 'Delete':
          setCursor((c) => (st.clear(c), c))
          break
        case 'KeyP':
        case 'KeyX':
          st.polish()
          break
        case 'KeyD':
          st.deliver()
          break
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  return (
    <div className="jo-root" data-phase={phase} ref={rootRef}>
      <JoiaDefs />
      <TopBar onExit={onExit} muted={muted} setMuted={(v) => (setMuted(v), setMutedState(v))} />
      <PlayArea cursor={cursor} setCursor={setCursor} rootRef={rootRef} tutorial={tutorial} />
      {phase === 'intro' && <IntroCard onExit={onExit} />}
      {tutorial !== null && <TutorialCard step={tutorial} />}
      {phase === 'paused' && tutorial === null && (
        <Overlay>
          <h2>Pausado</h2>
          <p>A bancada espera por você.</p>
          <div className="jo-actions">
            <button className="jo-cta" onClick={() => useJoiaStore.getState().resume()}>Continuar</button>
            <button className="jo-cta jo-cta--ghost" onClick={() => useJoiaStore.getState().showTutorial()}>Como jogar</button>
            <button className="jo-cta jo-cta--ghost" onClick={onExit}>Sair</button>
          </div>
        </Overlay>
      )}
      {phase === 'done' && results && <ResultsCard onExit={onExit} />}
    </div>
  )
}

// ---------------------------------------------------------------- topo
function TopBar({ onExit, muted, setMuted: setM }: { onExit: () => void; muted: boolean; setMuted: (v: boolean) => void }) {
  const time = useJoiaStore((st) => Math.ceil(Math.max(0, st.s.time)))
  const total = useJoiaStore((st) => st.s.total)
  const score = useJoiaStore((st) => st.s.score)
  const streak = useJoiaStore((st) => st.s.streak)
  const playing = useJoiaStore((st) => st.s.phase === 'playing')
  const mult = comboMult(streak)
  const low = time <= 15
  return (
    <>
      <header className="jo-top">
        <button className="jo-iconbtn" aria-label="Sair" onClick={() => (playSfx('click'), onExit())}><IcoClose /></button>
        <div className="jo-title">Joia Sob Medida</div>
        <div className={`jo-chip jo-chip--time${low ? ' jo-chip--low' : ''}`} aria-label="Tempo"><IcoClock />{time}s</div>
        <div className="jo-chip jo-chip--score" aria-label="Pontos"><span key={score} className="jo-bump">{score}</span><small>pts</small></div>
        <div className={`jo-combo${mult > 1 ? ' jo-combo--on' : ''}`}>x{mult}<small>{streak > 0 ? `${streak} seguidas` : 'combo'}</small></div>
        <button className="jo-iconbtn" aria-label={muted ? 'Ligar som' : 'Desligar som'} onClick={() => (setM(!muted), playSfx('click'))}><IcoSound off={muted} /></button>
        <button className="jo-iconbtn" aria-label="Pausar" onClick={() => useJoiaStore.getState().pause()} disabled={!playing}><IcoPause /></button>
      </header>
      <div className="jo-timebar" aria-hidden>
        <div className={`jo-timebar-fill${low ? ' jo-timebar-fill--low' : ''}`} style={{ transform: `scaleX(${Math.max(0, time / total)})` }} />
      </div>
    </>
  )
}

// ---------------------------------------------------------------- área de jogo
function PlayArea({ cursor, setCursor, rootRef, tutorial }: { cursor: number; setCursor: (n: number) => void; rootRef: React.RefObject<HTMLDivElement | null>; tutorial: number | null }) {
  const piece = useJoiaStore((st) => st.s.piece)
  const difficulty = useJoiaStore((st) => st.s.difficulty)
  const hasHand = useJoiaStore((st) => !!st.s.hand)
  const filled = useJoiaStore((st) => st.s.piece.placed.some(Boolean))
  const clientIdx = useJoiaStore((st) => st.s.clientIdx)
  const hl = (k: number) => (tutorial === k ? ' jo-hl' : '')

  const onSlot = (i: number) => {
    const st = useJoiaStore.getState()
    setCursor(i)
    if (st.s.hand) st.place(i)
    else if (st.s.piece.placed[i] && !st.s.piece.placed[i]!.ok) st.clear(i)
  }

  return (
    <main className="jo-play">
      <section className={`jo-order${hl(0)}`} aria-label="Pedido">
        <OrderCard order={piece.order} slots={piece.slots} difficulty={difficulty} clientIdx={clientIdx} />
      </section>
      <section className={`jo-boardwrap${hl(0)}`}>
        <Mold order={piece.order} slots={piece.slots} placed={piece.placed} hint={difficulty} cursor={cursor} onSlot={onSlot} armed={hasHand} />
        <Banners />
      </section>
      <section className={`jo-bench${hl(1)}${hl(2)}`}>
        <Belt rootRef={rootRef} />
        <div className="jo-tools">
          <Hand />
          <button className="jo-tool jo-tool--deliver" onClick={() => useJoiaStore.getState().deliver()} disabled={!filled} aria-label="Entregar a peça agora">
            <IcoGive /><span>Entregar</span>
          </button>
          <button className="jo-tool jo-tool--bin" data-bin onClick={() => useJoiaStore.getState().polish()} aria-label="Polir a peça na mão (ou arraste até aqui)">
            <IcoBrush /><span>Polir</span>
          </button>
        </div>
      </section>
    </main>
  )
}

function OrderCard({ order, slots, difficulty, clientIdx }: { order: Order; slots: SlotDef[]; difficulty: Difficulty; clientIdx: number }) {
  const c = clientOf(order.client)
  const gemSpec: Spec = { kind: 'gem', tone: order.gem, shape: order.shape }
  const pearlSpec: Spec = { kind: 'pearl', tone: order.pearl, shape: 'redonda' }
  return (
    <div className="jo-ordercard">
      <div className="jo-client">
        <ClientFace hair={c.hair} skin={c.skin} accent={c.accent} size={46} />
        <small>{clientIdx + 1}/{MAX_CLIENTS}</small>
      </div>
      <div className="jo-orderbody">
        <div className="jo-ordertitle">
          <b>{c.name}</b> pede {order.type === 'anel' || order.type === 'colar' ? 'um' : 'uma'} {PIECE_NAME[order.type].toLowerCase()} em
          <i className="jo-swatch" style={{ background: METAL_HEX[order.metal] }} />
          <b>{METAL_NAME[order.metal]}</b>
        </div>
        <div className="jo-chips">
          {order.pattern === 'pingente' ? (
            <span className="jo-ochip"><Item spec={{ kind: 'charm', tone: order.metal, shape: order.charm }} size={20} />Pingente {CHARM_NAME[order.charm].toLowerCase()}</span>
          ) : (
            <span className="jo-ochip"><Item spec={gemSpec} size={20} />{GEM_NAME[order.gem]} {SHAPE_NAME[order.shape]}</span>
          )}
          <span className="jo-ochip"><Item spec={pearlSpec} size={20} />{PEARL_NAME[order.pearl]}</span>
          <span className="jo-ochip jo-ochip--pat">{PATTERN_NAME[order.pattern]}</span>
        </div>
        {difficulty === 'estrela' ? (
          <div className="jo-recipe jo-recipe--txt">{PATTERN_HELP[order.pattern]}</div>
        ) : (
          <div className="jo-recipe" aria-label="Receita">
            {slots.map((s, i) => (
              <span key={i} className={s.big ? 'big' : ''}><Item spec={s.spec} size={s.big ? 22 : 17} /></span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- molde
export interface MoldProps {
  order: Order
  slots: SlotDef[]
  placed: (Placed | null)[]
  hint: Difficulty | 'none'
  cursor?: number
  onSlot?: (i: number) => void
  armed?: boolean
  compact?: boolean
}

export const Mold = memo(function Mold({ order, slots, placed, hint, cursor = -1, onSlot, armed, compact }: MoldProps) {
  const layout = useMemo(() => slotLayout(order.type, order.n), [order.type, order.n])
  const track = useMemo(() => {
    const f = trackFn(order.type)
    const pts = Array.from({ length: 61 }, (_, k) => f(k / 60))
    return 'M' + pts.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' L') + (order.closed ? 'Z' : '')
  }, [order.type, order.closed])
  return (
    <div className={`jo-board${compact ? ' jo-board--compact' : ''}${armed ? ' jo-board--armed' : ''}`}>
      <svg className="jo-track" viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} aria-hidden>
        <path d={track} fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="3.4" strokeLinejoin="round" />
        <path d={track} fill="none" stroke="#c9a85c" strokeWidth="1.5" strokeLinejoin="round" opacity="0.75" />
        <path d={track} fill="none" stroke="#f6e3b0" strokeWidth="0.4" strokeLinejoin="round" opacity="0.8" />
      </svg>
      {layout.map((p, i) => {
        const def = slots[i]
        const pl = placed[i]
        const sz = p.size * (def.big ? 1.22 : 1)
        const style: CSSProperties = { left: `${(p.x / BOARD_W) * 100}%`, top: `${(p.y / BOARD_H) * 100}%`, width: `${sz}%` }
        return (
          <button
            key={i}
            className={`jo-slot${def.big ? ' jo-slot--big' : ''}${pl ? (pl.ok ? ' jo-slot--ok' : ' jo-slot--bad') : ''}${cursor === i ? ' jo-slot--cur' : ''}`}
            style={style}
            data-slot={i}
            onClick={onSlot ? () => onSlot(i) : undefined}
            disabled={!onSlot}
            aria-label={pl ? (pl.ok ? `Encaixe ${i + 1} correto` : `Encaixe ${i + 1} errado: toque para retirar`) : `Encaixe ${i + 1} vazio`}
          >
            {pl ? (
              <span key={`${i}-${pl.ok}`} className="jo-placed"><Item spec={pl.spec} size={64} /></span>
            ) : hint === 'facil' ? (
              <span className="jo-ghost jo-ghost--full"><Item spec={def.spec} size={64} /></span>
            ) : hint === 'normal' ? (
              <span className="jo-ghost"><Silhouette spec={def.spec} size={64} /></span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
})

function Banners() {
  const fx = useJoiaStore((st) => st.s.fx)
  const last = useJoiaStore((st) => st.s.lastDelivery)
  return (
    <>
      <div className="jo-fxs">
        {fx.map((f) => (
          <div key={f.id} className={`jo-fx jo-fx--${f.kind}`}>{f.text}</div>
        ))}
      </div>
      {last && <DeliveryToast d={last} />}
    </>
  )
}

function DeliveryToast({ d }: { d: Delivered }) {
  const c = clientOf(d.order.client)
  return (
    <div className={`jo-toast${d.impecavel ? ' jo-toast--perfect' : ''}`}>
      <ClientFace hair={c.hair} skin={c.skin} accent={c.accent} size={40} />
      <div>
        <b>{d.impecavel ? 'Peça impecável!' : d.complete ? 'Peça entregue' : 'Entregue incompleta'}</b>
        <span>{c.name}: "{d.comment}"</span>
      </div>
      <em>+{d.score}</em>
    </div>
  )
}

// ---------------------------------------------------------------- esteira, mão e arrasto
function Belt({ rootRef }: { rootRef: React.RefObject<HTMLDivElement | null> }) {
  const belt = useJoiaStore((st) => st.s.belt)
  const hand = useJoiaStore((st) => st.s.hand)
  const glow = useMemo(() => polishableIds(belt), [belt])
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const drag = useRef<{ sx: number; sy: number; moved: boolean; touch: boolean } | null>(null)

  useEffect(() => {
    const target = (x: number, y: number) => {
      const root = rootRef.current
      const bin = root?.querySelector('[data-bin]')
      if (bin) {
        const r = bin.getBoundingClientRect()
        if (x >= r.left - 10 && x <= r.right + 10 && y >= r.top - 10 && y <= r.bottom + 10) return { bin: true as const }
      }
      let best = -1
      let bestD = 1e9
      root?.querySelectorAll<HTMLElement>('[data-slot]').forEach((el) => {
        const r = el.getBoundingClientRect()
        const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2))
        if (d < Math.max(30, r.width * 0.85) && d < bestD) {
          bestD = d
          best = Number(el.dataset.slot)
        }
      })
      return best >= 0 ? { slot: best } : null
    }
    const move = (e: PointerEvent) => {
      const d = drag.current
      if (!d) return
      if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 8) d.moved = true
      setPos({ x: e.clientX, y: e.clientY - (d.touch ? 36 : 0) })
    }
    const up = (e: PointerEvent) => {
      const d = drag.current
      if (!d) return
      drag.current = null
      setPos(null)
      if (!d.moved) return
      const t = target(e.clientX, e.clientY - (d.touch ? 36 : 0))
      const st = useJoiaStore.getState()
      if (t && 'bin' in t) st.polish()
      else if (t && 'slot' in t) st.place(t.slot)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [rootRef])

  const down = (e: React.PointerEvent, id: number) => {
    e.preventDefault()
    useJoiaStore.getState().grab(id)
    drag.current = { sx: e.clientX, sy: e.clientY, moved: false, touch: e.pointerType === 'touch' }
    setPos({ x: e.clientX, y: e.clientY - (e.pointerType === 'touch' ? 36 : 0) })
  }

  return (
    <div className="jo-belt" aria-label="Esteira de componentes">
      <div className="jo-belt-rail" aria-hidden />
      {belt.map((b) => (
        <button
          key={b.id}
          className={`jo-bitem${glow.has(b.id) ? ' jo-bitem--glow' : ''}`}
          style={{ left: `${b.x}%` }}
          onPointerDown={(e) => down(e, b.id)}
          aria-label={`Componente ${b.spec.kind}`}
        >
          <Item spec={b.spec} size={64} />
        </button>
      ))}
      {pos && hand && (
        <div className="jo-dragghost" style={{ left: pos.x, top: pos.y }}>
          <Item spec={hand.item.spec} size={64} />
        </div>
      )}
    </div>
  )
}

function Hand() {
  const hand = useJoiaStore((st) => st.s.hand)
  return (
    <div className={`jo-tool jo-hand${hand ? ' jo-hand--on' : ''}`} aria-label="Pinça">
      {hand ? <span className="jo-hand-item"><Item spec={hand.item.spec} size={64} /></span> : <IcoTweezers />}
      <span>{hand ? (hand.run.length >= 3 ? `Polir x${hand.run.length}` : 'Na pinça') : 'Pinça'}</span>
    </div>
  )
}

// ---------------------------------------------------------------- cartões
function Overlay({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className="jo-overlay">
      <div className={`jo-card ${className}`}>{children}</div>
    </div>
  )
}

function IntroCard({ onExit }: { onExit: () => void }) {
  const difficulty = useJoiaStore((st) => st.difficulty)
  const daily = useJoiaStore((st) => st.daily)
  const level = useJoiaStore((st) => st.s.level)
  const best = useJoiaStore((st) => st.best)
  const xp = getProfessionXp(PROFESSION)
  const next = xpForLevel(level + 1)
  const prev = xpForLevel(level)
  const pct = level >= 10 ? 100 : Math.max(0, Math.min(100, ((xp - prev) / (next - prev)) * 100))
  const upcoming = UNLOCKS.filter((u) => u.level > level).slice(0, 3)
  return (
    <Overlay className="jo-card--intro">
      <div className="jo-gemrow" aria-hidden>
        <Item spec={{ kind: 'gem', tone: 'safira', shape: 'gota' }} size={38} />
        <Item spec={{ kind: 'pearl', tone: 'branca', shape: 'redonda' }} size={34} />
        <Item spec={{ kind: 'gem', tone: 'rubi', shape: 'coracao' }} size={44} />
        <Item spec={{ kind: 'pearl', tone: 'branca', shape: 'redonda' }} size={34} />
        <Item spec={{ kind: 'gem', tone: 'esmeralda', shape: 'quadrado' }} size={38} />
      </div>
      <h1>Joia Sob Medida</h1>
      <p className="jo-sub">Monte cada encomenda no molde, seguindo o padrão e a simetria. Rodada de {ROUND_TIME[difficulty]}s, até {MAX_CLIENTS} clientes.</p>
      <div className="jo-diffs" role="radiogroup" aria-label="Dificuldade">
        {DIFFS.map((d) => (
          <button key={d} role="radio" aria-checked={d === difficulty} className={`jo-diff${d === difficulty ? ' on' : ''}`} onClick={() => (playSfx('tap'), useJoiaStore.getState().setDifficulty(d))}>
            {DIFFICULTY_LABEL[d]}
          </button>
        ))}
      </div>
      <p className="jo-diffhint">{DIFF_HINT[difficulty]}</p>
      <label className="jo-daily">
        <input type="checkbox" checked={daily} onChange={(e) => useJoiaStore.getState().setDaily(e.target.checked)} />
        <span>Desafio do dia: mesmas encomendas para todas</span>
      </label>
      <div className="jo-stats">
        <div><b>Nível {level}</b><small>Joalheira</small><div className="jo-meter"><i style={{ width: `${pct}%` }} /></div></div>
        <div><b>{best}</b><small>Recorde ({DIFFICULTY_LABEL[difficulty]})</small></div>
      </div>
      {upcoming.length > 0 && (
        <div className="jo-next">
          {upcoming.map((u) => (
            <span key={u.kind + u.id}><IcoLock />Nv {u.level}: {u.name}</span>
          ))}
        </div>
      )}
      <div className="jo-actions">
        <button className="jo-cta" onClick={() => (playSfx('click'), useJoiaStore.getState().start())}>Começar</button>
        <button className="jo-cta jo-cta--ghost" onClick={() => useJoiaStore.getState().showTutorial()}><IcoHelp />Como jogar</button>
        <button className="jo-cta jo-cta--ghost" onClick={onExit}>Sair</button>
      </div>
      <div className="jo-keys">PC: setas escolhem o encaixe, Q pega a peça, Espaço encaixa, P polir, D entrega.</div>
    </Overlay>
  )
}

function TutorialCard({ step }: { step: number }) {
  const t = TUTORIAL_TEXT[step]
  return (
    <div className={`jo-dim jo-dim--${t.pos}`}>
      <div className="jo-card jo-card--tut">
        <div className="jo-dots">
          {Array.from({ length: TUTORIAL_STEPS }, (_, i) => (
            <i key={i} className={i === step ? 'on' : ''} />
          ))}
        </div>
        <h3>{t.title}</h3>
        <p>{t.body}</p>
        <button className="jo-cta" onClick={() => (playSfx('click'), useJoiaStore.getState().nextTutorial())}>
          {step + 1 === TUTORIAL_STEPS ? 'Vamos lá!' : 'Próximo'}
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

const pctText = (v: number) => `${Math.round(v * 100)}%`

function Bar({ label, v }: { label: string; v: number }) {
  return (
    <div className="jo-bar">
      <span>{label}</span>
      <div className="jo-bar-track"><i style={{ width: `${Math.round(v * 100)}%` }} /></div>
      <b>{pctText(v)}</b>
    </div>
  )
}

function ResultsCard({ onExit }: { onExit: () => void }) {
  const r = useJoiaStore((st) => st.results)!
  const best = useJoiaStore((st) => st.best)
  const newBest = useJoiaStore((st) => st.newBest)
  const unlocked = useJoiaStore((st) => st.unlockedNow)
  const board = useJoiaStore((st) => st.board)
  const rank = useJoiaStore((st) => st.rank)
  const daily = useJoiaStore((st) => st.daily)
  const [sel, setSel] = useState(() => r.pieces.reduce((b, p, i, a) => (p.score > a[b].score ? i : b), 0))
  const score = useCountUp(r.score)
  const coins = useCountUp(r.coins, 1100)
  const xp = getProfessionXp(PROFESSION)
  const lvl = joalheiraLevel(xp)
  const pct = lvl >= 10 ? 100 : ((xp - xpForLevel(lvl)) / (xpForLevel(lvl + 1) - xpForLevel(lvl))) * 100
  const msg = ['A bancada precisa de mais treino.', 'Bom trabalho, joalheira!', 'Peças de vitrine!', 'Mestre joalheira!'][r.stars]
  const d = r.pieces[Math.min(sel, r.pieces.length - 1)]
  return (
    <Overlay className="jo-card--results">
      <h2>{msg}</h2>
      <div className="jo-stars">
        {[0, 1, 2].map((i) => (
          <span key={i} className={i < r.stars ? 'jo-star-pop' : ''} style={{ animationDelay: `${0.25 + i * 0.28}s` }}>
            <StarIcon on={i < r.stars} />
          </span>
        ))}
      </div>
      <div className="jo-big">{score}<small>pontos{daily ? ' · desafio do dia' : ''}</small></div>
      {newBest ? <div className="jo-newbest">Novo recorde!</div> : <div className="jo-bestline">Recorde: {best}</div>}

      {d ? (
        <div className="jo-showcase">
          <div className="jo-stage">
            <Suspense fallback={<div className="jo-stage-load">Preparando a vitrine…</div>}>
              <Showcase3D model={modelFor(d.order.type, d.order.pattern, d.order.shape)} type={d.order.type} metal={d.order.metal} gem={d.order.gem} pearl={d.order.pearl} />
            </Suspense>
            {d.impecavel && <div className="jo-seal">Peça impecável</div>}
          </div>
          {r.pieces.length > 1 && (
            <div className="jo-tabs" role="tablist">
              {r.pieces.map((p, i) => (
                <button key={i} role="tab" aria-selected={i === sel} className={i === sel ? 'on' : ''} onClick={() => setSel(i)}>
                  {PIECE_NAME[p.order.type]}
                </button>
              ))}
            </div>
          )}
          <PieceDetail d={d} />
        </div>
      ) : (
        <p className="jo-sub">Nenhuma peça foi entregue desta vez.</p>
      )}

      <div className="jo-breakdown">
        <div className="jo-subtitle">Média da rodada</div>
        <Bar label="Fidelidade ao pedido" v={r.fidelity} />
        <Bar label="Simetria" v={r.symmetry} />
        <Bar label="Tempo" v={r.tempo} />
        <Bar label="Qualidade" v={r.quality} />
      </div>

      <div className="jo-rewards">
        <div className="jo-reward"><CoinIcon size={26} /><b>+{coins}</b><small>Brilhos</small></div>
        <div className="jo-reward"><b>+{r.xp}</b><small>XP</small></div>
        <div className="jo-reward"><b>+{r.joiaXp}</b><small>XP Joalheira</small></div>
      </div>
      <div className="jo-lvl">
        Joalheira nível {lvl}
        <div className="jo-meter"><i style={{ width: `${pct}%` }} /></div>
      </div>
      <div className="jo-mini">
        {r.pieces.length} peças · {r.impecaveis} impecáveis · melhor combo {r.bestStreak} · {r.polished} {r.polished === 1 ? 'polimento' : 'polimentos'}
      </div>
      {unlocked.length > 0 && (
        <div className="jo-unlock">
          <b>Novo item desbloqueado!</b>
          <span>{unlocked.join(', ')}</span>
        </div>
      )}

      <div className="jo-board-rank">
        <div className="jo-subtitle">Ranking do dia · você em {rank}º</div>
        {board.map((e, i) => (
          <div key={i} className={`jo-rank${e.you ? ' you' : ''}`}>
            <span>{i + 1}</span>
            <em>{e.name}</em>
            <b>{e.score}</b>
          </div>
        ))}
      </div>

      <div className="jo-actions">
        <button className="jo-cta" onClick={() => (playSfx('click'), useJoiaStore.getState().start())}>Jogar de novo</button>
        <button className="jo-cta jo-cta--ghost" onClick={() => useJoiaStore.getState().enter()}>Mudar dificuldade</button>
        <button className="jo-cta jo-cta--ghost" onClick={onExit}>Sair</button>
      </div>
      <div className="jo-hint">Estrelas: {STAR_SCORES.join(' / ')} pontos</div>
    </Overlay>
  )
}

function PieceDetail({ d }: { d: Delivered }) {
  const c = clientOf(d.order.client)
  const slots = useMemo(() => buildSlots(d.order), [d.order])
  const placed: (Placed | null)[] = d.specs.map((s, i) => (s ? { spec: s, ok: d.oks[i] } : null))
  return (
    <div className="jo-detail">
      <div className="jo-detail-mold">
        <Mold order={d.order} slots={slots} placed={placed} hint="dificil" compact />
      </div>
      <div className="jo-detail-info">
        <div className="jo-comment">
          <ClientFace hair={c.hair} skin={c.skin} accent={c.accent} size={34} />
          <div><b>{c.name}</b><span>"{d.comment}"</span></div>
        </div>
        <Bar label="Fidelidade" v={d.fidelity} />
        <Bar label="Simetria" v={d.symmetry} />
        <Bar label="Tempo" v={d.tempo} />
        <Bar label="Qualidade" v={d.quality} />
        <div className="jo-piecescore">+{d.score} pontos</div>
      </div>
    </div>
  )
}

export default JoiaGame
