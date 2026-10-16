import { useEffect, useRef, useState } from 'react'
import { DIFFICULTY_LABEL } from '../../../game/minigames/shared/competition'
import { startSong, quitToMenu, type DjResult } from '../../../game/minigames/dj/controller'
import { computeLatency, eventAudioTime, getCtx, getLatency, setLatency, startMetronome } from '../../../game/minigames/dj/engine'
import { IcStar } from './icons'

/* ============ Como jogar (3 passos) ============ */
const STEPS = [
  { title: 'Toque na hora certa', body: 'As notas descem até a linha brilhante. Toque na pista (ou use D F J K) no instante em que chegarem. Quanto mais perto do ritmo, mais pontos.', demo: 'tap' },
  { title: 'Segure as notas longas', body: 'Notas com cauda pedem que você mantenha o dedo (ou a tecla) até o fim. Soltar cedo quebra o combo.', demo: 'hold' },
  { title: 'Risque o disco', body: 'A faixa magenta é um scratch: toque ou deslize na faixa de baixo (setas do teclado no PC). Combo 30 liga o Fever e a pista lota.', demo: 'scratch' },
] as const

export function Tutorial({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0)
  const s = STEPS[i]
  return (
    <div className="dj-modal">
      <div className="dj-card tut">
        <div className="dj-tut-demo" data-demo={s.demo}>
          <div className="dj-tut-lanes">
            <span /> <span /> <span /> <span />
          </div>
          <i className="dj-tut-note" />
          <i className="dj-tut-note b" />
          <div className="dj-tut-line" />
        </div>
        <div className="dj-steps">
          {STEPS.map((_, k) => (
            <i key={k} className={k === i ? 'on' : ''} />
          ))}
        </div>
        <h2>{s.title}</h2>
        <p>{s.body}</p>
        <div className="dj-row">
          {i > 0 && (
            <button className="dj-btn" onClick={() => setI(i - 1)}>
              Voltar
            </button>
          )}
          <button className="dj-btn primary" onClick={() => (i < STEPS.length - 1 ? setI(i + 1) : onDone())}>
            {i < STEPS.length - 1 ? 'Próximo' : 'Entendi!'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ============ Calibração de latência ============ */
export function Calibrate({ onClose }: { onClose: () => void }) {
  const [stage, setStage] = useState<'intro' | 'run' | 'done'>('intro')
  const [taps, setTaps] = useState(0)
  const [result, setResult] = useState<number | null | undefined>(undefined)
  const clicks = useRef<number[]>([])
  const tapTimes = useRef<number[]>([])
  const timer = useRef(0)

  const start = () => {
    if (!getCtx()) return
    const m = startMetronome()
    clicks.current = m.times
    tapTimes.current = []
    setTaps(0)
    setStage('run')
    const wait = (m.times[m.times.length - 1] - getCtx()!.currentTime + 0.6) * 1000
    timer.current = window.setTimeout(() => {
      const lat = computeLatency(clicks.current, tapTimes.current)
      setResult(lat)
      setStage('done')
    }, wait)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const tap = (ts: number) => {
    if (stage !== 'run') return
    tapTimes.current.push(eventAudioTime(ts))
    setTaps((n) => n + 1)
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.code === 'Escape') return
      e.preventDefault()
      tap(e.timeStamp)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="dj-modal">
      <div className="dj-card">
        <h2>Calibrar o áudio</h2>
        {stage === 'intro' && (
          <>
            <p>Cada aparelho atrasa o som um pouquinho. Vão tocar 9 cliques: bata no botão (ou qualquer tecla) junto de cada clique. Fones de ouvido ajudam.</p>
            <p className="dj-hint">Ajuste atual: {Math.round(getLatency() * 1000)} ms</p>
            <div className="dj-row">
              <button className="dj-btn" onClick={onClose}>Cancelar</button>
              <button className="dj-btn primary" onClick={start}>Começar</button>
            </div>
          </>
        )}
        {stage === 'run' && (
          <>
            <p>Bata junto do clique! ({taps} toques)</p>
            <button className="dj-tapbtn" onPointerDown={(e) => tap(e.timeStamp)}>
              TOQUE
            </button>
          </>
        )}
        {stage === 'done' && (
          <>
            {result == null ? (
              <p>Não deu para medir. Tente de novo, batendo junto de cada clique.</p>
            ) : (
              <p>
                Seu atraso medido: <b>{Math.round(result * 1000)} ms</b>. Vamos compensar isso nas notas.
              </p>
            )}
            <div className="dj-row">
              <button className="dj-btn" onClick={() => setStage('intro')}>Repetir</button>
              {result != null && (
                <button
                  className="dj-btn primary"
                  onClick={() => {
                    setLatency(Math.max(-0.25, Math.min(0.25, result)))
                    onClose()
                  }}
                >
                  Salvar
                </button>
              )}
              {result == null && <button className="dj-btn primary" onClick={onClose}>Fechar</button>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ============ Resultado ============ */
const JL = { perfect: 'Perfeito', great: 'Ótimo', good: 'Bom', miss: 'Errou' } as const

export function Results({ r }: { r: DjResult }) {
  const idx = r.board.findIndex((e) => e.you)
  const top = r.board.slice(0, 5)
  const extra = idx >= 5 ? r.board[idx] : null
  return (
    <div className="dj-modal scroll">
      <div className="dj-card results">
        <div className="dj-res-head">
          <div className={`dj-grade g-${r.grade}`}>{r.grade}</div>
          <div>
            <h2>{r.songName}</h2>
            <p className="dj-hint">
              {DIFFICULTY_LABEL[r.difficulty]}
              {r.daily ? ' · Desafio do dia' : ''}
            </p>
            <div className="dj-stars">
              {[1, 2, 3].map((n) => (
                <IcStar key={n} size={30} on={n <= r.stars} />
              ))}
            </div>
          </div>
        </div>
        <div className="dj-stats">
          <div><small>Precisão</small><b>{r.accuracy.toFixed(1)}%</b></div>
          <div><small>Pontos</small><b>{r.score.toLocaleString('pt-BR')}</b></div>
          <div><small>Combo máx.</small><b>{r.maxCombo}</b></div>
          <div><small>Energia da pista</small><b>{Math.round(r.energy * 100)}%</b></div>
        </div>
        <div className="dj-counts">
          {(Object.keys(JL) as (keyof typeof JL)[]).map((k) => (
            <span key={k} className={`c-${k}`}>
              {JL[k]} <b>{r.counts[k]}</b>
            </span>
          ))}
        </div>
        {r.newBest && <div className="dj-newbest">Novo recorde pessoal!</div>}
        <div className="dj-rewards">
          <span>+{r.coins} Brilhos</span>
          <span>+{r.xp} XP</span>
          <span>+{r.profXp} XP de DJ</span>
        </div>
        {r.unlocked.length > 0 && <div className="dj-unlock">Novo item desbloqueado! Música: {r.unlocked.join(', ')}</div>}
        {r.levelAfter > r.levelBefore && <div className="dj-unlock">Nível de DJ {r.levelAfter}!</div>}
        <div className="dj-label">Ranking do dia — {r.rank}º lugar</div>
        <ol className="dj-board">
          {top.map((e, i) => (
            <li key={i} className={e.you ? 'you' : ''}>
              <span>{i + 1}</span>
              <em>{e.name}</em>
              <b>{e.score.toLocaleString('pt-BR')}</b>
            </li>
          ))}
          {extra && (
            <li className="you">
              <span>{idx + 1}</span>
              <em>{extra.name}</em>
              <b>{extra.score.toLocaleString('pt-BR')}</b>
            </li>
          )}
        </ol>
        <div className="dj-row">
          <button className="dj-btn" onClick={quitToMenu}>Menu</button>
          <button className="dj-btn primary" onClick={() => startSong()}>Tocar de novo</button>
        </div>
      </div>
    </div>
  )
}

export function Pause({ onResume, onRestart, onQuit }: { onResume: () => void; onRestart: () => void; onQuit: () => void }) {
  return (
    <div className="dj-modal">
      <div className="dj-card narrow">
        <h2>Pausado</h2>
        <div className="dj-col">
          <button className="dj-btn primary big" onClick={onResume}>Continuar</button>
          <button className="dj-btn" onClick={onRestart}>Recomeçar</button>
          <button className="dj-btn" onClick={onQuit}>Sair para o menu</button>
        </div>
      </div>
    </div>
  )
}

