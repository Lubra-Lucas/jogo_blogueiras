import { useEffect, useState, type ReactNode } from 'react'
import { ACHIEVEMENTS, useAchievements } from '../../../game/casino/achievements'
import { GAME_LABEL, fmtChips, useChips, type GameId } from '../../../game/casino/chips'
import { leaderboardFor } from '../../../game/casino/report'
import { isMuted, setMuted } from '../../../game/minigames/audio'
import { casinoSfx } from '../../../game/minigames/casino/sfx'
import { DIFFICULTY_LABEL, type Difficulty, type Entry } from '../../../game/minigames/shared/competition'
import { ChipArt, IcoBack, IcoHelp, IcoSound, IcoTrophy } from './art'
import { FICHAS_NOTE, HELP } from './help'
import { useCz } from './ui'

export function Topbar({ title, onBack, game }: { title: string; onBack: () => void; game?: GameId }) {
  const balance = useChips((s) => s.balance)
  const [muted, setM] = useState(isMuted())
  return (
    <header className="cz-top">
      <button className="cz-iconbtn" aria-label="Voltar" onClick={() => (casinoSfx('tick'), onBack())}><IcoBack /></button>
      <div className="cz-title">{title}</div>
      <div className="cz-balance" aria-label={`Saldo: ${fmtChips(balance)} fichas`}>
        <ChipArt value={100} size={24} label="" />
        <b key={balance} className="cz-bump">{fmtChips(balance)}</b>
        <small>fichas</small>
      </div>
      {game && (
        <button className="cz-iconbtn" aria-label="Como jogar" onClick={() => useCz.getState().openHelp(game)}><IcoHelp /></button>
      )}
      <button className="cz-iconbtn" aria-label={muted ? 'Ligar som' : 'Silenciar'} onClick={() => (setMuted(!muted), setM(!muted))}><IcoSound on={!muted} /></button>
    </header>
  )
}

export function DifficultyPicker({ value, onChange, compact }: { value: Difficulty; onChange: (d: Difficulty) => void; compact?: boolean }) {
  return (
    <div className={`cz-seg${compact ? ' cz-seg--s' : ''}`} role="radiogroup" aria-label="Dificuldade">
      {(['facil', 'normal', 'dificil', 'estrela'] as Difficulty[]).map((d) => (
        <button key={d} role="radio" aria-checked={value === d} className={value === d ? 'on' : ''} onClick={() => (casinoSfx('tick'), onChange(d))}>
          {DIFFICULTY_LABEL[d]}
        </button>
      ))}
    </div>
  )
}

export function ChipRack({ selected, onSelect, values, onDragStart, disabled }: {
  selected?: number
  onSelect: (v: number) => void
  values: readonly number[]
  onDragStart?: (v: number, e: React.PointerEvent) => void
  disabled?: boolean
}) {
  return (
    <div className="cz-rack" role="group" aria-label="Fichas">
      {values.map((v) => (
        <button
          key={v}
          className={`cz-chipbtn${selected === v ? ' on' : ''}`}
          disabled={disabled}
          aria-label={`Ficha de ${v}`}
          onPointerDown={(e) => onDragStart?.(v, e)}
          onClick={() => (casinoSfx('chip'), onSelect(v))}
        >
          <ChipArt value={v} size={52} />
        </button>
      ))}
    </div>
  )
}

export function Modal({ children, onClose, wide, label }: { children: ReactNode; onClose?: () => void; wide?: boolean; label: string }) {
  useEffect(() => {
    if (!onClose) return
    const k = (e: KeyboardEvent) => e.code === 'Escape' && onClose()
    window.addEventListener('keydown', k, true)
    return () => window.removeEventListener('keydown', k, true)
  }, [onClose])
  return (
    <div className="cz-modalwrap" role="dialog" aria-modal="true" aria-label={label} onPointerDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`cz-modal${wide ? ' cz-modal--wide' : ''}`}>{children}</div>
    </div>
  )
}

export function HowTo() {
  const game = useCz((s) => s.help)
  const close = useCz((s) => s.closeHelp)
  if (!game) return null
  const h = HELP[game]
  return (
    <Modal label={`Como jogar ${h.title}`} onClose={close} wide>
      <h2 className="cz-h2">Como jogar: {h.title}</h2>
      <ol className="cz-steps">
        {h.steps.map((s, i) => (
          <li key={i}>
            <span className="cz-stepno">{i + 1}</span>
            <div><b>{s.t}</b><p>{s.b}</p></div>
          </li>
        ))}
      </ol>
      <div className="cz-cols">
        <section>
          <h3>Regras desta mesa</h3>
          <ul>{h.rules.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </section>
        <section>
          <h3>Chances e vantagem da casa</h3>
          <ul>{h.odds.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </section>
      </div>
      <p className="cz-note">{FICHAS_NOTE}</p>
      <div className="cz-actions"><button className="cz-btn primary" onClick={close}>Entendi</button></div>
    </Modal>
  )
}

export function Board({ board, title }: { board: Entry[]; title?: string }) {
  return (
    <ol className="cz-board" aria-label={title ?? 'Ranking do dia'}>
      {board.map((e, i) => (
        <li key={e.name + i} className={e.you ? 'you' : ''}>
          <span className="pos">{i + 1}</span>
          <span className="nm">{e.name}</span>
          <b>{fmtChips(e.score)}</b>
        </li>
      ))}
    </ol>
  )
}

/** Painel de rankings dos quatro jogos. */
export function RankPanel({ onClose }: { onClose: () => void }) {
  const difficulty = useCz((s) => s.difficulty)
  const [g, setG] = useState<GameId>('blackjack')
  const rep = leaderboardFor(g, difficulty)
  const done = useAchievements((s) => s.done)
  const title = useAchievements((s) => s.title)
  const setTitle = useAchievements.getState().setTitle
  const titles = ACHIEVEMENTS.filter((a) => a.title && done.includes(a.id)).map((a) => a.title as string)
  return (
    <Modal label="Rankings e conquistas" onClose={onClose} wide>
      <h2 className="cz-h2">Rankings do dia</h2>
      <div className="cz-tabs" role="tablist">
        {(Object.keys(GAME_LABEL) as GameId[]).map((k) => (
          <button key={k} role="tab" aria-selected={g === k} className={g === k ? 'on' : ''} onClick={() => setG(k)}>{GAME_LABEL[k]}</button>
        ))}
      </div>
      <p className="cz-sub">Pontos = fichas ganhas hoje neste jogo (dificuldade {DIFFICULTY_LABEL[difficulty]}). Sua posição: {rep.rank}º.</p>
      <Board board={rep.board} />
      <h3 className="cz-h3">Conquistas</h3>
      <ul className="cz-ach">
        {ACHIEVEMENTS.map((a) => {
          const ok = done.includes(a.id)
          return (
            <li key={a.id} className={ok ? 'ok' : ''}>
              <b>{a.name}</b>
              <span>{a.desc}</span>
              {a.unlockLabel && <em>{ok ? 'Item liberado: ' : 'Libera: '}{a.unlockLabel}</em>}
            </li>
          )
        })}
      </ul>
      {titles.length > 0 && (
        <div className="cz-titles">
          <span>Título exibido:</span>
          {titles.map((t) => (
            <button key={t} className={title === t ? 'on' : ''} onClick={() => setTitle(t)}>{t}</button>
          ))}
        </div>
      )}
      <div className="cz-actions"><button className="cz-btn primary" onClick={onClose}>Fechar</button></div>
    </Modal>
  )
}

/** Avisos de conquista nova (toasts). */
export function AchToasts() {
  const fresh = useAchievements((s) => s.fresh)
  const [show, setShow] = useState<string | null>(null)
  useEffect(() => {
    if (fresh.length && !show) {
      const id = fresh[0]
      useAchievements.getState().takeFresh()
      setShow(id)
      casinoSfx('bell')
      const t = setTimeout(() => setShow(null), 4200)
      return () => clearTimeout(t)
    }
  }, [fresh, show])
  const a = ACHIEVEMENTS.find((x) => x.id === show)
  if (!a) return null
  return (
    <div className="cz-toast" role="status">
      <IcoTrophy />
      <div>
        <b>Conquista: {a.name}</b>
        {a.title && <span>Novo título: {a.title}</span>}
        {a.unlockLabel && <span>Novo item de aparência: {a.unlockLabel}</span>}
      </div>
    </div>
  )
}

const BREAK_MS = 20 * 60 * 1000
/** Lembrete gentil depois de 20 minutos de sessão. */
export function BreakReminder({ since, onLeave }: { since: number; onLeave: () => void }) {
  const [open, setOpen] = useState(false)
  const [last, setLast] = useState(since)
  useEffect(() => {
    const t = setInterval(() => {
      if (Date.now() - last >= BREAK_MS) setOpen(true)
    }, 5000)
    return () => clearInterval(t)
  }, [last])
  // tecla de teste: ?cbreak=1 antecipa o lembrete
  useEffect(() => {
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('cbreak') === '1') {
      const t = setTimeout(() => setOpen(true), 1500)
      return () => clearTimeout(t)
    }
  }, [])
  if (!open) return null
  return (
    <Modal label="Pausa">
      <h2 className="cz-h2">Que tal uma pausa?</h2>
      <p className="cz-p">Você está no lounge há mais de 20 minutos. Beba uma água, estique as pernas e volte quando quiser. As fichas continuam guardadas.</p>
      <div className="cz-actions">
        <button className="cz-btn primary" onClick={onLeave}>Fazer uma pausa</button>
        <button className="cz-btn" onClick={() => (setOpen(false), setLast(Date.now()))}>Continuar por mais 20 min</button>
      </div>
    </Modal>
  )
}
