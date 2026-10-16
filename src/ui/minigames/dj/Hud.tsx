import { useEffect, useState } from 'react'
import { LANE_LABEL } from '../../../game/minigames/dj/chart'
import { JUDGE_LABEL } from '../../../game/minigames/dj/run'
import { live, padDown, padUp, scratchInput, session } from '../../../game/minigames/dj/controller'
import { IcArrow, IcCrowd } from './icons'
import { LANE_COLORS } from './Highway'

interface Snap {
  score: number
  combo: number
  mult: number
  fever: boolean
  energy: number
  progress: number
  t: number
  jid: number
  j: keyof typeof JUDGE_LABEL
  jd: number
  accuracy: number
}

function snap(): Snap {
  return {
    score: live.score,
    combo: live.combo,
    mult: live.multiplier,
    fever: live.fever,
    energy: live.energySmooth,
    progress: Math.max(0, Math.min(1, live.t / Math.max(1, live.duration))),
    t: live.t,
    jid: live.lastJudge.id,
    j: live.lastJudge.j,
    jd: live.lastJudge.delta,
    accuracy: live.accuracy,
  }
}

export function Hud() {
  const [s, setS] = useState<Snap>(snap)
  useEffect(() => {
    const id = window.setInterval(() => setS(snap()), 60)
    return () => window.clearInterval(id)
  }, [])
  const crowd = session ? Math.round(s.energy * 100) : 0
  return (
    <>
      <div className="dj-progress">
        <i style={{ width: `${s.progress * 100}%` }} />
      </div>
      <div className="dj-hud-left">
        <div className="dj-score">{Math.round(s.score).toLocaleString('pt-BR')}</div>
        <div className="dj-acc">{s.accuracy.toFixed(1)}%</div>
      </div>
      <div className="dj-energy" aria-label="Energia da pista">
        <IcCrowd size={20} />
        <div className="dj-energy-bar">
          <i style={{ height: `${crowd}%` }} data-low={crowd < 25} />
        </div>
        <small>Pista</small>
      </div>
      {s.combo >= 2 && (
        <div className={`dj-combo${s.fever ? ' fever' : ''}`} key={s.fever ? 'f' : 'n'}>
          <b>{s.combo}</b>
          <span>combo · x{s.mult % 1 ? s.mult.toFixed(1) : s.mult}</span>
        </div>
      )}
      {s.fever && <div className="dj-fever">FEVER</div>}
      {s.jid > 0 && (
        <div className={`dj-judge j-${s.j}`} key={s.jid}>
          {JUDGE_LABEL[s.j]}
          {s.j !== 'miss' && Math.abs(s.jd) > 15 && <small>{s.jd > 0 ? 'tarde' : 'cedo'}</small>}
        </div>
      )}
      {s.t < 0 && <div className="dj-ready">Prepare-se</div>}
    </>
  )
}

/** Pads grandes (celular) e faixa de scratch. Combina com as pistas da cartela. */
export function Pads({ lanes }: { lanes: 2 | 4 }) {
  const [, force] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 50)
    return () => window.clearInterval(id)
  }, [])
  const colors = lanes === 4 ? LANE_COLORS : [LANE_COLORS[0], LANE_COLORS[2]]
  return (
    <div className="dj-controls">
      <div
        className="dj-scratch"
        onPointerDown={(e) => {
          e.preventDefault()
          scratchInput(0, e.timeStamp)
        }}
        style={{ touchAction: 'none' }}
      >
        <IcArrow dir={-1} size={18} />
        <span>Scratch</span>
        <small className="dj-keyhint">← →</small>
        <IcArrow dir={1} size={18} />
      </div>
      <div className="dj-pads" style={{ gridTemplateColumns: `repeat(${lanes}, 1fr)` }}>
        {Array.from({ length: lanes }, (_, l) => (
          <button
            key={l}
            className={`dj-pad${live.held[l] ? ' down' : ''}`}
            style={{ ['--pc' as string]: colors[l] }}
            onPointerDown={(e) => {
              e.preventDefault()
              ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
              padDown(l, e.timeStamp)
            }}
            onPointerUp={(e) => padUp(l, e.timeStamp)}
            onPointerCancel={(e) => padUp(l, e.timeStamp)}
           
          >
            <span>{LANE_LABEL[lanes][l]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
