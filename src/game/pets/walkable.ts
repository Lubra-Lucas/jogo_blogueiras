import { CITY } from '../world/city/layout'
import { interiorBridge } from '../interiors/interiorBridge'
import { freeAt } from '../interiors/resolve'

const PAD = 0.32
const LIMIT = CITY.half - 6

/** Ponto livre para o pet (predios, lago, arvores, borda do mapa; dentro de sala: colisores e paredes)? */
export function petFree(x: number, z: number): boolean {
  const room = interiorBridge.room
  if (interiorBridge.active && room) return freeAt(room.rects, room.ox, room.oz, x, z, 0.24, room.layout)
  if (Math.abs(x) > LIMIT || Math.abs(z) > LIMIT) return false
  const f = CITY.futuro
  if (x > f.x0 - 1 && x < f.x1 + 1 && z > f.z0 - 1 && z < f.z1 + 1) return false
  const lk = CITY.lake
  if (Math.hypot(x - lk.cx, z - lk.cz) < lk.r + 0.4) return false
  for (const b of CITY.blocks) {
    const dx = x - b.x
    const dz = z - b.z
    const rr = Math.hypot(b.w, b.d) / 2 + 1
    if (dx * dx + dz * dz > rr * rr) continue
    if (b.shape === 'cyl') {
      if (Math.hypot(dx, dz) < b.w / 2 + PAD) return false
      continue
    }
    const c = Math.cos(b.rot)
    const s = Math.sin(b.rot)
    const lx = dx * c - dz * s
    const lz = dx * s + dz * c
    if (Math.abs(lx) < b.w / 2 + PAD && Math.abs(lz) < b.d / 2 + PAD) return false
  }
  for (const t of CITY.trees) {
    if (Math.abs(t.x - x) < 0.7 && Math.abs(t.z - z) < 0.7 && Math.hypot(t.x - x, t.z - z) < 0.6) return false
  }
  return true
}
