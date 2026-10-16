/**
 * Amplitude dos sliders: os morph targets da base (doll_base.glb) foram assados com deformacoes sutis.
 * O slider 0..1 vira influencia 0..MAX (o three.js extrapola o delta com influencia > 1), sem rebake.
 * Ajuste os multiplicadores aqui; o corpo E o cabelo/pecas que compartilham a chave usam o mesmo valor.
 */
export const MORPH_MAX: Record<string, number> = {
  // rosto
  lipsFull: 1.9,
  lipsWide: 3.2,
  noseSmall: 4.5,
  noseNarrow: 4.5,
  cheekbonesHigh: 1.2,
  jawNarrow: 2.5,
  chinPointed: 1.8,
  faceThin: 2.2,
  eyesBig: 2,
  browLift: 3.8,
  // corpo (limitado para manter proporcoes de bom gosto)
  bustBig: 2.2,
  bustSmall: 2,
  buttBig: 2.2,
  buttSmall: 2,
  hipsWide: 2.2,
  thighsThick: 1.8,
  waistThin: 2.2,
  weightUp: 1.9,
  weightDown: 2,
  shouldersNarrow: 2.2,
}

/** Influencia final aplicada ao morph para um valor de slider 0..1. */
export function morphInfluence(name: string, v: number): number {
  return v * (MORPH_MAX[name] ?? 1)
}

/** Pares opostos exibidos como UM slider bipolar (esquerda = `minus`, direita = `plus`). */
export interface MorphPair {
  id: string
  label: string
  minus: string
  plus: string
  minusLabel: string
  plusLabel: string
}

export const MORPH_PAIRS: MorphPair[] = [
  { id: 'bust', label: 'Busto', minus: 'bustSmall', plus: 'bustBig', minusLabel: 'menor', plusLabel: 'maior' },
  { id: 'butt', label: 'Bumbum', minus: 'buttSmall', plus: 'buttBig', minusLabel: 'menor', plusLabel: 'maior' },
  { id: 'weight', label: 'Peso', minus: 'weightDown', plus: 'weightUp', minusLabel: 'menos', plusLabel: 'mais' },
]

/** Valor bipolar -1..1 de um par a partir do dicionario de morphs. */
export function pairValue(p: MorphPair, morphs: Record<string, number>): number {
  return (morphs[p.plus] ?? 0) - (morphs[p.minus] ?? 0)
}

export function withPairValue(p: MorphPair, morphs: Record<string, number>, v: number): Record<string, number> {
  return { ...morphs, [p.plus]: Math.max(0, v), [p.minus]: Math.max(0, -v) }
}

if (import.meta.env.DEV) (window as unknown as { __morphMax: typeof MORPH_MAX }).__morphMax = MORPH_MAX

/** Rotulos (pt-BR) dos sliders unipolares. */
export const MORPH_LABELS: Record<string, string> = {
  lipsFull: 'Lábios cheios',
  lipsWide: 'Boca larga',
  noseSmall: 'Nariz pequeno',
  noseNarrow: 'Nariz fino',
  cheekbonesHigh: 'Maçãs do rosto altas',
  jawNarrow: 'Mandíbula fina',
  chinPointed: 'Queixo pontudo',
  faceThin: 'Rosto fino',
  eyesBig: 'Olhos grandes',
  browLift: 'Sobrancelhas altas',
  hipsWide: 'Quadril largo',
  waistThin: 'Cintura fina',
  thighsThick: 'Coxas grossas',
  shouldersNarrow: 'Ombros estreitos',
}

export const FACE_MORPHS = ['faceThin', 'jawNarrow', 'chinPointed', 'cheekbonesHigh', 'eyesBig', 'browLift', 'noseSmall', 'noseNarrow', 'lipsFull', 'lipsWide']
export const BODY_SINGLES = ['waistThin', 'hipsWide', 'thighsThick', 'shouldersNarrow']
