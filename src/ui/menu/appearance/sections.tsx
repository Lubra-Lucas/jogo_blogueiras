import { useState } from 'react'
import { useAppearanceStore, LOOK_SLOTS } from '../../../state/appearanceStore'
import { NUDE_UNDER, DEFAULT_APPEARANCE, type Appearance, type SuitFinish, FINISH_LABELS } from '../../../shared/appearance'
import { MORPH_LABELS, MORPH_PAIRS, pairValue, withPairValue } from '../../../game/character/morphConfig'
import { hairList } from '../../../game/character/outfit'
import { RARITY_COLORS, tagsOf } from '../../../game/character/itemTags'
import { MAKEUP_LOOKS, applyMakeupLook } from '../../../game/character/makeup/presets'
import { decodeLook, encodeLook, stripUnowned } from '../../../state/looks'
import { BipolarSlider, Slider } from '../controls'
import { IconCheck, SLOT_ICONS } from '../icons'
import * as D from './data'
import { Block, Choice, NamedSwatches, Row, Toggle, useLook } from './ui'
import { randomLook } from './random'

const FACE_GROUPS: Array<[string, string[]]> = [
  ['Formato do rosto', ['faceThin', 'jawNarrow', 'chinPointed', 'cheekbonesHigh']],
  ['Olhos e sobrancelhas', ['eyesBig', 'browLift']],
  ['Nariz', ['noseSmall', 'noseNarrow']],
  ['Boca', ['lipsFull', 'lipsWide']],
]

function PresetCards({ list, onPick, current }: { list: D.MorphPreset[]; onPick: (p: D.MorphPreset) => void; current?: string }) {
  return (
    <div className="cc-cards">
      {list.map((p) => (
        <button key={p.id} type="button" className="cc-card" aria-pressed={current === p.id} onClick={() => onPick(p)}>
          <b>{p.label}</b>
          <small>{p.note}</small>
        </button>
      ))}
    </div>
  )
}

export function FaceSection() {
  const { a, edit } = useLook()
  const set = (k: string, v: number) => edit((x) => ({ ...x, morphs: { ...x.morphs, [k]: v } }), `m.${k}`)
  const match = (ps: D.MorphPreset[], keys: string[]) => ps.find((p) => keys.every((k) => Math.abs((a.morphs[k] ?? 0) - (p.morphs[k] ?? 0)) < 0.01))?.id
  return (
    <>
      <Block title="Rostos prontos" hint="Um ponto de partida: depois é só ajustar os controles abaixo.">
        <PresetCards list={D.FACE_PRESETS} current={match(D.FACE_PRESETS, D.FACE_KEYS)} onPick={(p) => edit((x) => D.applyMorphGroup(x, D.FACE_KEYS, p.morphs))} />
      </Block>
      {FACE_GROUPS.map(([t, keys]) => (
        <Block key={t} title={t}>
          {keys.map((k) => (
            <Slider key={k} label={MORPH_LABELS[k]} value={a.morphs[k] ?? 0} onChange={(v) => set(k, v)} />
          ))}
        </Block>
      ))}
      <Row>
        <button type="button" className="btn" onClick={() => edit((x) => D.applyMorphGroup(x, D.FACE_KEYS, {}))}>
          Zerar rosto
        </button>
        <button
          type="button"
          className="btn"
          onClick={() =>
            edit((x) =>
              D.applyMorphGroup(
                x,
                D.FACE_KEYS,
                Object.fromEntries(D.FACE_KEYS.map((k) => [k, Math.round(Math.random() * 70) / 100])),
              ),
            )
          }
        >
          Rosto aleatório
        </button>
      </Row>
      <p className="cc-hint">Todos os controles do rosto são simétricos: os dois lados mudam juntos.</p>
    </>
  )
}

export function EyesSection() {
  const { a, mk, edit, editMk } = useLook()
  const eyes = a.eyes ?? { color: null, ring: 0.35 }
  const setEyes = (p: Partial<NonNullable<Appearance['eyes']>>) => edit((x) => ({ ...x, eyes: { ...(x.eyes ?? { color: null, ring: 0.35 }), ...p } }), 'eyes')
  const hetero = eyes.colorR !== undefined && eyes.colorR !== null && eyes.colorR !== eyes.color
  return (
    <>
      <Block title="Cor dos olhos">
        <NamedSwatches list={D.EYE_NATURAL} value={eyes.color} onChange={(c) => setEyes({ color: c, colorR: hetero ? eyes.colorR : null })} label="Cor da íris" allowNone />
        <div className="cc-sub">Fantasia</div>
        <NamedSwatches list={D.EYE_FANTASY} value={eyes.color} onChange={(c) => setEyes({ color: c, colorR: hetero ? eyes.colorR : null })} label="Cor da íris (fantasia)" />
        <Toggle label="Olhos de cores diferentes (heterocromia)" on={hetero} onChange={(on) => setEyes({ colorR: on ? (eyes.color === '#26b9b0' ? '#8a5bd6' : '#26b9b0') : null, color: eyes.color ?? '#5a9fd4' })} />
        {hetero && <NamedSwatches list={[...D.EYE_NATURAL, ...D.EYE_FANTASY]} value={eyes.colorR ?? null} onChange={(c) => setEyes({ colorR: c })} label="Cor do outro olho" />}
        <Slider label="Anel escuro da íris" value={eyes.ring} onChange={(v) => setEyes({ ring: v })} />
      </Block>
      <Block title="Sombra">
        <Choice options={D.SHADOW_STYLES} value={mk.eyeshadow.style} onChange={(style) => editMk('eyeshadow', { style })} glyph="shadow" cols={3} />
        {mk.eyeshadow.style !== 'none' && (
          <>
            <div className="cc-sub">Cor principal</div>
            <NamedSwatches list={D.SHADOW_COLORS} value={mk.eyeshadow.c1} onChange={(c) => editMk('eyeshadow', { c1: c ?? mk.eyeshadow.c1 })} label="Cor da pálpebra" />
            <div className="cc-sub">Cor de transição</div>
            <NamedSwatches list={D.SHADOW_COLORS} value={mk.eyeshadow.c2} onChange={(c) => editMk('eyeshadow', { c2: c ?? mk.eyeshadow.c2 })} label="Cor de transição" />
            <Slider label="Intensidade" value={mk.eyeshadow.intensity} onChange={(v) => editMk('eyeshadow', { intensity: v })} />
            <Slider label="Brilho (shimmer)" value={mk.eyeshadow.shimmer} onChange={(v) => editMk('eyeshadow', { shimmer: v })} />
          </>
        )}
      </Block>
      <Block title="Delineado">
        <Choice options={D.LINER_STYLES} value={mk.eyeliner.style} onChange={(style) => editMk('eyeliner', { style })} glyph="liner" cols={3} />
        {mk.eyeliner.style !== 'none' && (
          <>
            <NamedSwatches list={D.LINER_COLORS} value={mk.eyeliner.color} onChange={(c) => editMk('eyeliner', { color: c ?? mk.eyeliner.color })} label="Cor do delineado" />
            <Slider label="Espessura" value={mk.eyeliner.thickness} onChange={(v) => editMk('eyeliner', { thickness: v })} />
          </>
        )}
      </Block>
      <Block title="Cílios">
        <Choice options={D.LASH_STYLES} value={mk.lashes.style} onChange={(style) => editMk('lashes', { style })} glyph="lashes" cols={2} />
        <NamedSwatches list={D.LINER_COLORS.slice(0, 5)} value={mk.lashes.color} onChange={(c) => editMk('lashes', { color: c ?? mk.lashes.color })} label="Cor dos cílios" />
        {mk.lashes.style !== 'natural' && <Slider label="Comprimento" value={mk.lashes.length} onChange={(v) => editMk('lashes', { length: v })} />}
      </Block>
      <Block title="Formato">
        <Slider label="Olhos grandes" value={a.morphs.eyesBig ?? 0} onChange={(v) => edit((x) => ({ ...x, morphs: { ...x.morphs, eyesBig: v } }), 'm.eyesBig')} />
      </Block>
    </>
  )
}

export function BrowsSection() {
  const { a, mk, edit, editMk } = useLook()
  return (
    <>
      <Block title="Formato">
        <Choice options={D.BROW_STYLES} value={mk.brows.style} onChange={(style) => editMk('brows', { style })} glyph="brow" cols={3} />
      </Block>
      <Block title="Cor">
        <NamedSwatches list={D.BROW_COLORS} value={mk.brows.color} onChange={(c) => editMk('brows', { color: c ?? mk.brows.color })} label="Cor da sobrancelha" />
      </Block>
      {mk.brows.style !== 'painted' && (
        <Block title="Espessura">
          <Slider label="Espessura" value={mk.brows.thickness} onChange={(v) => editMk('brows', { thickness: v })} />
        </Block>
      )}
      <Block title="Posição">
        <Slider label="Sobrancelhas altas" value={a.morphs.browLift ?? 0} onChange={(v) => edit((x) => ({ ...x, morphs: { ...x.morphs, browLift: v } }), 'm.browLift')} />
      </Block>
    </>
  )
}

export function LipsSection() {
  const { a, mk, edit, editMk } = useLook()
  const lips = a.lips ?? { color: '#da7076', gloss: 0.5 }
  const setLips = (p: Partial<typeof lips>) => edit((x) => ({ ...x, lips: { ...(x.lips ?? lips), ...p } }), 'lips')
  return (
    <>
      <Block title="Cor do batom">
        <NamedSwatches list={D.LIP_COLORS} value={lips.color} onChange={(c) => setLips({ color: c ?? lips.color })} label="Cor do batom" />
      </Block>
      <Block title="Acabamento">
        <Choice options={D.LIP_FINISHES} value={mk.lips.finish} onChange={(finish) => editMk('lips', { finish })} glyph="lip" cols={4} />
        <Slider label="Brilho" value={lips.gloss} onChange={(v) => setLips({ gloss: v })} />
      </Block>
      <Block title="Contorno e degradê">
        <Toggle label="Lápis no contorno (overline)" on={!!mk.lips.liner} onChange={(on) => editMk('lips', { liner: on ? '#7d3a44' : null })} />
        {mk.lips.liner && <NamedSwatches list={D.LIP_COLORS} value={mk.lips.liner} onChange={(c) => editMk('lips', { liner: c })} label="Cor do lápis" />}
        <Toggle label="Lábios degradê (ombré)" on={!!mk.lips.ombre} onChange={(on) => editMk('lips', { ombre: on ? '#ff8a80' : null })} />
        {mk.lips.ombre && <NamedSwatches list={D.LIP_COLORS} value={mk.lips.ombre} onChange={(c) => editMk('lips', { ombre: c })} label="Cor do centro" />}
      </Block>
      <Block title="Formato">
        {['lipsFull', 'lipsWide'].map((k) => (
          <Slider key={k} label={MORPH_LABELS[k]} value={a.morphs[k] ?? 0} onChange={(v) => edit((x) => ({ ...x, morphs: { ...x.morphs, [k]: v } }), `m.${k}`)} />
        ))}
      </Block>
    </>
  )
}

export function MakeupSection() {
  const { a, mk, edit, editMk } = useLook()
  const toggleMark = (m: (typeof mk.marks)[number]) => editMk('marks', (mk.marks.includes(m) ? mk.marks.filter((x) => x !== m) : [...mk.marks, m]) as never)
  return (
    <>
      <Block title="Looks prontos" hint="Aplica sombra, delineado, blush, batom e detalhes de uma vez.">
        <div className="cc-cards">
          {MAKEUP_LOOKS.map((l) => (
            <button key={l.id} type="button" className="cc-card" onClick={() => edit((x) => applyMakeupLook(x, l))}>
              <span className="cc-card__dots">
                {[l.makeup.eyeshadow && (l.makeup.eyeshadow as { c1?: string }).c1, (l.makeup.blush as { color?: string } | undefined)?.color, l.lips.color].filter(Boolean).map((c, i) => (
                  <i key={i} style={{ background: c as string }} />
                ))}
              </span>
              <b>{l.label}</b>
              <small>{l.note}</small>
            </button>
          ))}
        </div>
        <button type="button" className="btn" onClick={() => edit((x) => ({ ...x, makeup: DEFAULT_APPEARANCE.makeup }))}>
          Remover maquiagem
        </button>
      </Block>
      <Block title="Base e contorno">
        <Slider label="Cobertura da base" value={mk.foundation.coverage} onChange={(v) => editMk('foundation', { coverage: v })} />
        <BipolarSlider label="Tom da base" minusLabel="mais escuro" plusLabel="mais claro" value={mk.foundation.shift} onChange={(v) => editMk('foundation', { shift: v })} />
        <Slider label="Contorno" value={mk.contour} onChange={(v) => editMk('contour', v as never)} />
      </Block>
      <Block title="Iluminador">
        <Slider label="Intensidade" value={mk.highlighter.amount} onChange={(v) => editMk('highlighter', { amount: v })} />
        {mk.highlighter.amount > 0 && <NamedSwatches list={D.HIGHLIGHT_COLORS} value={mk.highlighter.color} onChange={(c) => editMk('highlighter', { color: c ?? mk.highlighter.color })} label="Cor do iluminador" />}
      </Block>
      <Block title="Blush">
        <Choice options={D.BLUSH_STYLES} value={mk.blush.style} onChange={(style) => editMk('blush', { style })} glyph="blush" cols={4} />
        {mk.blush.style !== 'none' && (
          <>
            <NamedSwatches list={D.BLUSH_COLORS} value={mk.blush.color} onChange={(c) => editMk('blush', { color: c ?? mk.blush.color })} label="Cor do blush" />
            <Slider label="Intensidade" value={mk.blush.amount} onChange={(v) => editMk('blush', { amount: v })} />
          </>
        )}
      </Block>
      <Block title="Sardas e pintinhas">
        <Slider label="Sardas" value={mk.freckles} onChange={(v) => editMk('freckles', v as never)} />
        <div className="cc-pills">
          {D.MARK_SPOTS.map((m) => (
            <button key={m.id} type="button" className="pill" aria-pressed={mk.marks.includes(m.id)} onClick={() => toggleMark(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
      </Block>
      <Block title="Glitter">
        <Slider label="Quantidade" value={mk.glitter.amount} onChange={(v) => editMk('glitter', { amount: v })} />
        {mk.glitter.amount > 0 && <NamedSwatches list={D.GLITTER_COLORS} value={mk.glitter.color} onChange={(c) => editMk('glitter', { color: c ?? mk.glitter.color })} label="Cor do glitter" />}
      </Block>
      <Block title="Pedrinhas e adesivos">
        <Choice options={D.GEM_STYLES} value={mk.gems.style} onChange={(style) => editMk('gems', { style })} cols={3} />
        {mk.gems.style !== 'none' && (
          <>
            <Choice options={D.GEM_KINDS} value={mk.gems.kind} onChange={(kind) => editMk('gems', { kind })} cols={4} />
            <NamedSwatches list={D.GEM_COLORS} value={mk.gems.color} onChange={(c) => editMk('gems', { color: c ?? mk.gems.color })} label="Cor da pedrinha" />
          </>
        )}
      </Block>
      <Block title="Tatuagem temporária">
        <Choice options={D.TATTOO_STYLES} value={mk.tattoo.style} onChange={(style) => editMk('tattoo', { style })} cols={3} />
        {mk.tattoo.style !== 'none' && <NamedSwatches list={D.TATTOO_COLORS} value={mk.tattoo.color} onChange={(c) => editMk('tattoo', { color: c ?? mk.tattoo.color })} label="Cor da tatuagem" />}
      </Block>
      <p className="cc-hint">Cor dos olhos, sombra, delineado e cílios ficam em Olhos; batom em Lábios.</p>
      {a.hair.id === null && null}
    </>
  )
}

export function SkinSection() {
  const { a, edit } = useLook()
  const base = a.suit.base ?? 'color'
  const nudeOn = a.suit.color.toLowerCase() === NUDE_UNDER
  const setSuit = (p: Partial<Appearance['suit']>) => edit((x) => ({ ...x, suit: { ...x.suit, ...p } }), 'suit')
  return (
    <>
      <Block title="Tom de pele" hint="Do muito claro ao muito profundo, com subtom indicado.">
        <div className="cc-tones">
          {D.SKIN_TONES.map((t) => (
            <button key={t.id} type="button" className="cc-tone" aria-pressed={a.skin.tone.toLowerCase() === t.hex} onClick={() => edit((x) => ({ ...x, skin: { ...x.skin, tone: t.hex } }))} title={`${t.label} (${t.note})`}>
              <i style={{ background: t.hex }} />
              <span>{t.label}</span>
              <small>{t.note}</small>
            </button>
          ))}
        </div>
        <NamedSwatches list={[]} value={a.skin.tone} onChange={(c) => edit((x) => ({ ...x, skin: { ...x.skin, tone: c ?? x.skin.tone } }), 'tone')} label="Tom personalizado" />
      </Block>
      <Block title="Acabamento da pele">
        <Choice options={(Object.keys(D.SKIN_FINISH_LABELS) as Array<keyof typeof D.SKIN_FINISH_LABELS>).map((id) => ({ id, label: D.SKIN_FINISH_LABELS[id] }))} value={a.skin.finish ?? 'natural'} onChange={(finish) => edit((x) => ({ ...x, skin: { ...x.skin, finish } }))} cols={4} />
      </Block>
      <Block title="Detalhes do corpo">
        <Slider label="Sardas no colo e ombros" value={a.skin.bodyFreckles ?? 0} onChange={(v) => edit((x) => ({ ...x, skin: { ...x.skin, bodyFreckles: v } }), 'bf')} />
      </Block>
      <Block title="Base do corpo" hint="O que aparece sob roupas sem alça ou decotadas.">
        <Choice
          options={[
            { id: 'auto', label: 'Automática (some sob a roupa)' },
            { id: 'under', label: 'Collant sempre visível' },
            { id: 'color', label: 'Macacão colorido' },
          ]}
          value={base}
          onChange={(b) => setSuit({ base: b })}
          cols={2}
        />
        {base !== 'color' && <NamedSwatches list={D.BODY_BASE_COLORS} value={nudeOn ? NUDE_UNDER : a.suit.color} onChange={(c) => setSuit({ color: c ?? a.suit.color })} label="Cor da base" />}
        {base === 'color' && (
          <Choice options={(Object.keys(FINISH_LABELS) as SuitFinish[]).map((f) => ({ id: f, label: FINISH_LABELS[f] }))} value={a.suit.finish} onChange={(finish) => setSuit({ finish })} cols={3} />
        )}
      </Block>
    </>
  )
}

export function BodySection() {
  const { a, edit } = useLook()
  const set = (k: string, v: number) => edit((x) => ({ ...x, morphs: { ...x.morphs, [k]: v } }), `m.${k}`)
  const cur = D.BODY_PRESETS.find((p) => D.BODY_KEYS.every((k) => Math.abs((a.morphs[k] ?? 0) - (p.morphs[k] ?? 0)) < 0.011))?.id
  return (
    <>
      <Block title="Silhuetas" hint="Todas as formas são bonitas: escolha a que combina com a sua personagem.">
        <PresetCards list={D.BODY_PRESETS} current={cur} onPick={(p) => edit((x) => D.applyMorphGroup(x, D.BODY_KEYS, p.morphs))} />
      </Block>
      <Block title="Ajustes">
        {MORPH_PAIRS.map((p) => (
          <BipolarSlider key={p.id} label={p.label} minusLabel={p.minusLabel} plusLabel={p.plusLabel} value={pairValue(p, a.morphs)} onChange={(v) => edit((x) => ({ ...x, morphs: withPairValue(p, x.morphs, v) }), `p.${p.id}`)} />
        ))}
        {['waistThin', 'hipsWide', 'thighsThick', 'shouldersNarrow'].map((k) => (
          <Slider key={k} label={MORPH_LABELS[k]} value={a.morphs[k] ?? 0} onChange={(v) => set(k, v)} />
        ))}
      </Block>
      <Row>
        <button type="button" className="btn" onClick={() => edit((x) => D.applyMorphGroup(x, D.BODY_KEYS, {}))}>
          Zerar corpo
        </button>
      </Row>
    </>
  )
}

export function HairSection() {
  const { a, edit } = useLook()
  const h = a.hair
  const setHair = (p: Partial<Appearance['hair']>, g?: string) => edit((x) => ({ ...x, hair: { ...x.hair, ...p } }), g ?? 'hair')
  const mode = h.mode ?? 'solid'
  return (
    <>
      <Block title="Penteado">
        <div className="grid">
          <button type="button" className="card" aria-pressed={!h.id} onClick={() => setHair({ id: null })}>
            <span className="card__icon">{SLOT_ICONS.hair({ style: { color: '#b8b2c4' } })}</span>
            Sem cabelo
          </button>
          {hairList().map((w) => (
            <button key={w.id} type="button" className="card" style={{ ['--rar' as string]: RARITY_COLORS[tagsOf(w.id).rarity] }} aria-pressed={h.id === w.id} onClick={() => setHair({ id: w.id, color: w.defaultColor, color2: undefined, mode: 'solid' })}>
              <span className="card__icon">{SLOT_ICONS.hair({ style: { color: w.defaultColor } })}</span>
              {w.label}
              {h.id === w.id && (
                <span className="card__eq">
                  <IconCheck />
                </span>
              )}
            </button>
          ))}
        </div>
      </Block>
      <Block title="Cor">
        <NamedSwatches list={D.HAIR_NATURAL} value={h.color} onChange={(c) => setHair({ color: c ?? h.color }, 'hc')} label="Cores naturais" />
        <div className="cc-sub">Fantasia</div>
        <NamedSwatches list={D.HAIR_FANTASY} value={h.color} onChange={(c) => setHair({ color: c ?? h.color }, 'hc')} label="Cores de fantasia" />
      </Block>
      <Block title="Coloração">
        <Choice
          options={[
            { id: 'solid', label: 'Uma cor' },
            { id: 'ombre', label: 'Ombré' },
            { id: 'highlights', label: 'Mechas' },
            { id: 'twotone', label: 'Duas cores' },
          ]}
          value={mode}
          onChange={(m) => setHair({ mode: m, color2: m === 'solid' ? undefined : (h.color2 ?? '#f283ad') })}
          cols={4}
        />
        {mode !== 'solid' && (
          <>
            <div className="cc-sub">{mode === 'highlights' ? 'Cor das mechas' : 'Segunda cor (pontas)'}</div>
            <NamedSwatches list={[...D.HAIR_NATURAL, ...D.HAIR_FANTASY]} value={h.color2 ?? h.color} onChange={(c) => setHair({ color2: c ?? h.color }, 'hc2')} label="Segunda cor" />
            <Slider label={mode === 'highlights' ? 'Quantidade de mechas' : 'Extensão da cor'} value={h.amount ?? 0.5} onChange={(v) => setHair({ amount: v }, 'hamt')} />
          </>
        )}
      </Block>
      <Block title="Brilho">
        <Slider label="Brilho do cabelo" value={h.gloss ?? 0.5} onChange={(v) => setHair({ gloss: v }, 'hgl')} />
      </Block>
    </>
  )
}

export function NailsSection() {
  const { mk, editMk } = useLook()
  const n = mk.nails
  return (
    <>
      <Block title="Estilo">
        <Choice options={D.NAIL_STYLES} value={n.style} onChange={(style) => editMk('nails', { style })} cols={3} />
      </Block>
      {n.style !== 'none' && (
        <>
          <Block title="Cor do esmalte">
            <NamedSwatches list={D.NAIL_COLORS} value={n.color} onChange={(c) => editMk('nails', { color: c ?? n.color })} label="Cor do esmalte" />
          </Block>
          {(n.style === 'french' || n.style === 'ombre' || n.style === 'glitter') && (
            <Block title={n.style === 'french' ? 'Cor da ponta' : n.style === 'glitter' ? 'Cor do brilho' : 'Segunda cor'}>
              <NamedSwatches list={D.NAIL_COLORS} value={n.color2} onChange={(c) => editMk('nails', { color2: c ?? n.color2 })} label="Segunda cor" />
            </Block>
          )}
          <Block title="Acabamento">
            <Choice
              options={[
                { id: 'gloss', label: 'Brilho' },
                { id: 'matte', label: 'Fosco' },
                { id: 'chrome', label: 'Cromado' },
              ]}
              value={n.finish}
              onChange={(finish) => editMk('nails', { finish })}
              cols={3}
            />
          </Block>
        </>
      )}
      <p className="cc-hint">A cor aparece nas pontas dos dedos das mãos. Luvas cobrem as unhas.</p>
    </>
  )
}

export function LooksSection() {
  const { a, edit } = useLook()
  const slots = useAppearanceStore((s) => s.slots)
  const saveSlot = useAppearanceStore((s) => s.saveSlot)
  const deleteSlot = useAppearanceStore((s) => s.deleteSlot)
  const renameSlot = useAppearanceStore((s) => s.renameSlot)
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null)
  const [names, setNames] = useState<Record<number, string>>({})
  const mine = encodeLook(a)
  const say = (t: string, ok = true) => {
    setMsg({ t, ok })
    window.setTimeout(() => setMsg(null), 3200)
  }
  return (
    <>
      <Block title="Meus looks" hint={`Guarde até ${LOOK_SLOTS} aparências neste aparelho.`}>
        <div className="cc-slots">
          {Array.from({ length: LOOK_SLOTS }, (_, i) => {
            const s = slots[i]
            return (
              <div key={i} className={`cc-slot${s ? ' is-full' : ''}`}>
                {s ? (
                  <>
                    <span className="cc-slot__dots">
                      <i style={{ background: s.appearance.skin.tone }} />
                      <i style={{ background: s.appearance.hair.color }} />
                      <i style={{ background: s.appearance.lips?.color ?? '#da7076' }} />
                    </span>
                    <input className="cc-slot__name" value={names[i] ?? s.name} maxLength={24} aria-label={`Nome do look ${i + 1}`} onChange={(e) => setNames({ ...names, [i]: e.target.value })} onBlur={() => names[i] !== undefined && names[i] !== s.name && renameSlot(i, names[i])} />
                    <button type="button" className="btn" onClick={() => (edit(() => stripUnowned(s.appearance)), say(`“${s.name}” aplicado.`))}>
                      Usar
                    </button>
                    <button type="button" className="btn" onClick={() => (saveSlot(i, names[i] ?? s.name), say('Look atualizado.'))}>
                      Salvar aqui
                    </button>
                    <button type="button" className="btn btn--danger" onClick={() => deleteSlot(i)} aria-label={`Apagar look ${i + 1}`}>
                      Apagar
                    </button>
                  </>
                ) : (
                  <>
                    <span className="cc-slot__empty">Espaço {i + 1} vazio</span>
                    <button type="button" className="btn btn--primary" onClick={() => (saveSlot(i), say('Look guardado.'))}>
                      Guardar o look atual
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </Block>
      <Block title="Compartilhar" hint="Copie o código para enviar a aparência a uma amiga, ou cole um código para vestir o look dela. Peças que você não tem ficam de fora.">
        <div className="cc-code">
          <input className="text-input" readOnly value={mine} aria-label="Seu código de look" onFocus={(e) => e.currentTarget.select()} />
          <button
            type="button"
            className="btn"
            onClick={() => {
              void navigator.clipboard?.writeText(mine).then(
                () => say('Código copiado.'),
                () => say('Não consegui copiar: selecione o código e copie.', false),
              )
            }}
          >
            Copiar
          </button>
        </div>
        <div className="cc-code">
          <input className="text-input" value={code} placeholder="Cole um código JB4-..." aria-label="Código para importar" onChange={(e) => setCode(e.target.value)} />
          <button
            type="button"
            className="btn btn--primary"
            disabled={!code.trim()}
            onClick={() => {
              const r = decodeLook(code)
              if (!r.ok) return say(r.error, false)
              edit(() => r.appearance)
              setCode('')
              say(r.dropped > 0 ? `Look aplicado. ${r.dropped} peça(s) não possuída(s) ficaram de fora.` : 'Look aplicado.')
            }}
          >
            Importar
          </button>
        </div>
        {msg && (
          <p className={`cc-msg${msg.ok ? '' : ' is-err'}`} role="status">
            {msg.t}
          </p>
        )}
      </Block>
      <Block title="Surpresa">
        <Row>
          <button type="button" className="btn" onClick={() => edit((x) => randomLook(x, 'all'))}>
            Look aleatório
          </button>
          <button type="button" className="btn" onClick={() => edit((x) => randomLook(x, 'makeup'))}>
            Só maquiagem
          </button>
          <button type="button" className="btn" onClick={() => edit((x) => randomLook(x, 'hair'))}>
            Só cabelo
          </button>
        </Row>
      </Block>
    </>
  )
}
