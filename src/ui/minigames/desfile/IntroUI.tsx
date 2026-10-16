import { useState } from 'react'
import { getBest } from '../../../game/minigames/desfile/persist'
import { useDesfileStore } from '../../../game/minigames/desfile/store'
import { TAG_LABEL, type StyleTag } from '../../../game/minigames/desfile/types'
import { playSfx } from '../../../game/minigames/audio'

/** Cartão glamouroso do tema sorteado. */
export function IntroUI() {
  const theme = useDesfileStore((s) => s.theme)
  const [spin, setSpin] = useState(0)
  const best = getBest()[theme.id]
  const tags = (Object.entries(theme.tags) as [StyleTag, number][]).sort((a, b) => b[1] - a[1])
  return (
    <div className="dz-center">
      <div className="dz-card dz-theme" key={`${theme.id}${spin}`} style={{ ['--g1' as string]: theme.gradient[0], ['--g2' as string]: theme.gradient[1] }}>
        <div className="dz-theme-eyebrow">Tema do desfile</div>
        <div className="dz-theme-icon" aria-hidden>
          {theme.icon}
        </div>
        <h1 className="dz-title">{theme.name}</h1>
        <p className="dz-blurb">{theme.blurb}</p>
        <div className="dz-chips">
          {tags.map(([t, w]) => (
            <span key={t} className={`dz-chip${w >= 0.9 ? ' strong' : ''}`}>
              {TAG_LABEL[t]}
              <i>{w >= 0.9 ? '★★★' : w >= 0.5 ? '★★' : '★'}</i>
            </span>
          ))}
        </div>
        <div className="dz-swatches" aria-label="Cores do tema">
          {theme.colors.map((c) => (
            <span key={c} className="dz-sw" style={{ background: c }} />
          ))}
        </div>
        {best && (
          <div className="dz-best">
            Seu recorde: <b>{best.score100}</b> pts ({best.rank}º lugar)
          </div>
        )}
        <ul className="dz-rules">
          <li>🪞 90 s no camarim para montar o look</li>
          <li>💃 Desfile e 3 poses no ritmo</li>
          <li>⭐ 3 juradas dão nota ao tema, às cores e à criatividade</li>
        </ul>
        <div className="dz-row">
          <button
            className="dz-btn ghost"
            onClick={() => {
              playSfx('click')
              useDesfileStore.getState().redraw()
              setSpin((n) => n + 1)
            }}
          >
            🎲 Sortear outro
          </button>
          <button
            className="dz-btn primary"
            onClick={() => {
              playSfx('done')
              useDesfileStore.getState().enterCamarim()
            }}
          >
            Ir ao camarim
          </button>
        </div>
      </div>
    </div>
  )
}
