import { useEffect, useState } from 'react'
import { loadCarAsset, type CarAsset } from './carModel'

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
  const w = asset.size.x
  const h = asset.size.y
  const l = asset.size.z
  const cz = asset.center.z
  const slabBottom = 0.2
  const slabTop = Math.min(Math.max(h * 0.55, 0.7), 1.0)
  const slab: BoxCol = { c: [0, (slabBottom + slabTop) / 2, cz], h: [w / 2 - 0.04, (slabTop - slabBottom) / 2, l / 2 - 0.04] }
  const open = slug === 'conversivel'
  const cabTop = open ? h * 0.97 : h * 0.97
  const cabLen = l * (slug === 'van' ? 0.9 : open ? 0.22 : 0.5)
  const cabW = w * 0.82
  const cab: BoxCol = {
    c: [0, (slabTop + cabTop) / 2, cz + (slug === 'van' ? 0 : -l * 0.05)],
    h: [cabW / 2, (cabTop - slabTop) / 2, cabLen / 2],
  }
  return [slab, cab]
}
