import { Color, DoubleSide, FrontSide, MeshPhysicalMaterial } from 'three'

/** O estudio de luz da cena e forte: pastel puro estoura para creme. Compensa levemente o albedo. */
export const ALBEDO = 0.88

/** Brilho rosado muito leve (falso espalhamento subsuperficial): suaviza as sombras da pele. */
export function skinGlow(c: Color): Color {
  return c.clone().lerp(new Color('#ff9aa8'), 0.35).multiplyScalar(0.09)
}

/** Pele de porcelana: macia, leve brilho de sheen. */
export function skinMaterial(color: string): MeshPhysicalMaterial {
  const c = new Color(color)
  return new MeshPhysicalMaterial({
    color: c.clone().multiplyScalar(ALBEDO),
    roughness: 0.55,
    metalness: 0,
    clearcoat: 0.12,
    clearcoatRoughness: 0.5,
    sheen: 0.3,
    sheenRoughness: 0.5,
    sheenColor: c.clone().lerp(new Color('#ffffff'), 0.4),
    emissive: skinGlow(c),
  })
}

/** Tecido acetinado (sheen). */
export function fabricMaterial(color: string, opts: { double?: boolean; roughness?: number } = {}): MeshPhysicalMaterial {
  const c = new Color(color)
  return new MeshPhysicalMaterial({
    color: c.clone().multiplyScalar(ALBEDO),
    roughness: opts.roughness ?? 0.5,
    metalness: 0,
    sheen: 0.8,
    sheenRoughness: 0.35,
    sheenColor: c.clone().lerp(new Color('#ffffff'), 0.4),
    side: opts.double ? DoubleSide : FrontSide,
  })
}

export function goldMaterial(color = '#e6b84f'): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({ color, metalness: 0.9, roughness: 0.3 })
}

export function pearlMaterial(color = '#fff6f0'): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    color,
    roughness: 0.18,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    sheen: 0.8,
    sheenColor: new Color('#ffd9ec'),
  })
}

/** Cabelo com vertex colors (gradiente) e brilho suave. */
export function hairMaterial(): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    color: new Color('#ffffff').multiplyScalar(0.82),
    vertexColors: true,
    roughness: 0.42,
    metalness: 0,
    clearcoat: 0.15,
    clearcoatRoughness: 0.4,
    sheen: 0.1,
    sheenRoughness: 0.5,
    sheenColor: new Color('#ffd9ec'),
  })
}
