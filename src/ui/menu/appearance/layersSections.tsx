import type { ReactNode } from 'react'
import { defaultAppearanceFor, switchGender, type FaceLayers } from '../../../shared/appearance'
import {
  BEARD_STYLES,
  BROW_STYLES,
  CLASSIC_DEFAULTS,
  EYE_STYLES,
  LASH_STYLES,
  MOUTH_STYLES,
  mergeFace,
  setShapeControl,
  shapeControlValue,
  shapeGroups,
  type LayerBeardStyle,
  type LayerBrowStyle,
  type LayerEyeStyle,
  type LayerLashStyle,
  type LayerMouthStyle,
} from '../../../shared/faceLayers'
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
    edit((x) => ({ ...x, skin: { ...x.skin, tone: p.skin }, faceLayers: p.face, shape: { ...p.shape }, ...(male ? { hair: { ...x.hair, id: p.hair?.id ?? x.hair.id, color: p.hair?.color ?? x.hair.color, mode: 'solid' as const, color2: undefined } } : {}) }))
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

// ------------------------------------------------------------------ olhos / cilios / sobrancelhas / boca
const eyeOpts = (male: boolean) => EYE_STYLES.filter((s) => !(male && (s.id === 'classic'))).map((s) => ({ id: s.id as LayerEyeStyle, label: s.label }))

export function EyeLayerSection() {
  const { f, setF, male } = useFaceEdit()
  const e = f.eye
  const classic = e.style === 'classic'
  return (
    <>
      <Block title="Estilo do olho">
        <Choice
          options={eyeOpts(male)}
          value={e.style}
          onChange={(style) => setF({ eye: { style, lash: style === 'classic' ? 'classic' : e.lash === 'classic' ? 'natural' : e.lash } })}
          cols={2}
        />
      </Block>
      <Block title="Cor da íris">
        <NamedSwatches list={D.EYE_NATURAL} value={e.iris} onChange={(c) => setF({ eye: { iris: c ?? e.iris } }, 'iris')} label="Cores naturais" />
        <div className="cc-sub">Fantasia</div>
        <NamedSwatches list={D.EYE_FANTASY} value={e.iris} onChange={(c) => setF({ eye: { iris: c ?? e.iris } }, 'iris')} label="Cores de fantasia" />
      </Block>
      {classic ? (
        <p className="cc-hint">O olho Clássico é a pintura original da boneca: o tamanho e a posição são fixos. Escolha outro estilo para ajustar.</p>
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
  const { f, setF } = useFaceEdit()
  const e = f.eye
  const classic = e.style === 'classic'
  const opts: Array<{ id: LayerLashStyle; label: string }> = classic
    ? [
        { id: 'classic', label: 'Clássicos (tufos)' },
        { id: 'none', label: 'Sem cílios' },
      ]
    : LASH_STYLES.filter((l) => l.id !== 'classic').map((l) => ({ id: l.id as LayerLashStyle, label: l.label }))
  return (
    <>
      <Block title="Cílios">
        <Choice options={opts} value={e.lash} onChange={(lash) => setF({ eye: { lash } })} cols={2} />
      </Block>
      {!classic && e.lash !== 'none' && (
        <Block title="Cor dos cílios">
          <NamedSwatches list={D.LINER_COLORS} value={e.lashColor} onChange={(c) => setF({ eye: { lashColor: c ?? e.lashColor } }, 'lash')} label="Cor dos cílios" />
        </Block>
      )}
    </>
  )
}

export function BrowLayerSection() {
  const { f, setF, male } = useFaceEdit()
  const b = f.brow
  const opts = BROW_STYLES.filter((s) => !(male && s.id === 'classic')).map((s) => ({ id: s.id as LayerBrowStyle, label: s.label }))
  const classic = b.style === 'classic'
  return (
    <>
      <Block title="Estilo">
        <Choice options={opts} value={b.style} onChange={(style) => setF({ brow: { style, color: style === 'classic' ? CLASSIC_DEFAULTS.brow : b.color } })} cols={2} />
      </Block>
      <Block title="Cor">
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
  const { f, setF, male } = useFaceEdit()
  const m = f.mouth
  const opts: Array<{ id: LayerMouthStyle; label: string }> = MOUTH_STYLES.filter((s) => s.id !== 'classic').map((s) => ({ id: s.id as LayerMouthStyle, label: s.label }))
  return (
    <>
      {male ? (
        <Block title="Estilo da boca">
          <Choice options={opts} value={m.style} onChange={(style) => setF({ mouth: { style } })} cols={2} />
        </Block>
      ) : (
        <p className="cc-hint">Na boneca os lábios são esculpidos: aqui você escolhe a tinta e o brilho. Para lábios mais finos ou cheios, use Formato do rosto.</p>
      )}
      <Block title="Cor">
        <NamedSwatches list={D.LIP_COLORS} value={m.color} onChange={(c) => setF({ mouth: { color: c ?? m.color } }, 'lc')} label="Cor da boca" />
      </Block>
      <Block title="Brilho e intensidade">
        <Slider label="Brilho (gloss)" value={m.gloss} onChange={(v) => setF({ mouth: { gloss: v } }, 'mouth')} />
        <Slider label="Intensidade da cor" value={m.opacity} onChange={(v) => setF({ mouth: { opacity: v } }, 'mouth')} />
        {male && <BipolarSlider label="Altura" minusLabel="baixa" plusLabel="alta" value={m.y / 0.006} onChange={(v) => setF({ mouth: { y: v * 0.006 } }, 'mouth')} />}
      </Block>
    </>
  )
}

export function BeardLayerSection() {
  const { f, setF } = useFaceEdit()
  const b = f.beard
  const opts = BEARD_STYLES.map((s) => ({ id: s.id as LayerBeardStyle, label: s.label }))
  return (
    <>
      <Block title="Estilo">
        <Choice options={opts} value={b.style} onChange={(style) => setF({ beard: { style } })} cols={2} />
      </Block>
      {b.style !== 'none' && (
        <Block title="Cor e densidade">
          <NamedSwatches list={D.HAIR_NATURAL} value={b.color} onChange={(c) => setF({ beard: { color: c ?? b.color } }, 'beardc')} label="Cor da barba" />
          <Slider label="Densidade" value={b.amount} onChange={(v) => setF({ beard: { amount: v } }, 'beard')} />
        </Block>
      )}
    </>
  )
}

/** Blush, sombreado e (masculino) olheiras e linhas de expressao. */
export function SkinExtrasBlock(): ReactNode {
  const { f, setF, male } = useFaceEdit()
  return (
    <Block title="Rosto: rubor e detalhes">
      <Slider label="Rubor / sombreado das bochechas" value={f.blush.amount} onChange={(v) => setF({ blush: { amount: v } }, 'blush')} />
      <NamedSwatches list={D.BLUSH_COLORS} value={f.blush.color} onChange={(c) => setF({ blush: { color: c ?? f.blush.color } }, 'blushc')} label="Cor do rubor" />
      {!male && <Toggle label="Sombreado da pintura original (bochechas, testa, olhos)" on={!!f.blush.shade} onChange={(shade) => setF({ blush: { shade } })} />}
      {male && (
        <>
          <Slider label="Olheiras" value={f.detail.bags} onChange={(v) => setF({ detail: { bags: v } }, 'bags')} />
          <Slider label="Linhas de expressão" value={f.detail.lines} onChange={(v) => setF({ detail: { lines: v } }, 'lines')} />
        </>
      )}
    </Block>
  )
}
