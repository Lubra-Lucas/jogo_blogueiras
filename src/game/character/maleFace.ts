import { Color, DataTexture, LinearMipmapLinearFilter, NoColorSpace, SRGBColorSpace, Texture, TextureLoader } from 'three'
import { KIT_BROWS, KIT_CONTOUR, KIT_EYES, KIT_FRECKLES, KIT_LASHES, KIT_MOUTHS, KIT_NOSE, KIT_PAINT, type KitStyle } from '../../shared/faceKit.generated'
import {
  DEFAULT_FACE_LAYERS,
  EYE_STYLES,
  type FaceLayers,
  type LayerBeardStyle,
  type LayerBrowStyle,
  type LayerEyeStyle,
  type LayerLashStyle,
  type LayerMouthStyle,
} from '../../shared/faceLayers'

export * from '../../shared/faceLayers'
export type MaleFace = FaceLayers
export const DEFAULT_MALE_FACE = DEFAULT_FACE_LAYERS
export type EyeStyle = LayerEyeStyle
export type LashStyle = LayerLashStyle
export type BrowStyle = LayerBrowStyle
export type MouthStyle = LayerMouthStyle
export type BeardStyle = LayerBeardStyle
// ------------------------------------------------------------------ texturas do kit
const BASE = import.meta.env.BASE_URL
export const FACE_KIT_URL = `${BASE}assets/characters/male/face/`
/** `?kv=<n>` forca recarregar o kit (usado nas capturas: o navegador headless guarda cache das PNGs) */
const KV = new URLSearchParams(window.location.search).get('kv') ?? ''
const loader = new TextureLoader()
const cache = new Map<string, Texture>()
/** textura transparente usada enquanto a imagem do kit nao chegou (senao o shader veria preto opaco) */
export const BLANK_LAYER = new DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1)
BLANK_LAYER.needsUpdate = true
const listeners = new Set<() => void>()
/** avisa quando qualquer imagem do kit termina de carregar (o material reaplica o rosto) */
export function onKitLoad(fn: () => void) {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}

/** Textura do kit: `BLANK_LAYER` ate carregar (e dispara onKitLoad); depois a imagem (cache global). */
export function kitTexture(file: string, color = false): Texture {
  let t = cache.get(file)
  if (!t) {
    t = loader.load(`${FACE_KIT_URL}${file}.png${KV ? `?v=${KV}` : ''}`, () => listeners.forEach((f) => f()))
    t.colorSpace = color ? SRGBColorSpace : NoColorSpace
    t.anisotropy = 8
    t.minFilter = LinearMipmapLinearFilter
    t.generateMipmaps = true
    cache.set(file, t)
  }
  return t.image ? t : BLANK_LAYER
}

const styleIdx = (list: KitStyle[], id: string) => list.find((k) => k.id === id)

export interface KitState {
  sclera: Texture
  /** olho: R brilho, G delineado, B iris (0,1 + 0,9 cinza); classico: RGBA (razao) */
  iris: Texture
  /** atlas de partes (sobrancelha, boca, cilios) ou, na Classica, classic_parts */
  parts: Texture
  blush: Texture
  extras: Texture
  paint: Texture
  beard: Texture
  /** celulas no atlas (-1 = nada) */
  browCell: number
  mouthCell: number
  lashCell: number
  browRgb: number
  /** escala/posicao dos cilios no olho: (sx, sy, offY) */
  lashG: [number, number, number]
  /** deslocamento horizontal da sobrancelha (m) */
  browDx: number
  /** indices: nose, freckles, contour, paint (-1 = desligado) e quantidades */
  xIdx: [number, number, number, number]
  xAmt: [number, number, number, number]
  xCol: [string, string, string, string]
  classic: boolean
}

const LASH_A0 = 0.016
const LASH_HU0 = 0.0085

/** Texturas e indices do kit para este rosto. A Classica (pintura original) usa o conjunto classico inteiro (olho, cilios, sobrancelha, boca). */
export function kitFor(f: MaleFace): KitState {
  const classic = f.eye.style === 'classic'
  const eye = styleIdx(KIT_EYES, f.eye.style) ?? styleIdx(KIT_EYES, 'natural')!
  const brow = styleIdx(KIT_BROWS, classic ? 'thick' : f.brow.style) ?? styleIdx(KIT_BROWS, 'thick')!
  const mouth = styleIdx(KIT_MOUTHS, f.mouth.style) ?? styleIdx(KIT_MOUTHS, 'natural')!
  const lash = styleIdx(KIT_LASHES, f.eye.lash)
  const g = eye.geom ?? { a: 0.016, hu: 0.0085, lift: 0 }
  const sx = g.a / LASH_A0
  const sy = 1 + 0.5 * (g.hu / LASH_HU0 - 1)
  const ex = f.extras
  const one = (l: KitStyle[], e: { style: string; amount: number; color: string }) => {
    const k = e.style === 'none' ? undefined : styleIdx(l, e.style)
    return { idx: k?.cell ?? -1, amt: k ? e.amount : 0, col: e.color }
  }
  const n = one(KIT_NOSE, ex.nose), fr = one(KIT_FRECKLES, ex.freckles), p = one(KIT_PAINT, ex.paint)
  let ct = one(KIT_CONTOUR, ex.contour)
  if (ct.idx < 0 && (f.detail.lines > 0.01 || f.detail.bags > 0.01)) {
    const k = f.detail.lines > 0.01 && f.detail.bags > 0.01 ? 'age' : f.detail.lines > 0.01 ? 'lines' : 'bags'
    const ks = styleIdx(KIT_CONTOUR, k)!
    ct = { idx: ks.cell ?? -1, amt: Math.max(f.detail.lines, f.detail.bags), col: ks.color ?? '#7a5a4a' }
  }
  return {
    sclera: kitTexture(`eye_${eye.id}_sclera`, true),
    iris: classic ? kitTexture('eye_classic_iris') : kitTexture(`eyepk_${eye.id}`),
    parts: classic ? kitTexture('classic_parts') : kitTexture('parts'),
    blush: f.blush.shade ? kitTexture('classic_shade') : kitTexture('blush'),
    extras: kitTexture('extras'),
    paint: kitTexture('paint'),
    beard: f.beard.style === 'none' ? BLANK_LAYER : kitTexture(`beard_${f.beard.style}`),
    browCell: classic ? 0 : (brow.cell ?? -1),
    mouthCell: mouth.cell ?? 0,
    lashCell: classic ? 0 : !lash || f.eye.lash === 'none' ? -1 : (lash.cell ?? -1),
    browRgb: brow.rgb ? 1 : 0,
    lashG: [sx, sy, g.hu - LASH_HU0 * sy],
    browDx: brow.dx ?? 0,
    xIdx: [n.idx, fr.idx, ct.idx, p.idx],
    xAmt: [n.amt, fr.amt, ct.amt, p.amt],
    xCol: [n.col, fr.col, ct.col, p.col],
    classic,
  }
}

export function preloadKit() {
  for (const e of EYE_STYLES) {
    kitTexture(`eye_${e.id}_sclera`, true)
    kitTexture(e.id === 'classic' ? 'eye_classic_iris' : `eyepk_${e.id}`)
  }
  for (const f of ['parts', 'extras', 'paint', 'blush', 'classic_shade', 'classic_parts']) kitTexture(f)
}

export const colorOf = (hex: string) => new Color(hex)
