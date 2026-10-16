import { useEffect, useMemo, useRef, useState } from 'react'
import { DIFF, POSES } from '../../../game/minigames/foto/data'
import { live } from '../../../game/minigames/foto/live'
import {
  ASPECT, EYE_Y, FRAMING_LABEL, HEAD_TOP, exposure, histogram, idealCam, project, tempLabelOf, type Framing,
} from '../../../game/minigames/foto/logic'
import { useFotoStore } from '../../../game/minigames/foto/store'
import { IcFilm } from './icons'

const VW = 100
const VH = VW / ASPECT
const sx = (nx: number) => ((nx + 1) / 2) * VW
const sy = (ny: number) => ((1 - ny) / 2) * VH

const LOW: Record<Framing, number> = { close: 1.2, medio: 0.92, corpo: 0 }

/** silhueta-guia (onde a modelo deveria ficar no quadro) usando a câmera ideal do pedido */
function Guide({ framing, placement }: { framing: Framing; placement: 'centro' | 'terco_esq' | 'terco_dir' }) {
  const cam = idealCam(framing, placement)
  const P = (x: number, y: number) => {
    const [nx, ny] = project(cam, x, y)
    return [sx(nx), sy(ny)] as const
  }
  const [hx, hy] = P(0, 1.6)
  const [rx] = P(0.095, 1.6)
  const [, ry] = P(0, 1.6 - 0.125)
  const [lsx, lsy] = P(-0.21, 1.4)
  const [rsx] = P(0.21, 1.4)
  const low = LOW[framing]
  const [lbx, lby] = P(-0.17, Math.max(low, 0.9))
  const [rbx] = P(0.17, Math.max(low, 0.9))
  const [fx, fy] = P(0, 0)
  const [lfx] = P(-0.13, 0)
  const [rfx] = P(0.13, 0)
  const [, topY] = P(0, HEAD_TOP)
  return (
    <g className="fg-guide">
      <ellipse cx={hx} cy={hy} rx={Math.abs(rx - hx)} ry={Math.abs(ry - hy)} />
      <path d={`M${lsx} ${lsy} Q${hx} ${lsy - 2} ${rsx} ${lsy} L${rbx} ${lby} L${lbx} ${lby} Z`} />
      {framing === 'corpo' && <path d={`M${lbx + 1} ${lby} L${lfx} ${fy} M${rbx - 1} ${lby} L${rfx} ${fy} M${lfx - 3} ${fy} h${rfx - lfx + 6}`} />}
      <path className="fg-guide-line" d={`M${hx - 9} ${hy} h18 M${hx} ${hy - 9} v18`} />
      <path className="fg-guide-line" d={`M3 ${topY} h5 M${VW - 8} ${topY} h5`} />
      <text x={VW / 2} y={5} textAnchor="middle" className="fg-guide-text">{FRAMING_LABEL[framing]}</text>
      <circle cx={fx} cy={fy} r="0" />
    </g>
  )
}

function Meter() {
  const light = useFotoStore((s) => s.light)
  const diff = useFotoStore((s) => s.difficulty)
  const bars = useMemo(() => histogram(light), [light])
  const E = exposure(light)
  const needle = Math.min(0.97, Math.max(0.03, 0.5 + 0.34 * Math.log2(E)))
  const target = DIFF[diff].meterTarget
  return (
    <div className="fg-meter" aria-label="Medidor de luz">
      <div className="fg-meter-bars">
        {target && <span className="fg-meter-zone" />}
        {bars.map((b, i) => (
          <i key={i} style={{ height: `${Math.round(b * 100)}%` }} />
        ))}
        <span className="fg-meter-needle" style={{ left: `${needle * 100}%` }} />
      </div>
      <span className="fg-meter-txt">{E < 0.62 ? 'Escura' : E > 1.45 ? 'Estourada' : 'Exposição'} · {(Math.log2(E) >= 0 ? '+' : '') + Math.log2(E).toFixed(1)} EV</span>
    </div>
  )
}

/** Sobreposição do visor: grade, guias, foco, medidor, relógio, filme e retorno da foto. */
export function Hud() {
  const phase = useFotoStore((s) => s.phase)
  const client = useFotoStore((s) => s.clients[s.ci])
  const diff = useFotoStore((s) => s.difficulty)
  const film = useFotoStore((s) => s.film)
  const flash = useFotoStore((s) => s.flash)
  const feedback = useFotoStore((s) => s.feedback)
  const kelvin = useFotoStore((s) => s.light.kelvin)
  const cfg = DIFF[diff]
  const brackets = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const [poseName, setPoseName] = useState('')
  const [flashOn, setFlashOn] = useState(0)
  const lastFlash = useRef(flash)

  useEffect(() => {
    if (flash !== lastFlash.current) {
      lastFlash.current = flash
      setFlashOn((n) => n + 1)
    }
  }, [flash])

  useEffect(() => {
    let raf = 0
    let acc = 0
    let last = performance.now()
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const dt = (now - last) / 1000
      last = now
      const el = brackets.current
      const host = frame.current
      if (el && host) {
        const [nx, ny] = project(live.cam, 0, EYE_Y - 0.03)
        const [wx] = project({ ...live.cam }, 0.17, 0)
        const [cx0] = project({ ...live.cam }, 0, 0)
        const w = Math.max(12, (wx - cx0) * 100)
        el.style.left = `${((nx + 1) / 2) * 100}%`
        el.style.top = `${((1 - ny) / 2) * 100}%`
        el.style.width = `${w}%`
        el.style.aspectRatio = '1 / 1.2'
        const inside = Math.abs(nx) < 0.8 && Math.abs(ny) < 0.85
        const locked = inside && live.speed < 0.15
        el.dataset.lock = locked ? '1' : inside ? '0' : '2'
        const peak = live.sample.phase === 'hold' && !live.sample.blink ? live.sample.peak : 0
        host.style.setProperty('--peak', cfg.peakCue ? peak.toFixed(2) : '0')
        acc += dt
        if (acc > 0.12) {
          acc = 0
          const name = cfg.poseName && phase === 'shoot' ? POSES[live.sample.phase === 'hold' || live.sample.blendP > 0.5 ? live.sample.pose : live.sample.prev].label : ''
          setPoseName((p) => (p === name ? p : name))
        }
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [cfg.peakCue, cfg.poseName, phase])

  return (
    <div className="fg-hud" ref={frame}>
      <div className="fg-peakring" />
      <svg className="fg-grid" viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" aria-hidden="true">
        <path d={`M${VW / 3} 0v${VH}M${(VW * 2) / 3} 0v${VH}M0 ${VH / 3}h${VW}M0 ${(VH * 2) / 3}h${VW}`} />
        {cfg.guides && client && phase === 'shoot' && <Guide framing={client.brief.framing} placement={client.brief.placement} />}
      </svg>
      <div className="fg-brackets" ref={brackets} data-lock="0">
        <i /><i /><i /><i />
      </div>
      {phase === 'shoot' && (
        <>
          <div className="fg-readout tl">{kelvin} K · {tempLabelOf(kelvin)}</div>
          <div className="fg-readout tr"><IcFilm size={14} /> {String(film).padStart(2, '0')}</div>
          {poseName && <div className="fg-readout bl">{poseName}</div>}
          <Meter />
        </>
      )}
      {flashOn > 0 && <div className="fg-flash" key={flashOn} />}
      {feedback && phase === 'shoot' && (
        <div className="fg-feedback" key={feedback.id} data-tier={feedback.total >= 85 ? 'a' : feedback.total >= 55 ? 'b' : 'c'}>
          <b>{feedback.text}</b>
          <span>{feedback.total}</span>
        </div>
      )}
    </div>
  )
}
