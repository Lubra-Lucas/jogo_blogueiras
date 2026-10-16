/** Missoes do celular. `poi` = destino para "Ir ate la" / "Viagem rapida" (ids da navegacao). */
export type QuestTrigger = 'visit' | 'minigame-cafe' | 'minigame-desfile' | 'sit-park' | 'photo-spot'

export interface Quest {
  id: string
  title: string
  desc: string
  poi: string
  trigger: QuestTrigger
  /** trigger 'visit': id da area do `locate()` */
  area?: string
  xp: number
  coins: number
  /** item de catalogo entregue ao concluir (economia) */
  rewardItem?: string
  /** edicao limitada numerada entregue ao concluir (mercado) */
  rewardEdition?: string
}

export const QUESTS: Quest[] = [
  { id: 'work-cafe', title: 'Trabalhe no Café Rosé', desc: 'Atenda uma rodada de pedidos no café.', poi: 'cafe-rose', trigger: 'minigame-cafe', xp: 70, coins: 45 },
  { id: 'runway', title: 'Desfile na Passarela', desc: 'Monte um look e encare os jurados.', poi: 'boutique', trigger: 'minigame-desfile', xp: 90, coins: 60, rewardItem: 'star_pins', rewardEdition: 'ed.laco_bombom' },
  { id: 'visit-moda', title: 'Visite a Avenida da Moda', desc: 'Vitrines, passarelas e muito brilho.', poi: 'moda', trigger: 'visit', area: 'praca-moda', xp: 60, coins: 40 },
  { id: 'sit-park', title: 'Sente num banco do Parque', desc: 'Um respiro à beira do lago.', poi: 'parque', trigger: 'sit-park', xp: 50, coins: 30 },
  { id: 'photo-spot', title: 'Tire uma foto no ponto #JogoDasBlogueiras', desc: 'Abra o celular, Câmera, e clique na Praça Central.', poi: 'centro', trigger: 'photo-spot', xp: 80, coins: 50, rewardEdition: 'ed.diadema_estrela' },
]
