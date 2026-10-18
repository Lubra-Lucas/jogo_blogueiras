import { CanvasTexture, DataTexture, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, RGBAFormat, UnsignedByteType, type Texture } from 'three'
import { normalizeMakeup, type Makeup } from '../../../shared/appearance'
import { composeMakeup, loadFaceMasks, SIZE, type FaceMasks } from './compose'

const FACE_MASK_URL = `${import.meta.env.BASE_URL}assets/characters/doll_face_front.png`

export interface MakeupTextures {
  /** UMA textura (1024x2048): cor sRGB em cima e efeitos (rugosidade, metal, brilho) embaixo -- economiza um sampler no shader */
  tex: Texture
  /** ja desenhado com as mascaras do rosto */
  ready: boolean
}

/** Textura 1x1 transparente (valor padrao dos uniforms quando nao ha maquiagem). */
export const BLANK_TEXTURE: Texture = (() => {
  const t = new DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, RGBAFormat, UnsignedByteType)
  t.needsUpdate = true
  return t
})()

let masksP: Promise<FaceMasks> | null = null
let masks: FaceMasks | null = null
function ensureMasks(): Promise<FaceMasks> {
  masksP ??= loadFaceMasks(FACE_MASK_URL).then((m) => (masks = m))
  return masksP
}

interface Entry {
  key: string
  tex: MakeupTextures
  color: HTMLCanvasElement
  fx: HTMLCanvasElement
  stack: HTMLCanvasElement
  use: number
}
const cache = new Map<string, Entry>()
const MAX = 10

function draw(e: Entry, m: Makeup, tone: string) {
  if (!masks) return
  composeMakeup(m, tone, masks, e.color.getContext('2d')!, e.fx.getContext('2d')!)
  const sc = e.stack.getContext('2d')!
  sc.clearRect(0, 0, SIZE, SIZE * 2)
  sc.drawImage(e.color, 0, 0)
  sc.drawImage(e.fx, 0, SIZE)
  e.tex.tex.needsUpdate = true
  e.tex.ready = true
}

function mkCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = SIZE
  return c
}

/**
 * Texturas de maquiagem para um (makeup, tom de pele), em cache por chave: personagens com a mesma maquiagem
 * dividem a textura. So redesenha quando o JSON muda. As mascaras do rosto carregam uma vez (assincrono; ate la a
 * textura fica vazia e e preenchida assim que prontas).
 */
export function getMakeupTextures(m: Makeup, tone: string): MakeupTextures {
  const key = JSON.stringify([m, tone])
  let e = cache.get(key)
  if (e) {
    cache.delete(key)
    cache.set(key, e) // LRU
    return e.tex
  }
  const color = mkCanvas()
  const fx = mkCanvas()
  const stack = document.createElement('canvas')
  stack.width = SIZE
  stack.height = SIZE * 2
  const mkTex = (c: HTMLCanvasElement) => {
    const t = new CanvasTexture(c)
    t.colorSpace = NoColorSpace
    t.generateMipmaps = true
    t.minFilter = LinearMipmapLinearFilter
    t.magFilter = LinearFilter
    t.anisotropy = 4
    return t
  }
  e = { key, color, fx, stack, use: 0, tex: { tex: mkTex(stack), ready: false } }
  cache.set(key, e)
  const entry = e
  if (masks) draw(entry, m, tone)
  else void ensureMasks().then(() => draw(entry, m, tone))
  if (cache.size > MAX) {
    const old = cache.keys().next().value as string
    const o = cache.get(old)
    if (o && o !== entry) {
      o.tex.tex.dispose()
      cache.delete(old)
    }
  }
  return e.tex
}

/** Dev: canvas de cor/fx da maquiagem atual (depuracao com sobreposicao). */
export function debugCanvases(m: Makeup, tone: string): { color: HTMLCanvasElement; fx: HTMLCanvasElement } | null {
  const n = normalizeMakeup(m)
  getMakeupTextures(n, tone)
  const e = cache.get(JSON.stringify([n, tone]))
  return e ? { color: e.color, fx: e.fx } : null
}

if (import.meta.env.DEV) (window as unknown as { __makeupDebug: typeof debugCanvases }).__makeupDebug = debugCanvases
if (import.meta.env.DEV) void import('./presets')
