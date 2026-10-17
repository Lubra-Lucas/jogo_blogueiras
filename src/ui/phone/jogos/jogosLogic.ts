import { create } from 'zustand'
import type { ComponentType, SVGProps } from 'react'
import { CITY } from '../../../game/world/city/layout'
import { useMinigameStore } from '../../../game/minigames/minigameStore'
import { getProfessionXp } from '../../../game/minigames/rewards'
import { PET_PROFESSION, petLevel } from '../../../game/minigames/petshared/level'
import { usePetStore } from '../../../game/pets/petStore'
import { HOME_ID } from '../../../game/travel/destinations'
import { professionLevel } from '../../../state/profileStore'
import { GBeach, GChip, GFun, GPaw, GWork } from '../../glyphs'
import { MINIGAMES, getMinigame, type MinigameCategory, type MinigameDef } from '../../minigames/registry'
import { minimizePhone, restorePhone, usePhoneMin } from '../phoneMin'

/** Categorias do app Jogos (ordem dos filtros). */
export const CATEGORIES: Array<{ id: MinigameCategory; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>>; color: string }> = [
  { id: 'trabalho', label: 'Trabalho', Icon: GWork, color: '#d99a2b' },
  { id: 'diversao', label: 'Diversão', Icon: GFun, color: '#d9789f' },
  { id: 'pets', label: 'Pets', Icon: GPaw, color: '#3a9f8a' },
  { id: 'cassino', label: 'Cassino', Icon: GChip, color: '#8a6a2a' },
  { id: 'praia', label: 'Praia', Icon: GBeach, color: '#2f8fa8' },
]

/** Minijogos "de verdade" (fora o check-in do aeroporto), vindos do registro: novos entram sozinhos. */
export const listGames = (): MinigameDef[] => MINIGAMES.filter((m) => m.id !== 'viagem')

export const categoryId = (d: MinigameDef): MinigameCategory => d.category ?? (d.profession ? 'trabalho' : 'diversao')
export const categoryInfo = (d: MinigameDef) => CATEGORIES.find((c) => c.id === categoryId(d)) ?? CATEGORIES[1]
export const iconOf = (d: MinigameDef) => d.icon ?? categoryInfo(d).Icon
export const cityOf = (d: MinigameDef) => d.city ?? HOME_ID

/** "Café Rosé – Centro" */
export function placeOf(d: MinigameDef): string {
  if (d.place) return d.place
  const poi = CITY.pois.find((p) => p.id === d.poi)
  if (!poi) return d.label
  const dist = CITY.districts.find((x) => x.id === poi.district)
  return dist && dist.name !== poi.name ? `${poi.name} – ${dist.name}` : poi.name
}

/** Recorde (maior pontuacao registrada, sem contar desafios do dia), ou null. */
export function bestOf(d: MinigameDef): number | null {
  let best = 0
  const num = (v: unknown) => {
    if (typeof v === 'number') {
      if (v > best) best = v
    } else if (v && typeof v === 'object') {
      const o = v as { score100?: number }
      if (typeof o.score100 === 'number') num(o.score100)
      else for (const x of Object.values(v)) num(x)
    }
  }
  try {
    if (d.bestKey) {
      const raw = localStorage.getItem(d.bestKey)
      if (raw) num(JSON.parse(raw))
    }
    const re = /^jdb\.rank\.(.+)\.(facil|normal|dificil|estrela)$/
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? ''
      const m = re.exec(k)
      if (!m || !(m[1] === d.id || m[1].startsWith(`${d.id}-`)) || /-(dia|diario)$/.test(m[1])) continue
      num(Number(localStorage.getItem(k)))
    }
  } catch {
    /* armazenamento indisponivel */
  }
  return best > 0 ? Math.round(best) : null
}

export function professionOf(d: MinigameDef): { name: string; level: number } | null {
  if (!d.profession) return null
  const xp = getProfessionXp(d.profession)
  return { name: d.profession, level: d.profession === PET_PROFESSION ? petLevel(xp) : professionLevel(xp) }
}

/** Por que nao da para abrir agora (null = pode). */
export function blockedReason(d: MinigameDef, hasPet: boolean): 'pet' | 'local' | null {
  if (d.onSiteOnly) return 'local'
  if (d.needsPet && !hasPet) return 'pet'
  return null
}

// ---- jogados recentemente ----
const RECENT_KEY = 'jdb.jogos.recent'
const readRecent = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}
export const useRecentGames = create<{ ids: string[] }>()(() => ({ ids: readRecent() }))

// ---- jogar pelo celular: minimiza o aparelho e volta a ele ao sair ----
let returnToPhone = false

export function playFromPhone(id: string) {
  const d = getMinigame(id)
  if (!d || useMinigameStore.getState().active) return
  if (blockedReason(d, !!usePetStore.getState().active)) return
  returnToPhone = true
  minimizePhone()
  useMinigameStore.getState().open(id)
}

useMinigameStore.subscribe((s, prev) => {
  if (s.active && !prev.active) {
    const ids = [s.active, ...useRecentGames.getState().ids.filter((x) => x !== s.active)].slice(0, 6)
    useRecentGames.setState({ ids })
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(ids))
    } catch {
      /* ignora */
    }
  } else if (!s.active && prev.active) {
    const back = returnToPhone
    returnToPhone = false
    if (back && usePhoneMin.getState().min) window.setTimeout(restorePhone, 60)
  }
})
