import { useEffect, useState } from 'react'
import { useAppearanceStore } from '../state/appearanceStore'
import { loadBaseMeta, type MorphMeta } from '../game/character/assets'
import { FINISH_LABELS, type Appearance, type SuitFinish } from '../shared/appearance'

/** Painel de desenvolvimento (precursor do editor de personagem): `?editor=1` ou `?view=character`. */
export function editorEnabled(): boolean {
  const q = new URLSearchParams(window.location.search)
  return q.get('editor') === '1' || q.get('view') === 'character'
}

export function EditorPanel() {
  const appearance = useAppearanceStore((s) => s.appearance)
  const setAppearance = useAppearanceStore((s) => s.setAppearance)
  const [open, setOpen] = useState(() => window.innerWidth > 700)
  const [morphs, setMorphs] = useState<MorphMeta[]>([])
  useEffect(() => {
    void loadBaseMeta('doll').then((m) => setMorphs(m.morphs))
  }, [])

  const patch = (p: Partial<Appearance>) => setAppearance({ ...appearance, ...p })
  const setMorph = (name: string, v: number) => patch({ morphs: { ...appearance.morphs, [name]: v } })
  const groups = [...new Set(morphs.map((m) => m.group))]
  const lips = appearance.lips ?? { color: '#da7076', gloss: 0.5 }

  return (
    <div className={`editor ${open ? 'editor--open' : ''}`}>
      <button className="editor-toggle" onClick={() => setOpen(!open)}>
        {open ? 'Fechar editor' : 'Editar personagem'}
      </button>
      {open && (
        <div className="editor-body">
          <h3>Cores</h3>
          <label className="editor-row">
            <span>Pele</span>
            <input type="color" value={appearance.skin.tone} onChange={(e) => patch({ skin: { tone: e.target.value } })} />
          </label>
          <label className="editor-row">
            <span>Macacão</span>
            <input type="color" value={appearance.suit.color} onChange={(e) => patch({ suit: { ...appearance.suit, color: e.target.value } })} />
          </label>
          <label className="editor-row">
            <span>Acabamento</span>
            <select value={appearance.suit.finish} onChange={(e) => patch({ suit: { ...appearance.suit, finish: e.target.value as SuitFinish } })}>
              {(Object.keys(FINISH_LABELS) as SuitFinish[]).map((f) => (
                <option key={f} value={f}>
                  {FINISH_LABELS[f]}
                </option>
              ))}
            </select>
          </label>
          <label className="editor-row">
            <span>Cabelo</span>
            <input type="color" value={appearance.hair.color} onChange={(e) => patch({ hair: { ...appearance.hair, color: e.target.value } })} />
          </label>
          <label className="editor-row">
            <span>Batom</span>
            <input type="color" value={lips.color} onChange={(e) => patch({ lips: { ...lips, color: e.target.value } })} />
          </label>
          {groups.map((g) => (
            <div key={g}>
              <h3>{g}</h3>
              {morphs
                .filter((m) => m.group === g)
                .map((m) => (
                  <label key={m.name} className="editor-row">
                    <span>{m.label}</span>
                    <input
                      type="range"
                      min={m.min}
                      max={m.max}
                      step={0.01}
                      value={appearance.morphs[m.name] ?? 0}
                      onChange={(e) => setMorph(m.name, Number(e.target.value))}
                    />
                  </label>
                ))}
            </div>
          ))}
          <button className="editor-reset" onClick={() => patch({ morphs: {} })}>
            Zerar formas
          </button>
        </div>
      )}
    </div>
  )
}
