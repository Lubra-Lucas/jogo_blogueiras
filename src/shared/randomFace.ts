/**
 * Sorteio do rosto por camadas e do formato (morphs f_*), por genero. Puro (sem three). Usado por `randomAppearance`.
 * Todas as combinacoes saem bonitas: cores seguem pele/cabelo/olhos, tamanhos ficam na faixa do estilo (a boneca tem rosto menor e
 * olhos maiores que o masculino) e o formato usa so 2 a 4 controles por vez.
 */
import { CLASSIC_DEFAULTS, DEFAULT_FACE_LAYERS, mergeFace, setShapeControl, shapeGroups, type FaceLayers, type Gender } from './faceLayers'
import type { Rng } from '../game/market/rng.ts'

const LIP_HEX_F = ['#e68288', '#dc4f60', '#c9707a', '#e89aa0', '#b8505a', '#d8788a', '#a8566e', '#7a2535']
const EYE_SCALE: Record<Gender, Record<string, [number, number]>> = {
  female: { natural: [1.6, 2.0], almond: [1.55, 1.9], doll: [1.2, 1.45], dolla: [0.95, 1.1], classic: [1, 1] },
  male: { natural: [1.0, 1.3], almond: [1.0, 1.3], doll: [0.62, 0.9], dolla: [0.7, 0.9], classic: [1, 1] },
}
const round = (v: number) => Math.round(v * 1000) / 1000 + 0
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const pickOf = <T>(r: Rng, l: readonly T[]): T => l[Math.floor(r() * l.length) % l.length]
const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255
}
export const darken = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16)
  const c = (v: number) => Math.round(clamp(v * k, 0, 255)).toString(16).padStart(2, '0')
  return '#' + c((n >> 16) & 255) + c((n >> 8) & 255) + c(n & 255)
}
const mixHex = (a: string, b: string, t: number) => {
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16)
  const c = (sh: number) => Math.round(((x >> sh) & 255) * (1 - t) + ((y >> sh) & 255) * t).toString(16).padStart(2, '0')
  return '#' + c(16) + c(8) + c(0)
}
function pickW<T>(r: Rng, items: Array<[T, number]>): T {
  let x = r() * items.reduce((t, i) => t + i[1], 0)
  for (const [v, w] of items) {
    x -= w
    if (x <= 0) return v
  }
  return items[items.length - 1][0]
}

export function rollFaceLayers(r: Rng, gender: Gender, skinHex: string, hairHex: string, eyeHex: string, browHex0: string, npc = false): FaceLayers {
  const f = gender === 'female'
  const eyeStyle = pickW<FaceLayers['eye']['style']>(r, f ? [['classic', 3], ['natural', 3], ['almond', 3], ['doll', 2], ['dolla', 1]] : [['natural', 6], ['almond', 4], ['doll', npc ? 0 : 0.6]])
  const [lo, hi] = EYE_SCALE[gender][eyeStyle]
  const lash = eyeStyle === 'classic' ? 'classic' : pickW<FaceLayers['eye']['lash']>(r, f ? [['natural', 3], ['doll', 2], ['dolla', 1]] : [['none', 6], ['natural', 4]])
  const browStyle = pickW<FaceLayers['brow']['style']>(r, f ? [['soft', 3], ['thin', 3], ['arched', 3], ['classic', eyeStyle === 'classic' ? 6 : 1]] : [['thick', 4], ['arched', 3], ['thin', 2]])
  // sobrancelha masculina: nunca clara demais (cabelo branco/loiro nao apaga a sobrancelha)
  const browHex = f && browStyle === 'classic' ? CLASSIC_DEFAULTS.brow : !f && lum(browHex0) > 0.3 ? darken(browHex0, 0.5) : browHex0
  const lightSkin = lum(skinHex) > 0.6
  const mouthHex = f ? pickOf(r, LIP_HEX_F) : mixHex(darken(skinHex, lightSkin ? 0.72 : 0.62), lightSkin ? '#b0585a' : '#8a3f3c', 0.5)
  const beard = f ? 'none' : pickW<FaceLayers['beard']['style']>(r, [['none', 45], ['stubble', 22], ['mustache', 8], ['goatee', 10], ['full', 15]])
  return mergeFace(DEFAULT_FACE_LAYERS, {
    eye: { style: eyeStyle, lash, iris: eyeHex, scale: round(lo + r() * (hi - lo)), gap: round((r() - 0.5) * 0.004), y: round((r() - 0.5) * 0.002), tilt: round((r() - 0.5) * 6), liner: '#1c1618', lashColor: '#1a1416', linerAmt: round(f ? 0.8 + r() * 0.2 : 0.4 + r() * 0.5) },
    brow: { style: browStyle, color: browHex, scale: round(0.95 + r() * 0.25), opacity: f ? 0.9 : 0.92, tilt: round((r() - 0.5) * 6), y: round((r() - 0.5) * 0.004), gap: round((r() - 0.5) * 0.003) },
    mouth: { style: f ? 'classic' : pickW<FaceLayers['mouth']['style']>(r, [['natural', 4], ['thin', 3]]), color: mouthHex, gloss: round(f ? 0.35 + r() * 0.55 : r() * 0.25), opacity: 0.95, scale: 1, y: 0 },
    blush: f ? { amount: round(0.3 + r() * 0.7), color: '#f08a98', shade: true, scale: round(1.4 + r() * 0.5) } : { amount: r() < 0.2 ? round(0.15 + r() * 0.2) : 0, color: '#e0707c', scale: 1.2 },
    beard: { style: beard, color: darken(hairHex, 0.8), amount: round(0.75 + r() * 0.25) },
    detail: { bags: !f && r() < 0.15 ? round(0.3 + r() * 0.5) : 0, lines: !f && r() < 0.12 ? round(0.3 + r() * 0.5) : 0 },
  })
}

/** Chance de um sorteio incluir UM formato divertido (grupo `fun`): raro de proposito. */
export const FUN_SHAPE_CHANCE = 0.05
/** Controles que aparecem com mais frequencia no sorteio (formatos naturais comuns); os demais entram com peso 1. */
const COMMON_SHAPE = new Set(['jaw', 'chinW', 'chinD', 'cheek', 'bone', 'noseW', 'noseL', 'noseU', 'lips', 'mouthW', 'corners', 'faceL', 'fore', 'brow', 'eyeGap', 'eyeTilt', 'head'])

/**
 * Formato do rosto: 2 a 5 controles NATURAIS do genero (par bipolar = para um lado ou para o outro), os mais comuns com mais frequencia;
 * em ~5% dos sorteios entra tambem UM controle do grupo "Divertidos" (nunca em dobro). Os pesos (0..1) ja sao limitados pela faixa segura no Character.
 */
export function rollShape(r: Rng, gender: Gender, npc = false): Record<string, number> {
  const groups = shapeGroups(gender)
  const pool = groups.filter((g) => g.id !== 'fun').flatMap((g) => g.controls)
  const n = (npc ? 2 : 3) + Math.floor(r() * 2.99)
  let shape: Record<string, number> = {}
  for (let i = 0; i < n && pool.length; i++) {
    let x = r() * pool.reduce((t, c) => t + (COMMON_SHAPE.has(c.id) ? 2 : 1), 0)
    let k = 0
    for (; k < pool.length - 1; k++) {
      x -= COMMON_SHAPE.has(pool[k].id) ? 2 : 1
      if (x <= 0) break
    }
    const c = pool.splice(k, 1)[0]
    const mag = round(0.35 + r() * 0.65)
    shape = setShapeControl(shape, c, c.minus ? (r() < 0.5 ? -mag : mag) : mag)
  }
  if (r() < FUN_SHAPE_CHANCE) {
    const fun = groups.find((g) => g.id === 'fun')?.controls ?? []
    if (fun.length) shape = setShapeControl(shape, fun[Math.floor(r() * fun.length) % fun.length], round(0.45 + r() * 0.55))
  }
  return shape
}
