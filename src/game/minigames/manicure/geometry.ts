import { NAIL_H, NAIL_W } from './data'

/** Geometria da unha (viewBox 240x340): a ponta fica em cima, a cutícula embaixo. */
export const NAIL_PATH =
  'M 48 124 C 48 64 82 30 120 30 C 158 30 192 64 192 124 L 188 238 C 186 270 158 288 120 288 C 82 288 54 270 52 238 Z'
export const FINGER_PATH = 'M 22 110 C 22 40 66 6 120 6 C 174 6 218 40 218 110 L 218 340 L 22 340 Z'
/** faixa da ponta (francesinha): sorriso nos primeiros ~85 unidades */
export const TIP_POLY = 'M 0 0 H 240 V 78 Q 120 138 0 78 Z'

export const CELL = 5
export const GW = NAIL_W / CELL
export const GH = NAIL_H / CELL

export type RegionId = 'nail' | 'tip'

const masks: Partial<Record<RegionId, Uint8Array>> = {}
const tolMasks = new Map<string, Uint8Array>()

function makeCtx(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null
  return document.createElement('canvas').getContext('2d')
}

/** 1 = célula dentro da região. */
export function regionMask(id: RegionId): Uint8Array {
  const cached = masks[id]
  if (cached) return cached
  const m = new Uint8Array(GW * GH)
  const ctx = makeCtx()
  if (ctx) {
    const nail = new Path2D(NAIL_PATH)
    const tip = new Path2D(TIP_POLY)
    for (let j = 0; j < GH; j++)
      for (let i = 0; i < GW; i++) {
        const x = i * CELL + CELL / 2
        const y = j * CELL + CELL / 2
        let inside = ctx.isPointInPath(nail, x, y)
        if (inside && id === 'tip') inside = ctx.isPointInPath(tip, x, y)
        m[j * GW + i] = inside ? 1 : 0
      }
  }
  masks[id] = m
  return m
}

/** 1 = dentro da região dilatada por `tol` unidades (tolerância de borda). */
export function tolMask(id: RegionId, tol: number): Uint8Array {
  const k = `${id}:${tol}`
  const hit = tolMasks.get(k)
  if (hit) return hit
  const base = regionMask(id)
  const out = new Uint8Array(base)
  const r = Math.ceil(tol / CELL)
  if (tol > 0) {
    for (let j = 0; j < GH; j++)
      for (let i = 0; i < GW; i++) {
        if (base[j * GW + i]) continue
        let near = false
        for (let dj = -r; dj <= r && !near; dj++)
          for (let di = -r; di <= r; di++) {
            const ii = i + di
            const jj = j + dj
            if (ii < 0 || jj < 0 || ii >= GW || jj >= GH) continue
            if (base[jj * GW + ii] && Math.hypot(di, dj) * CELL <= tol + CELL * 0.6) {
              near = true
              break
            }
          }
        if (near) out[j * GW + i] = 1
      }
  }
  tolMasks.set(k, out)
  return out
}

export function insideCount(id: RegionId): number {
  const m = regionMask(id)
  let n = 0
  for (let i = 0; i < m.length; i++) n += m[i]
  return n
}
