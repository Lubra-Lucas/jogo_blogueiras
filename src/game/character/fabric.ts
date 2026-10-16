import { Color, DoubleSide, MeshPhysicalMaterial, RepeatWrapping, SRGBColorSpace, TextureLoader, type Texture } from 'three'

/** Acabamentos de tecido/metal das pecas (os manifestos listam os suportados por slot). */
export type Finish = 'latex' | 'satin' | 'matte' | 'glitter' | 'tulle' | 'lace' | 'gold' | 'pearl'

export const FINISH_NAMES: Record<string, string> = {
  latex: 'Látex',
  satin: 'Cetim',
  matte: 'Fosco',
  glitter: 'Glitter',
  tulle: 'Tule',
  lace: 'Renda',
  gold: 'Ouro',
  pearl: 'Pérola',
}

const BASE = `${import.meta.env.BASE_URL}assets/garments/tex/`
const loader = new TextureLoader()
const cache = new Map<string, Texture>()
const listeners = new Set<() => void>()
const WHITE = new Color('#ffffff')

function tex(name: string, srgb: boolean, repeat: number): Texture {
  let t = cache.get(name)
  if (!t) {
    t = loader.load(`${BASE}${name}`, () => listeners.forEach((f) => f()))
    t.flipY = false // UV do glTF
    t.wrapS = t.wrapT = RepeatWrapping
    t.repeat.set(repeat, repeat)
    if (srgb) t.colorSpace = SRGBColorSpace
    cache.set(name, t)
  }
  return t
}

/** Reaplica quando uma textura termina de carregar. */
export function onFabricTextureLoad(f: () => void): () => void {
  listeners.add(f)
  return () => void listeners.delete(f)
}

/** Ajusta um material de peca para (cor, acabamento). Reseta o que um acabamento anterior possa ter mexido. */
export function applyFinish(m: MeshPhysicalMaterial, finish: string, color: string): void {
  m.color.set(color)
  m.side = DoubleSide
  m.metalness = 0
  m.roughness = 0.5
  m.clearcoat = 0
  m.clearcoatRoughness = 0.3
  m.sheen = 0
  m.transparent = false
  m.opacity = 1
  m.alphaTest = 0
  m.depthWrite = true
  m.map = null
  m.normalMap = null
  m.sheenRoughness = 0.45
  m.sheenColor.set(color).lerp(WHITE, 0.4)
  switch (finish) {
    case 'latex':
      m.roughness = 0.12
      m.clearcoat = 1
      m.clearcoatRoughness = 0.05
      break
    case 'satin':
      m.roughness = 0.38
      m.sheen = 1
      break
    case 'matte':
      m.roughness = 0.85
      break
    case 'tulle':
      m.roughness = 0.55
      m.sheen = 0.4
      m.transparent = true
      m.opacity = 0.55
      m.depthWrite = false
      break
    case 'lace':
      m.roughness = 0.7
      m.sheen = 0.2
      m.map = tex('lace.png', true, 1)
      m.transparent = true
      m.depthWrite = false
      break
    case 'glitter':
      m.roughness = 0.3
      m.metalness = 0.35
      m.normalMap = tex('glitter_n.png', false, 6)
      m.normalScale.set(1.4, 1.4)
      break
    case 'gold':
      m.roughness = 0.22
      m.metalness = 1
      m.clearcoat = 0.3
      m.color.set('#f2c14e')
      break
    case 'pearl':
      m.roughness = 0.18
      m.metalness = 0.15
      m.clearcoat = 0.8
      m.sheen = 0.5
      break
    default:
      break
  }
  m.needsUpdate = true
}

/** Material de joia por slot: metal (espelhado), gem (cristal translucido), pearl, ribbon (cetim). */
export function applyJewelMaterial(m: MeshPhysicalMaterial, slot: string, color: string): void {
  m.emissive.set('#000000')
  m.emissiveIntensity = 0
  m.transmission = 0
  if (slot === 'metal') {
    applyFinish(m, 'gold', color)
    m.color.set(color)
    m.roughness = 0.14
  } else if (slot === 'gem') {
    applyFinish(m, 'latex', color)
    m.roughness = 0.05
    m.metalness = 0
    m.transmission = 0.85
    m.ior = 2.2
    m.thickness = 0.01
    m.clearcoat = 1
    m.emissive.set(color)
    m.emissiveIntensity = 0.12
  } else if (slot === 'pearl') {
    applyFinish(m, 'pearl', color)
    m.sheen = 1
    m.clearcoat = 1
  } else applyFinish(m, 'satin', color)
}
