import type { EditionDef, Origin } from './types.ts'

/**
 * Edicoes limitadas iniciais. Cada uma e uma "colorway" exclusiva de um item do catalogo, com teto de copias.
 * Dados puros (sem imports do jogo) para a simulacao rodar tambem no Node.
 * `colorway.colors` segue a ordem dos slots de material do manifesto do item (joia: metal, gem, pearl, ribbon;
 * roupa: base, trim, accent, lining).
 */
export const EDITIONS: EditionDef[] = [
  {
    id: 'ed.tiara_aurora', itemId: 'tiara', kind: 'jewelry', name: 'Tiara Aurora', origin: 'temporada', originNote: 'Temporada 1',
    blurb: 'Ouro rosé e cristais da cor do amanhecer. Só 300 foram feitas.', cap: 300, rarity: 'lendario', prestige: 1.1, tint: '#d9a08a',
    colorway: { colors: ['#e8a090', '#ffd9cf', '#fff3ec'] }, mintedStart: 0.82, ageDays: 24,
  },
  {
    id: 'ed.coroa_baile', itemId: 'queen_crown', kind: 'jewelry', name: 'Coroa da Rainha do Baile', origin: 'evento', originNote: 'Baile de Gala 2026',
    blurb: 'Entregue às coroadas do Baile de Gala. Edição encerrada.', cap: 120, rarity: 'lendario', prestige: 1.5, tint: '#c9a24a',
    colorway: { colors: ['#f2c14e', '#b3122e', '#f6efe0'] }, retired: true, mintedStart: 1, ageDays: 70,
  },
  {
    id: 'ed.diadema_estrela', itemId: 'star_diadem', kind: 'jewelry', name: 'Diadema Estrela Cadente', origin: 'evento', originNote: 'Chuva de Estrelas',
    blurb: 'Prata lunar com cristais azul-gelo, lançada na noite da chuva de estrelas.', cap: 250, rarity: 'epico', prestige: 1.25, tint: '#8fa6c9',
    colorway: { colors: ['#d9dde6', '#a9c8ff'] }, reserved: 25, mintedStart: 0.7, ageDays: 18,
  },
  {
    id: 'ed.veu_lua_mel', itemId: 'pearl_veil', kind: 'jewelry', name: 'Véu Lua de Mel', origin: 'conquista', originNote: 'Conquista "Noiva do Ano"',
    blurb: 'Só quem completa a coleção de casamento recebe um.', cap: 100, rarity: 'epico', prestige: 1.6, tint: '#e8dcc4',
    colorway: { colors: ['#fff6ea', '#f3e9dc', '#ffffff'] }, mintedStart: 0.55, ageDays: 40,
  },
  {
    id: 'ed.borboleta_y2k', itemId: 'butterfly_clips', kind: 'jewelry', name: 'Presilhas Borboleta Y2K', origin: 'temporada', originNote: 'Temporada 1',
    blurb: 'Asas translúcidas em lilás e prata, febre do início dos anos 2000.', cap: 500, rarity: 'raro', prestige: 1.0, tint: '#8e7cc3',
    colorway: { colors: ['#d9dde6', '#c8a4ff'] }, mintedStart: 0.9, ageDays: 24,
  },
  {
    id: 'ed.laco_bombom', itemId: 'giant_bow', kind: 'jewelry', name: 'Laço Gigante Bombom', origin: 'missao_dificil', originNote: 'Missão "Cinco Estrelas"',
    blurb: 'Cetim vermelho-cereja com ferragem dourada.', cap: 400, rarity: 'raro', prestige: 1.15, tint: '#a3132c',
    colorway: { colors: ['#f2c14e', '#ffffff', '#b3122e'] }, reserved: 40, mintedStart: 0.45, ageDays: 12,
  },
  {
    id: 'ed.gelo_choker', itemId: 'crystal_choker', kind: 'jewelry', name: 'Gargantilha Cristal Gelo', origin: 'ranking', originNote: 'Top 3 da Passarela',
    blurb: 'Premiação da Passarela: só as três melhores de cada rodada de ranking.', cap: 120, rarity: 'epico', prestige: 1.4, tint: '#8cc3d9',
    colorway: { colors: ['#f4f6fb', '#bfe6ff'] }, mintedStart: 0.6, ageDays: 30,
  },
  {
    id: 'ed.chandelier_lustre', itemId: 'chandelier_drops', kind: 'jewelry', name: 'Brincos Lustre Imperial', origin: 'evento', originNote: 'Noite de Ópera',
    blurb: 'Cascatas de cristal sobre ouro velho. Aposentados após a ópera.', cap: 200, rarity: 'epico', prestige: 1.3, tint: '#b88a3e', retired: true,
    colorway: { colors: ['#d9a93f', '#fff1c9', '#f7efe1'] }, mintedStart: 1, ageDays: 55,
  },
  {
    id: 'ed.tennis_rosa', itemId: 'tennis_bracelet', kind: 'jewelry', name: 'Pulseira Tênis Diamante Rosa', origin: 'ranking', originNote: 'Campeã do mês',
    blurb: 'Um cristal rosado raríssimo para a campeã do ranking mensal.', cap: 100, rarity: 'epico', prestige: 1.5, tint: '#d9789f',
    colorway: { colors: ['#f4f6fb', '#ffb3d1'] }, mintedStart: 0.5, ageDays: 26,
  },
  {
    id: 'ed.coquetel_esmeralda', itemId: 'cocktail_ring', kind: 'jewelry', name: 'Anel Coquetel Esmeralda', origin: 'temporada', originNote: 'Temporada 1',
    blurb: 'Pedra verde profunda cercada de pérolas.', cap: 350, rarity: 'epico', prestige: 1.15, tint: '#1f5d46',
    colorway: { colors: ['#f2c14e', '#1f8a62', '#f6efe0'] }, mintedStart: 0.78, ageDays: 24,
  },
  {
    id: 'ed.coracao_rubi', itemId: 'heart_ring', kind: 'jewelry', name: 'Anel Coração Rubi', origin: 'evento', originNote: 'Aniversário do jogo',
    blurb: 'Presente de aniversário. Nunca mais será feito.', cap: 200, rarity: 'raro', prestige: 1.3, tint: '#8f1d33', retired: true,
    colorway: { colors: ['#f2c14e', '#c4122f'] }, mintedStart: 1, ageDays: 60,
  },
  {
    id: 'ed.gala_meia_noite', itemId: 'ballgown', kind: 'garment', name: 'Vestido Gala Meia-Noite', origin: 'temporada', originNote: 'Temporada 1',
    blurb: 'Cetim verde-garrafa com forro de tule champanhe.', cap: 250, rarity: 'lendario', prestige: 1.0, tint: '#17392d',
    colorway: { colors: ['#17392d', '#c9a24a', '#0f241c', '#f2e6cf'], finishes: ['satin', 'satin', 'satin', 'tulle'] }, mintedStart: 0.72, ageDays: 24,
  },
  {
    id: 'ed.paete_disco', itemId: 'sequin_top', kind: 'garment', name: 'Top Paetê Discoteca', origin: 'evento', originNote: 'Festival de Verão',
    blurb: 'Paetês prateados que mudam de tom na luz do palco.', cap: 600, rarity: 'raro', prestige: 0.95, tint: '#9aa3b5',
    colorway: { colors: ['#cfd4e0'] }, mintedStart: 0.6, ageDays: 9,
  },
  {
    id: 'ed.corset_camelia', itemId: 'corset', kind: 'garment', name: 'Corset Camélia', origin: 'missao_dificil', originNote: 'Missão "Ateliê Secreto"',
    blurb: 'Látex marfim com detalhes em ouro. Costurado à mão (no jogo).', cap: 300, rarity: 'raro', prestige: 1.2, tint: '#d8cdb6',
    colorway: { colors: ['#f2ead9', '#c9a24a', '#e8c66a'] }, mintedStart: 0.4, ageDays: 10,
  },
  {
    id: 'ed.jeans_aurora', itemId: 'denim_jacket', kind: 'garment', name: 'Jaqueta Jeans Customizada', origin: 'conquista', originNote: 'Conquista "Mão na Massa"',
    blurb: 'Jeans lavado com rebites dourados, exclusiva de quem concluiu o ateliê.', cap: 500, rarity: 'raro', prestige: 1.05, tint: '#4f6f98',
    colorway: { colors: ['#4f6f98', '#e9eef6', '#f2c14e'] }, mintedStart: 0.35, ageDays: 14,
  },
  {
    id: 'ed.blazer_noir', itemId: 'blazer', kind: 'garment', name: 'Blazer Alfaiataria Noir', origin: 'ranking', originNote: 'Top 10 da Passarela',
    blurb: 'Preto profundo com forro de cetim e botões dourados.', cap: 150, rarity: 'epico', prestige: 1.35, tint: '#1b1b1f',
    colorway: { colors: ['#17171b', '#2b2b33', '#c9a24a'] }, mintedStart: 0.66, ageDays: 28,
  },
  {
    id: 'ed.undercut_lunar', itemId: 'hair.platinumUndercut', kind: 'hair', name: 'Undercut Platina Lunar', origin: 'temporada', originNote: 'Temporada 1',
    blurb: 'Platinado com reflexo de lua cheia.', cap: 400, rarity: 'raro', prestige: 1.1, tint: '#cfd3de',
    colorway: { colors: ['#eef0f7'] }, mintedStart: 0.74, ageDays: 24,
  },
  {
    id: 'ed.cachos_mel', itemId: 'hair.caramelCurls', kind: 'hair', name: 'Cachos Mel Dourado', origin: 'evento', originNote: 'Festival do Mel',
    blurb: 'Cachos caramelo com brilho de mel ao sol.', cap: 350, rarity: 'raro', prestige: 1.15, tint: '#c58b3a',
    colorway: { colors: ['#d79a3e'] }, mintedStart: 0.5, ageDays: 15,
  },
]

export const EDITION_BY_ID: Record<string, EditionDef> = Object.fromEntries(EDITIONS.map((e) => [e.id, e]))
export const getEdition = (id: string): EditionDef | null => EDITION_BY_ID[id] ?? null
export const editionsOfItem = (itemId: string): EditionDef[] => EDITIONS.filter((e) => e.itemId === itemId)
export const ORIGINS: Origin[] = ['temporada', 'evento', 'ranking', 'missao_dificil', 'conquista']
