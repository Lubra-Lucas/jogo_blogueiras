/** Missoes (por enquanto placeholders de visita; o tipo cresce com os minigames). */
export interface Quest {
  id: string
  title: string
  desc: string
  /** id da area do `locate()` que conclui a missao; ausente = ainda sem gatilho ("Em breve") */
  visit?: string
  xp: number
  coins: number
}

export const QUESTS: Quest[] = [
  { id: 'visit-praca', title: 'Chegue à Praça Central', desc: 'O coração da cidade das blogueiras.', visit: 'praca', xp: 30, coins: 20 },
  { id: 'visit-moda', title: 'Visite a Avenida da Moda', desc: 'Vitrines, passarelas e muito brilho.', visit: 'praca-moda', xp: 60, coins: 40 },
  { id: 'visit-vitrines', title: 'Passeie pela Praça das Vitrines', desc: 'Olhe as vitrines com calma.', visit: 'vitrines', xp: 40, coins: 25 },
  { id: 'visit-lago', title: 'Respire no Parque do Lago', desc: 'Um respiro entre uma tendência e outra.', visit: 'parque', xp: 50, coins: 30 },
  { id: 'visit-jardim', title: 'Descubra o Jardim Romântico', desc: 'Rosas, arcos e um clima de conto de fadas.', visit: 'praca-jardim', xp: 50, coins: 30 },
  { id: 'visit-neon', title: 'Dance no Palco Neon', desc: 'A noite também é sua.', visit: 'praca-neon', xp: 50, coins: 30 },
  { id: 'photo-centro', title: 'Tire uma foto no Centro', desc: 'A câmera do celular chega em breve.', xp: 80, coins: 50 },
]
