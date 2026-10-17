import { Color, DataTexture, LinearMipmapLinearFilter, NoColorSpace, SRGBColorSpace, Texture, TextureLoader } from 'three'

/**
 * Rosto masculino MONTADO POR CAMADAS, em tempo real (nada e assado na textura da pele).
 * Cada grupo (olho, cilios, sobrancelha, boca, blush) e um PNG com alfa gerado por `tools/blender/male/make_face_kit.py`
 * (public/assets/characters/male/face/). O shader (maleMaterial.ts) projeta de frente no espaco de repouso da malha (x, y),
 * entao a camada acompanha morphs e skinning. Olho e sobrancelha sao espelhados: um unico conjunto de parametros vale para os dois lados.
 * Posicoes sao DESLOCAMENTOS (metros) a partir dos pontos de referencia do modelo (`FACE_REF`).
 */

export type EyeStyle = 'natural' | 'almond' | 'doll'
export type LashStyle = 'none' | 'natural' | 'doll'
export type BrowStyle = 'thick' | 'arched' | 'thin'
export type MouthStyle = 'natural' | 'thin' | 'doll'

export const EYE_STYLES: Array<{ id: EyeStyle; label: string }> = [
  { id: 'natural', label: 'Natural' },
  { id: 'almond', label: 'Amendoado' },
  { id: 'doll', label: 'Boneca (grande)' },
]
export const LASH_STYLES: Array<{ id: LashStyle; label: string }> = [
  { id: 'none', label: 'Sem cilios' },
  { id: 'natural', label: 'Natural' },
  { id: 'doll', label: 'Boneca (volumosos)' },
]
export const BROW_STYLES: Array<{ id: BrowStyle; label: string }> = [
  { id: 'thick', label: 'Reta grossa' },
  { id: 'arched', label: 'Arqueada' },
  { id: 'thin', label: 'Fina natural' },
]
export const MOUTH_STYLES: Array<{ id: MouthStyle; label: string }> = [
  { id: 'natural', label: 'Natural masculina' },
  { id: 'thin', label: 'Fina' },
  { id: 'doll', label: 'Boneca glossy' },
]

export interface MaleFace {
  eye: {
    style: EyeStyle
    lash: LashStyle
    /** cor da iris, do delineado e dos cilios */
    iris: string
    liner: string
    lashColor: string
    /** 1 = tamanho do estilo */
    scale: number
    /** deslocamento da metade da distancia entre os olhos (m; + afasta) */
    gap: number
    /** deslocamento vertical (m) */
    y: number
    /** inclinacao em graus (+ = canto externo para cima) */
    tilt: number
    /** intensidade do delineado e dos cilios (0..1) */
    linerAmt: number
  }
  brow: { style: BrowStyle; color: string; scale: number; gap: number; y: number; tilt: number; opacity: number }
  mouth: { style: MouthStyle; color: string; gloss: number; scale: number; y: number; opacity: number }
  blush: { amount: number; color: string; scale: number; gap: number; y: number }
}

/** Pontos de referencia do modelo (m, espaco de repouso, y para cima): male_base.json -> face. */
export const FACE_REF = { eyeX: 0.0485, eyeY: 1.5827, browY: 1.609, browX: 0.0545, mouthY: 1.5019, noseY: 1.5423, chinY: 1.4552 }

/** Tamanho fisico (m) de cada canvas de camada (igual ao kit.json). */
export const KIT_CANVAS = { eye: [0.1, 0.09], brow: [0.09, 0.034], mouth: [0.09, 0.052], blush: [0.1, 0.075] } as const

export const DEFAULT_MALE_FACE: MaleFace = {
  eye: { style: 'natural', lash: 'natural', iris: '#6b4a32', liner: '#2a201e', lashColor: '#1c1514', scale: 1, gap: 0, y: 0, tilt: 0, linerAmt: 1 },
  brow: { style: 'thick', color: '#4a3326', scale: 1, gap: 0, y: 0, tilt: 0, opacity: 0.92 },
  mouth: { style: 'natural', color: '#b87068', gloss: 0.2, scale: 1, y: 0, opacity: 0.9 },
  blush: { amount: 0, color: '#e0707c', scale: 1, gap: 0, y: 0 },
}

export function mergeFace(base: MaleFace, p: DeepPartial<MaleFace>): MaleFace {
  return {
    eye: { ...base.eye, ...p.eye },
    brow: { ...base.brow, ...p.brow },
    mouth: { ...base.mouth, ...p.mouth },
    blush: { ...base.blush, ...p.blush },
  }
}
type DeepPartial<T> = { [K in keyof T]?: Partial<T[K]> }

// ------------------------------------------------------------------ texturas do kit
const BASE = import.meta.env.BASE_URL
export const FACE_KIT_URL = `${BASE}assets/characters/male/face/`
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
    t = loader.load(`${FACE_KIT_URL}${file}.png`, () => listeners.forEach((f) => f()))
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
  hi: Texture
  line: Texture
  lash: Texture | null
  brow: Texture
  lips: Texture
  gloss: Texture
  blush: Texture
}

export function kitFor(f: MaleFace): KitTextures {
  const e = f.eye.style
  return {
    sclera: kitTexture(`eye_${e}_sclera`, true),
    iris: kitTexture(`eye_${e}_iris`),
    hi: kitTexture(`eye_${e}_hi`, true),
    line: kitTexture(`eye_${e}_line`),
    lash: f.eye.lash === 'none' ? null : kitTexture(`lash_${f.eye.lash}_${e}`),
    brow: kitTexture(`brow_${f.brow.style}`),
    lips: kitTexture(`mouth_${f.mouth.style}_lips`),
    gloss: kitTexture(`mouth_${f.mouth.style}_gloss`, true),
    blush: kitTexture('blush'),
  }
}

export function preloadKit() {
  for (const e of EYE_STYLES) {
    kitTexture(`eye_${e.id}_sclera`, true); kitTexture(`eye_${e.id}_iris`); kitTexture(`eye_${e.id}_hi`, true); kitTexture(`eye_${e.id}_line`)
    for (const l of LASH_STYLES) if (l.id !== 'none') kitTexture(`lash_${l.id}_${e.id}`)
  }
  for (const b of BROW_STYLES) kitTexture(`brow_${b.id}`)
  for (const m of MOUTH_STYLES) { kitTexture(`mouth_${m.id}_lips`); kitTexture(`mouth_${m.id}_gloss`, true) }
  kitTexture('blush')
}

export const colorOf = (hex: string) => new Color(hex)
