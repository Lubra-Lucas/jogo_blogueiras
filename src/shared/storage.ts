/** localStorage seguro (modo privado/bloqueado pode lancar): leitura/escrita nunca quebram o jogo. */
export function loadJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function saveJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* sem persistencia: segue sem salvar */
  }
}

export function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignora */
  }
}

/** Chaves usadas pelo jogo (prefixo unico; sufixo = versao do formato). */
export const STORAGE_KEYS = {
  appearance: 'jb.appearance.v1',
  profile: 'jb.profile.v1',
  quality: 'jb.quality.v1',
  settings: 'jb.settings.v1',
} as const
