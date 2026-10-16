/**
 * Persistência local do minijogo (localStorage; tudo opcional/tolerante a falhas).
 *  - 'jdb.desfile.best'  : { [themeId]: { score100, rank, date } } melhor resultado por tema;
 *  - 'jdb.fama'          : número (Fama acumulada). Se o perfil tiver `addFame`/`addFama`, também é chamado;
 *  - 'jdb.feed.photos'   : lista (até 24) de { id, thumb(dataURL), title, themeId, date } para o futuro feed social.
 */

const BEST_KEY = 'jdb.desfile.best'
const FAME_KEY = 'jdb.fama'
const PHOTOS_KEY = 'jdb.feed.photos'

export interface BestEntry {
  score100: number
  rank: number
  date: number
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function write(key: string, v: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(v))
    return true
  } catch {
    return false
  }
}

export const getBest = (): Record<string, BestEntry> => read<Record<string, BestEntry>>(BEST_KEY, {})

/** Guarda se for o melhor resultado do tema. Devolve true se bateu o recorde. */
export function saveBest(themeId: string, score100: number, rank: number): boolean {
  const all = getBest()
  const cur = all[themeId]
  if (cur && cur.score100 >= score100) return false
  all[themeId] = { score100, rank, date: Date.now() }
  write(BEST_KEY, all)
  return true
}

export const getFame = (): number => read<number>(FAME_KEY, 0)

const profileModules = import.meta.glob('/src/state/profileStore.ts', { eager: true }) as Record<string, Record<string, unknown>>

export function addFame(n: number): number {
  const total = getFame() + n
  write(FAME_KEY, total)
  try {
    const mod = Object.values(profileModules)[0]
    const store = (mod?.useProfileStore ?? mod?.useProfile) as { getState?: () => Record<string, unknown> } | undefined
    const st = store?.getState?.()
    const fn = st?.addFame ?? st?.addFama
    if (typeof fn === 'function') (fn as (n: number) => void)(n)
  } catch {
    /* perfil indisponível */
  }
  return total
}

export interface FeedPhoto {
  id: string
  thumb: string
  title: string
  themeId: string
  date: number
}

export const getPhotos = (): FeedPhoto[] => read<FeedPhoto[]>(PHOTOS_KEY, [])

export function savePhoto(p: FeedPhoto): boolean {
  const list = [p, ...getPhotos()].slice(0, 24)
  // se estourar a cota, tenta de novo guardando menos fotos
  for (let n = list.length; n > 0; n = Math.floor(n / 2)) {
    if (write(PHOTOS_KEY, list.slice(0, n))) return true
  }
  return false
}

/** Reduz um canvas/dataURL para uma miniatura JPEG (largura `w`). */
export async function makeThumb(source: HTMLCanvasElement, w = 360): Promise<string> {
  const scale = w / source.width
  const c = document.createElement('canvas')
  c.width = w
  c.height = Math.max(1, Math.round(source.height * scale))
  const ctx = c.getContext('2d')
  if (!ctx) return ''
  ctx.drawImage(source, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.72)
}
