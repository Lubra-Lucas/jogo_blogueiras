/**
 * Sorteio do rosto por camadas e do formato (morphs f_*), por genero. Puro (sem three). Usado por `randomAppearance`.
 * Todas as combinacoes saem bonitas: cores seguem pele/cabelo/olhos, tamanhos ficam na faixa do estilo (a boneca tem rosto menor e
 * olhos maiores que o masculino) e o formato usa so 2 a 4 controles por vez.
 */
import { BEARD_STYLES, BROW_STYLES, CLASSIC_DEFAULTS, CONTOUR_STYLES, DEFAULT_FACE_LAYERS, EYE_STYLES, FRECKLE_STYLES, LASH_STYLES, MOUTH_STYLES, NOSE_STYLES, PAINT_STYLES, forGender, mergeFace, setShapeControl, shapeGroups, type FaceLayers, type Gender, type KitGroup, type StyleOpt } from './faceLayers'
import { KIT_CONTOUR, KIT_FRECKLES, KIT_NOSE, KIT_PAINT } from './faceKit.generated'
import type { Rng } from '../game/market/rng.ts'

const LIP_HEX_F = ['#e68288', '#dc4f60', '#c9707a', '#e89aa0', '#b8505a', '#d8788a', '#a8566e', '#7a2535']
const EYE_SCALE: Record<Gender, Record<string, [number, number]>> = {
  female: { natural: [1.6, 2.0], almond: [1.55, 1.9], doll: [1.2, 1.45], dolla: [0.95, 1.1], round: [1.4, 1.7], hooded: [1.5, 1.9], droopy: [1.5, 1.9], monolid: [1.5, 1.9], cat: [1.4, 1.7], catliner: [1.4, 1.7], sleepy: [1.5, 1.9], small: [1.8, 2.2], longalmond: [1.3, 1.6], ref: [1.5, 1.8], heart: [1.0, 1.25], star: [1.0, 1.25], slit: [1.0, 1.25], anime: [0.9, 1.1], spiral: [1.0, 1.25], cartoon: [0.8, 1.0] },
  male: { natural: [1.0, 1.3], almond: [1.0, 1.3], doll: [0.62, 0.9], dolla: [0.7, 0.9], round: [0.9, 1.15], hooded: [1.0, 1.3], droopy: [1.0, 1.3], monolid: [1.0, 1.3], cat: [0.9, 1.15], catliner: [0.9, 1.15], sleepy: [1.0, 1.3], small: [1.2, 1.5], longalmond: [0.85, 1.1], ref: [1.1, 1.3], heart: [0.6, 0.8], star: [0.6, 0.8], slit: [0.6, 0.8], anime: [0.6, 0.75], spiral: [0.6, 0.8], cartoon: [0.5, 0.65] },
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

/** Estilo aleatorio de uma lista: natural ~62%, glam ~33%, divertido ~5% (2% nas NPCs); some o 'none'/'classic'/ocultos e o que nao serve ao genero. */
function pickStyle(r: Rng, list: StyleOpt[], gender: Gender, npc: boolean, allowFun = true): StyleOpt {
  const avail = forGender(list, gender).filter((s) => !s.hidden && s.id !== 'none' && s.id !== 'classic')
  const x = r()
  const want: KitGroup = allowFun && x < (npc ? 0.02 : 0.05) ? 'fun' : x < 0.38 ? 'glam' : 'natural'
  const order: KitGroup[] = want === 'fun' ? ['fun', 'glam', 'natural'] : want === 'glam' ? ['glam', 'natural'] : ['natural', 'glam']
  for (const g of order) {
    const pool = avail.filter((s) => s.group === g)
    if (pool.length) return pool[Math.floor(r() * pool.length) % pool.length]
  }
  return avail[0]
}
const EXTRA_COLORS: Record<string, string> = Object.fromEntries([...KIT_NOSE, ...KIT_FRECKLES, ...KIT_CONTOUR, ...KIT_PAINT].map((k) => [k.id, k.color ?? '#8a5a48']))

export function rollFaceLayers(r: Rng, gender: Gender, skinHex: string, hairHex: string, eyeHex: string, browHex0: string, npc = false): FaceLayers {
  const f = gender === 'female'
  const classic = f && r() < 0.28
  const eye = classic ? EYE_STYLES.find((s) => s.id === 'classic')! : pickStyle(r, EYE_STYLES, gender, npc)
  const sizeKey = eye.id as string
  const [lo, hi] = EYE_SCALE[gender][sizeKey] ?? (f ? [1.45, 1.9] : [0.95, 1.3])
  const lashPick = classic ? null : r() < (f ? 0.15 : 0.55) ? null : pickStyle(r, LASH_STYLES, gender, npc)
  const lashId = classic ? 'classic' : (lashPick?.id ?? 'none')
  const brow = classic ? BROW_STYLES.find((s) => s.id === 'classic')! : pickStyle(r, BROW_STYLES, gender, npc)
  const rgbBrow = ['glitter', 'rainbow'].includes(brow.id)
  const browHex = classic ? CLASSIC_DEFAULTS.brow : rgbBrow ? '#ffffff' : !f && lum(browHex0) > 0.3 ? darken(browHex0, 0.5) : browHex0
  const lightSkin = lum(skinHex) > 0.6
  const mouthPick = f ? (r() < (npc ? 0.02 : 0.05) ? pickStyle(r, MOUTH_STYLES, gender, npc) : MOUTH_STYLES.find((s) => s.id === 'classic')!) : pickStyle(r, MOUTH_STYLES, gender, npc)
  const mouthHex = f ? pickOf(r, LIP_HEX_F) : mixHex(darken(skinHex, lightSkin ? 0.72 : 0.62), lightSkin ? '#b0585a' : '#8a3f3c', 0.5)
  const beard = f ? 'none' : r() < 0.45 ? 'none' : pickStyle(r, BEARD_STYLES, gender, npc, false).id
  const funLash = lashPick?.group === 'fun'
  // extras: sardas/pintas/nariz/contorno com frequencia moderada; pintura de festa so raramente (divertido)
  const ex = (list: StyleOpt[], p: number, key: string) => {
    if (r() >= p) return { style: 'none', amount: 0.6, color: EXTRA_COLORS[key] ?? '#8a5a48' }
    const st = pickStyle(r, list, gender, npc, false)
    return { style: st.id, amount: round(0.45 + r() * 0.45), color: EXTRA_COLORS[st.id] ?? '#8a5a48' }
  }
  const paintOn = r() < (npc ? 0.015 : 0.05)
  const paintSt = paintOn ? pickStyle(r, PAINT_STYLES, gender, npc) : null
  const extras = {
    nose: ex(NOSE_STYLES, f ? 0.12 : 0.1, 'fine'),
    freckles: ex(FRECKLE_STYLES, 0.2, 'light'),
    contour: ex(CONTOUR_STYLES, f ? 0.12 : 0.18, 'contour'),
    paint: paintSt ? { style: paintSt.id, amount: 1, color: EXTRA_COLORS[paintSt.id] } : { style: 'none', amount: 1, color: '#ffd45a' },
  }
  return mergeFace(DEFAULT_FACE_LAYERS, {
    eye: { style: eye.id, lash: lashId, iris: eyeHex, scale: classic ? 1 : round(lo + r() * (hi - lo)), gap: round((r() - 0.5) * 0.004), y: round((r() - 0.5) * 0.002), tilt: round((r() - 0.5) * 6), liner: '#1c1618', lashColor: funLash ? '#ffffff' : '#1a1416', linerAmt: round(f ? 0.8 + r() * 0.2 : 0.4 + r() * 0.5) },
    brow: { style: brow.id, color: browHex, scale: round(0.95 + r() * 0.25), opacity: f ? 0.9 : 0.92, tilt: round((r() - 0.5) * 6), y: round((r() - 0.5) * 0.004), gap: round((r() - 0.5) * 0.003) },
    mouth: { style: mouthPick.id, color: mouthHex, gloss: round(f ? 0.35 + r() * 0.55 : r() * 0.25), opacity: 0.95, scale: 1, y: 0 },
    blush: f ? { amount: round(0.3 + r() * 0.7), color: '#f08a98', shade: true, scale: round(1.4 + r() * 0.5) } : { amount: r() < 0.2 ? round(0.15 + r() * 0.2) : 0, color: '#e0707c', scale: 1.2 },
    beard: { style: beard, color: darken(hairHex, 0.8), amount: round(0.75 + r() * 0.25) },
    detail: { bags: 0, lines: 0 },
    extras,
  })
}

/** Formato do rosto: 2 a 4 controles do genero (par bipolar = para um lado ou para o outro). */
export function rollShape(r: Rng, gender: Gender, npc = false): Record<string, number> {
  const pool = shapeGroups(gender).flatMap((g) => g.controls)
  const n = (npc ? 2 : 3) + Math.floor(r() * 2.99)
  let shape: Record<string, number> = {}
  for (let i = 0; i < n && pool.length; i++) {
    const c = pool.splice(Math.floor(r() * pool.length), 1)[0]
    const mag = round(0.35 + r() * 0.65)
    shape = setShapeControl(shape, c, c.minus ? (r() < 0.5 ? -mag : mag) : mag)
  }
  return shape
}
