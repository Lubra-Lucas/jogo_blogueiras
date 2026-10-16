import { CITY } from '../world/city/layout'

export interface Destination {
  id: string
  name: string
  x: number
  z: number
  /** yaw da jogadora ao chegar (olhando para a porta); null = qualquer */
  yaw: number | null
  /** posicoes alternativas, mais afastadas da porta, se a primeira estiver bloqueada */
  fallbacks: [number, number][]
}

const ALIAS: Record<string, string> = {
  estudio: 'estudio-fotos',
  salao: 'salao-spa',
  cafe: 'cafe-rose',
  palco: 'palco-neon',
  casa: 'casa-sonhos',
  inicio: 'spawn',
  praca: 'centro',
}

/** Resolve um id (porta de loja, bairro, area ou ponto de captura) em posicao + direcao de chegada. */
export function resolveDestination(rawId: string): Destination | null {
  const id = ALIAS[rawId] ?? rawId
  const poi = CITY.pois.find((p) => p.id === id)
  if (poi && poi.kind !== 'spawn') {
    const sx = Math.sin(poi.facing)
    const sz = Math.cos(poi.facing)
    const at = (d: number): [number, number] => [poi.x + sx * d, poi.z + sz * d]
    const [x, z] = at(1.5)
    return { id, name: poi.name, x, z, yaw: poi.facing + Math.PI, fallbacks: [at(2.5), at(4)] }
  }
  const sp = CITY.spawns[id]
  if (!sp) return null
  const name =
    CITY.districts.find((d) => d.id === id)?.name ??
    CITY.areas.find((a) => a.id === id)?.name ??
    poi?.name ??
    NICE[id] ??
    id
  return { id, name, x: sp[0], z: sp[1], yaw: poi ? poi.facing : null, fallbacks: [] }
}

const NICE: Record<string, string> = {
  vitrines: 'Praça das Vitrines',
  boulevard: 'Boulevard Noturno',
  ponte: 'Ponte do Lago',
  coreto: 'Coreto',
  margem: 'Margem do Lago',
  'fonte-jardim': 'Fonte do Jardim',
}
