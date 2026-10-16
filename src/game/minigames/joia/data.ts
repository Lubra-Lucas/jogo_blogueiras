/** Dados do minijogo "Joia Sob Medida": metais, pedras, pérolas, padrões, peças e desbloqueios. */

export type PieceType = 'colar' | 'pulseira' | 'anel' | 'tiara'
export type Metal = 'ouro' | 'rose' | 'prata' | 'cromo'
export type GemColor = 'diamante' | 'safira' | 'esmeralda' | 'rubi' | 'ametista' | 'topazio'
export type GemShape = 'redondo' | 'gota' | 'quadrado' | 'coracao' | 'estrela'
export type PearlColor = 'branca' | 'champanhe' | 'preta'
export type CharmShape = 'coracao' | 'estrela' | 'laco'
export type Pattern = 'alternado' | 'simetrico' | 'trio' | 'pingente'

export const PIECE_TYPES: PieceType[] = ['colar', 'pulseira', 'anel', 'tiara']
export const PIECE_NAME: Record<PieceType, string> = { colar: 'Colar', pulseira: 'Pulseira', anel: 'Anel', tiara: 'Tiara' }

export const METALS: Metal[] = ['ouro', 'prata', 'rose', 'cromo']
export const METAL_NAME: Record<Metal, string> = { ouro: 'Ouro', rose: 'Ouro rosé', prata: 'Prata', cromo: 'Cromo' }
export const METAL_HEX: Record<Metal, string> = { ouro: '#e3b95a', rose: '#e0a08c', prata: '#cfd5df', cromo: '#f1f4fa' }
export const METAL_DEEP: Record<Metal, string> = { ouro: '#8c6a1f', rose: '#9a5d4c', prata: '#7b8494', cromo: '#9aa3b4' }

export const GEM_COLORS: GemColor[] = ['diamante', 'safira', 'rubi', 'esmeralda', 'ametista', 'topazio']
export const GEM_NAME: Record<GemColor, string> = {
  diamante: 'Diamante', safira: 'Safira', esmeralda: 'Esmeralda', rubi: 'Rubi', ametista: 'Ametista', topazio: 'Topázio',
}
export const GEM_HEX: Record<GemColor, string> = {
  diamante: '#eef4ff', safira: '#2d5fd1', esmeralda: '#18a46c', rubi: '#c8102e', ametista: '#8a4fc9', topazio: '#f0a63a',
}
export const GEM_LIGHT: Record<GemColor, string> = {
  diamante: '#ffffff', safira: '#7fa6f5', esmeralda: '#6fe0ac', rubi: '#ff6b82', ametista: '#c79cf0', topazio: '#ffd98a',
}
export const GEM_DARK: Record<GemColor, string> = {
  diamante: '#9fb3d4', safira: '#14307a', esmeralda: '#0a5c3b', rubi: '#6a0618', ametista: '#4a2278', topazio: '#a8620d',
}

export const GEM_SHAPES: GemShape[] = ['redondo', 'gota', 'quadrado', 'coracao', 'estrela']
export const SHAPE_NAME: Record<GemShape, string> = {
  redondo: 'redondo', gota: 'gota', quadrado: 'retangular', coracao: 'coração', estrela: 'estrela',
}

export const PEARLS: PearlColor[] = ['branca', 'champanhe', 'preta']
export const PEARL_NAME: Record<PearlColor, string> = { branca: 'Pérola', champanhe: 'Pérola champanhe', preta: 'Pérola negra' }
export const PEARL_HEX: Record<PearlColor, string> = { branca: '#f6efe6', champanhe: '#e8d3b0', preta: '#2b2a30' }

export const CHARMS: CharmShape[] = ['coracao', 'estrela', 'laco']
export const CHARM_NAME: Record<CharmShape, string> = { coracao: 'Coração', estrela: 'Estrela', laco: 'Laço' }

export const PATTERNS: Pattern[] = ['alternado', 'simetrico', 'trio', 'pingente']
export const PATTERN_NAME: Record<Pattern, string> = {
  alternado: 'Alternado', simetrico: 'Simétrico', trio: 'Trio', pingente: 'Pingente central',
}
export const PATTERN_HELP: Record<Pattern, string> = {
  alternado: 'pérola, pedra, pérola, pedra…',
  simetrico: 'elos nas pontas, pérolas, pedra no centro',
  trio: 'pérola, pérola, pedra, repetindo',
  pingente: 'elos com o pingente no centro',
}

/** Modelo 3D de cada peça (ids de jewelry.json). */
export function modelFor(type: PieceType, pattern: Pattern, shape: GemShape): string {
  switch (type) {
    case 'colar': return pattern === 'pingente' ? 'layered_gold' : 'pearl_choker'
    case 'pulseira': return pattern === 'alternado' || pattern === 'trio' ? 'bangle_stack' : 'tennis_bracelet'
    case 'anel': return shape === 'coracao' ? 'heart_ring' : 'cocktail_ring'
    case 'tiara': return 'tiara'
  }
}

// ---------------------------------------------------------------- progressão
export interface Unlock { level: number; kind: 'peça' | 'pedra' | 'lapidação' | 'metal' | 'pérola' | 'padrão'; id: string; name: string }
export const UNLOCKS: Unlock[] = [
  { level: 1, kind: 'peça', id: 'colar', name: 'Colar' },
  { level: 1, kind: 'peça', id: 'pulseira', name: 'Pulseira' },
  { level: 2, kind: 'peça', id: 'anel', name: 'Anel' },
  { level: 3, kind: 'peça', id: 'tiara', name: 'Tiara' },
  { level: 1, kind: 'pedra', id: 'diamante', name: 'Diamante' },
  { level: 1, kind: 'pedra', id: 'safira', name: 'Safira' },
  { level: 2, kind: 'pedra', id: 'rubi', name: 'Rubi' },
  { level: 3, kind: 'pedra', id: 'esmeralda', name: 'Esmeralda' },
  { level: 4, kind: 'pedra', id: 'ametista', name: 'Ametista' },
  { level: 6, kind: 'pedra', id: 'topazio', name: 'Topázio' },
  { level: 1, kind: 'lapidação', id: 'redondo', name: 'Lapidação redonda' },
  { level: 1, kind: 'lapidação', id: 'gota', name: 'Lapidação gota' },
  { level: 2, kind: 'lapidação', id: 'quadrado', name: 'Lapidação esmeralda' },
  { level: 4, kind: 'lapidação', id: 'coracao', name: 'Lapidação coração' },
  { level: 6, kind: 'lapidação', id: 'estrela', name: 'Lapidação estrela' },
  { level: 1, kind: 'metal', id: 'ouro', name: 'Ouro' },
  { level: 1, kind: 'metal', id: 'prata', name: 'Prata' },
  { level: 2, kind: 'metal', id: 'rose', name: 'Ouro rosé' },
  { level: 3, kind: 'metal', id: 'cromo', name: 'Cromo' },
  { level: 1, kind: 'pérola', id: 'branca', name: 'Pérola' },
  { level: 2, kind: 'pérola', id: 'champanhe', name: 'Pérola champanhe' },
  { level: 4, kind: 'pérola', id: 'preta', name: 'Pérola negra' },
  { level: 1, kind: 'padrão', id: 'alternado', name: 'Padrão alternado' },
  { level: 2, kind: 'padrão', id: 'simetrico', name: 'Padrão simétrico' },
  { level: 3, kind: 'padrão', id: 'trio', name: 'Padrão trio' },
  { level: 5, kind: 'padrão', id: 'pingente', name: 'Pingente central' },
]

export function unlockedIds(level: number, kind: Unlock['kind']): string[] {
  return UNLOCKS.filter((u) => u.kind === kind && u.level <= level).map((u) => u.id)
}

// ---------------------------------------------------------------- clientes
export interface ClientLook { name: string; hair: string; skin: string; accent: string }
export const CLIENTS: ClientLook[] = [
  { name: 'Dona Helena', hair: '#d9d6d2', skin: '#f1d3bd', accent: '#6d1a2c' },
  { name: 'Camila', hair: '#2a1d1a', skin: '#c68e6b', accent: '#1f3b63' },
  { name: 'Sra. Valentina', hair: '#6b3a22', skin: '#efc9a9', accent: '#14543b' },
  { name: 'Beatriz', hair: '#16141a', skin: '#8d5a3c', accent: '#5b2c83' },
  { name: 'Marquesa Aurora', hair: '#c79a58', skin: '#f6dcc7', accent: '#8a1c2b' },
  { name: 'Isadora', hair: '#43271a', skin: '#d9a883', accent: '#1d3a56' },
  { name: 'Duquesa Lívia', hair: '#a8a29a', skin: '#e9c4a6', accent: '#3a2a52' },
  { name: 'Rafaela', hair: '#1c1613', skin: '#b57b57', accent: '#7a4a14' },
]

export const COMMENTS = {
  perfect: ['Impecável! Parece feita para mim.', 'Exatamente o que sonhei. Magnífico!', 'Simetria perfeita, que mão!'],
  good: ['Muito bonita, obrigada!', 'Ficou elegante. Voltarei!', 'Gostei bastante do acabamento.'],
  ok: ['Está bonita, mas não era bem assim.', 'Aceitável… esperava mais capricho.', 'Algumas pedras fora do lugar, hein?'],
  bad: ['Não é o que eu pedi…', 'Vou pedir a outro joalheiro.', 'Isso não tem simetria nenhuma!'],
  late: ['Demorou, mas ficou linda.', 'Quase desisti de esperar!'],
} as const
