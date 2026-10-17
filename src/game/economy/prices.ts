import type { Rarity } from '../character/itemTags'
import type { Availability, Currency, ProductKind } from './types'

/**
 * Tabela de precos guiada por dados. Valores por raridade + sobrescritas por item.
 *
 * Referencia de equilibrio (rodada normal de minijogo ~ 40-120 Brilhos):
 *   comum ~ 150-300 (2-4 rodadas) | raro ~ 500-900 | epico ~ 1.500-2.500 | lendario ~ 4.000-8.000 (ou Diamantes).
 * Diamantes: 1 Diamante equivale a ~12-14 Brilhos; exclusivos custam Diamantes na 1a semana e depois
 * entram na loja de Brilhos a um preco alto (regra: quase todo exclusivo tambem sai por Brilhos).
 */
export const BASE_BRILHOS: Record<Rarity, number> = { comum: 220, raro: 700, epico: 2000, lendario: 6000 }
export const BASE_DIAMANTES: Record<Rarity, number> = { comum: 20, raro: 60, epico: 170, lendario: 480 }

/** Multiplicador por slot (peca mais "cara" de produzir/usar custa um pouco mais). */
const SLOT_MULT: Record<string, number> = {
  hair: 1.1,
  top: 1,
  bottom: 1,
  dress: 1.25,
  shoes: 1.1,
  gloves: 0.9,
  legwear: 0.7,
  neck: 1,
  ears: 0.85,
  head: 1,
  wrist: 0.95,
  finger: 0.8,
}

/** Arredonda para dezenas (ou 5 em valores pequenos). */
export const roundPrice = (n: number): number => (n < 100 ? Math.max(5, Math.round(n / 5) * 5) : Math.round(n / 10) * 10)

export interface EconomyOverride {
  availability?: Availability
  /** preco em Brilhos (padrao: tabela por raridade) */
  brilhos?: number
  /** preco em Diamantes (exclusivos) */
  diamantes?: number
  /** exclusivo: semana de lancamento (0 = semana de LAUNCH_MS). Janela de Diamantes = 7 dias. */
  releaseWeek?: number
  /** preco em Brilhos depois da janela de Diamantes (padrao: 1,35x o da tabela) */
  brilhosAfter?: number
  /** missao que entrega o item */
  quest?: string
  /** texto de evento */
  event?: string
  /** marca como novidade */
  novo?: boolean
}

/** Itens do guarda-roupa inicial (a jogadora ja possui). */
export const STARTER_ITEMS: string[] = ['hair.meshyUpdo', 'hair.chestnutWaves', 'tee', 'aline', 'stockings', 'hair_bow', 'pearl_studs', 'ribbon_choker']

/** Segunda-feira de referencia das semanas de exclusivos (UTC). */
export const LAUNCH_MS = Date.UTC(2026, 9, 12)
export const WEEK_MS = 7 * 24 * 3600 * 1000

export const OVERRIDES: Record<string, EconomyOverride> = {
  // inicial
  ...Object.fromEntries(STARTER_ITEMS.map((id) => [id, { availability: 'inicial' as const }])),
  // exclusivos (Diamantes na semana de estreia, depois Brilhos a preco alto)
  tennis_bracelet: { availability: 'exclusivo', diamantes: 190, brilhosAfter: 3200, releaseWeek: -1 },
  chandelier_drops: { availability: 'exclusivo', diamantes: 170, brilhosAfter: 2900, releaseWeek: 0 },
  ballgown: { availability: 'exclusivo', diamantes: 520, brilhosAfter: 8000, releaseWeek: 1 },
  tiara: { availability: 'exclusivo', diamantes: 480, brilhosAfter: 7500, releaseWeek: 2 },
  cocktail_ring: { availability: 'exclusivo', diamantes: 160, brilhosAfter: 2700, releaseWeek: 3 },
  // missao / evento
  star_pins: { availability: 'missao', quest: 'runway' },
  big_hoops: { availability: 'evento', event: 'Festival de Verão (em breve)' },
  // loja (ajustes finos)
  'hair.platinumUndercut': { brilhos: 780, novo: true },
  'hair.caramelCurls': { brilhos: 640, novo: true },
  corset: { brilhos: 740 },
  tutu: { brilhos: 620 },
  gloves: { brilhos: 1800 },
  pearl_choker: { brilhos: 2000 },
}

/** Material "novidade" extra (itens sem entrada na tabela, vindos de novos manifestos, tambem contam como novos). */
export const NEWEST_FIRST: string[] = ['tee']

export interface BigTicket {
  id: string
  kind: Extract<ProductKind, 'car' | 'house'>
  label: string
  blurb: string
  brilhos?: number
  diamantes?: number
  rarity: Rarity
  /** cor de apresentacao */
  tint: string
  /** true = ja tem jogabilidade (compravel); false/ausente = "Em breve" */
  live?: boolean
}

/** Itens de alto valor (conteudo de jogo depois): so nome + preco, marcados "Em breve". */
export const BIG_TICKETS: BigTicket[] = [
  { id: 'car.scooter', kind: 'car', label: 'Scooter Retrô', blurb: 'Compacta, ideal para a Avenida da Moda.', brilhos: 12000, rarity: 'raro', tint: '#3f8f86' },
  { id: 'car.conversivel', kind: 'car', label: 'Conversível Bordô', blurb: 'Capota baixa e vidros espelhados.', brilhos: 48000, diamantes: 3200, rarity: 'epico', tint: '#7a2f3d' },
  { id: 'car.limusine', kind: 'car', label: 'Limusine Pérola', blurb: 'Chegada digna de tapete vermelho.', diamantes: 9000, rarity: 'lendario', tint: '#d9d2c4' },
  { id: 'house.studio', kind: 'house', label: 'Studio no Centro', blurb: 'Um cantinho só seu, perto de tudo.', brilhos: 30000, rarity: 'raro', tint: '#b79a6f' },
  { id: 'house.sobrado', kind: 'house', label: 'Sobrado do Jardim', blurb: 'Dois andares e quintal florido.', brilhos: 120000, diamantes: 7500, rarity: 'epico', tint: '#5f7d5a' },
  { id: 'house.sonhos', kind: 'house', label: 'Casa dos Sonhos', blurb: 'A mansão com piscina e closet gigante. Em breve vai se ligar à decoração.', diamantes: 24000, rarity: 'lendario', tint: '#c9a24a' },
]

export const PREMIUM_FINISH_PRICE: Record<string, number> = { glitter: 80, latex: 80, gold: 120, pearl: 100 }

/** Servicos do Salão (sink de Brilhos). */
export interface SalonService {
  id: string
  label: string
  blurb: string
  color: string
  price: number
}
export const SALON_COLORS: SalonService[] = [
  { id: 'mel', label: 'Mel dourado', blurb: 'Loiro quente com reflexo de mel.', color: '#c8964f', price: 90 },
  { id: 'cobre', label: 'Cobre natural', blurb: 'Ruivo acobreado, sem exagero.', color: '#a8501f', price: 90 },
  { id: 'chocolate', label: 'Chocolate', blurb: 'Castanho profundo e brilhante.', color: '#4a2a1c', price: 70 },
  { id: 'preto', label: 'Preto azulado', blurb: 'Preto com reflexo frio.', color: '#171822', price: 70 },
  { id: 'platina', label: 'Platinado', blurb: 'Descoloração completa e matização.', color: '#e6e0d2', price: 160 },
  { id: 'borgonha', label: 'Borgonha', blurb: 'Vinho intenso, tom de vinil.', color: '#5a1a2b', price: 120 },
  { id: 'grafite', label: 'Grafite', blurb: 'Cinza metálico urbano.', color: '#6b6d78', price: 140 },
  { id: 'azul', label: 'Azul-petróleo', blurb: 'Cor de fantasia, estilo editorial.', color: '#1f4a5a', price: 180 },
]

export function currencyOfPrice(o: { brilhos?: number; diamantes?: number }): Currency {
  return o.brilhos ? 'brilhos' : 'diamantes'
}

export function basePrice(rarity: Rarity, slot: string, currency: Currency): number {
  const table = currency === 'brilhos' ? BASE_BRILHOS : BASE_DIAMANTES
  return roundPrice(table[rarity] * (SLOT_MULT[slot] ?? 1))
}

// ---------------------------------------------------------------- Pets (Petshop do Jardim)
/** Preco em Brilhos por raca (pelagem rara = + PET_TIER_ADD). Sem sorteio: a jogadora escolhe raca e pelagem. Id do item: `pet.<raca>.<pelagem>`. */
export const PET_BREED_PRICE: Record<string, number> = { poodle: 1400, shiba: 1500, dachshund: 1300, caramelo: 900, siames: 1400, persa: 1600, srd: 800, maltes: 1500, cavalier: 1700, golden: 1600 }
export const PET_TIER_ADD: Record<string, number> = { comum: 0, raro: 600 }
/** Pelagens que tambem podem ser pagas em Diamantes (todas continuam disponiveis em Brilhos). */
export const PET_DIAMOND_COATS: Record<string, number> = { 'persa.branco': 150, 'shiba.creme': 140 }

export interface PetFoodDef {
  id: string
  label: string
  blurb: string
  price: number
  /** quanto enche a barra de fome (0-100) */
  fill: number
  /** alegria extra ao comer */
  joy: number
}
export const PET_FOOD: PetFoodDef[] = [
  { id: 'food.racao', label: 'Ração do dia', blurb: 'Equilibrada e crocante.', price: 30, fill: 45, joy: 2 },
  { id: 'food.sache', label: 'Sachê gourmet', blurb: 'Patê macio, o favorito de muitos.', price: 55, fill: 60, joy: 8 },
  { id: 'food.biscoito', label: 'Biscoitinho', blurb: 'Para premiar o adestramento.', price: 20, fill: 15, joy: 14 },
]

export type PetAccSlot = 'collar' | 'bow' | 'outfit'
export interface PetAccDef {
  id: string
  label: string
  slot: PetAccSlot
  color: string
  price: number
  /** GLB rigido (caminho relativo a assets/pets/) que substitui a geometria procedural */
  file?: string
  /** GLB com skin, por id de raca (assets/pets/); raca sem entrada nao pode usar o item */
  files?: Record<string, string>
  /** nome do material tingivel do GLB; sem isso a cor nao e aplicada */
  tint?: string
  /** sem material tingivel: a UI nao oferece tingimento */
  fixedColor?: boolean
  /** escondido da loja, vitrine e painel (e nao e desenhado se ja estiver equipado) */
  hidden?: boolean
}
/** O acessorio pode ser usado nesta raca? (a polo so existe para os caes com arquivo) */
export const petAccFits = (a: PetAccDef, breedId: string | undefined): boolean => !a.files || (!!breedId && !!a.files[breedId])
/** Acessorios de pet (id `petacc.*`). */
export const PET_ACCESSORIES: PetAccDef[] = [
  { id: 'petacc.coleira-vinho', label: 'Coleira vinho', slot: 'collar', color: '#7a2332', price: 180 },
  { id: 'petacc.coleira-marinho', label: 'Coleira azul-marinho', slot: 'collar', color: '#1f3556', price: 180 },
  { id: 'petacc.coleira-dourada', label: 'Coleira dourada', slot: 'collar', color: '#c49a3a', price: 420 },
  { id: 'petacc.laco-creme', label: 'Laço creme', slot: 'bow', color: '#efe3cf', price: 150 },
  { id: 'petacc.laco-verde', label: 'Laço verde-musgo', slot: 'bow', color: '#4f7a55', price: 150 },
  { id: 'petacc.laco-rosa', label: 'Laço rosé', slot: 'bow', color: '#e8a7b4', price: 260 },
  { id: 'petacc.roupinha-listrada', label: 'Roupinha listrada', slot: 'outfit', color: '#2c4a6e', price: 380 },
  { id: 'petacc.roupinha-mostarda', label: 'Roupinha mostarda', slot: 'outfit', color: '#c8932f', price: 380 },
  { id: 'petacc.coleira-strass', label: 'Coleira de strass com coração neon', slot: 'collar', color: '#f3c6d3', price: 650, file: 'acc/coleira-strass.glb', tint: 'tira_tint' },
  { id: 'petacc.bandana-xadrez', label: 'Bandana xadrez', slot: 'collar', color: '#1f3556', price: 220, file: 'acc/bandana-xadrez.glb', fixedColor: true },
  { id: 'petacc.laco-cetim', label: 'Laço de cetim', slot: 'bow', color: '#c96f86', price: 180, file: 'acc/laco-cetim.glb', tint: 'cetim_tint' },
  {
    id: 'petacc.polo-rosa',
    hidden: true, // GLB com defeito (gola/manchas): reativar quando o corrigido chegar
    label: 'Camisa polo rosa',
    slot: 'outfit',
    color: '#f29bb5',
    price: 480,
    tint: 'polo_corpo_tint',
    files: {
      poodle: 'acc/polo-rosa/poodle.glb',
      shiba: 'acc/polo-rosa/shiba.glb',
      dachshund: 'acc/polo-rosa/dachshund.glb',
      caramelo: 'acc/polo-rosa/caramelo.glb',
      maltes: 'acc/polo-rosa/maltes.glb',
      cavalier: 'acc/polo-rosa/cavalier.glb',
      golden: 'acc/polo-rosa/golden.glb',
    },
  },
]
