import { useEffect, useReducer, useRef, useState } from 'react'
import { loadCatalog, useCatalogStore } from '../../../game/character/catalog'
import { isMuted, playSfx, setMuted } from '../../../game/minigames/audio'
import { DIFFICULTY_LABEL, dailySeed, rng, type Difficulty } from '../../../game/minigames/shared/competition'
import { bestOf, settle, starsFor, type Settled } from '../../../game/minigames/shared/settle'
import {
  GRID, GRID_LABEL, LOOK_CFG, LOOK_SCORE, PAIR_SCORE, PAIRS_CFG, SLOT_LABEL, SLOT_QUESTION, buildLook, buildPool, dealCards, lookStarTh, lookTypical,
  pairsStarTh, pairsTypical, pickPairs, pieceKey,
  type Card, type LookRound, type MemMode, type Pool,
} from '../../../game/minigames/memoria/logic'
import { useProfileStore } from '../../../state/profileStore'
import { DiffPicker, IcoCards, IcoEye, IcoHelp, Overlay, ResultsCard, TopBar, Tutorial, markSeen, pref, seen, setPref, type TutStep } from '../shared/kit'
import { CardBack, PieceImg, preloadPieces } from './art'
import './memoria.css'

const PROF = 'Estilista'
const TUT_PAIRS = 'jdb.memoria.tut.pares'
const TUT_LOOK = 'jdb.memoria.tut.look'
const LABELS_KEY = 'jdb.memoria.labels'
const CONTRAST_KEY = 'jdb.memoria.contrast'

const HINT_PAIRS: Record<Difficulty, string> = {
  facil: 'Grade 3 x 4, as cartas aparecem por 3 s no início e o erro não tira pontos.',
  normal: 'Grade 4 x 4, 2 s de olhada e erro tira 10 pontos.',
  dificil: 'Grade 4 x 5 com peças iguais em cores parecidas. Erro tira 20 pontos.',
  estrela: 'Grade 6 x 6, sem olhada, muitas peças em 3 tons parecidos. Erro tira 30 pontos.',
}
const HINT_LOOK: Record<Difficulty, string> = {
  facil: '4 looks de 3 peças, 9 s para decorar e 4 opções por peça.',
  normal: '5 looks de 4 peças, 7 s para decorar. Uma opção é a mesma peça em outra cor.',
  dificil: '5 looks de 5 peças, 6 s para decorar e 6 opções, com peças quase idênticas.',
  estrela: '5 looks de 6 peças, 5 s para decorar, 6 opções e vários tons parecidos.',
}

const TUT_P: TutStep[] = [
  { title: 'Ache os pares', body: 'Toque em duas cartas para virar. Se as duas peças forem idênticas (mesma peça e mesma cor), o par fica. Se não, elas desviram.', fig: <div className="nj-tut-fig"><IcoCards /></div> },
  { title: 'Atenção às cores', body: 'Nos níveis difíceis há a mesma peça em tons parecidos: vermelho e vinho, marfim e areia. Confira a cor, não só o formato.', fig: <div className="nj-tut-fig"><IcoEye /></div> },
  { title: 'Sequência vale ouro', body: 'Acertos seguidos dão bônus de combo. Errar zera o combo e tira alguns pontos. Terminou antes do tempo? O que sobrar vira bônus.', fig: <div className="nj-tut-fig"><IcoCards /></div> },
]
const TUT_L: TutStep[] = [
  { title: 'Decore o look', body: 'Um look completo aparece por alguns segundos: peças, formatos e cores. Toque em "Já decorei" quando estiver pronta.', fig: <div className="nj-tut-fig"><IcoEye /></div> },
  { title: 'Remonte peça por peça', body: 'O look some. Para cada peça você escolhe a certa entre as opções. Algumas são a mesma peça em outra cor.', fig: <div className="nj-tut-fig"><IcoCards /></div> },
  { title: 'Rapidez rende pontos', body: 'Cada acerto vale pontos e ganha bônus pela rapidez e por sequência. Um look sem erros dá bônus extra.', fig: <div className="nj-tut-fig"><IcoEye /></div> },
]

type Phase = 'intro' | 'loading' | 'peek' | 'playing' | 'memorize' | 'choose' | 'reveal' | 'paused' | 'done'

interface G {
  mode: MemMode
  difficulty: Difficulty
  daily: boolean
  seed: number
  phase: Phase
  resume: Phase
  // comum
  score: number
  combo: number
  bestCombo: number
  errors: number
  time: number
  total: number
  settled: Settled | null
  finalScore: number
  bonus: number
  // pares
  cards: Card[]
  state: Array<'down' | 'up' | 'matched'>
  sel: number[]
  busy: boolean
  matches: number
  peekLeft: number
  // look
  round: number
  look: LookRound | null
  idx: number
  picks: Array<number | null>
  correct: number
  perfectLooks: number
  asked: number
  feedback: { idx: number; ok: boolean } | null
  memLeft: number
  roundCorrect: number
}

const blank = (): G => ({
  mode: 'pares', difficulty: 'normal', daily: false, seed: 1, phase: 'intro', resume: 'playing', score: 0, combo: 0, bestCombo: 0, errors: 0, time: 0, total: 1,
  settled: null, finalScore: 0, bonus: 0, cards: [], state: [], sel: [], busy: false, matches: 0, peekLeft: 0, round: 0, look: null, idx: 0, picks: [], correct: 0,
  perfectLooks: 0, asked: 0, feedback: null, memLeft: 0, roundCorrect: 0,
})

export function MemoriaGame({ onExit }: { onExit: () => void }) {
  const [, force] = useReducer((x: number) => x + 1, 0)
  const gRef = useRef<G>(blank())
  const g = gRef.current
  const poolRef = useRef<Pool | null>(null)
  const [mode, setMode] = useState<MemMode>('pares')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [daily, setDaily] = useState(false)
  const [muted, setMutedState] = useState(isMuted())
  const [labels, setLabels] = useState(() => pref(LABELS_KEY))
  const [contrast, setContrast] = useState(() => pref(CONTRAST_KEY))
  const [tutorial, setTutorial] = useState<MemMode | null>(null)
  const [ready, setReady] = useState(useCatalogStore.getState().loaded)
  const [live, setLive] = useState('')
  const timers = useRef<number[]>([])
  const token = useRef(0)

  useEffect(() => {
    void loadCatalog().then(() => setReady(true))
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t))
      token.current++
    }
  }, [])
  const later = (fn: () => void, ms: number) => {
    const t = window.setTimeout(fn, ms)
    timers.current.push(t)
  }

  // ---------------------------------------------------------------- relógio
  useEffect(() => {
    let last = performance.now()
    let lastSec = -1
    const loop = () => {
      const now = performance.now()
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const G = gRef.current
      if (G.phase === 'playing' && G.mode === 'pares') {
        G.time -= dt
        const s = Math.ceil(G.time)
        if (s !== lastSec) (lastSec = s, force())
        if (G.time <= 0) finishPairs(false)
      } else if (G.phase === 'peek') {
        G.peekLeft -= dt
        if (G.peekLeft <= 0) {
          G.phase = 'playing'
          G.state = G.state.map((s) => (s === 'up' ? 'down' : s))
          force()
        }
      } else if (G.phase === 'memorize') {
        G.memLeft -= dt
        const s = Math.ceil(G.memLeft)
        if (s !== lastSec) (lastSec = s, force())
        if (G.memLeft <= 0) toChoose()
      } else if (G.phase === 'choose' && !G.feedback) {
        G.time -= dt
        const s = Math.ceil(G.time)
        if (s !== lastSec) (lastSec = s, force())
        if (G.time <= 0) answer(-1)
      }
    }
    const iv = window.setInterval(loop, 50)
    return () => window.clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onHide = () => {
      if (document.hidden) pause()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return
      const G = gRef.current
      if (tutorial) return
      if (G.phase === 'playing' || G.phase === 'choose' || G.phase === 'memorize') pause()
      else if (G.phase === 'paused') resume()
      else if (G.phase === 'intro' || G.phase === 'done') onExit()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorial])

  const pause = () => {
    const G = gRef.current
    if (G.phase === 'playing' || G.phase === 'choose' || G.phase === 'memorize') {
      G.resume = G.phase
      G.phase = 'paused'
      force()
    }
  }
  const resume = () => {
    const G = gRef.current
    if (G.phase === 'paused') {
      G.phase = G.resume
      force()
    }
  }

  // ---------------------------------------------------------------- iniciar
  const start = async () => {
    if (!ready) return
    const pool = (poolRef.current ??= buildPool(useCatalogStore.getState().items))
    const seed = daily ? dailySeed(mode === 'pares' ? 'memoria' : 'memoria-look') : Math.floor(Math.random() * 2 ** 31)
    const my = ++token.current
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
    const fresh = blank()
    Object.assign(gRef.current, fresh, { mode, difficulty, daily, seed })
    const G = gRef.current
    playSfx('click')
    if (mode === 'pares') {
      const r = rng(seed)
      const pairs = pickPairs(pool, difficulty, r)
      G.cards = dealCards(pairs, r)
      G.state = G.cards.map(() => 'down' as const)
      G.total = G.time = PAIRS_CFG[difficulty].time
      G.phase = 'loading'
      force()
      await preloadPieces(pairs, 5000)
      if (my !== token.current) return
      G.state = G.cards.map(() => 'up' as const)
      G.peekLeft = PAIRS_CFG[difficulty].peek
      G.phase = G.peekLeft > 0 ? 'peek' : 'playing'
      if (!G.peekLeft) G.state = G.cards.map(() => 'down' as const)
      if (!seen(TUT_PAIRS)) {
        G.resume = G.phase === 'peek' ? 'playing' : 'playing'
        G.state = G.cards.map(() => 'down' as const)
        G.phase = 'paused'
        setTutorial('pares')
      }
      force()
    } else {
      G.total = G.time = LOOK_CFG[difficulty].pick
      G.round = -1
      await nextLook(my)
      if (my === token.current && !seen(TUT_LOOK)) {
        G.resume = G.phase
        G.phase = 'paused'
        setTutorial('look')
        force()
      }
    }
  }

  // ---------------------------------------------------------------- pares
  const flip = (i: number) => {
    const G = gRef.current
    if (G.phase !== 'playing' || G.busy || G.state[i] !== 'down' || G.sel.length >= 2) return
    G.state[i] = 'up'
    G.sel.push(i)
    playSfx('tap')
    if (G.sel.length === 2) {
      const [a, b] = G.sel
      G.busy = true
      if (G.cards[a].pair === G.cards[b].pair) {
        G.combo++
        G.bestCombo = Math.max(G.bestCombo, G.combo)
        G.score += PAIR_SCORE.match + Math.min(PAIR_SCORE.comboMax, PAIR_SCORE.combo * (G.combo - 1))
        G.matches++
        later(() => {
          G.state[a] = G.state[b] = 'matched'
          G.sel = []
          G.busy = false
          playSfx(G.combo >= 3 ? 'combo' : 'serve')
          setLive(`Par encontrado: ${G.cards[a].piece.label}`)
          if (G.matches === GRID[G.difficulty].pairs) finishPairs(true)
          force()
        }, 420)
      } else {
        G.errors++
        G.combo = 0
        G.score = Math.max(0, G.score - PAIRS_CFG[G.difficulty].wrongPenalty)
        later(() => playSfx('bad'), 380)
        later(() => {
          G.state[a] = G.state[b] = 'down'
          G.sel = []
          G.busy = false
          force()
        }, PAIRS_CFG[G.difficulty].hideMs)
      }
    }
    force()
  }

  const finishPairs = (all: boolean) => {
    const G = gRef.current
    if (G.phase === 'done') return
    G.bonus = all ? Math.round(Math.max(0, G.time) * PAIR_SCORE.timeBonus) : 0
    G.finalScore = G.score + G.bonus
    const th = pairsStarTh(G.difficulty)
    const stars = starsFor(G.finalScore, th)
    G.settled = settle({ rankId: 'memoria', difficulty: G.difficulty, score: G.finalScore, typical: pairsTypical(G.difficulty), stars, profession: PROF, playerName: useProfileStore.getState().name })
    later(() => {
      G.phase = 'done'
      playSfx(stars >= 2 ? 'done' : 'serve')
      force()
    }, all ? 450 : 0)
    if (!all) {
      G.phase = 'done'
      playSfx('bad')
    }
    force()
  }

  // ---------------------------------------------------------------- Lembre o look
  const nextLook = async (my: number) => {
    const G = gRef.current
    const pool = poolRef.current!
    G.round++
    if (G.round >= LOOK_CFG[G.difficulty].rounds) return finishLook()
    const r = rng(G.seed + G.round * 977)
    G.look = buildLook(pool, G.difficulty, r)
    G.idx = 0
    G.picks = G.look.pieces.map(() => null)
    G.feedback = null
    G.roundCorrect = 0
    G.phase = 'loading'
    force()
    await preloadPieces(G.look.pieces, 7000)
    if (my !== token.current) return
    void preloadPieces(G.look.options.flat(), 12000)
    G.memLeft = LOOK_CFG[G.difficulty].memorize
    G.phase = 'memorize'
    force()
  }

  const toChoose = () => {
    const G = gRef.current
    if (G.phase !== 'memorize') return
    G.phase = 'choose'
    G.time = G.total = LOOK_CFG[G.difficulty].pick
    playSfx('click')
    force()
  }

  const answer = (opt: number) => {
    const G = gRef.current
    if (G.phase !== 'choose' || G.feedback || !G.look) return
    const piece = G.look.pieces[G.idx]
    const chosen = opt >= 0 ? G.look.options[G.idx][opt] : null
    const ok = !!chosen && pieceKey(chosen) === pieceKey(piece)
    G.asked++
    G.picks[G.idx] = opt
    if (ok) {
      G.correct++
      G.roundCorrect++
      G.combo++
      G.bestCombo = Math.max(G.bestCombo, G.combo)
      const speed = Math.round(LOOK_SCORE.speed * Math.max(0, G.time / G.total))
      G.score += LOOK_SCORE.right + speed + Math.min(LOOK_SCORE.comboMax, LOOK_SCORE.combo * (G.combo - 1))
      playSfx(G.combo >= 3 ? 'combo' : 'serve')
      setLive(`Certo: ${piece.label}`)
    } else {
      G.errors++
      G.combo = 0
      playSfx('bad')
      setLive(`Era: ${piece.label}${piece.colorName ? `, ${piece.colorName}` : ''}`)
    }
    G.feedback = { idx: opt, ok }
    force()
    const my = token.current
    later(() => {
      if (my !== token.current) return
      G.feedback = null
      if (G.idx + 1 < G.look!.pieces.length) {
        G.idx++
        G.time = G.total
        force()
      } else {
        if (G.roundCorrect === G.look!.pieces.length) {
          G.score += LOOK_SCORE.perfect
          G.perfectLooks++
        }
        G.phase = 'reveal'
        force()
        later(() => void nextLook(my), 2200)
      }
    }, ok ? 650 : 1500)
  }

  const finishLook = () => {
    const G = gRef.current
    G.bonus = G.perfectLooks * LOOK_SCORE.perfect
    G.finalScore = G.score
    const stars = starsFor(G.finalScore, lookStarTh(G.difficulty))
    G.settled = settle({ rankId: 'memoria-look', difficulty: G.difficulty, score: G.finalScore, typical: lookTypical(G.difficulty), stars, profession: PROF, playerName: useProfileStore.getState().name })
    G.phase = 'done'
    playSfx(stars >= 2 ? 'done' : 'serve')
    force()
  }

  // ganchos de DEV (automação de partidas e capturas)
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as { __memoria?: unknown }
    w.__memoria = {
      state: () => { const G = gRef.current; return { phase: G.phase, mode: G.mode, score: G.score, time: G.time, matches: G.matches, errors: G.errors, round: G.round, idx: G.idx, cards: G.cards.length } },
      /** pares: vira o próximo par (ou um erro) */
      solvePair: (wrong = false) => {
        const G = gRef.current
        const free = G.cards.map((c, i) => ({ c, i })).filter((x) => G.state[x.i] === 'down')
        if (!free.length) return
        const a = free[0]
        if (wrong) {
          const b = free.find((x) => x.c.pair !== a.c.pair)!
          flip(a.i)
          flip(b.i)
        } else {
          const b = free.find((x) => x.c.pair === a.c.pair && x.i !== a.i)!
          flip(a.i)
          flip(b.i)
        }
      },
      /** look: responde certo (ou errado) */
      solveLook: (wrong = false) => {
        const G = gRef.current
        if (G.phase === 'memorize') return toChoose()
        if (G.phase !== 'choose' || !G.look) return
        const piece = G.look.pieces[G.idx]
        const opts = G.look.options[G.idx]
        const k = opts.findIndex((o) => (pieceKey(o) === pieceKey(piece)) === !wrong)
        answer(k)
      },
      endNow: () => (gRef.current.mode === 'pares' ? finishPairs(false) : finishLook()),
    }
    return () => {
      delete w.__memoria
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ph = g.phase
  const th = g.mode === 'pares' ? pairsStarTh(g.difficulty) : lookStarTh(g.difficulty)
  const st = g.settled
  const rankId = g.mode === 'pares' ? 'memoria' : 'memoria-look'
  const title = 'Memória Fashion'
  const playing = ph === 'playing' || ph === 'choose' || ph === 'memorize'

  return (
    <div className={`nj mm${contrast ? ' nj--hc mm--hc' : ''}${labels ? ' mm--labels' : ''}`} data-phase={ph} data-mode={g.mode}>
      <TopBar
        title={title}
        time={ph === 'intro' ? 0 : ph === 'memorize' ? g.memLeft : g.time}
        total={ph === 'memorize' ? LOOK_CFG[g.difficulty].memorize : g.total}
        score={ph === 'intro' ? 0 : g.score}
        playing={playing}
        muted={muted}
        onExit={onExit}
        onMute={() => (setMuted(!muted), setMutedState(!muted))}
        onPause={pause}
        contrast={contrast}
        onContrast={() => (setPref(CONTRAST_KEY, !contrast), setContrast(!contrast))}
        low={g.mode === 'pares' ? 15 : 5}
        extra={
          g.combo > 1 ? <div className="nj-chip" aria-label={`Sequência de ${g.combo}`}><b>x{g.combo}</b><small>seq</small></div> : null
        }
      />
      <div className="mm-main">
        {g.mode === 'pares' && g.cards.length > 0 && ph !== 'intro' && <PairsBoard g={g} labels={labels} flip={flip} />}
        {g.mode === 'look' && g.look && ph !== 'intro' && <LookView g={g} answer={answer} ready={toChoose} labels={labels} />}
        {ph === 'loading' && <div className="mm-loading"><i className="mm-spin" />Preparando as peças…</div>}
      </div>
      <div className="sr-only" role="status" aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{live}</div>

      {ph === 'intro' && (
        <Overlay>
          <h1>Memória Fashion</h1>
          <div className="nj-seg nj-seg--mode" role="radiogroup" aria-label="Modo de jogo">
            <button role="radio" aria-checked={mode === 'pares'} className={mode === 'pares' ? 'on' : ''} onClick={() => (playSfx('tap'), setMode('pares'))}>
              Pares<small>Ache as peças iguais</small>
            </button>
            <button role="radio" aria-checked={mode === 'look'} className={mode === 'look' ? 'on' : ''} onClick={() => (playSfx('tap'), setMode('look'))}>
              Lembre o look<small>Decore e remonte</small>
            </button>
          </div>
          <div className="nj-cols">
          <div className="nj-col">
          <DiffPicker value={difficulty} onChange={setDifficulty} hints={mode === 'pares' ? HINT_PAIRS : HINT_LOOK} />
          </div>
          <div className="nj-col">
          <label className="nj-check"><input type="checkbox" checked={daily} onChange={(e) => setDaily(e.target.checked)} /><span>Desafio do dia: mesma partida para todas</span></label>
          <label className="nj-check"><input type="checkbox" checked={labels} onChange={(e) => (setPref(LABELS_KEY, e.target.checked), setLabels(e.target.checked))} /><span>Mostrar o nome das peças nas cartas</span></label>
          <div className="nj-stats">
            <div><b>{bestOf(mode === 'pares' ? 'memoria' : 'memoria-look', difficulty)}</b><small>Recorde ({DIFFICULTY_LABEL[difficulty]})</small></div>
            <div><b>{mode === 'pares' ? GRID_LABEL[difficulty] : `${LOOK_CFG[difficulty].rounds} looks`}</b><small>{mode === 'pares' ? `${PAIRS_CFG[difficulty].time}s de tempo` : `${LOOK_CFG[difficulty].pieces} peças cada`}</small></div>
          </div>
          </div>
          </div>
          <div className="nj-actions">
            <button className="nj-cta" onClick={() => void start()} disabled={!ready}>{ready ? 'Começar' : 'Carregando o catálogo…'}</button>
            <button className="nj-cta nj-cta--ghost" onClick={() => setTutorial(mode)}><IcoHelp />Como jogar</button>
            <button className="nj-cta nj-cta--ghost" onClick={onExit}>Sair</button>
          </div>
        </Overlay>
      )}
      {ph === 'paused' && !tutorial && (
        <Overlay>
          <h2>Pausado</h2>
          <p>As peças esperam por você.</p>
          <div className="nj-actions">
            <button className="nj-cta" onClick={resume}>Continuar</button>
            <button className="nj-cta nj-cta--ghost" onClick={() => setTutorial(g.mode)}>Como jogar</button>
            <button className="nj-cta nj-cta--ghost" onClick={onExit}>Sair</button>
          </div>
        </Overlay>
      )}
      {tutorial && (
        <Tutorial
          steps={tutorial === 'pares' ? TUT_P : TUT_L}
          onDone={() => {
            markSeen(tutorial === 'pares' ? TUT_PAIRS : TUT_LOOK)
            setTutorial(null)
            const G = gRef.current
            if (G.phase === 'paused') {
              if (G.mode === 'pares' && G.cards.length) {
                // depois do tutorial: olhada rápida (se houver) e jogo
                const pk = PAIRS_CFG[G.difficulty].peek
                G.phase = pk > 0 ? 'peek' : 'playing'
                if (pk > 0) (G.peekLeft = pk, (G.state = G.state.map((s) => (s === 'matched' ? s : 'up'))))
                force()
              } else resume()
            }
          }}
        />
      )}
      {ph === 'done' && st && (
        <ResultsCard
          message={['Treine mais a memória!', 'Boa memória!', 'Que olhar de estilista!', 'Memória de passarela!'][st.stars]}
          stars={st.stars}
          score={g.finalScore}
          best={bestOf(rankId, g.difficulty)}
          newBest={st.newBest}
          daily={g.daily}
          lines={
            g.mode === 'pares'
              ? [['Pares', `${g.matches} de ${GRID[g.difficulty].pairs}`], ['Erros', String(g.errors)], ['Melhor sequência', String(g.bestCombo)], ['Bônus de tempo', `+${g.bonus}`]]
              : [['Peças certas', `${g.correct} de ${g.asked}`], ['Looks perfeitos', String(g.perfectLooks)], ['Melhor sequência', String(g.bestCombo)], ['Bônus de looks perfeitos', `+${g.bonus}`]]
          }
          coins={st.coins}
          xp={st.xp}
          profXp={st.profXp}
          profession={PROF}
          board={st.board}
          rank={st.rank}
          thresholds={th}
          onAgain={() => void start()}
          onChange={() => {
            gRef.current.phase = 'intro'
            force()
          }}
          onExit={onExit}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------- tabuleiro de pares
function PairsBoard({ g, labels, flip }: { g: G; labels: boolean; flip: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [dim, setDim] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setDim({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setDim({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])
  const grid = GRID[g.difficulty]
  const N = g.cards.length
  const gap = grid.pairs > 12 ? 5 : 9
  // melhor arrumação exata (divisores de N) para a área disponível; a grade nominal vence empates
  let best = { cols: grid.cols, rows: grid.rows, cw: 0 }
  if (dim.w > 0 && dim.h > 0) {
    const size = (c: number, r: number) => Math.min((dim.w - gap * (c - 1)) / c, ((dim.h - gap * (r - 1)) / r) * 0.78)
    const nominal = dim.w > dim.h ? { cols: Math.max(grid.cols, grid.rows), rows: Math.min(grid.cols, grid.rows) } : { cols: Math.min(grid.cols, grid.rows), rows: Math.max(grid.cols, grid.rows) }
    best = { ...nominal, cw: size(nominal.cols, nominal.rows) }
    for (let c = 2; c <= N / 2; c++) {
      if (N % c) continue
      const r = N / c
      const cw = size(c, r)
      if (cw > best.cw * 1.12) best = { cols: c, rows: r, cw }
    }
  }
  const { cols } = best
  const cw = Math.max(20, best.cw)
  const ch = cw / 0.78
  return (
    <div className="mm-board" ref={ref}>
      <div className="mm-grid" style={{ gridTemplateColumns: `repeat(${cols}, ${cw}px)`, gridAutoRows: `${ch}px`, gap }} role="group" aria-label="Cartas">
        {g.cards.map((c, i) => {
          const s = g.state[i]
          const up = s !== 'down'
          return (
            <button
              key={c.uid}
              className={`mm-card${up ? ' up' : ''}${s === 'matched' ? ' matched' : ''}${g.sel.includes(i) && g.sel.length === 2 && g.cards[g.sel[0]].pair !== g.cards[g.sel[1]].pair ? ' wrong' : ''}`}
              onClick={() => flip(i)}
              disabled={g.phase !== 'playing'}
              aria-label={up ? `${c.piece.label}${c.piece.colorName ? `, ${c.piece.colorName}` : ''}${s === 'matched' ? ', par feito' : ''}` : `Carta ${i + 1}, virada para baixo`}
            >
              <span className="mm-inner">
                <span className="mm-face mm-face--back"><CardBack /></span>
                <span className="mm-face mm-face--front">
                  <PieceImg piece={c.piece} size={Math.round(cw * 0.6)} />
                  {labels && up && <em className="mm-name">{c.piece.colorName ? `${c.piece.label} · ${c.piece.colorName}` : c.piece.label}</em>}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Lembre o look
function LookView({ g, answer, ready, labels }: { g: G; answer: (i: number) => void; ready: () => void; labels: boolean }) {
  const look = g.look!
  const cfg = LOOK_CFG[g.difficulty]
  const showLook = g.phase === 'memorize' || g.phase === 'reveal' || g.phase === 'paused' && g.resume === 'memorize'
  const choose = g.phase === 'choose' || (g.phase === 'paused' && g.resume === 'choose')
  const piece = look.pieces[g.idx]
  return (
    <div className="mm-look">
      <div className="mm-look-head">
        <b>Look {Math.max(1, g.round + 1)} de {cfg.rounds}</b>
        {g.phase === 'memorize' && <span>Decore as peças: {Math.max(0, Math.ceil(g.memLeft))}s</span>}
        {g.phase === 'reveal' && <span>{g.roundCorrect} de {look.pieces.length} certas{g.roundCorrect === look.pieces.length ? ' · Look perfeito!' : ''}</span>}
        {choose && <span>Peça {g.idx + 1} de {look.pieces.length}</span>}
      </div>
      <div className={`mm-flat${showLook ? '' : ' mm-flat--mini'}`} aria-label="Look">
        {look.pieces.map((p, i) => {
          const shown = showLook || (choose && i < g.idx) || (choose && g.feedback && i === g.idx)
          const res = g.picks[i]
          const ok = res !== null && res !== undefined && res >= 0 && pieceKey(look.options[i][res]) === pieceKey(p)
          return (
            <div key={i} className={`mm-tile${shown ? ' shown' : ''}${g.phase === 'reveal' ? (ok ? ' ok' : ' bad') : ''}${choose && i === g.idx ? ' cur' : ''}`}>
              {shown ? <PieceImg piece={p} size={showLook ? 56 : 30} /> : <span className="mm-q">?</span>}
              <em>{SLOT_LABEL[p.slot]}{showLook && p.colorName ? ` · ${p.colorName}` : ''}</em>
            </div>
          )
        })}
      </div>
      {g.phase === 'memorize' && (
        <div className="nj-actions"><button className="nj-cta" onClick={ready}>Já decorei</button></div>
      )}
      {choose && piece && (
        <>
          <h3 className="mm-q-title">Qual era {SLOT_QUESTION[piece.slot]}?</h3>
          <div className="mm-opts" data-n={look.options[g.idx].length}>
            {look.options[g.idx].map((o, i) => {
              const fb = g.feedback
              const isRight = pieceKey(o) === pieceKey(piece)
              return (
                <button
                  key={pieceKey(o) + i}
                  className={`mm-opt${fb && isRight ? ' right' : ''}${fb && fb.idx === i && !fb.ok ? ' wrong' : ''}`}
                  onClick={() => answer(i)}
                  disabled={!!fb}
                  aria-label={`${o.label}${o.colorName ? `, ${o.colorName}` : ''}`}
                >
                  <PieceImg piece={o} size={56} />
                  {(labels || g.difficulty === 'facil') && <em>{o.colorName ? `${o.label} · ${o.colorName}` : o.label}</em>}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default MemoriaGame
