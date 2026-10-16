import { useInventory } from './inventory.ts'
import { getEdition } from './editions.ts'

/** Colecoes (conjuntos de edicoes). Completar da titulo e emblema (sem moeda: nao e torneira de Brilhos). */
export interface CollectionDef {
  id: string
  name: string
  blurb: string
  editions: string[]
  title: string
  badge: string
}

export const COLLECTIONS: CollectionDef[] = [
  { id: 'col.corte', name: 'Coroas da Corte', blurb: 'Quatro peças de cabeça dignas de um trono.', editions: ['ed.tiara_aurora', 'ed.coroa_baile', 'ed.diadema_estrela', 'ed.veu_lua_mel'], title: 'Guardiã da Corte', badge: 'Coroa de Honra' },
  { id: 'col.gala', name: 'Noite de Gala', blurb: 'Vestido, brincos, pulseira e anel para o grande baile.', editions: ['ed.gala_meia_noite', 'ed.chandelier_lustre', 'ed.tennis_rosa', 'ed.coquetel_esmeralda'], title: 'Dama da Noite', badge: 'Selo de Gala' },
  { id: 'col.y2k', name: 'Febre Y2K', blurb: 'O brilho exagerado do começo dos anos 2000.', editions: ['ed.borboleta_y2k', 'ed.paete_disco', 'ed.laco_bombom', 'ed.gelo_choker'], title: 'Ícone Y2K', badge: 'Borboleta de Prata' },
  { id: 'col.atelie', name: 'Raridades do Ateliê', blurb: 'Peças que só quem fez de tudo no ateliê tem.', editions: ['ed.corset_camelia', 'ed.jeans_aurora', 'ed.blazer_noir', 'ed.coracao_rubi'], title: 'Mestra do Ateliê', badge: 'Agulha de Ouro' },
  { id: 'col.cabelos', name: 'Cabeleira de Luxo', blurb: 'Os dois cabelos de edição limitada.', editions: ['ed.undercut_lunar', 'ed.cachos_mel'], title: 'Musa do Salão', badge: 'Pente de Marfim' },
]

export interface CollectionProgress {
  def: CollectionDef
  have: string[]
  missing: string[]
  complete: boolean
  claimed: boolean
}

export function collectionProgress(): CollectionProgress[] {
  const inv = useInventory.getState()
  const owned = new Set(Object.values(inv.instances).map((i) => i.editionId))
  return COLLECTIONS.map((def) => {
    const have = def.editions.filter((e) => owned.has(e))
    return { def, have, missing: def.editions.filter((e) => !owned.has(e)), complete: have.length === def.editions.length, claimed: inv.claimedSets.includes(def.id) }
  })
}

/** resgata os conjuntos completos; devolve os recem-resgatados */
export function claimCompleted(): CollectionDef[] {
  const out: CollectionDef[] = []
  for (const p of collectionProgress()) {
    if (p.complete && !p.claimed && p.def.editions.every((e) => getEdition(e))) {
      useInventory.getState().claimSet(p.def.id, p.def.title, p.def.badge)
      out.push(p.def)
    }
  }
  return out
}
