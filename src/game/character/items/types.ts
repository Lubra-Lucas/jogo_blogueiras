import type { Object3D } from 'three'
import type { JointName } from '../joints'

export type ItemSlot = 'hair' | 'top' | 'bottom' | 'dress' | 'shoes' | 'accessory'

/** Entrada de um builder: cores e parametros vindos do `ItemRef` (ja com defaults mesclados pelo registro). */
export interface ItemSpec {
  colors: string[]
  params: Record<string, number>
}

/** Um pedaco construido: objeto cujo espaco local e o da junta `joint`. */
export interface BuiltPart {
  joint: JointName
  object: Object3D
}

/**
 * Peca do guarda-roupa. `build` devolve malhas ja posicionadas no espaco local de cada junta
 * (cabelo na cabeca, saia nos quadris, mangas nos bracos superiores...), para que sigam o corpo
 * quando o passo 5b girar as juntas. Cada chamada cria geometrias/materiais proprios (o Character
 * os descarta ao trocar de look).
 */
export interface ItemDef {
  id: string
  slot: ItemSlot
  /** juntas onde o item pode colocar partes (documentacao + validacao) */
  attachTo: readonly JointName[]
  /** cores padrao quando o `ItemRef` nao define */
  defaultColors: readonly string[]
  /** parametros padrao */
  defaultParams: Readonly<Record<string, number>>
  build(spec: ItemSpec): BuiltPart[]
}
