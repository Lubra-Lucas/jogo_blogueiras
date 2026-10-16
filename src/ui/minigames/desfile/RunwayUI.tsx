import { useEffect, useRef, useState } from 'react'
import { POSES, useDesfileStore } from '../../../game/minigames/desfile/store'
import { POSE_FRAMES } from '../../../game/minigames/desfile/poses'
import type { PoseGrade } from '../../../game/minigames/desfile/types'

export const QTE_RING_MS = 1300
const PERFECT_MS = 95
const GOOD_MS = 220
/** toques mais de 380 ms antes do alvo são ignorados (não punem) */
const EARLY_IGNORE_MS = 380

export function gradeForDelta(deltaMs: number): PoseGrade {
  const a = Math.abs(deltaMs)
  return a <= PERFECT_MS ? 'perfect' : a <= GOOD_MS ? 'good' : 'miss'
}

const GRADE_TEXT: Record<PoseGrade, string> = { perfect: 'Perfeito!', good: 'Bom!', miss: 'Errou!' }

/** QTE de poses: um anel encolhe até o alvo; toque / espaço na batida. */
export function RunwayUI() {
  const stage = useDesfileStore((s) => s.runStage)
  const poseIdx = useDesfileStore((s) => s.poseIdx)
  const qte = useDesfileStore((s) => s.qte)
  const last = useDesfileStore((s) => s.lastGrade)
  const poses = useDesfileStore((s) => s.poses)
  const theme = useDesfileStore((s) => s.theme)
  const ring = useRef<HTMLDivElement>(null)
  const [tick, setTick] = useState(0)

  // anel: escala = 1 + 1.6 * restante/duração (1 = encaixou no alvo)
  useEffect(() => {
    if (!qte) return
    let raf = 0
    const loop = () => {
      const fix = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('dzqtefix') : null
      const left = fix ? Number(fix) : qte.targetAt - performance.now()
      const k = Math.max(0, left) / QTE_RING_MS
      if (ring.current) {
        ring.current.style.setProperty('--k', String(1 + 1.7 * k))
        const near = Math.abs(left) <= GOOD_MS
        ring.current.classList.toggle('near', near)
        ring.current.classList.toggle('hit', Math.abs(left) <= PERFECT_MS)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [qte])

  const tap = () => {
    const st = useDesfileStore.getState()
    const q = st.qte
    if (!q) return
    const d = performance.now() - q.targetAt
    if (d < -EARLY_IGNORE_MS) return
    st.recordPose(gradeForDelta(d))
  }
  const tapRef = useRef(tap)
  tapRef.current = tap

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        tapRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // reinicia a animação do aviso a cada nota
  useEffect(() => {
    if (last) setTick((n) => n + 1)
  }, [last?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="dz-runway-ui" onPointerDown={tap}>
      <div className="dz-theme-pill small" style={{ ['--g1' as string]: theme.gradient[0], ['--g2' as string]: theme.gradient[1] }}>
        <span>{theme.icon}</span> {theme.name}
      </div>
      {stage === 'poses' || stage === 'done' ? (
        <div className="dz-poses" aria-label="Poses">
          {Array.from({ length: POSES }, (_, i) => (
            <span key={i} className={`dz-pose-dot ${poses[i] ?? (i === poseIdx ? 'now' : '')}`}>
              {poses[i] ? (poses[i] === 'perfect' ? '★' : poses[i] === 'good' ? '✓' : '✕') : i + 1}
            </span>
          ))}
        </div>
      ) : (
        <div className="dz-hint">Desfile! Prepare-se: no fim da passarela toque no ritmo (ou aperte espaço) quando o anel encaixar.</div>
      )}
      {qte && (
        <div className="dz-qte" key={qte.id}>
          <div className="dz-qte-name">Pose {poseIdx + 1}: {POSE_FRAMES[poseIdx % POSE_FRAMES.length].name}</div>
          <div className="dz-qte-box">
            <div className="dz-qte-target" />
            <div className="dz-qte-ring" ref={ring} />
            <div className="dz-qte-tap">TOQUE</div>
          </div>
        </div>
      )}
      {last && (
        <div key={`${last.id}-${tick}`} className={`dz-grade ${last.grade}`}>
          {GRADE_TEXT[last.grade]}
        </div>
      )}
    </div>
  )
}
