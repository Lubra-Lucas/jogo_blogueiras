/** Paleta de moda do mundo real (tons de loja de roupa) e famílias de cor usadas nos pedidos das clientes. */
import { colorDistance, hexToHsl } from '../desfile/colors'

export type Family =
  | 'vermelho' | 'laranja' | 'amarelo' | 'verde' | 'azul' | 'roxo' | 'rosa'
  | 'preto' | 'branco' | 'cinza' | 'bege' | 'marrom'

export interface FashionColor {
  id: string
  name: string
  hex: string
  family: Family
}

export const FASHION_COLORS: FashionColor[] = [
  { id: 'preto', name: 'Preto', hex: '#1c1b1f', family: 'preto' },
  { id: 'grafite', name: 'Grafite', hex: '#3b3d44', family: 'cinza' },
  { id: 'cinza', name: 'Cinza', hex: '#8c8c90', family: 'cinza' },
  { id: 'marfim', name: 'Marfim', hex: '#f3eddc', family: 'branco' },
  { id: 'branco', name: 'Branco', hex: '#fbfaf6', family: 'branco' },
  { id: 'areia', name: 'Areia', hex: '#dcc9a3', family: 'bege' },
  { id: 'champagne', name: 'Champagne', hex: '#d9c39a', family: 'bege' },
  { id: 'camelo', name: 'Camelo', hex: '#b07a45', family: 'marrom' },
  { id: 'chocolate', name: 'Chocolate', hex: '#4a2f22', family: 'marrom' },
  { id: 'bordo', name: 'Bordô', hex: '#6e1f2f', family: 'vermelho' },
  { id: 'vermelho', name: 'Vermelho', hex: '#b3262e', family: 'vermelho' },
  { id: 'terracota', name: 'Terracota', hex: '#b8603a', family: 'laranja' },
  { id: 'mostarda', name: 'Mostarda', hex: '#d1a03a', family: 'amarelo' },
  { id: 'oliva', name: 'Verde-oliva', hex: '#6b6b3a', family: 'verde' },
  { id: 'esmeralda', name: 'Esmeralda', hex: '#1f6b57', family: 'verde' },
  { id: 'marinho', name: 'Azul-marinho', hex: '#1f2e4f', family: 'azul' },
  { id: 'jeans', name: 'Jeans', hex: '#3e5f8a', family: 'azul' },
  { id: 'ceu', name: 'Azul-céu', hex: '#8fbbe0', family: 'azul' },
  { id: 'ameixa', name: 'Ameixa', hex: '#5b3a6b', family: 'roxo' },
  { id: 'lavanda', name: 'Lavanda', hex: '#b9a8d6', family: 'roxo' },
  { id: 'rose', name: 'Rosê', hex: '#e7b9bd', family: 'rosa' },
  { id: 'rosa-antigo', name: 'Rosa-antigo', hex: '#d8a0a8', family: 'rosa' },
]

const hexOf = (id: string) => FASHION_COLORS.find((c) => c.id === id)!.hex

/** Amostras oferecidas para recolorir peças de roupa. */
export const GARMENT_SWATCHES = ['preto', 'marfim', 'areia', 'camelo', 'bordo', 'vermelho', 'terracota', 'mostarda', 'oliva', 'esmeralda', 'marinho', 'ceu', 'lavanda', 'rose'].map(hexOf)

export const SUIT_SWATCHES = ['marfim', 'areia', 'champagne', 'cinza', 'preto', 'chocolate', 'marinho', 'ceu'].map(hexOf)

export const HAIR_SWATCHES = ['#16141a', '#3a2417', '#4a2f22', '#816b58', '#b07a45', '#d8b46e', '#e8dcc8', '#8c8c90']

/** Imagem que lembra a família (usada nas pistas vagas). */
export const FAMILY_HINT: Record<Family, string> = {
  vermelho: 'um semáforo fechado', laranja: 'uma tangerina', amarelo: 'gema de ovo', verde: 'folhagem de jardim', azul: 'água de piscina',
  roxo: 'suco de uva', rosa: 'chiclete', preto: 'noite sem lua', branco: 'papel em branco', cinza: 'dia de chuva', bege: 'papelão', marrom: 'chocolate quente',
}

export const WARM: Family[] = ['vermelho', 'laranja', 'amarelo', 'rosa', 'marrom', 'bege']
export const COOL: Family[] = ['verde', 'azul', 'roxo']
export const NEUTRAL: Family[] = ['preto', 'branco', 'cinza']

export function nearestColor(hex: string): FashionColor {
  let best = FASHION_COLORS[0]
  let bd = 9
  for (const c of FASHION_COLORS) {
    const d = colorDistance(hex, c.hex)
    if (d < bd) {
      bd = d
      best = c
    }
  }
  return best
}

export const familyOf = (hex: string): Family => nearestColor(hex).family
export const colorName = (hex: string): string => nearestColor(hex).name
export const lightnessOf = (hex: string): number => hexToHsl(hex).l
