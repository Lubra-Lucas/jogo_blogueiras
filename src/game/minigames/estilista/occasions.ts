/** Ocasiões dos pedidos: estilo, formalidade e frases de pista (claras e vagas). */
import type { StyleTag } from '../desfile/types'

export interface Occasion {
  id: string
  /** nome curto (aparece no resultado) */
  name: string
  tags: Partial<Record<StyleTag, number>>
  /** 0 casual .. 1 gala */
  formality: number
  clear: string[]
  vague: string[]
}

export const OCCASIONS: Occasion[] = [
  {
    id: 'casamento-praia', name: 'Casamento na praia', tags: { praia: 1, romantico: 0.7 }, formality: 0.55,
    clear: ['Vou a um casamento na praia ao entardecer'],
    vague: ['Vou ver alguém dizer sim com os pés na areia e o sol baixando'],
  },
  {
    id: 'gala', name: 'Baile de gala', tags: { gala: 1, rococo: 0.5 }, formality: 1,
    clear: ['Fui convidada para o baile de gala do Teatro Municipal'],
    vague: ['Tapete vermelho, candelabros e muita etiqueta me esperam hoje à noite'],
  },
  {
    id: 'anos-2000', name: 'Festa anos 2000', tags: { y2k: 1, goth: 0.35, casual: 0.3 }, formality: 0.35,
    clear: ['Vou a uma festa com tema anos 2000'],
    vague: ['A trilha sonora de hoje é CD gravado e celular de abrir'],
  },
  {
    id: 'piquenique', name: 'Piquenique', tags: { casual: 1, romantico: 0.4, praia: 0.4 }, formality: 0.2,
    clear: ['Vou fazer um piquenique no parque com as amigas'],
    vague: ['Meu programa tem cesta, toalha xadrez e muita grama'],
  },
  {
    id: 'patinacao', name: 'Aula de patinação', tags: { esportivo: 1, casual: 0.6, y2k: 0.4 }, formality: 0.1,
    clear: ['Tenho aula de patinação e quero me mexer à vontade'],
    vague: ['Preciso de algo que acompanhe giro, pulo e queda sem reclamar'],
  },
  {
    id: 'jantar', name: 'Jantar a dois', tags: { romantico: 1, gala: 0.45 }, formality: 0.65,
    clear: ['Tenho um jantar a dois num restaurante à luz de velas'],
    vague: ['Uma mesa pequena, uma vela e alguém muito especial do outro lado'],
  },
  {
    id: 'halloween', name: 'Festa de Halloween', tags: { goth: 1, y2k: 0.4 }, formality: 0.4,
    clear: ['Vou a uma festa de Halloween num casarão'],
    vague: ['A festa é num casarão antigo e a noite pertence às sombras'],
  },
  {
    id: 'cha', name: 'Chá no palacete', tags: { rococo: 1, romantico: 0.6, gala: 0.4 }, formality: 0.75,
    clear: ['Fui convidada para o chá da tarde no palacete'],
    vague: ['Porcelana fina, bolinhos e conversas sussurradas num salão antigo'],
  },
  {
    id: 'formatura', name: 'Formatura', tags: { gala: 0.8, romantico: 0.5 }, formality: 0.8,
    clear: ['É a minha formatura e quero ser lembrada nas fotos'],
    vague: ['Hoje eu jogo o capelo para o alto e posso posar para mil fotos'],
  },
]

export const occasionById = (id: string) => OCCASIONS.find((o) => o.id === id) ?? OCCASIONS[0]
