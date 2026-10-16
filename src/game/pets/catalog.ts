import { create } from 'zustand'
import { PET_BREED_PRICE, PET_DIAMOND_COATS, PET_TIER_ADD } from '../economy/prices'

/** Manifest dos pets (public/assets/pets/pets.json, gerado por tools/blender/pets). */
export interface PetCoat {
  id: string
  label: string
  tier: 'comum' | 'raro'
  /** cor por slot de material (coat, coat2, coat3, belly, nose, eye, iris, pupil, glint, inner, tongue) */
  colors: Record<string, string>
}
export interface PetBreed {
  id: string
  label: string
  species: 'dog' | 'cat'
  file: string
  /** medidas (m) e pontos-chave no espaco do modelo (x, y cima, z frente) */
  meta: { hr: number; L: number; bh: number; bw: number; zc: number; n0: number[]; hn: number[]; hc: number[]; neckR: number; height: number }
  coats: PetCoat[]
}
interface Manifest {
  anims: string[]
  breeds: PetBreed[]
}

export type PetClip = 'idle' | 'walk' | 'run' | 'sit' | 'lie' | 'happy' | 'eat'

export const PET_BASE = `${import.meta.env.BASE_URL}assets/pets/`

interface CatalogState {
  breeds: PetBreed[]
  loaded: boolean
}
export const usePetCatalog = create<CatalogState>()(() => ({ breeds: [], loaded: false }))

let started = false
export function loadPetCatalog(): void {
  if (started) return
  started = true
  fetch(`${PET_BASE}pets.json`)
    .then((r) => r.json())
    .then((m: Manifest) => usePetCatalog.setState({ breeds: m.breeds, loaded: true }))
    .catch((e) => {
      started = false
      console.warn('[pets] manifest indisponivel', e)
    })
}

/** id de item de economia: `pet.<raca>.<pelagem>` */
export const petItemId = (breed: string, coat: string) => `pet.${breed}.${coat}`

export function parsePetId(id: string): { breed: string; coat: string } | null {
  const m = /^pet\.([^.]+)\.([^.]+)$/.exec(id)
  return m ? { breed: m[1], coat: m[2] } : null
}

export function findPet(breeds: PetBreed[], id: string): { breed: PetBreed; coat: PetCoat } | null {
  const p = parsePetId(id)
  if (!p) return null
  const breed = breeds.find((b) => b.id === p.breed)
  const coat = breed?.coats.find((c) => c.id === p.coat)
  return breed && coat ? { breed, coat } : null
}

export interface PetPrice {
  brilhos: number
  diamantes?: number
}
export function petPrice(breed: string, coat: PetCoat): PetPrice {
  return { brilhos: (PET_BREED_PRICE[breed] ?? 1000) + (PET_TIER_ADD[coat.tier] ?? 0), diamantes: PET_DIAMOND_COATS[`${breed}.${coat.id}`] }
}

/** Nomes sugeridos (botao "Sugerir nome"). */
export const PET_NAME_IDEAS = ['Mel', 'Pipoca', 'Bolinha', 'Nina', 'Thor', 'Amora', 'Bento', 'Luna', 'Fred', 'Pérola', 'Churros', 'Dudu', 'Mocha', 'Cacau', 'Teca', 'Maya']
