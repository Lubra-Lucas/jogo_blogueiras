/**
 * Catalogo de carros. A economia (game/economy/bigTickets.ts) le o array `CARS` de forma tolerante:
 * id, nome, descricao, precoBrilhos, precoDiamantes, raridade, cores[0].
 * Ids de compra: `car.<slug>` (o mesmo texto fica em `profile.owned`).
 */
export type CarRarity = 'comum' | 'raro' | 'epico' | 'lendario'

export interface CarStats {
  /** 1..10 (so para exibir) */
  velocidade: number
  aceleracao: number
  controle: number
}

/** Parametros de fisica de cada carro (m, s, kg). */
export interface CarPhysics {
  mass: number
  /** velocidade maxima (m/s) sem nitro */
  vTop: number
  /** aceleracao com o carro parado (m/s2) */
  accel: number
  /** velocidade maxima de re (m/s) */
  vReverse: number
  /** esterco (rad) da roda parada / na velocidade maxima */
  steerLow: number
  steerHigh: number
  /** quanto a derrapagem exagera o giro (0..1) */
  driftYaw: number
  /** taxa (1/s) de eliminacao da velocidade lateral: com aderencia / derrapando */
  gripHigh: number
  gripLow: number
}

export interface CarSpec {
  id: string
  slug: string
  nome: string
  descricao: string
  modelo: string
  /** cor de apresentacao / padrao da carroceria */
  cor: string
  cores: string[]
  precoBrilhos?: number
  precoDiamantes?: number
  raridade: CarRarity
  stats: CarStats
  fisica: CarPhysics
  /** todos tem direito ao carro inicial */
  inicial?: boolean
  /**
   * Ajuste fino do banco do motorista (m, somado ao `seat.y` do GLB; negativo = banco mais baixo). A boneca sentada tem
   * ~0,94 m do assento ao topo do coque; cabines baixas pedem baixar o quadril (ate ~8 cm, o que a almofada comporta).
   */
  bancoDy?: number
  /** altura dos olhos acima do banco na camera em 1a pessoa (m); padrao 0,65 */
  olhoY?: number
}

export const BODY_COLORS: ReadonlyArray<{ id: string; nome: string; hex: string }> = [
  { id: 'creme', nome: 'Creme', hex: '#e9dfc8' },
  { id: 'verde', nome: 'Verde-inglês', hex: '#2f5d46' },
  { id: 'marinho', nome: 'Azul-marinho', hex: '#26406b' },
  { id: 'bordo', nome: 'Bordô', hex: '#6e2433' },
  { id: 'mostarda', nome: 'Mostarda', hex: '#d9a02a' },
  { id: 'prata', nome: 'Prata', hex: '#b9bfc9' },
  { id: 'carvao', nome: 'Carvão', hex: '#2c2f36' },
  { id: 'salvia', nome: 'Sálvia', hex: '#8fb09a' },
  { id: 'terracota', nome: 'Terracota', hex: '#b5502f' },
  { id: 'perola', nome: 'Pérola', hex: '#f1ede2' },
]

export const RIM_COLORS: ReadonlyArray<{ id: string; nome: string; hex: string }> = [
  { id: 'prata', nome: 'Prata', hex: '#d9dde6' },
  { id: 'ouro', nome: 'Ouro', hex: '#c9a15a' },
  { id: 'grafite', nome: 'Grafite', hex: '#3a3d44' },
  { id: 'branco', nome: 'Branco', hex: '#f4f0e6' },
]

const model = (slug: string) => `${import.meta.env?.BASE_URL ?? "/"}assets/vehicles/${slug}.glb`
const pick = (...ids: string[]) => ids.map((i) => BODY_COLORS.find((c) => c.id === i)?.hex ?? '#cccccc')

export const CARS: CarSpec[] = [
  {
    id: 'car.compacto',
    slug: 'compacto',
    nome: 'Docinho',
    descricao: 'Compacto fofo e ágil, perfeito para virar esquinas e estacionar em qualquer lugar.',
    modelo: model('compacto'),
    cor: '#e9dfc8',
    cores: pick('creme', 'salvia', 'mostarda', 'marinho', 'terracota', 'perola'),
    precoBrilhos: 6500,
    raridade: 'comum',
    inicial: true,
    stats: { velocidade: 4, aceleracao: 5, controle: 9 },
    bancoDy: -0.08, // teto interno ~0,84 m acima do banco; o coque ainda encosta no forro
    fisica: { mass: 1000, vTop: 27, accel: 3.6, vReverse: 8, steerLow: 0.66, steerHigh: 0.2, driftYaw: 0.35, gripHigh: 12, gripLow: 2.4 },
  },
  {
    id: 'car.conversivel',
    slug: 'conversivel',
    nome: 'Madame',
    descricao: 'Conversível de luxo com capota aberta e muito estilo.',
    modelo: model('conversivel'),
    cor: '#6e2433',
    cores: pick('bordo', 'creme', 'verde', 'marinho', 'perola', 'carvao'),
    precoBrilhos: 48000,
    precoDiamantes: 3200,
    raridade: 'epico',
    stats: { velocidade: 7, aceleracao: 7, controle: 7 },
    fisica: { mass: 1350, vTop: 34, accel: 4.4, vReverse: 9, steerLow: 0.58, steerHigh: 0.17, driftYaw: 0.42, gripHigh: 11, gripLow: 2.1 },
  },
  {
    id: 'car.suv',
    slug: 'suv',
    nome: 'Safári',
    descricao: 'SUV parrudo e estável, aguenta qualquer passeio.',
    modelo: model('suv'),
    cor: '#2f5d46',
    cores: pick('verde', 'carvao', 'prata', 'terracota', 'marinho', 'perola'),
    precoBrilhos: 28000,
    raridade: 'raro',
    stats: { velocidade: 5, aceleracao: 5, controle: 6 },
    bancoDy: -0.06, // teto interno ~0,89 m acima do banco
    fisica: { mass: 1900, vTop: 30, accel: 3.4, vReverse: 8, steerLow: 0.52, steerHigh: 0.15, driftYaw: 0.3, gripHigh: 13, gripLow: 2.8 },
  },
  {
    id: 'car.esportivo',
    slug: 'esportivo',
    nome: 'Relâmpago',
    descricao: 'Esportivo baixo e largo: rápido de verdade e adora derrapar.',
    modelo: model('esportivo'),
    cor: '#26406b',
    cores: pick('marinho', 'mostarda', 'bordo', 'carvao', 'perola', 'verde'),
    precoBrilhos: 85000,
    precoDiamantes: 6500,
    raridade: 'lendario',
    stats: { velocidade: 10, aceleracao: 9, controle: 6 },
    bancoDy: -0.07, // teto interno so ~0,59 m acima do banco: mesmo assim a cabeca nao cabe (ver relatorio)
    olhoY: 0.5,
    fisica: { mass: 1250, vTop: 43, accel: 6, vReverse: 10, steerLow: 0.5, steerHigh: 0.13, driftYaw: 0.5, gripHigh: 10, gripLow: 1.8 },
  },
  {
    id: 'car.van',
    slug: 'van',
    nome: 'Food Truck',
    descricao: 'Van retrô com janelinha de atendimento e toldo listrado.',
    modelo: model('van'),
    cor: '#8fb09a',
    cores: pick('salvia', 'creme', 'mostarda', 'terracota', 'marinho', 'perola'),
    precoBrilhos: 19000,
    raridade: 'raro',
    stats: { velocidade: 3, aceleracao: 3, controle: 5 },
    fisica: { mass: 2400, vTop: 24, accel: 2.9, vReverse: 7, steerLow: 0.46, steerHigh: 0.14, driftYaw: 0.25, gripHigh: 13, gripLow: 3.2 },
  },
]

export const carBySlug = (slug: string): CarSpec => CARS.find((c) => c.slug === slug) ?? CARS[0]
export const carById = (id: string): CarSpec | undefined => CARS.find((c) => c.id === id)
