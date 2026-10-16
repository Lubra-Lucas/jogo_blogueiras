import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { isMuted, playSfx, setMuted } from '../../../game/minigames/audio'
import {
  BASES, BASE_NAME, SIZES, SIZE_NAME, SWEETS, SWEET_NAME, TOPPINGS, TOPPING_NAME, UNLOCKS,
  type Topping,
} from '../../../game/minigames/cafe/data'
import {
  HEARTS, ROUND_SECONDS, STAR_SCORES, baristaLevel, comboMultiplier, heartsOf, xpForLevel,
  type Customer, type Ingredient,
} from '../../../game/minigames/cafe/logic'
import { TUTORIAL_STEPS, useCafeStore } from '../../../game/minigames/cafe/store'
import { getProfessionXp } from '../../../game/minigames/rewards'
import { BaseIcon, CafeDefs, Coin, Cup, Face, Heart, SizeIcon, Star, SweetIcon, ToppingIcon } from './art'
import './cafe.css'

const TUTORIAL_TEXT = [
  { title: 'Veja o pedido', body: 'Cada cliente chega com um balão mostrando o que quer: tamanho, bebida, coberturas e talvez um docinho.', pos: 'bottom' },
  { title: 'Monte o copo', body: 'Toque no tamanho, na bebida e nas coberturas. Toque de novo numa cobertura para tirar. A lixeira recomeça o copo.', pos: 'top' },
  { title: 'Sirva rápido!', body: 'Toque no cliente para entregar. Rápido rende gorjeta e combos multiplicam os pontos. Pedido errado faz o cliente ir embora.', pos: 'bottom' },
] as const

export function CafeGame({ onExit }: { onExit: () => void }) {
  const s = useCafeStore((st) => st.s)
  const tutorial = useCafeStore((st) => st.tutorial)
  const results = useCafeStore((st) => st.results)
  const [muted, setMutedState] = useState(isMuted())

  useEffect(() => {
    useCafeStore.getState().enter()
  }, [])

  // relogio: rAF acumulando dt; o estado so e publicado a cada ~70 ms
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let acc = 0
    const loop = (now: number) => {
      acc += Math.min(0.25, (now - last) / 1000)
      last = now
      if (acc >= 0.07) {
        useCafeStore.getState().step(acc)
        acc = 0
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  // pausa ao perder o foco
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) useCafeStore.getState().pause()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [])

  // atalhos de teclado (opcionais)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useCafeStore.getState()
      if (e.code === 'Escape') {
        if (st.s.phase === 'playing') st.pause()
        else if (st.s.phase === 'paused' && st.tutorial === null) st.resume()
        return
      }
      if (st.s.phase !== 'playing') return
      if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3') st.serve(Number(e.code.slice(5)) - 1)
      else if (e.code === 'Backspace' || e.code === 'KeyX') st.trash()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  const ing = (i: Ingredient) => useCafeStore.getState().ingredient(i)
  const mult = comboMultiplier(s.streak)
  const lowTime = s.time <= 15
  const tray = s.tray
  const canServe = !!(tray.size && tray.base)
  const hlCounter = tutorial === 0 || tutorial === 2 ? ' cf-hl' : ''
  const hlTray = tutorial === 1 || tutorial === 2 ? ' cf-hl' : ''
  const hlShelves = tutorial === 1 ? ' cf-hl' : ''

  return (
    <div className="cf-root" data-phase={s.phase}>
      <CafeDefs />
      <header className="cf-top">
        <button className="cf-iconbtn" aria-label="Sair" onClick={() => (playSfx('click'), onExit())}>
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
        </button>
        <div className="cf-title">Café Rosé</div>
        <div className={`cf-chip cf-chip--time${lowTime ? ' cf-chip--low' : ''}`} aria-label="Tempo">
          <span className="cf-chip-ico">⏱</span>
          {Math.ceil(s.time)}s
        </div>
        <div className="cf-chip cf-chip--score" aria-label="Pontos">
          <span key={s.score} className="cf-bump">{s.score}</span>
          <small>pts</small>
        </div>
        <div className={`cf-combo${mult > 1 ? ' cf-combo--on' : ''}`} key={`c${mult}`}>
          {mult > 1 ? `x${mult}` : `x1`}
          <small>{s.streak > 0 ? `${s.streak} seguidos` : 'combo'}</small>
        </div>
        <button
          className="cf-iconbtn"
          aria-label={muted ? 'Ligar som' : 'Desligar som'}
          onClick={() => {
            setMuted(!muted)
            setMutedState(!muted)
            playSfx('click')
          }}
        >
          {muted ? '🔇' : '🔊'}
        </button>
        <button className="cf-iconbtn" aria-label="Pausar" onClick={() => useCafeStore.getState().pause()} disabled={s.phase !== 'playing'}>
          <svg viewBox="0 0 24 24" width="20" height="20"><rect x="6" y="5" width="4.2" height="14" rx="1.6" fill="currentColor" /><rect x="13.8" y="5" width="4.2" height="14" rx="1.6" fill="currentColor" /></svg>
        </button>
      </header>
      <div className="cf-timebar" aria-hidden>
        <div className={`cf-timebar-fill${lowTime ? ' cf-timebar-fill--low' : ''}`} style={{ transform: `scaleX(${Math.max(0, s.time / ROUND_SECONDS)})` }} />
      </div>

      <section className={`cf-counter${hlCounter}`} aria-label="Balcão">
        {s.customers.map((c, i) => (
          <Spot key={i} slot={i} customer={c} ready={canServe} />
        ))}
        {s.fx.filter((f) => f.slot === -1).map((f) => (
          <div key={f.id} className="cf-banner">{f.text}</div>
        ))}
      </section>

      <section className="cf-prep">
        <div className={`cf-tray${hlTray}`}>
          <Cup tray={tray} />
          <div className="cf-tray-info">
            {tray.size ? SIZE_NAME[tray.size] : 'Copo'} {tray.base ? `de ${BASE_NAME[tray.base]}` : 'vazio'}
          </div>
          <button className="cf-trash" onClick={() => useCafeStore.getState().trash()} aria-label="Lixeira: recomeçar o copo">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
              <path d="M5 7 H19 M9 7 V4.5 H15 V7 M7 7 L8 20 H16 L17 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Lixeira</span>
          </button>
        </div>

        <div className={`cf-shelves${hlShelves}`}>
          <Row label="Tamanho">
            {SIZES.map((id) => (
              <IngBtn key={id} tone="blue" on={tray.size === id} name={SIZE_NAME[id]} onPress={() => ing({ kind: 'size', id })} icon={<SizeIcon id={id} />} />
            ))}
          </Row>
          <Row label="Bebida">
            {BASES.map((id) => (
              <IngBtn key={id} tone="mint" on={tray.base === id} name={BASE_NAME[id]} locked={lockLevel('base', id, s.unlocked.bases)} onPress={() => ing({ kind: 'base', id })} icon={<BaseIcon id={id} />} />
            ))}
          </Row>
          <Row label="Coberturas">
            {TOPPINGS.map((id) => (
              <IngBtn key={id} tone="butter" on={tray.toppings.includes(id)} name={shortTop(id)} locked={lockLevel('topping', id, s.unlocked.toppings)} onPress={() => ing({ kind: 'topping', id })} icon={<ToppingIcon id={id} />} />
            ))}
          </Row>
          <Row label="Docinhos">
            {SWEETS.map((id) => (
              <IngBtn key={id} tone="lilac" on={tray.sweet === id} name={SWEET_NAME[id]} locked={lockLevel('sweet', id, s.unlocked.sweets)} onPress={() => ing({ kind: 'sweet', id })} icon={<SweetIcon id={id} />} />
            ))}
          </Row>
        </div>
      </section>

      {s.phase === 'intro' && <IntroCard onExit={onExit} />}
      {tutorial !== null && <TutorialCard step={tutorial} />}
      {s.phase === 'paused' && tutorial === null && (
        <Overlay>
          <h2>Pausado</h2>
          <p>O café espera por você!</p>
          <div className="cf-actions">
            <button className="cf-cta" onClick={() => useCafeStore.getState().resume()}>Continuar</button>
            <button className="cf-cta cf-cta--ghost" onClick={onExit}>Sair</button>
          </div>
        </Overlay>
      )}
      {s.phase === 'done' && results && <ResultsCard onExit={onExit} />}
    </div>
  )
}

const shortTop = (id: Topping) => (id === 'caramelo' ? 'Caramelo' : TOPPING_NAME[id])

function lockLevel(kind: 'base' | 'topping' | 'sweet', id: string, unlocked: readonly string[]): number {
  if (unlocked.includes(id)) return 0
  return UNLOCKS.find((u) => u.kind === kind && u.id === id)?.level ?? 99
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="cf-row">
      <div className="cf-row-label">{label}</div>
      <div className="cf-row-btns">{children}</div>
    </div>
  )
}

function IngBtn({ icon, name, on, tone, locked = 0, onPress }: { icon: ReactNode; name: string; on: boolean; tone: string; locked?: number; onPress: () => void }) {
  return (
    <button
      className={`cf-ing cf-ing--${tone}${on ? ' cf-ing--on' : ''}${locked ? ' cf-ing--locked' : ''}`}
      onClick={locked ? undefined : onPress}
      aria-pressed={on}
      aria-disabled={locked > 0}
      aria-label={locked ? `${name} (bloqueado: nível ${locked})` : name}
    >
      <span className="cf-ing-ico">{icon}</span>
      <span className="cf-ing-name">{locked ? `Nv ${locked}` : name}</span>
      {locked > 0 && <span className="cf-lock">🔒</span>}
      {on && <span className="cf-check">✓</span>}
    </button>
  )
}

function OrderBubble({ c }: { c: Customer }) {
  const o = c.order
  return (
    <div className="cf-bubble">
      <div className="cf-bubble-row">
        <span className="cf-ico cf-ico--size" title={SIZE_NAME[o.size]}><SizeIcon id={o.size} /></span>
        <span className="cf-ico" title={BASE_NAME[o.base]}><BaseIcon id={o.base} /></span>
        {o.toppings.map((t) => (
          <span key={t} className="cf-ico" title={TOPPING_NAME[t]}><ToppingIcon id={t} /></span>
        ))}
        {o.sweet && <span className="cf-ico" title={SWEET_NAME[o.sweet]}><SweetIcon id={o.sweet} /></span>}
      </div>
    </div>
  )
}

function Spot({ slot, customer: c, ready }: { slot: number; customer: Customer | null; ready: boolean }) {
  const fx = useCafeStore((st) => st.s.fx)
  const mine = fx.filter((f) => f.slot === slot)
  const hearts = c ? heartsOf(c) : 0
  const mood = c?.leaving ? c.leaving.mood : hearts <= 1 ? 'angry' : 'waiting'
  return (
    <button
      className={`cf-spot${c && !c.leaving && ready ? ' cf-spot--ready' : ''}`}
      disabled={!c || !!c.leaving}
      onClick={() => useCafeStore.getState().serve(slot)}
      aria-label={c ? `Servir cliente ${slot + 1}` : `Balcão ${slot + 1} vazio`}
    >
      <span className="cf-key">{slot + 1}</span>
      {c ? (
        <div key={c.id} className={`cf-cust${c.leaving ? ` cf-cust--${c.leaving.mood}` : ''}`}>
          {!c.leaving && <OrderBubble c={c} />}
          {c.leaving?.mood === 'happy' && <div className="cf-emote">💖</div>}
          {c.leaving?.mood === 'angry' && <div className="cf-emote">💢</div>}
          <Face look={c.look} mood={mood} />
          <div className="cf-hearts">
            {Array.from({ length: HEARTS }, (_, i) => (
              <Heart key={i} full={i < hearts} size={16} />
            ))}
          </div>
        </div>
      ) : (
        <div className="cf-empty">
          <span>☕</span>
        </div>
      )}
      {mine.map((f) => (
        <span key={f.id} className={`cf-fx cf-fx--${f.kind}`}>{f.text}</span>
      ))}
    </button>
  )
}

// ---------------------------------------------------------------- cartoes
function Overlay({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className="cf-overlay">
      <div className={`cf-card ${className}`}>{children}</div>
    </div>
  )
}

function IntroCard({ onExit }: { onExit: () => void }) {
  const level = useCafeStore((st) => st.s.level)
  const best = useCafeStore((st) => st.best)
  const xp = getProfessionXp('Barista')
  const next = xpForLevel(level + 1)
  const prev = xpForLevel(level)
  const pct = level >= 10 ? 100 : Math.max(0, Math.min(100, ((xp - prev) / (next - prev)) * 100))
  return (
    <Overlay className="cf-card--intro">
      <div className="cf-cup-mini"><Cup tray={{ size: 'G', base: 'milkshake', toppings: ['chantilly', 'morango'], sweet: null }} steam={false} /></div>
      <h1>Café Rosé</h1>
      <p className="cf-sub">Anote, prepare e sirva os pedidos antes que a paciência acabe. Rodada de {ROUND_SECONDS}s.</p>
      <div className="cf-stats">
        <div><b>Nível {level}</b><small>Barista</small><div className="cf-meter"><i style={{ width: `${pct}%` }} /></div></div>
        <div><b>{best}</b><small>Melhor pontuação</small></div>
      </div>
      <div className="cf-actions">
        <button className="cf-cta" onClick={() => (playSfx('click'), useCafeStore.getState().start())}>Começar</button>
        <button className="cf-cta cf-cta--ghost" onClick={onExit}>Sair</button>
      </div>
    </Overlay>
  )
}

function TutorialCard({ step }: { step: number }) {
  const t = TUTORIAL_TEXT[step]
  return (
    <div className={`cf-dim cf-dim--${t.pos}`}>
      <div className="cf-card cf-card--tut">
        <div className="cf-dots">
          {Array.from({ length: TUTORIAL_STEPS }, (_, i) => (
            <i key={i} className={i === step ? 'on' : ''} />
          ))}
        </div>
        <h3>{t.title}</h3>
        <p>{t.body}</p>
        <button className="cf-cta" onClick={() => (playSfx('click'), useCafeStore.getState().nextTutorial())}>
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

function ResultsCard({ onExit }: { onExit: () => void }) {
  const r = useCafeStore((st) => st.results)!
  const best = useCafeStore((st) => st.best)
  const newBest = useCafeStore((st) => st.newBest)
  const unlocked = useCafeStore((st) => st.unlockedNow)
  const levelAfter = useCafeStore((st) => st.levelAfter)
  const score = useCountUp(r.score)
  const coins = useCountUp(r.coins, 1100)
  const xp = getProfessionXp('Barista')
  const lvl = baristaLevel(xp)
  const pct = lvl >= 10 ? 100 : ((xp - xpForLevel(lvl)) / (xpForLevel(lvl + 1) - xpForLevel(lvl))) * 100
  const msg = useMemo(() => ['Hmm, o café esfriou...', 'Bom trabalho!', 'Que atendimento!', 'Barista perfeita!'][r.stars], [r.stars])
  return (
    <Overlay className="cf-card--results">
      <h2>{msg}</h2>
      <div className="cf-stars">
        {[0, 1, 2].map((i) => (
          <span key={i} className={i < r.stars ? 'cf-star-pop' : ''} style={{ animationDelay: `${0.25 + i * 0.28}s` }}>
            <Star on={i < r.stars} size={58} />
          </span>
        ))}
      </div>
      <div className="cf-big">{score}<small>pontos</small></div>
      {newBest ? <div className="cf-newbest">Novo recorde!</div> : <div className="cf-bestline">Recorde: {best}</div>}
      <div className="cf-rewards">
        <div className="cf-reward"><Coin size={26} /><b>+{coins}</b><small>Brilhos</small></div>
        <div className="cf-reward"><span className="cf-rw-ico">✨</span><b>+{r.xp}</b><small>XP</small></div>
        <div className="cf-reward"><span className="cf-rw-ico">☕</span><b>+{r.baristaXp}</b><small>XP Barista</small></div>
      </div>
      <div className="cf-lvl">
        Barista nível {lvl}
        <div className="cf-meter"><i style={{ width: `${pct}%` }} /></div>
      </div>
      <div className="cf-mini-stats">
        {r.served} servidos · {r.failed} perdidos · melhor combo {r.bestStreak} · gorjetas {r.tips}
      </div>
      {unlocked.length > 0 && (
        <div className="cf-unlock">
          <b>Novo ingrediente desbloqueado!</b>
          <span>{unlocked.join(', ')}{levelAfter ? ` (nível ${levelAfter})` : ''}</span>
        </div>
      )}
      <div className="cf-actions">
        <button className="cf-cta" onClick={() => (playSfx('click'), useCafeStore.getState().start())}>Jogar de novo</button>
        <button className="cf-cta cf-cta--ghost" onClick={onExit}>Sair</button>
      </div>
      <div className="cf-hint">Estrelas: {STAR_SCORES.join(' / ')} pontos</div>
    </Overlay>
  )
}
