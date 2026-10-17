import { useEffect, useState, type ReactNode } from 'react'
import { playSfx } from '../../../game/minigames/audio'
import { DIFFICULTY_LABEL, type Difficulty, type Entry } from '../../../game/minigames/shared/competition'
import './kit.css'

export const DIFFS: Difficulty[] = ['facil', 'normal', 'dificil', 'estrela']

// ---------------------------------------------------------------- ícones (traço único, 24x24)
const svg = (d: ReactNode, size = 22) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
)
export const IcoClose = () => svg(<path d="M6 6l12 12M18 6L6 18" />)
export const IcoPause = () => svg(<path d="M8 5v14M16 5v14" />)
export const IcoHelp = () => svg(<><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4M12 16.6v.1" /></>)
export const IcoClock = () => svg(<><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9.5 3h5" /></>, 18)
export const IcoContrast = () => svg(<><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17" /><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" /></>)
export const IcoSound = ({ off }: { off?: boolean }) =>
  svg(off ? <><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M16 9.5l5 5M21 9.5l-5 5" /></> : <><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" /></>)
export const IcoBulb = () => svg(<><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2v.1h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" /></>)
export const IcoSearch = () => svg(<><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></>)
export const IcoCards = () => svg(<><rect x="3.5" y="5" width="10" height="14" rx="2" /><path d="M16 7.5l4 1.2-3 10.5-3-.9" /></>)
export const IcoEye = () => svg(<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>)
export function StarIcon({ on, size = 44 }: { on: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <defs>
        <linearGradient id="nj-star-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f7e8bd" /><stop offset="1" stopColor="#b58f45" /></linearGradient>
      </defs>
      <path d="M12 2.8l2.7 5.7 6.2.8-4.5 4.3 1.1 6.2L12 16.8 6.5 19.8l1.1-6.2L3.1 9.3l6.2-.8z" fill={on ? 'url(#nj-star-g)' : 'rgba(255,255,255,0.1)'} stroke={on ? '#f7e8bd' : 'rgba(255,255,255,0.25)'} strokeWidth="1" strokeLinejoin="round" />
    </svg>
  )
}
export const CoinIcon = ({ size = 22 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
    <circle cx="12" cy="12" r="9.5" fill="#d4b06a" stroke="#8a6a2b" strokeWidth="1.2" />
    <circle cx="12" cy="12" r="6.6" fill="none" stroke="#f7e8bd" strokeWidth="1" />
    <path d="M12 7.5l1.2 3 3.1.2-2.4 2 .8 3-2.7-1.7-2.7 1.7.8-3-2.4-2 3.1-.2z" fill="#f7e8bd" />
  </svg>
)

// ---------------------------------------------------------------- estrutura
export function TopBar(p: {
  title: string
  time: number
  total: number
  score: number
  playing: boolean
  muted: boolean
  onExit: () => void
  onMute: () => void
  onPause: () => void
  contrast?: boolean
  onContrast?: () => void
  low?: number
  extra?: ReactNode
}) {
  const t = Math.ceil(Math.max(0, p.time))
  const low = t <= (p.low ?? 15) && p.playing
  return (
    <>
      <header className="nj-top">
        <button className="nj-iconbtn" aria-label="Sair" onClick={() => (playSfx('click'), p.onExit())}><IcoClose /></button>
        <div className="nj-title">{p.title}</div>
        <div className={`nj-chip${low ? ' nj-chip--low' : ''}`} aria-label={`Tempo: ${t} segundos`}><IcoClock />{t}s</div>
        <div className="nj-chip" aria-label={`Pontos: ${p.score}`}><span key={p.score} className="nj-bump">{p.score}</span><small>pts</small></div>
        {p.extra}
        {p.onContrast && (
          <button className="nj-iconbtn" aria-label="Alto contraste" aria-pressed={!!p.contrast} onClick={p.onContrast}><IcoContrast /></button>
        )}
        <button className="nj-iconbtn" aria-label={p.muted ? 'Ligar som' : 'Desligar som'} onClick={p.onMute}><IcoSound off={p.muted} /></button>
        <button className="nj-iconbtn" aria-label="Pausar" onClick={p.onPause} disabled={!p.playing}><IcoPause /></button>
      </header>
      <div className="nj-timebar" aria-hidden>
        <i className={low ? 'low' : ''} style={{ transform: `scaleX(${Math.max(0, Math.min(1, p.time / p.total))})` }} />
      </div>
    </>
  )
}

export function Overlay({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className="nj-overlay">
      <div className={`nj-card ${className}`}>{children}</div>
    </div>
  )
}

export function DiffPicker({ value, onChange, hints }: { value: Difficulty; onChange: (d: Difficulty) => void; hints: Record<Difficulty, string> }) {
  return (
    <>
      <div className="nj-seg" role="radiogroup" aria-label="Dificuldade">
        {DIFFS.map((d) => (
          <button key={d} role="radio" aria-checked={d === value} className={d === value ? 'on' : ''} onClick={() => (playSfx('tap'), onChange(d))}>
            {DIFFICULTY_LABEL[d]}
          </button>
        ))}
      </div>
      <p className="nj-hint">{hints[value]}</p>
    </>
  )
}

export interface TutStep { title: string; body: string; fig?: ReactNode }

export function Tutorial({ steps, onDone }: { steps: TutStep[]; onDone: () => void }) {
  const [i, setI] = useState(0)
  const s = steps[i]
  return (
    <div className="nj-tut" role="dialog" aria-label="Como jogar">
      <div className="nj-card" style={{ width: 'min(440px, 100%)' }}>
        <div className="nj-dots">{steps.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</div>
        {s.fig}
        <h3>{s.title}</h3>
        <p>{s.body}</p>
        <div className="nj-actions">
          <button className="nj-cta" onClick={() => (playSfx('click'), i + 1 === steps.length ? onDone() : setI(i + 1))}>{i + 1 === steps.length ? 'Vamos lá!' : 'Próximo'}</button>
          {i + 1 < steps.length && <button className="nj-cta nj-cta--ghost" onClick={onDone}>Pular</button>}
        </div>
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

export function ResultsCard(p: {
  message: string
  stars: number
  score: number
  best: number
  newBest: boolean
  daily: boolean
  lines: Array<[string, string]>
  coins: number
  xp: number
  profXp: number
  profession: string
  board: Entry[]
  rank: number
  thresholds: readonly [number, number, number]
  onAgain: () => void
  onChange: () => void
  onExit: () => void
  extra?: ReactNode
}) {
  const score = useCountUp(p.score)
  return (
    <Overlay>
      <h2>{p.message}</h2>
      <div className="nj-stars" aria-label={`${p.stars} de 3 estrelas`}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ animationDelay: `${0.2 + i * 0.25}s` }}><StarIcon on={i < p.stars} /></span>
        ))}
      </div>
      <div className="nj-big">{score}<small>pontos{p.daily ? ' · desafio do dia' : ''}</small></div>
      {p.newBest ? <div className="nj-newbest">Novo recorde!</div> : <div className="nj-keys">Recorde: {p.best}</div>}
      <div className="nj-cols">
      <div className="nj-col">
      <div className="nj-lines">
        {p.lines.map(([k, v]) => (
          <div className="nj-line" key={k}><span>{k}</span><b>{v}</b></div>
        ))}
      </div>
      {p.extra}
      <div className="nj-rewards">
        <div><b style={{ display: 'flex', justifyContent: 'center', gap: 5, alignItems: 'center' }}><CoinIcon size={20} />+{p.coins}</b><small>Brilhos</small></div>
        <div><b>+{p.xp}</b><small>XP</small></div>
        <div><b>+{p.profXp}</b><small>XP {p.profession}</small></div>
      </div>
      </div>
      <div className="nj-col">
      <div className="nj-rank">
        <div className="nj-subtitle">Ranking do dia · você em {p.rank}º</div>
        {p.board.map((e, i) => (
          <div key={i} className={e.you ? 'you' : ''}><span>{i + 1}</span><em>{e.name}</em><b>{e.score}</b></div>
        ))}
      </div>
      </div>
      </div>
      <div className="nj-actions nj-actions--sticky">
        <button className="nj-cta" onClick={() => (playSfx('click'), p.onAgain())}>Jogar de novo</button>
        <button className="nj-cta nj-cta--ghost" onClick={p.onChange}>Mudar opções</button>
        <button className="nj-cta nj-cta--ghost" onClick={p.onExit}>Sair</button>
      </div>
      <div className="nj-keys">Estrelas: {p.thresholds.join(' / ')} pontos</div>
    </Overlay>
  )
}

export function seen(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}
export function markSeen(key: string) {
  try {
    localStorage.setItem(key, '1')
  } catch {
    /* ignora */
  }
}
export function pref(key: string, def = false): boolean {
  try {
    const v = localStorage.getItem(key)
    return v === null ? def : v === '1'
  } catch {
    return def
  }
}
export function setPref(key: string, v: boolean) {
  try {
    localStorage.setItem(key, v ? '1' : '0')
  } catch {
    /* ignora */
  }
}
