/**
 * Registro de DESTINOS de viagem de aviao. Para criar uma cidade nova:
 *  1. adicione um item aqui (id, nome, nivel minimo, preco da passagem em Brilhos, descricao);
 *  2. registre o mundo em `worlds.ts` (portas, navegacao, minimapa, ambiente, chegada);
 *  3. monte o componente 3D em `TravelWorlds.tsx`.
 * Nada mais precisa mudar: a tela de check-in, o celular, o minimapa e o perfil leem este registro.
 */
export interface TravelDestination {
  id: string
  name: string
  /** nivel minimo da jogadora para comprar a passagem */
  minLevel: number
  /** preco da passagem em Brilhos (0 = gratis) */
  price: number
  /** descricao curta (pt-BR) */
  blurb: string
  /** duracao do voo (s): a cena da janela do aviao; pode ser pulada */
  flightSeconds: number
  /** cores da cena de chegada (ceu) para a transicao do voo: topo, meio, horizonte */
  sky: [string, string, string]
  /** o que aparece la embaixo na chegada: costa com mar turquesa ou cidade/terra */
  approach: 'coast' | 'city'
  /** destino a que o jogador volta (cidade inicial); passagem de volta e sempre gratis */
  home?: boolean
}

/**
 * Nivel minimo de Miami Beach = 15 (decisao do usuario; destino exclusivo de longo prazo). Referencia: a curva de XP (profileStore.xpToNext = 80 + 45*(n-1)^1.5)
 * pede ~1.750 XP acumulados para sair do nivel 1 ao 7; com ~35-50 XP por rodada de minijogo e ~350 XP das
 * missoes iniciais isso e cerca de 1h30 a 2h de jogo (o nivel 8 pede ~2.490 XP, perto de 3h).
 */
export const MIAMI_MIN_LEVEL = 15

export const DESTINATIONS: TravelDestination[] = [
  {
    id: 'main',
    name: 'Cidade das Blogueiras',
    minLevel: 1,
    price: 0,
    blurb: 'Casa: Centro, Avenida da Moda, Palco Neon e o Jardim Romântico.',
    flightSeconds: 4,
    sky: ['#3f86d8', '#9cc7ec', '#e9eef4'],
    approach: 'city',
    home: true,
  },
  {
    id: 'miami',
    name: 'Miami Beach',
    minLevel: MIAMI_MIN_LEVEL,
    price: 40,
    blurb: 'Praia, Ocean Drive Art Déco, palmeiras, salva-vidas coloridos e um píer sobre o mar turquesa.',
    flightSeconds: 5,
    sky: ['#1d86e6', '#6cc4f0', '#ffd9b0'],
    approach: 'coast',
  },
]

export const getDestination = (id: string | null | undefined) => DESTINATIONS.find((d) => d.id === id) ?? null
export const HOME_ID = 'main'
