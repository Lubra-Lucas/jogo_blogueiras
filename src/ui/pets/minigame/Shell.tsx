import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { playSfx } from '../../../game/minigames/audio'
import { DIFFICULTY_LABEL, dailySeed, getLeaderboard, submitScore, type Difficulty } from '../../../game/minigames/shared/competition'
import { getProfessionXp, grantRewards } from '../../../game/minigames/rewards'
import { currentPetLevel, isUnlocked, markTutorialSeen, PET_PROFESSION, PET_UNLOCKS, petLevel, petXpForLevel, rewardFor, starsFor, tutorialSeen } from '../../../game/minigames/petshared/level'
import { usePetStore } from '../../../game/pets/petStore'
import { useProfileStore } from '../../../state/profileStore'
import { usePetLook, type ArtLook } from './PetArt'
import { IconClose, IconPaw } from '../icons'
import './shell.css'

const DIFFS: Difficulty[] = ['facil', 'normal', 'dificil', 'estrela']

export interface PlayProps {
  difficulty: Difficulty
  seed: number
  daily: boolean
  level: number
  paused: boolean
  look: ArtLook
  onFinish: (r: ResultInput) => void
}
export interface ResultInput {
  score: number
  lines: { label: string; value: string }[]
  judge: string
}

export interface ShellProps {
  id: string
  title: string
  tagline: string
  steps: { title: string; text: string }[]
  diffNotes: Record<Difficulty, string>
  typical: Record<Difficulty, number>
  max: number
  accent: string
  /** nome da profissão mostrado na tela inicial (o XP é o mesmo dos minijogos do petshop) */
  professionLabel?: string
  /** ids de PET_UNLOCKS que valem neste minijogo (padrão: todos) */
  unlockIds?: string[]
  /** textos próprios (por id) para os bônus deste minijogo */
  unlockText?: Record<string, { label: string; note: string }>
  icon: ReactNode
  play: (p: PlayProps) => ReactNode
  onExit: () => void
}

type Phase = 'menu' | 'how' | 'play' | 'result'

export function Shell(p: ShellProps) {
  const look = usePetLook()
  const name = useProfileStore((s) => s.name)
  const [phase, setPhase] = useState<Phase>('menu')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [daily, setDaily] = useState(false)
  const [seed, setSeed] = useState(1)
  const [paused, setPaused] = useState(false)
  const [res, setRes] = useState<ResultInput | null>(null)
  const [round, setRound] = useState(0)
  const [howFrom, setHowFrom] = useState<'start' | 'menu'>('menu')
  const level = useMemo(() => currentPetLevel(), [phase])
  const xp = getProfessionXp(PET_PROFESSION)
  const lo = petXpForLevel(level)
  const hi = petXpForLevel(level + 1)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return
      e.stopPropagation()
      if (phase === 'play') setPaused((v) => !v)
      else if (phase === 'how') {
        if (howFrom === 'start') p.onExit() // tutorial da primeira partida: Esc sai
        else setPhase('menu')
      }
      else p.onExit()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [phase, p, howFrom])

  const start = (isDaily: boolean) => {
    playSfx('click')
    setDaily(isDaily)
    setSeed(isDaily ? dailySeed(p.id) : (Math.random() * 1e9) >>> 0)
    setPaused(false)
    setRound((r) => r + 1)
    if (!tutorialSeen(p.id)) {
      markTutorialSeen(p.id)
      setHowFrom('start')
      setPhase('how')
    } else setPhase('play')
  }
  const openHow = () => {
    setHowFrom('menu')
    setPhase('how')
  }

  const best = (d: Difficulty) => getLeaderboard(p.id, d, p.typical[d], name).find((e) => e.you)?.score ?? 0

  return (
    <div className="ps-root" style={{ ['--ps-acc' as string]: p.accent }} role="dialog" aria-modal="true" aria-label={p.title}>
      <button type="button" className="ps-x" aria-label="Sair do minijogo" onClick={p.onExit}>
        <IconClose />
      </button>

      {phase === 'menu' && (
        <div className="ps-card ps-menu">
          <div className="ps-head">
            <span className="ps-badge">{p.icon}</span>
            <div>
              <h1>{p.title}</h1>
              <p>{p.tagline}</p>
            </div>
          </div>
          <div className="ps-lvl" title="XP de profissão do Petshop (compartilhado entre Banho e Tosa e Adestramento)">
            <span>
              Nível {level} de {p.professionLabel ?? 'Tosadora'} · treinando <b>{look.name}</b>
            </span>
            <i>
              <b style={{ width: `${Math.min(100, Math.round(((xp - lo) / Math.max(1, hi - lo)) * 100))}%` }} />
            </i>
          </div>
          <button type="button" className="ps-daily" onClick={() => start(true)}>
            <b>Desafio do dia</b>
            <small>Mesma partida para todas as jogadoras · {DIFFICULTY_LABEL[difficulty]}</small>
          </button>
          <div className="ps-label">Dificuldade</div>
          <div className="ps-seg" role="tablist">
            {DIFFS.map((d) => {
              const locked = d === 'estrela' && !isUnlocked('estrela', level)
              return (
                <button key={d} type="button" role="tab" aria-selected={d === difficulty} disabled={locked} className={d === difficulty ? 'on' : ''} onClick={() => setDifficulty(d)}>
                  {DIFFICULTY_LABEL[d]}
                  {locked && <small>nível 3</small>}
                </button>
              )
            })}
          </div>
          <p className="ps-note">
            {p.diffNotes[difficulty]} · Recorde: <b>{best(difficulty).toLocaleString('pt-BR') || 0}</b>
          </p>
          <div className="ps-actions">
            <button type="button" className="ps-btn" onClick={() => start(false)}>
              Jogar
            </button>
            <button type="button" className="ps-btn ps-btn--ghost" onClick={openHow}>
              Como jogar
            </button>
          </div>
          <ul className="ps-unlocks">
            {PET_UNLOCKS.filter((u) => !p.unlockIds || p.unlockIds.includes(u.id)).map((u) => (
              <li key={u.id} className={level >= u.level ? 'ok' : ''}>
                <b>{p.unlockText?.[u.id]?.label ?? u.label}</b> <small>{level >= u.level ? 'liberado' : `nível ${u.level}`} · {p.unlockText?.[u.id]?.note ?? u.note}</small>
              </li>
            ))}
          </ul>
        </div>
      )}

      {phase === 'how' && (
        <div className="ps-card ps-how">
          <h2>Como jogar</h2>
          <ol>
            {p.steps.map((s, i) => (
              <li key={i}>
                <span>{i + 1}</span>
                <div>
                  <b>{s.title}</b>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="ps-actions">
            <button type="button" className="ps-btn" onClick={() => setPhase(howFrom === 'start' ? 'play' : 'menu')}>
              {howFrom === 'start' ? 'Entendi, vamos!' : 'Entendi'}
            </button>
            <button type="button" className="ps-btn ps-btn--ghost" onClick={() => setPhase('menu')}>
              Voltar
            </button>
          </div>
        </div>
      )}

      {phase === 'play' && (
        <div className="ps-play" key={round}>
          {p.play({
            difficulty,
            seed,
            daily,
            level,
            paused,
            look,
            onFinish: (r) => {
              setRes(r)
              setPhase('result')
            },
          })}
          <button type="button" className="ps-pause" onClick={() => setPaused(true)} aria-label="Pausar">
            Pausa
          </button>
          {paused && (
            <div className="ps-veil">
              <div className="ps-card ps-pausecard">
                <h2>Pausado</h2>
                <div className="ps-actions">
                  <button type="button" className="ps-btn" onClick={() => setPaused(false)}>
                    Continuar
                  </button>
                  <button type="button" className="ps-btn ps-btn--ghost" onClick={() => (setPaused(false), setPhase('menu'))}>
                    Desistir
                  </button>
                  <button type="button" className="ps-btn ps-btn--ghost" onClick={p.onExit}>
                    Sair
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'result' && res && (
        <Result
          shell={p}
          res={res}
          difficulty={difficulty}
          daily={daily}
          look={look}
          name={name}
          onAgain={() => start(daily)}
          onMenu={() => setPhase('menu')}
        />
      )}
    </div>
  )
}

function Result({ shell, res, difficulty, daily, look, name, onAgain, onMenu }: { shell: ShellProps; res: ResultInput; difficulty: Difficulty; daily: boolean; look: ArtLook; name: string; onAgain: () => void; onMenu: () => void }) {
  const done = useRef<{ stars: number; coins: number; board: ReturnType<typeof submitScore>; unlocked: typeof PET_UNLOCKS; rw: ReturnType<typeof rewardFor>; treat: boolean } | null>(null)
  const granted = useRef(false)
  if (!done.current) {
    const typical = shell.typical[difficulty]
    const stars = starsFor(res.score, typical)
    const rw = rewardFor(res.score, stars, difficulty, shell.max)
    const rid = daily ? `${shell.id}-diario` : shell.id
    const board = submitScore(rid, difficulty, res.score, typical, name)
    const xp0 = getProfessionXp(PET_PROFESSION)
    const before = petLevel(xp0)
    const after = petLevel(xp0 + rw.professionXp)
    done.current = { stars, coins: rw.coins, board, unlocked: PET_UNLOCKS.filter((u) => u.level > before && u.level <= after), rw, treat: isUnlocked('biscoito', before) }
  }
  const d = done.current
  // efeitos colaterais (perfil, pet, som) fora do render, uma unica vez
  useEffect(() => {
    if (granted.current) return
    granted.current = true
    grantRewards({ coins: d.rw.coins, xp: d.rw.xp, professionXp: { [PET_PROFESSION]: d.rw.professionXp } })
    const act = usePetStore.getState().active
    if (act) usePetStore.getState().joyBoost(act, 6 + d.stars * 4 + (d.treat ? 8 : 0))
    if (d.treat) usePetStore.getState().addFood('food.biscoito', 1)
    playSfx(d.stars >= 2 ? 'done' : 'tap')
  }, [d])
  return (
    <div className="ps-card ps-result">
      <h2>{res.judge}</h2>
      <div className="ps-stars" aria-label={`${d.stars} de 3 estrelas`}>
        {[1, 2, 3].map((i) => (
          <svg key={i} viewBox="0 0 24 24" className={i <= d.stars ? 'on' : ''}>
            <path d="M12 2.8l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.3 6.3 20.3l1.1-6.3L2.8 9.5l6.4-.9z" />
          </svg>
        ))}
      </div>
      <div className="ps-score">{res.score.toLocaleString('pt-BR')}</div>
      {d.board.newBest && <div className="ps-pill">Novo recorde</div>}
      <dl className="ps-lines">
        {res.lines.map((l) => (
          <div key={l.label}>
            <dt>{l.label}</dt>
            <dd>{l.value}</dd>
          </div>
        ))}
        <div>
          <dt>Brilhos</dt>
          <dd>+{d.coins}</dd>
        </div>
        {d.treat && (
          <div>
            <dt>Biscoito premiado</dt>
            <dd>+1 Biscoitinho</dd>
          </div>
        )}
      </dl>
      {d.unlocked.map((u) => (
        <div className="ps-unlock" key={u.id}>
          <IconPaw /> Novo item desbloqueado: <b>{u.label}</b>
        </div>
      ))}
      <div className="ps-label">{daily ? 'Ranking do desafio do dia' : 'Ranking de hoje'} · você em {d.board.rank}º</div>
      <ol className="ps-board">
        {d.board.board.slice(0, 6).map((e, i) => (
          <li key={e.name + i} className={e.you ? 'you' : ''}>
            <span>{i + 1}</span>
            <b>{e.you ? `${e.name} (${look.name})` : e.name}</b>
            <i>{e.score.toLocaleString('pt-BR')}</i>
          </li>
        ))}
      </ol>
      <div className="ps-actions">
        <button type="button" className="ps-btn" onClick={onAgain}>
          Jogar de novo
        </button>
        <button type="button" className="ps-btn ps-btn--ghost" onClick={onMenu}>
          Menu
        </button>
      </div>
    </div>
  )
}
