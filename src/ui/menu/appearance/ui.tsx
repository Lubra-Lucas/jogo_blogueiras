import type { ReactNode } from 'react'
import { useAppearanceStore } from '../../../state/appearanceStore'
import type { Appearance, Makeup } from '../../../shared/appearance'
import { DEFAULT_MAKEUP, normalizeMakeup } from '../../../shared/appearance'
import { StyleGlyph } from './glyphs'
import type { Opt, Swatch } from './data'
import './appearance.css'

/** Aparencia ao vivo + escritor que sempre le o estado mais novo (sem fechamento velho em arrastes de slider). */
export function useLook() {
  const a = useAppearanceStore((s) => s.appearance)
  const edit = (fn: (a: Appearance) => Appearance, group?: string) => {
    const cur = useAppearanceStore.getState().appearance
    useAppearanceStore.getState().setAppearance(fn(cur), group)
  }
  const mk: Makeup = normalizeMakeup(a.makeup ?? DEFAULT_MAKEUP)
  const editMk = <K extends keyof Makeup>(key: K, patch: Makeup[K] extends object ? Partial<Makeup[K]> : Makeup[K], group?: string) =>
    edit((x) => {
      const cur = normalizeMakeup(x.makeup)
      const val = typeof cur[key] === 'object' && !Array.isArray(cur[key]) ? { ...(cur[key] as object), ...(patch as object) } : patch
      return { ...x, makeup: { ...cur, [key]: val } }
    }, group ?? `mk.${String(key)}`)
  return { a, mk, edit, editMk }
}

export function Block({ title, hint, children, className = '' }: { title?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`cc-block ${className}`}>
      {title && <h4 className="cc-block__t">{title}</h4>}
      {hint && <p className="cc-hint">{hint}</p>}
      {children}
    </section>
  )
}

/** Grade de opcoes (com icone opcional). */
export function Choice<T extends string>({ options, value, onChange, glyph, cols }: { options: Array<Opt<T>>; value: T; onChange: (v: T) => void; glyph?: 'shadow' | 'liner' | 'lashes' | 'brow' | 'blush' | 'lip'; cols?: number }) {
  return (
    <div className="cc-choice" style={cols ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` } : undefined} role="group">
      {options.map((o) => (
        <button key={o.id} type="button" className="cc-opt" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {glyph && <StyleGlyph kind={glyph} id={o.id} />}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  )
}

/** Amostras de cor com nome (dica ao passar o mouse/segurar) + seletor livre. */
export function NamedSwatches({ list, value, onChange, label, allowNone }: { list: Swatch[]; value: string | null; onChange: (hex: string | null) => void; label: string; allowNone?: boolean }) {
  const same = (x: string | null, y: string) => !!x && x.toLowerCase() === y.toLowerCase()
  const custom = !!value && !list.some((s) => same(value, s.hex))
  return (
    <div className="cc-sw" role="group" aria-label={label}>
      {allowNone && (
        <button type="button" className="cc-sw__none" aria-pressed={value === null} onClick={() => onChange(null)} title="Original" aria-label="Original">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M5 19 19 5" />
          </svg>
        </button>
      )}
      {list.map((s) => (
        <button key={s.id} type="button" className="cc-sw__c" style={{ background: s.hex }} aria-pressed={same(value, s.hex)} title={s.note ? `${s.label} (${s.note})` : s.label} aria-label={s.label} onClick={() => onChange(s.hex)} />
      ))}
      <label className={`cc-sw__custom${custom ? ' is-on' : ''}`} title="Cor personalizada" style={custom ? { background: value ?? undefined } : undefined}>
        <input type="color" value={value && /^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff'} onChange={(e) => onChange(e.target.value)} aria-label="Cor personalizada" />
      </label>
    </div>
  )
}

export function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" className="cc-toggle" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span>{label}</span>
      <i aria-hidden />
    </button>
  )
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="cc-row">{children}</div>
}
