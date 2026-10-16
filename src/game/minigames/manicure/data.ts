import type { Difficulty } from '../shared/competition'

/** Dados do minijogo Manicure Perfeita: cores de esmalte, adesivos, dificuldades e desbloqueios. */

export type FinishKind = 'solid' | 'ombre' | 'glitter' | 'chrome' | 'cateye'

export interface Polish {
  id: string
  name: string
  kind: FinishKind
  /** cor principal */
  c1: string
  /** segunda cor (degradê, brilho) */
  c2?: string
  /** nível de Cabeleireira que libera */
  level: number
}

export const POLISHES: Polish[] = [
  // linha clássica (esmaltes reais)
  { id: 'nude', name: 'Nude Areia', kind: 'solid', c1: '#d9ad94', level: 1 },
  { id: 'vermelho', name: 'Vermelho Clássico', kind: 'solid', c1: '#b3131f', level: 1 },
  { id: 'bordo', name: 'Bordô', kind: 'solid', c1: '#5e1426', level: 1 },
  { id: 'marinho', name: 'Azul-marinho', kind: 'solid', c1: '#1b2a4e', level: 1 },
  { id: 'preto', name: 'Preto Ônix', kind: 'solid', c1: '#17141a', level: 1 },
  { id: 'branco', name: 'Branco Neve', kind: 'solid', c1: '#f6f3ee', level: 1 },
  { id: 'cafe', name: 'Café com Leite', kind: 'solid', c1: '#a07662', level: 2 },
  { id: 'oliva', name: 'Verde-oliva', kind: 'solid', c1: '#59623a', level: 2 },
  { id: 'terracota', name: 'Terracota', kind: 'solid', c1: '#b5573a', level: 2 },
  { id: 'lavanda', name: 'Lavanda', kind: 'solid', c1: '#b6a5d8', level: 2 },
  { id: 'rosa-po', name: 'Rosa Antigo', kind: 'solid', c1: '#d79aa6', level: 3 },
  { id: 'menta', name: 'Menta Suave', kind: 'solid', c1: '#a9d6c3', level: 3 },
  // degradês
  { id: 'ombre-nude', name: 'Degradê Nude e Branco', kind: 'ombre', c1: '#d9ad94', c2: '#f6f3ee', level: 2 },
  { id: 'ombre-noite', name: 'Degradê Marinho e Prata', kind: 'ombre', c1: '#1b2a4e', c2: '#b9c0cc', level: 3 },
  { id: 'ombre-por', name: 'Degradê Pôr do Sol', kind: 'ombre', c1: '#b5573a', c2: '#f0c36a', level: 4 },
  // acabamentos especiais
  { id: 'glitter-ouro', name: 'Glitter Dourado', kind: 'glitter', c1: '#2a1f1a', c2: '#e4bd5a', level: 3 },
  { id: 'glitter-prata', name: 'Glitter Prata', kind: 'glitter', c1: '#2b3040', c2: '#d6dbe6', level: 4 },
  { id: 'cromo-prata', name: 'Cromado Prata', kind: 'chrome', c1: '#c7ced8', c2: '#6c7482', level: 5 },
  { id: 'cromo-ouro', name: 'Cromado Ouro', kind: 'chrome', c1: '#f0cf7a', c2: '#a37a22', level: 6 },
  { id: 'olho-gato-verde', name: 'Olho de Gato Esmeralda', kind: 'cateye', c1: '#10392f', c2: '#79e0b0', level: 7 },
  { id: 'olho-gato-vinho', name: 'Olho de Gato Rubi', kind: 'cateye', c1: '#3a0f1c', c2: '#e86a86', level: 8 },
]
export const POLISH_BY_ID: Record<string, Polish> = Object.fromEntries(POLISHES.map((p) => [p.id, p]))

export type DecalKind = 'dot' | 'pearl' | 'heart' | 'star' | 'bow' | 'gem' | 'flower'
export const DECALS: { id: DecalKind; name: string; level: number; symmetric: boolean }[] = [
  { id: 'dot', name: 'Ponto', level: 1, symmetric: true },
  { id: 'pearl', name: 'Pérola', level: 1, symmetric: true },
  { id: 'star', name: 'Estrela', level: 1, symmetric: false },
  { id: 'heart', name: 'Coração', level: 1, symmetric: false },
  { id: 'bow', name: 'Laço', level: 2, symmetric: false },
  { id: 'gem', name: 'Cristal', level: 3, symmetric: false },
  { id: 'flower', name: 'Flor', level: 5, symmetric: false },
]
export const DECAL_BY_ID = Object.fromEntries(DECALS.map((d) => [d.id, d])) as Record<DecalKind, (typeof DECALS)[number]>

/** cores dos adesivos (metais e pedras) */
export const DECAL_COLORS = ['#d8b45a', '#e9ecf2', '#b3131f', '#2b4a8a'] as const

export const FINGERS = ['Polegar', 'Indicador', 'Médio', 'Anelar', 'Mindinho'] as const
export const SKIN_TONES = ['#f1cdb0', '#e2ac84', '#c78a5f', '#9a6240', '#6d4128', '#f6d9c4']

export interface DiffCfg {
  /** segundos de rodada */
  seconds: number
  /** bônus de tempo ao terminar uma cliente */
  clientBonus: number
  /** raio do pincel (unidades 240x340) */
  brush: number
  /** velocidade (unid./ms) acima da qual o traço falha */
  maxSpeed: number
  /** tinta por mergulho (unid. de caminho) */
  ink: number
  /** tolerância fora da unha (unid.) */
  tol: number
  /** cobertura que finaliza a unha sozinha */
  autoDone: number
  guides: boolean
  showCoverage: boolean
  cleanups: number
  /** alternativas de cor na paleta */
  choices: number
  /** tolerância de posição do adesivo (unid.) */
  decalTol: number
  /** tolerância de giro (graus) */
  rotTol: number
  /** dica visual dos adesivos: 'ghost' | 'dot' | 'none' */
  decalHint: 'ghost' | 'dot' | 'none'
  /** largura da zona verde do verniz */
  greenZone: number
  /** velocidade do medidor do verniz (1/s) */
  glossSpeed: number
  /** tamanho de grupos de clientes (unhas) */
  nails: number[]
  typical: number
  stars: [number, number, number]
}

export const DIFF: Record<Difficulty, DiffCfg> = {
  facil: {
    seconds: 120, clientBonus: 10, brush: 20, maxSpeed: 2.4, ink: 1100, tol: 10, autoDone: 0.9, guides: true, showCoverage: true,
    cleanups: 1, choices: 4, decalTol: 26, rotTol: 40, decalHint: 'ghost', greenZone: 0.3, glossSpeed: 0.55, nails: [2, 3, 3, 4, 4, 5], typical: 5200,
    stars: [2000, 4200, 6400],
  },
  normal: {
    seconds: 105, clientBonus: 7, brush: 15, maxSpeed: 1.8, ink: 850, tol: 6, autoDone: 0.95, guides: true, showCoverage: true,
    cleanups: 0, choices: 6, decalTol: 20, rotTol: 30, decalHint: 'dot', greenZone: 0.22, glossSpeed: 0.7, nails: [3, 3, 4, 4, 5], typical: 6400,
    stars: [2600, 5200, 7800],
  },
  dificil: {
    seconds: 95, clientBonus: 6, brush: 12, maxSpeed: 1.4, ink: 700, tol: 3, autoDone: 0.96, guides: false, showCoverage: false,
    cleanups: 0, choices: 8, decalTol: 15, rotTol: 22, decalHint: 'none', greenZone: 0.16, glossSpeed: 0.85, nails: [3, 4, 4, 5, 5], typical: 7400,
    stars: [3000, 6000, 9000],
  },
  estrela: {
    seconds: 85, clientBonus: 5, brush: 9, maxSpeed: 1.1, ink: 560, tol: 1, autoDone: 0.97, guides: false, showCoverage: false,
    cleanups: 0, choices: 10, decalTol: 11, rotTol: 15, decalHint: 'none', greenZone: 0.11, glossSpeed: 1.0, nails: [4, 4, 5, 5], typical: 8400,
    stars: [3400, 6800, 10200],
  },
}

export const NAIL_W = 240
export const NAIL_H = 340

/** XP de Cabeleireira acumulado para o nível n (mesma curva do Café). */
export const xpForLevel = (n: number) => 30 * n * (n - 1)
export function salonLevel(xp: number): number {
  let n = 1
  while (n < 10 && xp >= xpForLevel(n + 1)) n++
  return n
}

export const PROFESSION = 'Cabeleireira'

export function unlocksAt(level: number): string[] {
  return [
    ...POLISHES.filter((p) => p.level === level).map((p) => p.name),
    ...DECALS.filter((d) => d.level === level).map((d) => `Adesivo: ${d.name}`),
  ]
}
