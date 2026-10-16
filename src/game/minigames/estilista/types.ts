import type { Appearance } from '../../../shared/appearance'
import type { ItemSlot } from '../../character/catalog'
import type { Look, StyleTag } from '../desfile/types'
import type { Family } from './palette'

export type Mood = 'happy' | 'neutral' | 'unhappy'

/** Preferência escondida, revelada só se a estilista perguntar. */
export interface Secret {
  kind: 'want' | 'avoid' | 'minimal' | 'loud'
  slot?: ItemSlot
  /** frase dita pela cliente ao ser perguntada */
  text: string
}

export interface Client {
  id: string
  name: string
  vip: boolean
  /** corpo/pele/rosto da cliente (sem roupas) */
  base: Appearance
  /** look de partida (cabelo próprio, nenhuma peça) */
  look0: Look
  occasion: string
  tags: Partial<Record<StyleTag, number>>
  formality: number
  hate: Family | null
  love: Family | null
  palette: 'quente' | 'frio' | null
  tone: 'claro' | 'escuro' | null
  budget: number | null
  secret: Secret | null
  /** pedido falado (pt-BR), só com pistas */
  brief: string
  clarity: 'clear' | 'vague'
  /** estilos mais fortes (dica do modo Fácil / pergunta 1) */
  hintTags: StyleTag[]
  timeLimit: number
}

export type QuestionId = 'style' | 'budget' | 'special'

export const QUESTIONS: { id: QuestionId; text: string }[] = [
  { id: 'style', text: 'Que estilo você imagina para hoje?' },
  { id: 'budget', text: 'Qual é o seu limite de gasto?' },
  { id: 'special', text: 'Tem algo que você faz questão (ou não aceita)?' },
]

export interface Breakdown {
  occasion: number
  colors: number
  budget: number | null
  coherence: number
  surprise: number
  special: number | null
}

export type Criterion = keyof Breakdown

export const CRITERION_LABEL: Record<Criterion, string> = {
  occasion: 'Ocasião',
  colors: 'Cores',
  budget: 'Orçamento',
  coherence: 'Coerência',
  surprise: 'Surpresa',
  special: 'Pedido especial',
}

export interface Evaluation {
  /** 0..100 (sem bônus de tempo) */
  base: number
  total: number
  breakdown: Breakdown
  cost: number
  mood: Mood
  scheme: string
  hated: boolean
  overBudget: boolean
  empty: boolean
}

export interface ClientResult {
  client: Client
  look: Look
  eval: Evaluation
  /** pontos da cliente já com o multiplicador do combo */
  points: number
  comboAt: number
  asked: QuestionId | null
  quote: string
  timedOut: boolean
}
