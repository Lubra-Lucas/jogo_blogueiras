import type { CSSProperties } from 'react'

/** Slider simples 0..1 (ou min..max). Mostra o preenchimento a partir da esquerda. */
export function Slider({ label, value, onChange, min = 0, max = 1 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  const pct = ((value - min) / (max - min)) * 100
  const style = { '--lo': '0%', '--hi': `${pct}%` } as CSSProperties
  return (
    <div className="sl">
      <div className="sl__top">
        <span>{label}</span>
        <small>{Math.round(pct)}%</small>
      </div>
      <input className="range" type="range" min={min} max={max} step={0.01} value={value} style={style} aria-label={label} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  )
}

/** Slider bipolar -1..1 (centro = neutro): esquerda = `minus`, direita = `plus`. */
export function BipolarSlider({ label, value, onChange, minusLabel, plusLabel }: { label: string; value: number; onChange: (v: number) => void; minusLabel: string; plusLabel: string }) {
  const pos = ((value + 1) / 2) * 100
  const lo = Math.min(50, pos)
  const hi = Math.max(50, pos)
  const style = { '--lo': `${lo}%`, '--hi': `${hi}%` } as CSSProperties
  const word = value === 0 ? 'neutro' : value < 0 ? `${minusLabel} ${Math.round(-value * 100)}%` : `${plusLabel} ${Math.round(value * 100)}%`
  return (
    <div className="sl">
      <div className="sl__top">
        <span>{label}</span>
        <small>{word}</small>
      </div>
      <input
        className="range range--bi"
        type="range"
        min={-1}
        max={1}
        step={0.02}
        value={value}
        style={style}
        aria-label={label}
        onChange={(e) => {
          const v = Number(e.target.value)
          onChange(Math.abs(v) < 0.04 ? 0 : v) // "imã" no centro
        }}
        onDoubleClick={() => onChange(0)}
      />
      <div className="sl__ends">
        <span>{minusLabel}</span>
        <span>{plusLabel}</span>
      </div>
    </div>
  )
}

/** Amostras de cor + seletor livre. */
export function Swatches({ colors, value, onChange, label }: { colors: string[]; value: string; onChange: (c: string) => void; label?: string }) {
  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()
  return (
    <div className="swatches" role="group" aria-label={label}>
      {colors.map((c) => (
        <button key={c} type="button" className="sw" style={{ background: c }} aria-label={c} aria-pressed={same(c, value)} onClick={() => onChange(c)} />
      ))}
      <label className="sw-custom" title="Cor personalizada">
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff'} onChange={(e) => onChange(e.target.value)} aria-label="Cor personalizada" />
      </label>
    </div>
  )
}
