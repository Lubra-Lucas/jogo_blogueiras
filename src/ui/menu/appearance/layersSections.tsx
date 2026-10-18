import { useState, type ReactNode } from 'react'
import { defaultAppearanceFor, switchGender, type FaceLayers } from '../../../shared/appearance'
import {
  BEARD_STYLES,
  BROW_STYLES,
  CLASSIC_DEFAULTS,
  CONTOUR_STYLES,
  EYE_STYLES,
  FRECKLE_STYLES,
  GROUP_LABELS,
  LASH_STYLES,
  MOUTH_STYLES,
  NOSE_STYLES,
  PAINT_STYLES,
  forGender,
  mergeFace,
  setShapeControl,
  shapeControlValue,
  shapeGroups,
  type Extras,
  type KitGroup,
  type StyleOpt,
} from '../../../shared/faceLayers'
import { KIT_CONTOUR, KIT_FRECKLES, KIT_NOSE, KIT_PAINT } from '../../../shared/faceKit.generated'
import { FEM_SIX, TWELVE, type FemLook, type MaleLook } from '../../../shared/facePresets'
import { randomAppearance } from '../../../shared/randomAppearance'
import { BipolarSlider, Slider } from '../controls'
import * as D from './data'
import { Block, Choice, NamedSwatches, Row, Toggle, useLook } from './ui'

type FacePatch = { [K in keyof FaceLayers]?: Partial<FaceLayers[K]> }

/** Edita o rosto por camadas (mescla parcial); `group` junta arrastes de slider em uma entrada do historico. */
export function useFaceEdit() {
  const { a, edit } = useLook()
  const f = a.faceLayers
  const setF = (p: FacePatch, group?: string) => edit((x) => ({ ...x, faceLayers: mergeFace(x.faceLayers, p) }), group ?? 'fl')
  return { a, f, setF, edit, male: a.gender === 'male' }
}

// ------------------------------------------------------------------ genero
export { switchGender }

export function GenderBar() {
  const { a, edit } = useLook()
  return (
    <div className="cc-gender" role="group" aria-label="Gênero do modelo">
      {(['female', 'male'] as const).map((g) => (
        <button key={g} type="button" className="cc-opt" aria-pressed={a.gender === g} onClick={() => edit((x) => switchGender(x, g), 'gender')}>
          <span>{g === 'female' ? 'Feminino' : 'Masculino'}</span>
        </button>
      ))}
    </div>
  )
}

// ------------------------------------------------------------------ rostos prontos
function PresetCard({ p, onPick }: { p: MaleLook | FemLook; onPick: () => void }) {
  return (
    <button type="button" className="cc-card" onClick={onPick}>
      <b>{p.name}</b>
      <small>
        <i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 5, background: p.skin, marginRight: 6 }} />
        {p.face.beard.style !== 'none' ? 'com barba' : 'rosto limpo'}
      </small>
    </button>
  )
}

export function FacesSection() {
  const { a, edit, male } = useFaceEdit()
  const list: Array<MaleLook | FemLook> = male ? TWELVE : FEM_SIX
  const apply = (p: MaleLook | FemLook) =>
    edit((x) => ({ ...x, skin: { ...x.skin, tone: p.skin }, faceLayers: p.face, shape: { ...p.shape }, ...(male ? { hair: { ...x.hair, id: p.hair ? p.hair.id : null, color: p.hair?.color ?? x.hair.color, mode: 'solid' as const, color2: undefined } } : {}) }))
  const rnd = () => {
    const out = randomAppearance(Math.floor(Math.random() * 4294967296), { base: a, skin: false, hair: false, body: false, eyes: true })
    edit((x) => ({ ...x, faceLayers: out.faceLayers, shape: out.shape }))
  }
  return (
    <>
      <Block title={male ? 'Rostos prontos (masculinos)' : 'Rostos prontos (femininos)'} hint="Um ponto de partida: depois ajuste Formato, Olhos, Boca e o resto.">
        <div className="cc-cards">
          {list.map((p) => (
            <PresetCard key={p.name} p={p} onPick={() => apply(p)} />
          ))}
        </div>
      </Block>
      <Row>
        <button type="button" className="btn" onClick={rnd}>
          Aleatório (rosto)
        </button>
        <button type="button" className="btn" onClick={() => edit((x) => ({ ...x, faceLayers: defaultAppearanceFor(x.gender).faceLayers, shape: {} }))}>
          Zerar rosto
        </button>
      </Row>
    </>
  )
}

// ------------------------------------------------------------------ formato do rosto
export function ShapeSection() {
  const { a, edit } = useFaceEdit()
  return (
    <>
      {shapeGroups(a.gender).map((g) => (
        <Block key={g.id} title={g.label}>
          {g.controls.map((c) =>
            c.minus ? (
              <BipolarSlider
                key={c.id}
                label={c.label.split(' (')[0]}
                minusLabel={c.label.includes('(') ? c.label.split('(')[1].split('↔')[0].trim() : 'menos'}
                plusLabel={c.label.includes('↔') ? c.label.split('↔')[1].replace(')', '').trim() : 'mais'}
                value={shapeControlValue(a.shape, c)}
                onChange={(v) => edit((x) => ({ ...x, shape: setShapeControl(x.shape, c, v) }), `shape.${c.id}`)}
              />
            ) : (
              <Slider key={c.id} label={c.label} value={shapeControlValue(a.shape, c)} onChange={(v) => edit((x) => ({ ...x, shape: setShapeControl(x.shape, c, v) }), `shape.${c.id}`)} />
            ),
          )}
        </Block>
      ))}
      <Row>
        <button type="button" className="btn" onClick={() => edit((x) => ({ ...x, shape: {} }))}>
          Zerar formato
        </button>
      </Row>
    </>
  )
}

// ------------------------------------------------------------------ seletor de estilos com abas Natural / Glam / Divertido
const GROUPS: KitGroup[] = ['natural', 'glam', 'fun']

/** Grade de estilos filtrada por aba. A aba inicial e a do estilo escolhido; abas sem opcoes para o genero somem. */
function StylePicker({ list, value, onChange, gender, showNone }: { list: StyleOpt[]; value: string; onChange: (id: string) => void; gender: 'male' | 'female'; showNone?: boolean }) {
  const avail = forGender(list, gender).filter((s) => !s.hidden || s.id === value)
  const groupOf = avail.find((s) => s.id === value)?.group ?? 'natural'
  const [tab, setTab] = useState<KitGroup>(groupOf)
  const present = GROUPS.filter((g) => avail.some((s) => s.group === g && s.id !== 'none'))
  const cur = present.includes(tab) ? tab : (present[0] ?? 'natural')
  const shown = avail.filter((s) => s.group === cur && s.id !== 'none')
  const none = avail.find((s) => s.id === 'none')
  return (
    <>
      {present.length > 1 && (
        <div className="cc-tabs" role="tablist" aria-label="Tipo de estilo">
          {present.map((g) => (
            <button key={g} type="button" role="tab" className="cc-opt" aria-selected={cur === g} aria-pressed={cur === g} onClick={() => setTab(g)}>
              <span>{GROUP_LABELS[g]}</span>
            </button>
          ))}
        </div>
      )}
      <Choice options={[...(none || showNone ? [{ id: 'none', label: none?.label ?? 'Nenhum' }] : []), ...shown.map((s) => ({ id: s.id, label: s.label }))]} value={value} onChange={onChange} cols={2} />
    </>
  )
}

const optOf = (list: StyleOpt[], id: string) => list.find((s) => s.id === id)

export function EyeLayerSection() {
  const { f, setF, a } = useFaceEdit()
  const e = f.eye
  const classic = e.style === 'classic'
  const pick = (style: string) =>
    setF(
      style === 'classic'
        ? { eye: { style, lash: 'classic' }, brow: { style: 'classic', color: CLASSIC_DEFAULTS.brow }, mouth: { style: 'classic' } }
        : { eye: { style, lash: e.lash === 'classic' ? 'natural' : e.lash }, ...(f.brow.style === 'classic' ? { brow: { style: 'soft' } } : {}) },
    )
  return (
    <>
      <Block title="Estilo do olho">
        <StylePicker list={EYE_STYLES} value={e.style} onChange={pick} gender={a.gender} />
      </Block>
      <Block title="Cor da íris">
        <NamedSwatches list={D.EYE_NATURAL} value={e.iris} onChange={(c) => setF({ eye: { iris: c ?? e.iris } }, 'iris')} label="Cores naturais" />
        <div className="cc-sub">Fantasia</div>
        <NamedSwatches list={D.EYE_FANTASY} value={e.iris} onChange={(c) => setF({ eye: { iris: c ?? e.iris } }, 'iris')} label="Cores de fantasia" />
      </Block>
      {classic ? (
        <p className="cc-hint">O olho Clássico é a pintura original da boneca (com cílios, sobrancelha e sombreado dela): tamanho e posição são fixos. Escolha outro estilo para ajustar.</p>
      ) : (
        <Block title="Tamanho e posição">
          <Slider label="Tamanho" value={e.scale} min={0.5} max={2.4} onChange={(v) => setF({ eye: { scale: v } }, 'eye')} />
          <BipolarSlider label="Distância entre os olhos" minusLabel="juntos" plusLabel="separados" value={e.gap / 0.01} onChange={(v) => setF({ eye: { gap: v * 0.01 } }, 'eye')} />
          <BipolarSlider label="Altura" minusLabel="baixo" plusLabel="alto" value={e.y / 0.006} onChange={(v) => setF({ eye: { y: v * 0.006 } }, 'eye')} />
          <BipolarSlider label="Inclinação" minusLabel="para baixo" plusLabel="para cima" value={e.tilt / 12} onChange={(v) => setF({ eye: { tilt: v * 12 } }, 'eye')} />
        </Block>
      )}
      {!classic && (
        <Block title="Delineado">
          <Slider label="Intensidade do delineado" value={e.linerAmt} onChange={(v) => setF({ eye: { linerAmt: v } }, 'eyeliner')} />
          <NamedSwatches list={D.LINER_COLORS} value={e.liner} onChange={(c) => setF({ eye: { liner: c ?? e.liner } }, 'liner')} label="Cor do delineado" />
        </Block>
      )}
    </>
  )
}

export function LashLayerSection() {
  const { f, setF, a } = useFaceEdit()
  const e = f.eye
  const classic = e.style === 'classic'
  const fun = optOf(LASH_STYLES, e.lash)?.group === 'fun'
  return (
    <>
      <Block title="Cílios">
        {classic ? (
          <Choice options={[{ id: 'classic', label: 'Clássicos (tufos)' }, { id: 'none', label: 'Sem cílios' }]} value={e.lash} onChange={(lash) => setF({ eye: { lash } })} cols={2} />
        ) : (
          <StylePicker
            list={LASH_STYLES}
            value={e.lash}
            onChange={(lash) => setF({ eye: { lash, lashColor: optOf(LASH_STYLES, lash)?.group === 'fun' ? '#ffffff' : e.lashColor === '#ffffff' ? '#1a1416' : e.lashColor } })}
            gender={a.gender}
            showNone
          />
        )}
      </Block>
      {!classic && e.lash !== 'none' && (
        <Block title="Cor dos cílios" hint={fun ? 'Os cílios divertidos têm cores próprias: use branco para manter as cores originais.' : undefined}>
          <NamedSwatches list={D.LINER_COLORS} value={e.lashColor} onChange={(c) => setF({ eye: { lashColor: c ?? e.lashColor } }, 'lash')} label="Cor dos cílios" />
        </Block>
      )}
    </>
  )
}

const RGB_BROWS = ['glitter', 'rainbow']

export function BrowLayerSection() {
  const { f, setF, a } = useFaceEdit()
  const b = f.brow
  const classic = f.eye.style === 'classic'
  return (
    <>
      <Block title="Estilo">
        {classic ? (
          <p className="cc-hint">Com o olho Clássico a sobrancelha é a da pintura original. Escolha outro estilo de olho para trocar a sobrancelha.</p>
        ) : (
          <StylePicker
            list={BROW_STYLES}
            value={b.style}
            onChange={(style) => setF({ brow: { style, color: RGB_BROWS.includes(style) ? '#ffffff' : b.color === '#ffffff' ? '#5b4332' : b.color } })}
            gender={a.gender}
          />
        )}
      </Block>
      <Block title="Cor" hint={RGB_BROWS.includes(b.style) ? 'Este estilo tem cores próprias: use branco para mantê-las.' : undefined}>
        <NamedSwatches list={D.BROW_COLORS} value={b.color} onChange={(c) => setF({ brow: { color: c ?? b.color } }, 'bc')} label="Cor da sobrancelha" />
      </Block>
      <Block title="Espessura e posição">
        <Slider label="Intensidade" value={b.opacity} onChange={(v) => setF({ brow: { opacity: v } }, 'brow')} />
        {!classic && (
          <>
            <Slider label="Tamanho / espessura" value={b.scale} min={0.6} max={1.6} onChange={(v) => setF({ brow: { scale: v } }, 'brow')} />
            <BipolarSlider label="Altura" minusLabel="baixa" plusLabel="alta" value={b.y / 0.008} onChange={(v) => setF({ brow: { y: v * 0.008 } }, 'brow')} />
            <BipolarSlider label="Distância" minusLabel="juntas" plusLabel="separadas" value={b.gap / 0.01} onChange={(v) => setF({ brow: { gap: v * 0.01 } }, 'brow')} />
            <BipolarSlider label="Inclinação" minusLabel="para baixo" plusLabel="para cima" value={b.tilt / 12} onChange={(v) => setF({ brow: { tilt: v * 12 } }, 'brow')} />
          </>
        )}
      </Block>
    </>
  )
}

export function MouthLayerSection() {
  const { f, setF, a } = useFaceEdit()
  const m = f.mouth
  const female = a.gender === 'female'
  return (
    <>
      <Block title="Estilo da boca" hint={female ? 'Na boneca os lábios são esculpidos: o formato fino ou cheio vem de Formato do rosto; aqui você escolhe a tinta e estilos divertidos.' : undefined}>
        <StylePicker list={MOUTH_STYLES} value={m.style} onChange={(style) => setF({ mouth: { style } })} gender={a.gender} />
      </Block>
      <Block title="Cor">
        <NamedSwatches list={D.LIP_COLORS} value={m.color} onChange={(c) => setF({ mouth: { color: c ?? m.color } }, 'lc')} label="Cor da boca" />
        {['twotone', 'tongue'].includes(m.style) && (
          <>
            <div className="cc-sub">{m.style === 'tongue' ? 'Cor da língua' : 'Segunda cor (lábio de baixo)'}</div>
            <NamedSwatches list={D.LIP_COLORS} value={m.color2 ?? '#e8607f'} onChange={(c) => setF({ mouth: { color2: c ?? m.color2 } }, 'lc2')} label="Segunda cor" />
          </>
        )}
      </Block>
      <Block title="Brilho e intensidade">
        <Slider label="Brilho (gloss)" value={m.gloss} onChange={(v) => setF({ mouth: { gloss: v } }, 'mouth')} />
        <Slider label="Intensidade da cor" value={m.opacity} onChange={(v) => setF({ mouth: { opacity: v } }, 'mouth')} />
        {!female && <BipolarSlider label="Altura" minusLabel="baixa" plusLabel="alta" value={m.y / 0.006} onChange={(v) => setF({ mouth: { y: v * 0.006 } }, 'mouth')} />}
      </Block>
    </>
  )
}

export function BeardLayerSection() {
  const { f, setF, a } = useFaceEdit()
  const b = f.beard
  return (
    <>
      <Block title="Estilo">
        <StylePicker list={BEARD_STYLES} value={b.style} onChange={(style) => setF({ beard: { style } })} gender={a.gender} showNone />
      </Block>
      {b.style !== 'none' && (
        <Block title="Cor e densidade">
          <NamedSwatches list={D.HAIR_NATURAL} value={b.color} onChange={(c) => setF({ beard: { color: c ?? b.color } }, 'beardc')} label="Cor da barba" />
          <NamedSwatches list={D.HAIR_FANTASY} value={b.color} onChange={(c) => setF({ beard: { color: c ?? b.color } }, 'beardc')} label="Cores de fantasia" />
          <Slider label="Densidade" value={b.amount} onChange={(v) => setF({ beard: { amount: v } }, 'beard')} />
        </Block>
      )}
    </>
  )
}

// ------------------------------------------------------------------ nariz, sardas/pintas, contorno e pinturas de festa
type ExtraKey = keyof Extras
function ExtraBlock({ k, title, list, kit, gender }: { k: ExtraKey; title: string; list: StyleOpt[]; kit: Array<{ id: string; color?: string }>; gender: 'male' | 'female' }) {
  const { f, setF } = useFaceEdit()
  const x = f.extras[k]
  const set = (p: Partial<Extras[ExtraKey]>, group?: string) => setF({ extras: { [k]: p } as never }, group ?? `x.${k}`)
  return (
    <Block title={title}>
      <StylePicker
        list={list}
        value={x.style}
        gender={gender}
        showNone
        onChange={(style) => set({ style, color: kit.find((i) => i.id === style)?.color ?? x.color, amount: style === 'none' ? x.amount : Math.max(x.amount, 0.5) }, `x.${k}.s`)}
      />
      {x.style !== 'none' && (
        <>
          <Slider label="Intensidade" value={x.amount} onChange={(v) => set({ amount: v })} />
          <NamedSwatches list={k === 'paint' ? [...D.BLUSH_COLORS, ...D.EYE_FANTASY] : [...D.BLUSH_COLORS, ...D.BROW_COLORS]} value={x.color} onChange={(c) => set({ color: c ?? x.color }, `x.${k}.c`)} label="Cor" />
        </>
      )}
    </Block>
  )
}

export function NoseSection() {
  const { a } = useFaceEdit()
  return (
    <>
      <p className="cc-hint">Sombreado e contorno do nariz (camada de cor). O formato 3D do nariz fica em Formato do rosto.</p>
      <ExtraBlock k="nose" title="Nariz" list={NOSE_STYLES} kit={KIT_NOSE} gender={a.gender} />
    </>
  )
}

export function ExtrasSection() {
  const { a } = useFaceEdit()
  return (
    <>
      <ExtraBlock k="freckles" title="Sardas e pintas" list={FRECKLE_STYLES} kit={KIT_FRECKLES} gender={a.gender} />
      <ExtraBlock k="contour" title="Contorno, iluminador e idade" list={CONTOUR_STYLES} kit={KIT_CONTOUR} gender={a.gender} />
      <ExtraBlock k="paint" title="Pintura de festa e adesivos" list={PAINT_STYLES} kit={KIT_PAINT} gender={a.gender} />
      <SkinExtrasBlock />
    </>
  )
}

/** Rubor / sombreado das bochechas. */
export function SkinExtrasBlock(): ReactNode {
  const { f, setF, male } = useFaceEdit()
  return (
    <Block title="Rubor nas bochechas">
      <Slider label="Rubor / sombreado" value={f.blush.amount} onChange={(v) => setF({ blush: { amount: v } }, 'blush')} />
      <NamedSwatches list={D.BLUSH_COLORS} value={f.blush.color} onChange={(c) => setF({ blush: { color: c ?? f.blush.color } }, 'blushc')} label="Cor do rubor" />
      {!male && <Toggle label="Sombreado da pintura original (bochechas, testa, olhos)" on={!!f.blush.shade} onChange={(shade) => setF({ blush: { shade } })} />}
    </Block>
  )
}
