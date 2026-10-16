import { create } from 'zustand'

export type MarketTab = 'explorar' | 'pecas' | 'ordens' | 'historico' | 'colecoes'

interface MarketUiState {
  open: boolean
  tab: MarketTab
  /** edicao aberta no detalhe */
  detail: string | null
  /** abre a janela de venda para esta instancia */
  sellFor: string | null
  notesOpen: boolean
  openMarket: (o?: { tab?: MarketTab; edition?: string }) => void
  closeMarket: () => void
  setTab: (t: MarketTab) => void
  setDetail: (id: string | null) => void
  setSellFor: (id: string | null) => void
  setNotesOpen: (o: boolean) => void
}

export const useMarketUi = create<MarketUiState>()((set) => ({
  open: false,
  tab: 'explorar',
  detail: null,
  sellFor: null,
  notesOpen: false,
  openMarket: (o) => set({ open: true, tab: o?.tab ?? 'explorar', detail: o?.edition ?? null, sellFor: null, notesOpen: false }),
  closeMarket: () => set({ open: false, detail: null, sellFor: null, notesOpen: false }),
  setTab: (tab) => set({ tab, detail: null, notesOpen: false }),
  setDetail: (detail) => set({ detail, notesOpen: false }),
  setSellFor: (sellFor) => set({ sellFor }),
  setNotesOpen: (notesOpen) => set({ notesOpen }),
}))

/** Abre o mercado (para o app "Mercado" do celular). */
export const openMarket = (o?: { tab?: MarketTab; edition?: string }): void => useMarketUi.getState().openMarket(o)
export const closeMarket = (): void => useMarketUi.getState().closeMarket()
