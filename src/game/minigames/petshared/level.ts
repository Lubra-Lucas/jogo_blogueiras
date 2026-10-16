import type { Difficulty } from '../shared/competition'
import { DIFFICULTY_REWARD } from '../shared/competition'
import { getProfessionXp } from '../rewards'

/** Profissão dos minijogos do Petshop. */
export const PET_PROFESSION = 'Tosadora'

export const petLevel = (xp: number) => Math.floor(Math.sqrt(Math.max(0, xp) / 40)) + 1
export const petXpForLevel = (lv: number) => Math.round(((lv - 1) ** 2) * 40)
export const currentPetLevel = () => petLevel(getProfessionXp(PET_PROFESSION))

/** Conteúdo liberado pelo nível de Tosadora. */
export const PET_UNLOCKS: { level: number; id: string; label: string; note: string }[] = [
  { level: 2, id: 'shampoo', label: 'Shampoo de aveia', note: 'Espuma mais rápido no banho.' },
  { level: 3, id: 'estrela', label: 'Modo Estrela', note: 'Dificuldade máxima, sem dicas.' },
  { level: 4, id: 'escova', label: 'Escova dourada', note: 'Pontos extras por sequência perfeita.' },
  { level: 5, id: 'biscoito', label: 'Biscoito premiado', note: 'Mais alegria para o seu pet.' },
]
export const isUnlocked = (id: string, level: number) => (PET_UNLOCKS.find((u) => u.id === id)?.level ?? 1) <= level

/** Estrelas por pontuação em relação à partida "boa" (typical) da dificuldade. */
export function starsFor(score: number, typical: number): 0 | 1 | 2 | 3 {
  if (score >= typical * 1.12) return 3
  if (score >= typical * 0.68) return 2
  if (score >= typical * 0.3) return 1
  return 0
}

export function rewardFor(score: number, stars: number, d: Difficulty, max: number) {
  const base = 28 + Math.min(1, score / max) * 62
  const coins = Math.round((base + stars * 6) * DIFFICULTY_REWARD[d])
  return { coins, xp: 12 + stars * 8, professionXp: 10 + stars * 8 }
}

const seenKey = (id: string) => `jdb.tutorial.${id}`
export function tutorialSeen(id: string): boolean {
  try {
    return localStorage.getItem(seenKey(id)) === '1'
  } catch {
    return false
  }
}
export function markTutorialSeen(id: string) {
  try {
    localStorage.setItem(seenKey(id), '1')
  } catch {
    /* ignora */
  }
}
