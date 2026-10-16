import { useState, type ReactNode } from 'react'
import { BACKDROPS, GELS, KELVIN_MAX, KELVIN_MIN, PROPS, SIDE_LABEL, type LightSide } from '../../../game/minigames/foto/data'
import { tempLabelOf, ZOOM_MAX, ZOOM_MIN } from '../../../game/minigames/foto/logic'
import { useFotoStore } from '../../../game/minigames/foto/store'
import { IcBackdrop, IcBulb, IcGel, IcLock, IcMinus, IcPlus, IcProp, IcSideBack, IcSideLeft, IcSideRight, IcSideTop, IcTemp } from './icons'

const SIDE_ICON: Record<LightSide, () => ReactNode> = {
  esq: () => <IcSideLeft />,
  topo: () => <IcSideTop />,
  dir: () => <IcSideRight />,
  tras: () => <IcSideBack />,
}
type Tab = 'luz' | 'fundo' | 'extras'

export function ZoomRow() {
  const zoom = useFotoStore((s) => s.cam.zoom)
  const setCam = useFotoStore((s) => s.setCam)
  return (
    <div className="fg-zoom">
      <button className="fg-mini" aria-label="Afastar" onClick={() => setCam({ zoom: zoom / 1.25 })}>
        <IcMinus />
      </button>
      <input
        type="range" min={Math.log(ZOOM_MIN)} max={Math.log(ZOOM_MAX)} step="0.01" value={Math.log(zoom)}
        aria-label="Lente (aproximar)" onChange={(e) => setCam({ zoom: Math.exp(Number(e.target.value)) })}
      />
      <button className="fg-mini" aria-label="Aproximar" onClick={() => setCam({ zoom: zoom * 1.25 })}>
        <IcPlus />
      </button>
      <span className="fg-zoom-v">{zoom.toFixed(1)}x</span>
    </div>
  )
}

export function Controls() {
  const [tab, setTab] = useState<Tab>('luz')
  const light = useFotoStore((s) => s.light)
  const level = useFotoStore((s) => s.level)
  const setLight = useFotoStore((s) => s.setLight)

  return (
    <div className="fg-controls" data-tab={tab}>
      <div className="fg-tabs" role="tablist">
        {([['luz', 'Luz'], ['fundo', 'Fundo'], ['extras', 'Extras']] as [Tab, string][]).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      <section className="fg-sec" data-sec="luz">
        <label className="fg-row">
          <span className="fg-lab"><IcTemp size={18} /> Temperatura <b>{light.kelvin} K · {tempLabelOf(light.kelvin)}</b></span>
          <input
            className="fg-range fg-range-temp" type="range" min={KELVIN_MIN} max={KELVIN_MAX} step="50" value={light.kelvin}
            onChange={(e) => setLight({ kelvin: Number(e.target.value) })}
          />
        </label>
        <label className="fg-row">
          <span className="fg-lab"><IcBulb size={18} /> Intensidade <b>{Math.round(light.intensity * 100)}%</b></span>
          <input
            className="fg-range" type="range" min="0.2" max="2" step="0.05" value={light.intensity}
            onChange={(e) => setLight({ intensity: Number(e.target.value) })}
          />
        </label>
        <div className="fg-row">
          <span className="fg-lab">Lado da luz</span>
          <div className="fg-seg">
            {(['esq', 'topo', 'dir', 'tras'] as LightSide[]).map((s) => (
              <button key={s} className={light.side === s ? 'on' : ''} onClick={() => setLight({ side: s })} aria-label={SIDE_LABEL[s]} aria-pressed={light.side === s}>
                {SIDE_ICON[s]()}
                <span>{SIDE_LABEL[s]}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="fg-sec" data-sec="fundo">
        <div className="fg-row">
          <span className="fg-lab"><IcBackdrop size={18} /> Fundo de papel</span>
          <div className="fg-swatches">
            {BACKDROPS.map((b) => {
              const locked = b.level > level
              return (
                <button
                  key={b.id} className={'fg-sw' + (light.backdrop === b.id ? ' on' : '') + (locked ? ' locked' : '')} style={{ background: b.color }}
                  disabled={locked} aria-label={locked ? `${b.label} (nível ${b.level})` : b.label} title={locked ? `Nível ${b.level}` : b.label} onClick={() => setLight({ backdrop: b.id })}
                >
                  {locked && <IcLock size={14} />}
                </button>
              )
            })}
          </div>
        </div>
        <div className="fg-row">
          <span className="fg-lab"><IcGel size={18} /> Gel colorido</span>
          <div className="fg-swatches">
            {GELS.map((g) => {
              const locked = g.level > level
              return (
                <button
                  key={g.id} className={'fg-sw gel' + (light.gel === g.id ? ' on' : '') + (locked ? ' locked' : '')} style={{ background: g.id === 'nenhum' ? 'transparent' : g.color }}
                  disabled={locked} aria-label={locked ? `${g.label} (nível ${g.level})` : g.label} title={locked ? `Nível ${g.level}` : g.label} onClick={() => setLight({ gel: g.id })}
                >
                  {locked ? <IcLock size={14} /> : g.id === 'nenhum' ? <span className="fg-sw-x" /> : null}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <section className="fg-sec" data-sec="extras">
        <div className="fg-row">
          <span className="fg-lab"><IcProp size={18} /> Adereços no cenário</span>
          <div className="fg-chips">
            {PROPS.map((p) => {
              const locked = p.level > level
              return (
                <button key={p.id} className={'fg-chip' + (light.prop === p.id ? ' on' : '')} disabled={locked} onClick={() => setLight({ prop: p.id })}>
                  {locked && <IcLock size={13} />} {p.label}
                </button>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
