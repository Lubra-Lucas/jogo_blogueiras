import { useEffect, useMemo, type ReactNode } from 'react'
import { findPet, loadPetCatalog, usePetCatalog } from '../../../game/pets/catalog'
import { usePetStore } from '../../../game/pets/petStore'

export type ArtPose = 'stand' | 'sit' | 'lie' | 'paw' | 'spin' | 'jump' | 'happy'

export interface ArtLook {
  species: 'dog' | 'cat'
  colors: Record<string, string>
  name: string
}

const FALLBACK: ArtLook = {
  species: 'dog',
  name: 'Caramelo',
  colors: { coat: '#c98a45', coat2: '#c98a45', coat3: '#c98a45', belly: '#f4e8d2', nose: '#1b1517', eye: '#171214', iris: '#c4b24a', inner: '#d9a6a0' },
}

/** Aparência do pet ativo (ou um caramelo genérico se a jogadora ainda não tem um). */
export function usePetLook(): ArtLook {
  const active = usePetStore((s) => s.active)
  const names = usePetStore((s) => s.names)
  const breeds = usePetCatalog((s) => s.breeds)
  useEffect(() => loadPetCatalog(), [])
  return useMemo(() => {
    const f = active ? findPet(breeds, active) : null
    if (!f) return FALLBACK
    return { species: f.breed.species, colors: f.coat.colors, name: names[active ?? ''] || f.breed.label }
  }, [active, breeds, names])
}

/**
 * Pet desenhado em SVG (frente, sentado), com as cores da pelagem do pet de verdade.
 * Espaço 400 x 420. `children` desenha por cima (espuma, manchas...).
 */
export function PetArt({ look, pose = 'sit', children, wiggle }: { look: ArtLook; pose?: ArtPose; children?: ReactNode; wiggle?: boolean }) {
  const c = look.colors
  const cat = look.species === 'cat'
  const coat2 = c.coat2 ?? c.coat
  const earFill = look.species === 'cat' ? coat2 : c.coat2 && c.coat2 !== c.coat ? c.coat2 : c.coat
  return (
    <svg className={`pa pa--${pose}${wiggle ? ' pa--wiggle' : ''}`} viewBox="0 0 400 420" role="img" aria-label={`${look.name}, ${cat ? 'gato' : 'cachorro'}`}>
      <ellipse cx="200" cy="402" rx="120" ry="12" fill="rgba(40,28,52,0.18)" />
      <g className="pa-all">
        {/* cauda */}
        <path className="pa-tail" d="M292 352 C 350 340 366 280 340 240 C 330 270 316 292 288 318 Z" fill={c.coat} />
        {/* corpo */}
        <g className="pa-body">
          <ellipse cx="200" cy="312" rx="108" ry="92" fill={c.coat} />
          <ellipse cx="200" cy="330" rx="56" ry="68" fill={c.belly} />
          <ellipse cx="148" cy="388" rx="32" ry="20" fill={c.belly} />
          <ellipse cx="252" cy="388" rx="32" ry="20" fill={c.belly} />
          <g className="pa-paw">
            <ellipse cx="252" cy="384" rx="32" ry="21" fill={c.belly} />
          </g>
        </g>
        {/* cabeca */}
        <g className="pa-head">
          {cat ? (
            <>
              <path d="M118 126 L132 52 L178 100 Z" fill={earFill} />
              <path d="M282 126 L268 52 L222 100 Z" fill={earFill} />
              <path d="M134 108 L140 74 L164 98 Z" fill={c.inner} />
              <path d="M266 108 L260 74 L236 98 Z" fill={c.inner} />
            </>
          ) : (
            <>
              <ellipse cx="116" cy="158" rx="28" ry="56" fill={earFill} transform="rotate(14 116 158)" />
              <ellipse cx="284" cy="158" rx="28" ry="56" fill={earFill} transform="rotate(-14 284 158)" />
            </>
          )}
          <ellipse cx="200" cy="162" rx={cat ? 92 : 86} ry={cat ? 76 : 78} fill={c.coat} />
          <ellipse cx="200" cy="198" rx={cat ? 36 : 42} ry={cat ? 26 : 32} fill={c.belly} />
          <ellipse cx="163" cy="152" rx="11" ry="12" fill={cat ? c.iris : c.eye} />
          <ellipse cx="237" cy="152" rx="11" ry="12" fill={cat ? c.iris : c.eye} />
          {cat && (
            <>
              <ellipse cx="163" cy="152" rx="3.4" ry="9" fill="#0b0b0d" />
              <ellipse cx="237" cy="152" rx="3.4" ry="9" fill="#0b0b0d" />
            </>
          )}
          <circle cx="167" cy="147" r="3.4" fill="#fff" />
          <circle cx="241" cy="147" r="3.4" fill="#fff" />
          <ellipse cx="200" cy="188" rx={cat ? 9 : 13} ry={cat ? 6 : 9} fill={c.nose} />
          <path d="M200 196 v8 M200 204 c-7 7 -16 7 -22 1 M200 204 c7 7 16 7 22 1" fill="none" stroke="rgba(40,24,30,0.55)" strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </g>
      {children}
    </svg>
  )
}
