import { useEffect, useState } from 'react'
import { loadCarAsset, type CarAsset } from './carModel'
import { chassisBoxes } from './sim/vehiclePhysics'

const ready = new Map<string, CarAsset>()

/** Modelo do carro (GLB, ou provisorio se faltar); null ate carregar. Instantaneo depois da 1a vez. */
export function useCarAsset(slug: string): CarAsset | null {
  const [asset, setAsset] = useState<CarAsset | null>(() => ready.get(slug) ?? null)
  useEffect(() => {
    let alive = true
    const hit = ready.get(slug)
    if (hit) {
      setAsset(hit)
      return
    }
    void loadCarAsset(slug).then((a) => {
      ready.set(slug, a)
      if (alive) setAsset(a)
    })
    return () => {
      alive = false
    }
  }, [slug])
  return asset && asset.slug === slug ? asset : null
}

/** Colisores sugeridos (meia-extensao + centro, espaco do modelo) a partir da caixa do modelo. */
export interface BoxCol {
  c: [number, number, number]
  h: [number, number, number]
}

export function colliderBoxes(asset: CarAsset, slug: string): BoxCol[] {
  return chassisBoxes(slug, asset.size, asset.center.z)
}
