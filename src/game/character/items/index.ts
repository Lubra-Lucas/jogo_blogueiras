// Importar este arquivo registra todos os itens padrao.
import './skirtParametric'
import './dressRococo'
import './hairs'
import './shoes'
import './accessories'

export { buildItem, getItem, listItems, registerItem } from './registry'
export type { BuiltPart, ItemDef, ItemSlot, ItemSpec } from './types'
