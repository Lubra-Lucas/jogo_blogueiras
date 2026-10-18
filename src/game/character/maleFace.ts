import { Color, DataTexture, LinearMipmapLinearFilter, NoColorSpace, SRGBColorSpace, Texture, TextureLoader } from 'three'
import {
  BROW_STYLES,
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

export interface KitTextures {
  sclera: Texture
  iris: Texture
  /** R = brilho, G = delineado, B = cilios (alfa de cada); classico: RGBA dos cilios */
  fx: Texture
  brow: Texture
  /** R = labios (cinza), G = alfa, B = brilho; classico: RGBA (cor por razao) */
  mouth: Texture
  blush: Texture
  /** R = barba, G = linhas, B = olheiras (so masculino) */
  detail: Texture
}

/** Texturas do kit para este rosto (poucas e empacotadas: o shader tem no maximo ~7 samplers de rosto). */
export function kitFor(f: MaleFace): KitTextures {
  const e = f.eye.style
  const classic = e === 'classic'
  const l = classic ? (f.eye.lash === 'classic' ? 'classic' : 'none') : f.eye.lash === 'classic' ? 'natural' : f.eye.lash
  return {
    sclera: kitTexture(`eye_${e}_sclera`, true),
    iris: kitTexture(`eye_${e}_iris`),
    fx: kitTexture(`eyefx_${e}_${l}`, classic),
    brow: kitTexture(`brow_${f.brow.style}`),
    mouth: kitTexture(`mouth_${f.mouth.style}_pk`, f.mouth.style === 'classic'),
    blush: f.blush.shade ? kitTexture('classic_shade') : kitTexture('blush'),
    detail: kitTexture(`detail_${f.beard.style}`),
  }
}

export function preloadKit() {
  for (const e of EYE_STYLES) {
    kitTexture(`eye_${e.id}_sclera`, true)
    kitTexture(`eye_${e.id}_iris`)
  }
  for (const b of BROW_STYLES) kitTexture(`brow_${b.id}`)
  kitTexture('blush')
  kitTexture('classic_shade')
}

export const colorOf = (hex: string) => new Color(hex)
