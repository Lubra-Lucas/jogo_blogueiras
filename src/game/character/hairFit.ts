import { Vector2, Vector3 } from 'three'

/**
 * Calibracao por cabelo (por arquivo GLB, sem extensao), aplicada no vertex shader do cabelo ANTES do skinning,
 * no espaco de repouso do esqueleto (o mesmo dos `hairClip.bind` das joias):
 *   p' = pivot + (p - pivot) * scale + offset      (so acima de `band`: 0 = ponta/pescoco, 1 = cranio)
 * `scale` e `offset` em metros (x lateral, y altura, z para frente). A faixa `band` e a altura (y) em que a calibracao
 * entra (smoothstep), para nao deformar as mechas longas que caem sobre os ombros.
 *
 * Calibrado com tools/blender/jewelry/hair_probe4.py (distancia couro cabeludo -> primeira superficie do cabelo) e
 * conferido nas capturas frente/perfil/costas. O encaixe de malha (empurrar o que estava dentro da cabeca) e os morphs
 * (faceThin, jawNarrow, chinPointed, cheekbonesHigh, busto, peso...) vem assados no GLB por tools/blender/hair_fitbake.py.
 */
export interface HairCalib {
  scale: [number, number, number]
  offset: [number, number, number]
  /** centro da cabeca em repouso (m) */
  pivot: [number, number, number]
  /** altura (y) onde a calibracao entra: [0, 1] -> smoothstep(band[0], band[1], y) */
  band: [number, number]
}

const HEAD_PIVOT: [number, number, number] = [0, 1.46, 0.0]
const IDENTITY: HairCalib = { scale: [1, 1, 1], offset: [0, 0, 0], pivot: HEAD_PIVOT, band: [1.3, 1.4] }

export const HAIR_CALIB: Record<string, HairCalib> = {
  hair_meshy_updo: { ...IDENTITY },
  hair_chestnutWaves: { ...IDENTITY },
  hair_caramelCurls: { ...IDENTITY },
  hair_platinumUndercut: { ...IDENTITY },
}

export function hairCalibFor(file: string | null | undefined): HairCalib {
  return (file && HAIR_CALIB[file]) || IDENTITY
}

/** Escreve a calibracao nos uniforms do material do cabelo. */
export function applyHairCalib(u: Record<string, { value: unknown }>, c: HairCalib): void {
  ;(u.uCalS.value as Vector3).set(...c.scale)
  ;(u.uCalO.value as Vector3).set(...c.offset)
  ;(u.uCalP.value as Vector3).set(...c.pivot)
  ;(u.uCalBand.value as Vector2).set(...c.band)
}
