import { create } from 'zustand'
import type { Currency, ShopId } from '../../game/economy/types'

export type ShopTab = 'vitrine' | 'catalogo' | 'servicos' | 'diamantes' | 'diario'

/** Pedido de confirmacao de compra (item do catalogo ou servico). */
export type ConfirmRequest =
  | { kind: 'item'; id: string; /** vestir ao concluir (loja com personagem) */ canWear?: boolean }
  | { kind: 'service'; label: string; currency: Currency; price: number; onDone?: () => void }
  | { kind: 'finish'; finish: string; label: string; price: number; onDone?: () => void }

export type PhoneShopTab = 'loja' | 'diamantes' | 'diario' | 'carros' | 'casas'

interface ShopUiState {
  phoneTab: PhoneShopTab
  setPhoneTab: (t: PhoneShopTab) => void
  /** loja aberta na cidade (null = nenhuma) */
  open: ShopId | null
  tab: ShopTab
  confirm: ConfirmRequest | null
  openShop: (id: ShopId, tab?: ShopTab) => void
  closeShop: () => void
  setTab: (t: ShopTab) => void
  ask: (c: ConfirmRequest) => void
  dismiss: () => void
}

export const useShopStore = create<ShopUiState>()((set) => ({
  phoneTab: 'loja',
  setPhoneTab: (phoneTab) => set({ phoneTab }),
  open: null,
  tab: 'vitrine',
  confirm: null,
  openShop: (open, tab = 'vitrine') => set({ open, tab, confirm: null }),
  closeShop: () => set({ open: null, confirm: null }),
  setTab: (tab) => set({ tab }),
  ask: (confirm) => set({ confirm }),
  dismiss: () => set({ confirm: null }),
}))

// dev: acesso pelo console / scripts de captura
if (import.meta.env.DEV) (window as unknown as { __shop: typeof useShopStore }).__shop = useShopStore
