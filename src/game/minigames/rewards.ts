/**
 * Recompensas dos minijogos.
 *
 * Se `src/state/profileStore.ts` existir (perfil do jogador: nivel, xp, Brilhos, profissao), as
 * recompensas vao para ele (ver `profileBridge`). Enquanto nao existir, ficam em localStorage:
 *  - 'jdb.pendingRewards'  : { coins, xp, professionXp: { Barista: n } } acumulado, para o perfil
 *                            "resgatar" depois (`takePendingRewards()` le e zera);
 *  - 'jdb.profession.xp'   : { Barista: n } espelho local do XP de profissao (le-se em `getProfessionXp`).
 */

export interface Rewards {
  coins: number
  xp: number
  professionXp: Record<string, number>
}

const PENDING_KEY = 'jdb.pendingRewards'
const PROF_KEY = 'jdb.profession.xp'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback
  } catch {
    return fallback
  }
}
function writeJson(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    /* armazenamento indisponivel */
  }
}

// O perfil e opcional em tempo de build: import.meta.glob devolve {} se o arquivo nao existir.
const profileModules = import.meta.glob('/src/state/profileStore.ts', { eager: true }) as Record<string, Record<string, unknown>>

interface ProfileBridge {
  grant(r: Rewards): boolean
  professionXp(name: string): number | null
}

function loadBridge(): ProfileBridge | null {
  const mod = Object.values(profileModules)[0]
  if (!mod) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const store = (mod.useProfileStore ?? mod.useProfile) as any
  if (!store || typeof store.getState !== 'function') return null
  return {
    grant(r) {
      const st = store.getState()
      if (typeof st.grantRewards === 'function') {
        st.grantRewards(r)
        return true
      }
      let used = false
      if (typeof st.addCoins === 'function' && r.coins) (st.addCoins(r.coins), (used = true))
      if (typeof st.addXp === 'function' && r.xp) (st.addXp(r.xp), (used = true))
      if (typeof st.addProfessionXp === 'function') {
        for (const [k, v] of Object.entries(r.professionXp)) st.addProfessionXp(k, v)
        used = true
      }
      return used
    },
    professionXp(name) {
      const st = store.getState()
      const v = st?.professionXp?.[name] ?? st?.professions?.[name]?.xp
      return typeof v === 'number' ? v : null
    },
  }
}

export function grantRewards(r: { coins?: number; xp?: number; professionXp?: Record<string, number> }): void {
  const rewards: Rewards = { coins: r.coins ?? 0, xp: r.xp ?? 0, professionXp: r.professionXp ?? {} }
  // espelho local do XP de profissao (usado para niveis/desbloqueios enquanto nao ha perfil)
  const prof = readJson<Record<string, number>>(PROF_KEY, {})
  for (const [k, v] of Object.entries(rewards.professionXp)) prof[k] = (prof[k] ?? 0) + v
  writeJson(PROF_KEY, prof)

  const bridge = loadBridge()
  if (bridge?.grant(rewards)) return
  const pending = readJson<Rewards>(PENDING_KEY, { coins: 0, xp: 0, professionXp: {} })
  pending.coins += rewards.coins
  pending.xp += rewards.xp
  for (const [k, v] of Object.entries(rewards.professionXp)) pending.professionXp[k] = (pending.professionXp[k] ?? 0) + v
  writeJson(PENDING_KEY, pending)
}

/** XP atual de uma profissao (perfil, se existir; senao o espelho local). */
export function getProfessionXp(name: string): number {
  const fromProfile = loadBridge()?.professionXp(name)
  if (fromProfile !== null && fromProfile !== undefined) return fromProfile
  return readJson<Record<string, number>>(PROF_KEY, {})[name] ?? 0
}

/** Le e zera as recompensas pendentes (para o perfil resgatar). */
export function takePendingRewards(): Rewards {
  const p = readJson<Rewards>(PENDING_KEY, { coins: 0, xp: 0, professionXp: {} })
  try {
    localStorage.removeItem(PENDING_KEY)
  } catch {
    /* ignora */
  }
  return p
}
