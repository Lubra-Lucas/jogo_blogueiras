import { useEffect, useState } from 'react'
import { CRITERION_LABEL, JUDGES, type Criterion } from '../../../game/minigames/desfile/scoring'
import { useDesfileStore } from '../../../game/minigames/desfile/store'
import { playSfx } from '../../../game/minigames/audio'

const ORDER: Criterion[] = ['theme', 'colors', 'creativity', 'poses']
const STEP_MS = 3200

/** As 3 juradas revelam as notas (tema, cores, criatividade, poses) uma por vez, com comentário. */
export function JudgesUI() {
  const result = useDesfileStore((s) => s.result)
  const [shown, setShown] = useState(1)

  useEffect(() => {
    playSfx('serve')
    const id = window.setInterval(() => {
      setShown((n) => {
        if (n < JUDGES.length) {
          playSfx('tip')
          return n + 1
        }
        return n
      })
    }, STEP_MS)
    return () => window.clearInterval(id)
  }, [])

  if (!result) return null
  const done = shown >= JUDGES.length
  const cur = Math.min(shown, JUDGES.length) - 1
  const j = JUDGES[cur]
  const r = result.judges.find((x) => x.judgeId === j.id)!

  return (
    <div className="dz-judges">
      <div className="dz-judge-chips">
        {JUDGES.map((jj, i) => {
          const rr = result.judges.find((x) => x.judgeId === jj.id)!
          return (
            <button key={jj.id} className={`dz-jchip${i === cur ? ' on' : ''}${i < shown ? '' : ' hidden'}`} disabled={i >= shown} onClick={() => setShown(Math.max(shown, i + 1))}>
              <span>{jj.emoji}</span>
              <b>{i < shown ? rr.total.toFixed(1) : '?'}</b>
            </button>
          )
        })}
      </div>
      <div className="dz-card dz-judge-card" key={j.id}>
        <header>
          <span className="dz-avatar">{j.emoji}</span>
          <div>
            <h2 className="dz-title small">{j.name}</h2>
            <small>{j.title}</small>
          </div>
          <div className="dz-total">
            {r.total.toFixed(1)}
            <small>/10</small>
          </div>
        </header>
        <div className="dz-scores">
          {ORDER.map((k, i) => (
            <div className="dz-score" key={k} style={{ ['--d' as string]: `${i * 0.35}s` }}>
              <span>{CRITERION_LABEL[k]}</span>
              <div className="dz-bar">
                <i style={{ ['--w' as string]: `${r.scores[k] * 10}%` }} />
              </div>
              <b>{r.scores[k]}</b>
            </div>
          ))}
        </div>
        <p className="dz-comment">“{r.comment}”</p>
        <div className="dz-row">
          {done ? (
            <button className="dz-btn primary" onClick={() => (playSfx('done'), useDesfileStore.getState().showResults())}>
              Ver o ranking 🏆
            </button>
          ) : (
            <button className="dz-btn ghost" onClick={() => setShown((n) => n + 1)}>
              Próxima jurada ›
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
