import type { ShopId } from '../../game/economy/types'

/**
 * Registro de lojas ligadas a portas da cidade (paralelo ao dos minijogos). A porta lista
 * os minijogos e, depois, as lojas daqui.
 */
export interface ShopDef {
  id: ShopId
  /** nome da loja (titulo) */
  title: string
  /** rotulo do botao no aviso da porta */
  label: string
  /** POI da porta (ids em game/world/city/layout.ts) */
  poi: string
  /** categorias vendidas */
  blurb: string
}

export const SHOPS: ShopDef[] = [
  { id: 'boutique', title: 'Boutique da Avenida', label: 'Loja de roupas', poi: 'boutique', blurb: 'Roupas, meias, luvas e sapatos.' },
  { id: 'joalheria', title: 'Joalheria', label: 'Loja de joias', poi: 'joalheria', blurb: 'Colares, brincos, tiaras, pulseiras e anéis.' },
  { id: 'salao', title: 'Salão & Spa', label: 'Loja do salão', poi: 'salao-spa', blurb: 'Cabelos e serviços de coloração.' },
]

export const getShop = (id: string | null | undefined) => SHOPS.find((s) => s.id === id) ?? null
export const shopsAtPoi = (poi: string) => SHOPS.filter((s) => s.poi === poi)
