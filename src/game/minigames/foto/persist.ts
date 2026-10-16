/** Persistência local do Ensaio Fotográfico (tudo tolerante a falhas de localStorage). */
const TUTORIAL = 'jdb.foto.tutorialDone'
const FOLLOWERS = 'jdb.foto.followers'
const BEST = 'jdb.foto.best'
const FEED = 'jdb.feed.photos'
const FEED_MAX = 24

function get(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function set(key: string, v: string): boolean {
  try {
    localStorage.setItem(key, v)
    return true
  } catch {
    return false
  }
}

export const tutorialDone = () => get(TUTORIAL) === '1'
export const setTutorialDone = () => void set(TUTORIAL, '1')

export const getFollowers = () => Number(get(FOLLOWERS)) || 0
export function addFollowers(n: number): number {
  const total = getFollowers() + n
  set(FOLLOWERS, String(total))
  return total
}

export function getBest(difficulty: string): number {
  try {
    return Number((JSON.parse(get(BEST) ?? '{}') as Record<string, number>)[difficulty]) || 0
  } catch {
    return 0
  }
}
export function saveBest(difficulty: string, avg: number): boolean {
  if (avg <= getBest(difficulty)) return false
  let all: Record<string, number> = {}
  try {
    all = JSON.parse(get(BEST) ?? '{}')
  } catch {
    /* ignora */
  }
  all[difficulty] = avg
  set(BEST, JSON.stringify(all))
  return true
}

interface FeedPhoto {
  id: string
  thumb: string
  title: string
  themeId?: string
  date: string
}

/** Grava a melhor foto no feed do Blogram (mesmo formato de `state/photoStore.ts`). Devolve true se salvou. */
export function saveToFeed(thumb: string, title: string): boolean {
  let list: FeedPhoto[] = []
  try {
    const v = JSON.parse(get(FEED) ?? '[]')
    if (Array.isArray(v)) list = v.filter((p) => p && typeof p.thumb === 'string')
  } catch {
    /* ignora */
  }
  const photo: FeedPhoto = { id: `p${Date.now().toString(36)}`, thumb, title, themeId: 'foto', date: new Date().toISOString() }
  const all = [photo, ...list].slice(0, FEED_MAX)
  for (let n = all.length; n > 0; n = Math.floor(n / 2)) {
    if (set(FEED, JSON.stringify(all.slice(0, n)))) return true
  }
  return false
}
