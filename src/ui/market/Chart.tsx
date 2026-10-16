import { useEffect, useMemo, useRef, useState } from 'react'
import type { DayPoint } from '../../game/market/types'
import { fmt, pct } from './format'

/** Grafico de linha do preco (SVG proprio): area suave, grade discreta, volume em barras e dica ao tocar/passar o mouse. */
export function PriceChart({ points, height = 190 }: { points: DayPoint[]; height?: number }) {
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(480)
  const [hover, setHover] = useState<number | null>(null)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(Math.max(220, el.clientWidth)))
    ro.observe(el)
    setW(Math.max(220, el.clientWidth))
    return () => ro.disconnect()
  }, [])

  const g = useMemo(() => {
    const padL = 8
    const padR = 46
    const padT = 12
    const volH = 26
    const padB = 20 + volH
    const iw = w - padL - padR
    const ih = height - padT - padB
    const vals = points.map((p) => p.c)
    if (!vals.length) return null
    let lo = Math.min(...points.map((p) => p.l || p.c))
    let hi = Math.max(...points.map((p) => p.h || p.c))
    const span = Math.max(hi - lo, hi * 0.04)
    lo -= span * 0.12
    hi += span * 0.12
    const x = (i: number) => padL + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw)
    const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * ih
    const vmax = Math.max(1, ...points.map((p) => p.v))
    const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.c).toFixed(1)}`).join('')
    const area = `${path}L${x(points.length - 1).toFixed(1)},${padT + ih}L${x(0).toFixed(1)},${padT + ih}Z`
    return { padL, padR, padT, padB, iw, ih, lo, hi, x, y, vmax, path, area, volH }
  }, [points, w, height])

  if (!g || points.length < 2) return <div ref={box} className="mk-chart mk-chart--empty">Sem histórico suficiente ainda.</div>
  const first = points[0].c
  const last = points[points.length - 1].c
  const up = last >= first
  const tone = up ? 'var(--mk-up)' : 'var(--mk-down)'
  const ticks = [0, 0.5, 1].map((t) => g.lo + (g.hi - g.lo) * t)
  const hp = hover !== null ? points[hover] : null

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * w
    const i = Math.round(((px - g.padL) / g.iw) * (points.length - 1))
    setHover(Math.min(points.length - 1, Math.max(0, i)))
  }

  return (
    <div ref={box} className="mk-chart">
      <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label={`Preço nos últimos ${points.length} dias: de ${fmt(first)} a ${fmt(last)} Brilhos`}>
        <defs>
          <linearGradient id="mk-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={tone} stopOpacity="0.28" />
            <stop offset="1" stopColor={tone} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={g.padL} x2={w - g.padR} y1={g.y(t)} y2={g.y(t)} className="mk-chart__grid" />
            <text x={w - g.padR + 6} y={g.y(t) + 3.500} className="mk-chart__tick">
              {t >= 10000 ? `${(t / 1000).toFixed(1).replace('.', ',')}k` : fmt(t)}
            </text>
          </g>
        ))}
        <path d={g.area} fill="url(#mk-area)" />
        <path d={g.path} fill="none" stroke={tone} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <rect key={p.d} x={g.x(i) - Math.max(1, (g.iw / points.length) * 0.32)} width={Math.max(2, (g.iw / points.length) * 0.64)} y={height - 18 - (p.v / g.vmax) * g.volH} height={(p.v / g.vmax) * g.volH} className="mk-chart__vol" opacity={hover === i ? 1 : 0.55} rx="1" />
        ))}
        <text x={g.padL} y={height - 3} className="mk-chart__tick">
          há {points.length - 1} d
        </text>
        <text x={w - g.padR} y={height - 3} className="mk-chart__tick" textAnchor="end">
          hoje
        </text>
        <circle cx={g.x(points.length - 1)} cy={g.y(last)} r="3.600" fill={tone} stroke="var(--mk-paper)" strokeWidth="1.500" />
        {hp && hover !== null && (
          <g pointerEvents="none">
            <line x1={g.x(hover)} x2={g.x(hover)} y1={g.padT} y2={g.padT + g.ih} className="mk-chart__cursor" />
            <circle cx={g.x(hover)} cy={g.y(hp.c)} r="4.500" fill="var(--mk-paper)" stroke={tone} strokeWidth="2" />
            <g transform={`translate(${Math.min(Math.max(g.x(hover) - 62, 4), w - 130)},${g.padT + 2})`}>
              <rect width="124" height="38" rx="5" className="mk-chart__tip" />
              <text x="9" y="15" className="mk-chart__tipT">
                {fmt(hp.c)} Brilhos
              </text>
              <text x="9" y="30" className="mk-chart__tipS">
                {hover === points.length - 1 ? 'hoje' : `há ${points.length - 1 - hover} d`} · {hp.v} {hp.v === 1 ? 'negócio' : 'negócios'}
              </text>
            </g>
          </g>
        )}
      </svg>
      <div className="mk-chart__sum" style={{ color: tone }}>
        {pct(last / first - 1)} no período
      </div>
    </div>
  )
}
