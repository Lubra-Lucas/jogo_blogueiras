import { create } from 'zustand'
import { loadJson, saveJson } from '../shared/storage'

/** Feed de fotos (chave compartilhada com o minijogo Passarela: 'jdb.feed.photos', ate 24 itens). */
export interface FeedPhoto {
  id: string
  thumb: string
  title: string
  themeId?: string
  date: string
}
const KEY = 'jdb.feed.photos'
const MAX = 24

interface PhotoState {
  photos: FeedPhoto[]
  /** pedido de captura (o componente dentro do Canvas atende no proximo frame) */
  request: number
  flash: number
  add: (thumb: string, title: string) => void
  remove: (id: string) => void
  reload: () => void
  shoot: () => void
}

const read = (): FeedPhoto[] => {
  const v = loadJson<FeedPhoto[]>(KEY)
  return Array.isArray(v) ? v.filter((p) => p && typeof p.thumb === 'string') : []
}

export const usePhotoStore = create<PhotoState>()((set, get) => ({
  photos: read(),
  request: 0,
  flash: 0,
  reload: () => set({ photos: read() }),
  add: (thumb, title) => {
    const photo: FeedPhoto = { id: `p${Date.now().toString(36)}`, thumb, title, date: new Date().toISOString() }
    const photos = [photo, ...read()].slice(0, MAX)
    saveJson(KEY, photos)
    set({ photos, flash: get().flash + 1 })
  },
  remove: (id) => {
    const photos = read().filter((p) => p.id !== id)
    saveJson(KEY, photos)
    set({ photos })
  },
  shoot: () => set({ request: get().request + 1 }),
}))
