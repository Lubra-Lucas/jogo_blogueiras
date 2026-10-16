import { useEffect, useRef, useState, type ReactNode } from 'react'
import { playSfx } from '../../../game/minigames/audio'
import { isUnlocked } from '../../../game/minigames/petshared/level'
import { ADESTRA_MAX, ADESTRA_TYPICAL, COMMANDS, COMMAND_LABEL, commandPoints, makeRound, paramsFor, roundBonus, type Command } from '../../../game/minigames/petadestra/logic'
import { rng } from '../../../game/minigames/shared/competition'
import { PetArt, type ArtPose } from '../../pets/minigame/PetArt'
import { Shell, type PlayProps, type ResultInput } from '../../pets/minigame/Shell'
import { IconPaw } from '../../pets/icons'
import './adestra.css'

interface Item {
  cmd: Command
  decoy: boolean
}

const POSE: Record<Command, ArtPose> = { senta: 'sit', deita: 'lie', pata: 'paw', gira: 'spin', pula: 'jump' }

export function CmdIcon({ cmd, size = 34 }: { cmd: Command; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 32 32', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  let body: ReactNode
  switch (cmd) {
    case 'senta':
      body = (
        <>
          <path d="M9 27h14" />
          <path d="M16 5v14" />
          <path d="M10 14l6 7 6-7" />
        </>
      )
      break
    case 'deita':
      body = (
        <>
          <path d="M5 24h22" />
          <path d="M8 24c0-5 4-8 9-8s7 3 7 8" />
          <circle cx="11" cy="12" r="3.2" />
        </>
      )
      break
    case 'pata':
      body = (
        <>
          <ellipse cx="9" cy="14" rx="2.2" ry="3" />
          <ellipse cx="14" cy="9" rx="2.2" ry="3" />
          <ellipse cx="20" cy="9" rx="2.2" ry="3" />
          <ellipse cx="25" cy="14" rx="2.2" ry="3" />
          <path d="M17 15c-4 0-7 4-7 7 0 2.4 1.8 3.4 3.6 3 1.2-.3 2-.7 3.4-.7s2.2.4 3.4.7c1.8.4 3.6-.6 3.6-3 0-3-3-7-7-7z" />
        </>
      )
      break
    case 'gira':
      body = (
        <>
          <path d="M26 16a10 10 0 1 1-4-8" />
          <path d="M23 3v6h-6" />
        </>
      )
      break
    default:
      body = (
        <>
          <path d="M16 27V8" />
          <path d="M9 14l7-8 7 8" />
          <path d="M8 28h16" />
        </>
      )
  }
  return <svg {...common}>{body}</svg>
}

type Phase = 'intro' | 'show' | 'answer' | 'fail'

function Play({ difficulty, seed, level, paused, look, onFinish }: PlayProps) {
  const P = paramsFor(difficulty)
  const golden = isUnlocked('escova', level)
  const pool = COMMANDS.slice(0, P.pool)
  const g = useRef({
    phase: 'intro' as Phase,
    pt: 0,
    round: 0,
    seq: [] as Item[],
    target: 0,
    lives: P.lives,
    score: 0,
    combo: 0,
    bestCombo: 0,
    mistakes: 0,
    cleanRounds: 0,
    correct: 0,
    wrong: 0,
    timeLeft: P.time,
    lastInput: 0,
    pose: 'sit' as ArtPose,
    poseUntil: 0,
    flash: null as { id: number; text: string; good: boolean } | null,
    done: false,
    replays: 0,
  })
  const [, force] = useState(0)
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  const buildSeq = (round: number): Item[] => {
    const base = makeRound(seed, round, P)
    if (!P.decoys) return base.map((cmd) => ({ cmd, decoy: false }))
    const r = rng(seed + round * 31 + 5)
    return base.map((cmd, i) => ({ cmd, decoy: i > 0 && i < base.length - 1 && r() < 0.22 }))
  }
  if (g.current.seq.length === 0) g.current.seq = buildSeq(0)

  const targetCount = () => g.current.seq.filter((s) => !s.decoy).length
  const nextTarget = (from: number) => {
    let i = from
    while (i < g.current.seq.length && g.current.seq[i].decoy) i++
    return i
  }

  const finish = () => {
    const s = g.current
    if (s.done) return
    s.done = true
    const typ = ADESTRA_TYPICAL[difficulty]
    const ratio = s.score / typ
    const res: ResultInput = {
      score: s.score,
      judge: ratio >= 1.15 ? 'Adestradora de elite!' : ratio >= 0.85 ? 'Pet obediente!' : ratio >= 0.5 ? 'Bom treino' : 'Vamos praticar mais',
      lines: [
        { label: 'Rodadas completas', value: String(s.round) },
        { label: 'Comandos certos', value: String(s.correct) },
        { label: 'Erros', value: String(s.wrong) },
        { label: 'Melhor sequência', value: String(s.bestCombo) },
        { label: 'Rodadas perfeitas', value: String(s.cleanRounds) },
      ],
    }
    onFinish(res)
  }

  const flash = (text: string, good: boolean) => {
    g.current.flash = { id: Date.now() + Math.random(), text, good }
  }

  const mistake = (reason: string) => {
    const s = g.current
    s.wrong += 1
    s.mistakes += 1
    s.combo = 0
    s.lives -= 1
    playSfx('bad')
    flash(reason, false)
    if (s.lives < 0) {
      s.phase = 'fail'
      s.pt = -99
      window.setTimeout(finish, 900)
      return
    }
    s.phase = 'fail'
    s.pt = 0
  }

  const input = (cmd: Command) => {
    const s = g.current
    if (pausedRef.current || s.done || s.phase !== 'answer') return
    const idx = nextTarget(s.target)
    const need = s.seq[idx]
    if (!need) return
    const elapsed = s.pt - s.lastInput
    if (need.cmd !== cmd) {
      mistake('Não era esse')
      return
    }
    s.combo += 1
    s.bestCombo = Math.max(s.bestCombo, s.combo)
    s.correct += 1
    const pts = commandPoints(elapsed, P.answerS, s.combo, golden)
    s.score += pts
    s.pose = POSE[cmd]
    s.poseUntil = performance.now() + 700
    s.lastInput = s.pt
    playSfx(s.combo >= 4 ? 'combo' : 'tap')
    flash(`+${pts}`, true)
    s.target = idx + 1
    if (nextTarget(s.target) >= s.seq.length) {
      // rodada completa
      const bonus = roundBonus(targetCount(), s.mistakes)
      if (s.mistakes === 0) s.cleanRounds += 1
      s.score += bonus
      if (bonus) flash(`Rodada perfeita +${bonus}`, true)
      s.round += 1
      s.seq = buildSeq(s.round)
      s.target = 0
      s.mistakes = 0
      s.phase = 'intro'
      s.pt = 0
      playSfx('serve')
    } else s.lastInput = s.pt
  }
  const inputRef = useRef(input)
  inputRef.current = input

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const i = Number(e.key) - 1
      if (e.repeat || !(i >= 0 && i < P.pool)) return
      e.stopPropagation()
      inputRef.current(COMMANDS[i])
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [P.pool])

  useEffect(() => {
    let raf = 0
    let prev = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      const s = g.current
      if (!pausedRef.current && !s.done) {
        s.timeLeft -= dt
        s.pt += dt
        if (s.timeLeft <= 0) {
          s.timeLeft = 0
          finish()
        } else if (s.phase === 'intro' && s.pt > 1.0) {
          s.phase = 'show'
          s.pt = 0
        } else if (s.phase === 'show') {
          const slot = P.showMs / 1000 + 0.22
          if (s.pt > s.seq.length * slot + 0.2) {
            s.phase = 'answer'
            s.pt = 0
            s.lastInput = 0
            s.target = 0
          }
        } else if (s.phase === 'answer' && s.pt - s.lastInput > P.answerS) {
          mistake('Tempo esgotado')
        } else if (s.phase === 'fail' && s.pt > 1.1 && s.lives >= 0) {
          s.phase = 'show'
          s.pt = 0
          s.target = 0
        }
        if (s.poseUntil && performance.now() > s.poseUntil) {
          s.poseUntil = 0
          s.pose = 'sit'
        }
        force((v) => (v + 1) % 1000)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const s = g.current
  const slot = P.showMs / 1000 + 0.22
  const showIdx = s.phase === 'show' ? Math.floor(s.pt / slot) : -1
  const showItem = showIdx >= 0 && showIdx < s.seq.length && s.pt - showIdx * slot < P.showMs / 1000 ? s.seq[showIdx] : null
  const idxNow = nextTarget(s.target)
  const totalT = targetCount()
  const doneT = s.seq.slice(0, Math.min(idxNow, s.seq.length)).filter((x) => !x.decoy).length
  const ansLeft = s.phase === 'answer' ? Math.max(0, 1 - (s.pt - s.lastInput) / P.answerS) : 0
  const hintCmd = P.hints && s.phase === 'answer' && s.pt - s.lastInput > P.answerS * 0.6 ? s.seq[idxNow]?.cmd : null

  return (
    <div className="ad-root">
      <div className="ad-hud">
        <div className="ad-title">
          <IconPaw /> Rodada {s.round + 1}
        </div>
        <div className="ad-bar" title="Tempo">
          <i style={{ width: `${(s.timeLeft / P.time) * 100}%` }} />
        </div>
        <div className="ad-score">
          {s.score.toLocaleString('pt-BR')}
          <span className="ad-lives" aria-label={`${Math.max(0, s.lives + 1)} tentativas`}>
            {Array.from({ length: P.lives + 1 }, (_, i) => (
              <IconPaw key={i} width={16} height={16} className={i < s.lives + 1 ? 'on' : ''} />
            ))}
          </span>
        </div>
      </div>

      <div className="ad-stage">
        <PetArt look={look} pose={s.pose} />
        <div className="ad-speech" aria-live="polite">
          {s.phase === 'intro' && <b>Atenção!</b>}
          {s.phase === 'show' && (showItem ? <ShowCard item={showItem} /> : <span className="ad-dots">...</span>)}
          {s.phase === 'answer' && <b>Sua vez!</b>}
          {s.phase === 'fail' && <b className="bad">Vamos de novo</b>}
        </div>
        {s.flash && (
          <div className={`ad-flash${s.flash.good ? '' : ' bad'}`} key={s.flash.id}>
            {s.flash.text}
          </div>
        )}
      </div>

      <div className="ad-progress" aria-label="Progresso da sequência">
        {Array.from({ length: totalT }, (_, i) => (
          <i key={i} className={i < doneT ? 'on' : ''} />
        ))}
      </div>
      {s.phase === 'answer' && (
        <div className="ad-timer">
          <i style={{ width: `${ansLeft * 100}%` }} />
        </div>
      )}

      <div className="ad-keys" style={{ gridTemplateColumns: `repeat(${P.pool}, 1fr)` }}>
        {pool.map((c, i) => (
          <button key={c} type="button" className={`ad-key${hintCmd === c ? ' hint' : ''}`} disabled={s.phase !== 'answer'} onPointerDown={() => input(c)}>
            <CmdIcon cmd={c} />
            <b>{COMMAND_LABEL[c]}</b>
            <small>{i + 1}</small>
          </button>
        ))}
      </div>
    </div>
  )
}

function ShowCard({ item }: { item: Item }) {
  return (
    <div className={`ad-card${item.decoy ? ' decoy' : ''}`} key={item.cmd + item.decoy}>
      <CmdIcon cmd={item.cmd} size={44} />
      <b>{COMMAND_LABEL[item.cmd]}</b>
      {item.decoy && <small>pegadinha: não repita</small>}
    </div>
  )
}

export function AdestraGame({ onExit }: { onExit: () => void }) {
  return (
    <Shell
      id="petadestra"
      title="Adestramento"
      tagline="Memorize os comandos e repita no tempo certo."
      accent="#a8760f"
      icon={<IconPaw />}
      max={ADESTRA_MAX}
      typical={ADESTRA_TYPICAL}
      diffNotes={{
        facil: '3 comandos, muito tempo e dicas depois de um erro',
        normal: '4 comandos, sequências até 8',
        dificil: '5 comandos, pouco tempo e pegadinhas que não valem',
        estrela: 'Sequências longas, rápidas, sem dicas',
      }}
      steps={[
        { title: 'Observe', text: 'O treinador mostra os comandos um a um. Memorize a ordem.' },
        { title: 'Repita', text: 'Toque nos botões (ou nas teclas 1 a 5) na mesma ordem, antes da barrinha de paciência acabar.' },
        { title: 'Caprichem', text: 'Acertos rápidos e seguidos valem mais. Rodadas sem erro dão bônus. Pegadinhas riscadas não devem ser repetidas.' },
      ]}
      play={(p) => <Play {...p} />}
      onExit={onExit}
    />
  )
}
