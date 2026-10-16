import { freeAt, type Resolved } from './resolve'

export type Pt = [number, number]
const CELL = 0.3
const R = 0.34

function los(r: Resolved, ax: number, az: number, bx: number, bz: number): boolean {
  const d = Math.hypot(bx - ax, bz - az)
  const n = Math.max(1, Math.ceil(d / 0.15))
  for (let i = 1; i <= n; i++) {
    const t = i / n
    if (!freeAt(r.rects, r.ox, r.oz, ax + (bx - ax) * t, az + (bz - az) * t, R, r.layout)) return false
  }
  return true
}

/** Linha reta livre dentro da sala? */
export function roomLineFree(r: Resolved, ax: number, az: number, bx: number, bz: number) {
  return los(r, ax, az, bx, bz)
}

/** A* em grade para a sala. Retorna null se nao ha caminho; [] se a linha reta esta livre. Pontos em coordenadas de mundo. */
export function findRoomPath(r: Resolved, sx: number, sz: number, gx: number, gz: number): Pt[] | null {
  if (los(r, sx, sz, gx, gz)) return []
  const { w, d } = r.layout
  const nx = Math.ceil(w / CELL)
  const nz = Math.ceil(d / CELL)
  const cx = (i: number) => r.ox - w / 2 + (i + 0.5) * CELL
  const cz = (j: number) => r.oz - d / 2 + (j + 0.5) * CELL
  const ci = (x: number) => Math.min(nx - 1, Math.max(0, Math.floor((x - (r.ox - w / 2)) / CELL)))
  const cj = (z: number) => Math.min(nz - 1, Math.max(0, Math.floor((z - (r.oz - d / 2)) / CELL)))
  const blocked = new Uint8Array(nx * nz)
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) blocked[j * nx + i] = freeAt(r.rects, r.ox, r.oz, cx(i), cz(j), R, r.layout) ? 0 : 1
  let si = ci(sx)
  let sj = cj(sz)
  let gi = ci(gx)
  let gj = cj(gz)
  // destino bloqueado: procura a celula livre mais proxima
  const nearestFree = (i: number, j: number): [number, number] | null => {
    if (!blocked[j * nx + i]) return [i, j]
    for (let rr = 1; rr < 12; rr++)
      for (let dj = -rr; dj <= rr; dj++)
        for (let di = -rr; di <= rr; di++) {
          const a = i + di
          const b = j + dj
          if (a < 0 || b < 0 || a >= nx || b >= nz) continue
          if (Math.max(Math.abs(di), Math.abs(dj)) !== rr) continue
          if (!blocked[b * nx + a]) return [a, b]
        }
    return null
  }
  const g = nearestFree(gi, gj)
  const s = nearestFree(si, sj)
  if (!g || !s) return null
  ;[gi, gj] = g
  ;[si, sj] = s
  const open: number[] = [sj * nx + si]
  const came = new Int32Array(nx * nz).fill(-1)
  const cost = new Float32Array(nx * nz).fill(1e9)
  cost[sj * nx + si] = 0
  const goal = gj * nx + gi
  const h = (k: number) => Math.hypot((k % nx) - gi, Math.floor(k / nx) - gj)
  const f = new Float32Array(nx * nz).fill(1e9)
  f[open[0]] = h(open[0])
  let found = false
  let guard = 0
  while (open.length && guard++ < 20000) {
    let bi = 0
    for (let k = 1; k < open.length; k++) if (f[open[k]] < f[open[bi]]) bi = k
    const cur = open.splice(bi, 1)[0]
    if (cur === goal) {
      found = true
      break
    }
    const ci0 = cur % nx
    const cj0 = Math.floor(cur / nx)
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue
        const a = ci0 + di
        const b = cj0 + dj
        if (a < 0 || b < 0 || a >= nx || b >= nz) continue
        const k = b * nx + a
        if (blocked[k]) continue
        if (di && dj && (blocked[cj0 * nx + a] || blocked[b * nx + ci0])) continue
        const c = cost[cur] + (di && dj ? 1.414 : 1)
        if (c < cost[k]) {
          cost[k] = c
          came[k] = cur
          f[k] = c + h(k)
          if (!open.includes(k)) open.push(k)
        }
      }
  }
  if (!found) return null
  const cells: Pt[] = []
  for (let k = goal; k !== -1; k = came[k]) cells.push([cx(k % nx), cz(Math.floor(k / nx))])
  cells.reverse()
  // simplifica por linha de visada
  const out: Pt[] = []
  let a: Pt = [sx, sz]
  let idx = 0
  while (idx < cells.length) {
    let far = idx
    for (let k = cells.length - 1; k > idx; k--) {
      if (los(r, a[0], a[1], cells[k][0], cells[k][1])) {
        far = k
        break
      }
    }
    out.push(cells[far])
    a = cells[far]
    idx = far + 1
  }
  // o ultimo ponto e o destino real se estiver livre
  if (freeAt(r.rects, r.ox, r.oz, gx, gz, R, r.layout)) out[out.length - 1] = [gx, gz]
  return out
}
