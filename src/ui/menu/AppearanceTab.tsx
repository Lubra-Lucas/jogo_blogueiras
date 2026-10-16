import { useState } from 'react'
import { useAppearanceStore } from '../../state/appearanceStore'
import { FINISH_LABELS, type Appearance, type SuitFinish } from '../../shared/appearance'
import { BODY_SINGLES, FACE_MORPHS, MORPH_LABELS, MORPH_PAIRS, pairValue, withPairValue } from '../../game/character/morphConfig'
import { hairList } from '../../game/character/outfit'
import { RARITY_COLORS, tagsOf } from '../../game/character/itemTags'
import { BipolarSlider, Slider, Swatches } from './controls'
import { IconCheck, IconSave, IconUndo } from './icons'
import { SLOT_ICONS } from './icons'
import type { StageFocus } from './CharacterPreview'

type Section = 'rosto' | 'corpo' | 'pele' | 'cabelo'
const SECTIONS: Array<{ id: Section; label: string; focus: StageFocus }> = [
  { id: 'rosto', label: 'Rosto', focus: 'face' },
  { id: 'corpo', label: 'Corpo', focus: 'body' },
  { id: 'pele', label: 'Pele & Maquiagem', focus: 'face' },
  { id: 'cabelo', label: 'Cabelo', focus: 'hair' },
]

const SKIN_TONES = ['#fbe3d6', '#efcdbd', '#e3b89a', '#cf9a74', '#a87050', '#7a4a30', '#5a3422']
const LIP_COLORS = ['#da7076', '#e8909a', '#c93c5f', '#a8566e', '#ff6fa5', '#b0243a', '#8a4a5a', '#e9b3a8']
const SUIT_COLORS = ['#f39ab3', '#ffb3d1', '#c8a4ff', '#9fd8f5', '#9ff0d0', '#ffe9a8', '#16141a', '#ffffff']
const HAIR_COLORS = ['#f0d78c', '#d8b46e', '#c08a4e', '#816b58', '#3a2417', '#16110e', '#e8dcc8', '#e0587e', '#8f6bf0', '#4fb7e8']

export function AppearanceTab({ onFocus }: { onFocus: (f: StageFocus) => void }) {
  const [section, setSection] = useState<Section>('rosto')
  const appearance = useAppearanceStore((s) => s.appearance)
  const saved = useAppearanceStore((s) => s.saved)
  const setAppearance = useAppearanceStore((s) => s.setAppearance)
  const save = useAppearanceStore((s) => s.save)
  const revert = useAppearanceStore((s) => s.revert)
  const [justSaved, setJustSaved] = useState(false)

  const dirty = JSON.stringify(appearance) !== JSON.stringify(saved)
  const patch = (p: Partial<Appearance>) => setAppearance({ ...appearance, ...p })
  const setMorph = (name: string, v: number) => patch({ morphs: { ...appearance.morphs, [name]: v } })
  const lips = appearance.lips ?? { color: '#da7076', gloss: 0.5 }

  const go = (s: Section) => {
    setSection(s)
    onFocus(SECTIONS.find((x) => x.id === s)!.focus)
  }

  return (
    <>
      <div className="pills" role="tablist" aria-label="Seções da aparência">
        {SECTIONS.map((s) => (
          <button key={s.id} type="button" className="pill" aria-pressed={section === s.id} onClick={() => go(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="panel">
        {section === 'rosto' && (
          <>
            <h3>Rosto</h3>
            {FACE_MORPHS.map((n) => (
              <Slider key={n} label={MORPH_LABELS[n]} value={appearance.morphs[n] ?? 0} onChange={(v) => setMorph(n, v)} />
            ))}
          </>
        )}

        {section === 'corpo' && (
          <>
            <h3>Corpo</h3>
            {MORPH_PAIRS.map((p) => (
              <BipolarSlider key={p.id} label={p.label} minusLabel={p.minusLabel} plusLabel={p.plusLabel} value={pairValue(p, appearance.morphs)} onChange={(v) => patch({ morphs: withPairValue(p, appearance.morphs, v) })} />
            ))}
            {BODY_SINGLES.map((n) => (
              <Slider key={n} label={MORPH_LABELS[n]} value={appearance.morphs[n] ?? 0} onChange={(v) => setMorph(n, v)} />
            ))}
          </>
        )}

        {section === 'pele' && (
          <>
            <h3>Pele &amp; Maquiagem</h3>
            <div className="field-label">Tom de pele</div>
            <Swatches colors={SKIN_TONES} value={appearance.skin.tone} onChange={(tone) => patch({ skin: { tone } })} label="Tom de pele" />
            <div className="field-label">Batom</div>
            <Swatches colors={LIP_COLORS} value={lips.color} onChange={(color) => patch({ lips: { ...lips, color } })} label="Cor do batom" />
            <Slider label="Brilho dos lábios" value={lips.gloss} onChange={(gloss) => patch({ lips: { ...lips, gloss } })} />
            <div className="field-label">Base do corpo</div>
            <Swatches colors={SUIT_COLORS} value={appearance.suit.color} onChange={(color) => patch({ suit: { ...appearance.suit, color } })} label="Cor da base" />
            <div className="field-label">Acabamento</div>
            <div className="fin-chips">
              {(Object.keys(FINISH_LABELS) as SuitFinish[]).map((f) => (
                <button key={f} type="button" className="pill" aria-pressed={appearance.suit.finish === f} onClick={() => patch({ suit: { ...appearance.suit, finish: f } })}>
                  {FINISH_LABELS[f]}
                </button>
              ))}
            </div>
          </>
        )}

        {section === 'cabelo' && (
          <>
            <h3>Cabelo</h3>
            <div className="grid">
              <button type="button" className="card" aria-pressed={!appearance.hair.id} onClick={() => patch({ hair: { ...appearance.hair, id: null } })}>
                <span className="card__icon">{SLOT_ICONS.hair({ style: { color: '#b8b2c4' } })}</span>
                Sem cabelo
              </button>
              {hairList().map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className="card"
                  style={{ ['--rar' as string]: RARITY_COLORS[tagsOf(h.id).rarity] }}
                  aria-pressed={appearance.hair.id === h.id}
                  onClick={() => patch({ hair: { id: h.id, color: h.defaultColor } })}
                >
                  <span className="card__icon">{SLOT_ICONS.hair({ style: { color: h.defaultColor } })}</span>
                  {h.label}
                  {appearance.hair.id === h.id && (
                    <span className="card__eq">
                      <IconCheck />
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="field-label">Cor do cabelo</div>
            <Swatches colors={HAIR_COLORS} value={appearance.hair.color} onChange={(color) => patch({ hair: { ...appearance.hair, color } })} label="Cor do cabelo" />
          </>
        )}
      </div>

      <div className="actions">
        <button type="button" className="btn btn--primary" disabled={!dirty} onClick={() => (save(), setJustSaved(true), window.setTimeout(() => setJustSaved(false), 1800))}>
          <IconSave /> {justSaved && !dirty ? 'Salvo!' : 'Salvar'}
        </button>
        <button type="button" className="btn" disabled={!dirty} onClick={revert}>
          <IconUndo /> Desfazer
        </button>
        {(section === 'rosto' || section === 'corpo') && (
          <button type="button" className="btn" onClick={() => patch({ morphs: Object.fromEntries(Object.entries(appearance.morphs).filter(([k]) => (section === 'rosto') !== !FACE_MORPHS.includes(k))) })}>
            Zerar {section === 'rosto' ? 'rosto' : 'corpo'}
          </button>
        )}
        {dirty && <span className="unsaved">Alterações não salvas</span>}
      </div>
    </>
  )
}
