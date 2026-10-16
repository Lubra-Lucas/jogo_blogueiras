import type { WorldDef } from '../../travel/worlds'
import { miamiEnvHook } from './env'
import { MIAMI, MIAMI_ARRIVAL, MIAMI_POIS, MIAMI_ROADS, MIAMI_SPAWNS, SEA, miamiLocate } from './layout'
import { MIAMI_MAP } from './map'
import type { LampSpot } from '../environment/lamps'

/** pontos candidatos do grafo de navegacao: vias, pier e uma grade sobre a ilha (o pathfinder descarta os bloqueados) */
function navSeeds(): [number, number][] {
  const out: [number, number][] = []
  for (const r of MIAMI_ROADS) {
    for (let i = 0; i < r.points.length - 1; i++) {
      const [ax, az] = r.points[i]
      const [bx, bz] = r.points[i + 1]
      const L = Math.hypot(bx - ax, bz - az)
      const n = Math.max(1, Math.round(L / 5))
      for (let k = 0; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n])
    }
  }
  for (let x = -136; x <= SEA.wallX - 2; x += 6.5) for (let z = -134; z <= 134; z += 6.5) out.push([x, z])
  for (const p of MIAMI_POIS) for (const d of [1.5, 2.5, 4]) out.push([p.x + Math.sin(p.facing) * d, p.z + Math.cos(p.facing) * d])
  for (const id in MIAMI_SPAWNS) out.push([MIAMI_SPAWNS[id][0], MIAMI_SPAWNS[id][1]])
  return out
}

/** globos dos postes deco (para a luz noturna) */
function lamps(): LampSpot[] {
  return [...MIAMI.small, ...MIAMI.items]
    .filter((i) => i.piece === 'lamp_deco')
    .map((i) => ({ x: i.x, y: (i.y ?? 0) + 3.95, z: i.z, color: '#ffd9a0', y2k: false }))
}

export const MIAMI_WORLD: WorldDef = {
  id: 'miami',
  name: 'Miami Beach',
  doors: MIAMI_POIS,
  spawns: MIAMI_SPAWNS,
  arrival: MIAMI_ARRIVAL,
  locate: miamiLocate,
  navSeeds,
  map: MIAMI_MAP,
  lamps,
  envHook: miamiEnvHook,
  mapTitle: 'Mapa de Miami Beach',
}
