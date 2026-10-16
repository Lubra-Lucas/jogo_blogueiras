import { CITY } from '../city/layout'
import { CENTRO_R } from '../city/centro'
import { ROMANTIC_ALL } from '../city/romantic'

export interface LampSpot {
  x: number
  y: number
  z: number
  /** cor da luz (hex) */
  color: string
  /** poste do kit Y2K (globo maior) */
  y2k: boolean
}

// mesmas regras de Props.tsx (Lamps) para saber qual kit cada poste usa
const isY2k = (x: number, z: number) => Math.hypot(x, z) < 82 || (x > 20 && Math.abs(z) < 70)
const inCentro = (x: number, z: number) => Math.hypot(x, z) < CENTRO_R
const inRomantic = (x: number, z: number) => z > 60 && z < 215 && Math.abs(x) < 80

/** Posicao do globo (mundo) de um poste com offset local (lx,lz) e giro `rot` em Y. */
function globe(x: number, z: number, rot: number, lx: number, ly: number, lz: number) {
  const cs = Math.cos(rot)
  const sn = Math.sin(rot)
  return { x: x + lx * cs + lz * sn, y: ly, z: z - lx * sn + lz * cs }
}

let CACHE: LampSpot[] | null = null
/** Todos os postes da cidade (kit Y2K, kit romantico e os do Centro) com a posicao do globo aceso. */
export function lampSpots(): LampSpot[] {
  if (CACHE) return CACHE
  const out: LampSpot[] = []
  for (const l of CITY.lamps) {
    if (inRomantic(l.x, l.z) && !isY2k(l.x, l.z)) continue // o Jardim usa os postes do proprio kit
    if (isY2k(l.x, l.z)) {
      const rot = inCentro(l.x, l.z) ? Math.atan2(-l.x, -l.z) - Math.PI / 2 : 0
      const g = globe(l.x, l.z, rot, 0.55, 3.7, 0)
      out.push({ ...g, color: l.color, y2k: true })
    } else {
      out.push({ x: l.x, y: 3.5, z: l.z, color: '#ffd9a0', y2k: false })
    }
  }
  for (const it of ROMANTIC_ALL) {
    if (it.piece !== 'lamp_post') continue
    out.push({ x: it.x, y: 3.5, z: it.z, color: '#ffd9a0', y2k: false })
  }
  CACHE = out
  return out
}
