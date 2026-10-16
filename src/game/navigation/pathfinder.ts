import { CITY, polylineLength, type Vec2 } from '../world/city/layout'
import { BRIDGE, ISLET } from '../world/city/romantic'
import { hasLineOfSight, isFree, colliderCount } from './probe'

/**
 * Grafo de navegacao a partir dos dados da cidade:
 *  - nos ao longo das linhas centrais das vias (a cada ~6 m, aneis inclusos);
 *  - grades de 7 m nas pracas e no parque (fora do lago), filtradas por colisores;
 *  - pontos de porta (frente de cada loja) e pontos de captura (spawns);
 *  - cadeia fixa da ponte do coreto (a rampa e alta demais para a esfera de teste).
 * Arestas = pares de nos a ate 10,5 m com linha de visao livre no Rapier. A* + suavizacao (string pulling).
 */
interface GNode {
  x: number
  z: number
  /** na ponte/ilhota: dispensa linha de visao ao ligar */
  trusted?: boolean
}
interface Edge {
  to: number
  w: number
}
interface Graph {
  nodes: GNode[]
  adj: Edge[][]
  colliders: number
  cell: Map<number, number[]>
}

const ROAD_STEP = 6
const GRID_STEP = 7
const LINK_R = 10.5
const CELL = 12
const key = (cx: number, cz: number) => cx * 4096 + cz
const cellOf = (v: number) => Math.floor((v + 500) / CELL)

let graph: Graph | null = null

export function invalidateGraph() {
  graph = null
}

function samplePolyline(pts: readonly Vec2[], step: number, out: [number, number][]) {
  const total = polylineLength(pts)
  const n = Math.max(1, Math.round(total / step))
  const seg: number[] = []
  let acc = 0
  for (let i = 0; i < pts.length - 1; i++) {
    seg.push(acc)
    acc += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])
  }
  for (let k = 0; k <= n; k++) {
    const s = (k / n) * total
    let i = seg.length - 1
    while (i > 0 && seg[i] > s) i--
    const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])
    const u = l > 0 ? (s - seg[i]) / l : 0
    out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u])
  }
}

function buildGraph(): Graph {
  const nodes: GNode[] = []
  const dedupe = new Set<string>()
  const add = (x: number, z: number, trusted = false, check = true) => {
    const k = `${Math.round(x * 2)},${Math.round(z * 2)}`
    if (dedupe.has(k)) return
    if (check && !isFree(x, z)) return
    dedupe.add(k)
    nodes.push({ x, z, trusted })
  }

  // vias
  const pts: [number, number][] = []
  for (const r of CITY.roads) samplePolyline(r.points, ROAD_STEP, pts)
  for (const [x, z] of pts) add(x, z)

  // pracas e parque
  const L = CITY.lake
  for (const a of CITY.areas) {
    if (a.kind === 'lago') continue
    const b = a.bounds
    const x0 = b.t === 'circle' ? b.cx - b.r : b.x0
    const x1 = b.t === 'circle' ? b.cx + b.r : b.x1
    const z0 = b.t === 'circle' ? b.cz - b.r : b.z0
    const z1 = b.t === 'circle' ? b.cz + b.r : b.z1
    // pracinhas cheias de bancos/vasos/fonte: grade fina; parque: media; praca central (vazia): grossa
    const step = b.t === 'circle' ? (b.r <= 15 ? 3.2 : GRID_STEP) : 5
    for (let x = x0 + 1; x <= x1 - 1; x += step) {
      for (let z = z0 + 1; z <= z1 - 1; z += step) {
        if (b.t === 'circle' && Math.hypot(x - b.cx, z - b.cz) > b.r - 1) continue
        if (Math.hypot(x - L.cx, z - L.cz) < L.r + 3.5) continue
        add(x, z)
      }
    }
  }

  // portas e capturas
  for (const p of CITY.pois) {
    if (p.kind === 'spawn') continue
    for (const d of [1.5, 2.5, 4]) add(p.x + Math.sin(p.facing) * d, p.z + Math.cos(p.facing) * d)
  }
  for (const id in CITY.spawns) {
    if (id === 'coreto' || id === 'ponte') continue
    add(CITY.spawns[id][0], CITY.spawns[id][1])
  }

  // ponte + ilhota (cadeia fixa)
  const bridge: number[] = []
  for (const z of [BRIDGE.z0 - 1.5, BRIDGE.z0 + 1.5, BRIDGE.z0 + 4.2, BRIDGE.z0 + 7, ISLET.z + 1.2]) {
    bridge.push(nodes.length)
    add(BRIDGE.x, z, true, false)
  }
  bridge.push(nodes.length)
  add(CITY.spawns['coreto'][0], CITY.spawns['coreto'][1], true, false)

  // hash espacial
  const cell = new Map<number, number[]>()
  nodes.forEach((n, i) => {
    const k = key(cellOf(n.x), cellOf(n.z))
    const l = cell.get(k)
    if (l) l.push(i)
    else cell.set(k, [i])
  })

  const adj: Edge[][] = nodes.map(() => [])
  const link = (i: number, j: number) => {
    const w = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].z - nodes[j].z)
    adj[i].push({ to: j, w })
    adj[j].push({ to: i, w })
  }
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i]
    const cx = cellOf(a.x)
    const cz = cellOf(a.z)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const l = cell.get(key(cx + dx, cz + dz))
        if (!l) continue
        for (const j of l) {
          if (j <= i) continue
          const b = nodes[j]
          if (a.trusted && b.trusted) continue // ligados so pela cadeia
          if (Math.hypot(a.x - b.x, a.z - b.z) > LINK_R) continue
          if (hasLineOfSight(a.x, a.z, b.x, b.z)) link(i, j)
        }
      }
    }
  }
  for (let k = 0; k < bridge.length - 1; k++) link(bridge[k], bridge[k + 1])
  // cabeceira da ponte: liga o 1o no da cadeia aos nos vizinhos de fora
  const head = bridge[0]
  for (const j of cell.get(key(cellOf(nodes[head].x), cellOf(nodes[head].z))) ?? []) {
    if (j !== head && !nodes[j].trusted && Math.hypot(nodes[j].x - nodes[head].x, nodes[j].z - nodes[head].z) < 12 && !adj[head].some((e) => e.to === j)) link(head, j)
  }

  return { nodes, adj, colliders: colliderCount(), cell }
}

export function getGraph(): Graph {
  if (!graph || graph.colliders !== colliderCount()) graph = buildGraph()
  return graph
}

export function graphStats() {
  const g = getGraph()
  return { nodes: g.nodes.length, edges: g.adj.reduce((a, l) => a + l.length, 0) / 2 }
}

// ---------------------------------------------------------------- A*

class Heap {
  private a: { n: number; f: number }[] = []
  get size() {
    return this.a.length
  }
  push(n: number, f: number) {
    const a = this.a
    a.push({ n, f })
    let i = a.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (a[p].f <= a[i].f) break
      const t = a[p]
      a[p] = a[i]
      a[i] = t
      i = p
    }
  }
  pop() {
    const a = this.a
    const top = a[0]
    const last = a.pop()!
    if (a.length) {
      a[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let m = i
        if (l < a.length && a[l].f < a[m].f) m = l
        if (r < a.length && a[r].f < a[m].f) m = r
        if (m === i) break
        const t = a[m]
        a[m] = a[i]
        a[i] = t
        i = m
      }
    }
    return top
  }
}

/** Nos alcancaveis a partir do ponto (linha de visao), mais proximos primeiro. */
function attach(g: Graph, x: number, z: number, maxN = 6): { i: number; d: number }[] {
  for (const radius of [22, 50, 140]) {
    const c: { i: number; d: number }[] = []
    const cr = Math.ceil(radius / CELL)
    const cx = cellOf(x)
    const cz = cellOf(z)
    for (let dx = -cr; dx <= cr; dx++) {
      for (let dz = -cr; dz <= cr; dz++) {
        for (const i of g.cell.get(key(cx + dx, cz + dz)) ?? []) {
          const d = Math.hypot(g.nodes[i].x - x, g.nodes[i].z - z)
          if (d <= radius) c.push({ i, d })
        }
      }
    }
    c.sort((a, b) => a.d - b.d)
    const out: { i: number; d: number }[] = []
    let tests = 0
    for (const e of c) {
      if (tests++ > 40 || out.length >= maxN) break
      if ((g.nodes[e.i].trusted && e.d < 7) || hasLineOfSight(x, z, g.nodes[e.i].x, g.nodes[e.i].z)) out.push(e)
    }
    if (out.length) return out
  }
  return []
}

export type Pt = [number, number]

/** Caminho (sem o ponto de partida) ou null. */
export function findPath(sx: number, sz: number, gx: number, gz: number): Pt[] | null {
  if (hasLineOfSight(sx, sz, gx, gz, 0.5)) return [[gx, gz]]
  const g = getGraph()
  const from = attach(g, sx, sz)
  const to = attach(g, gx, gz)
  if (!from.length || !to.length) return null
  const toCost = new Map(to.map((e) => [e.i, e.d]))
  const N = g.nodes.length
  const gs = new Float64Array(N).fill(Infinity)
  const prev = new Int32Array(N).fill(-1)
  const closed = new Uint8Array(N)
  const h = (i: number) => Math.hypot(g.nodes[i].x - gx, g.nodes[i].z - gz)
  const heap = new Heap()
  for (const e of from) {
    gs[e.i] = e.d
    heap.push(e.i, e.d + h(e.i))
  }
  let best = Infinity
  let bestNode = -1
  while (heap.size) {
    const { n, f } = heap.pop()
    if (f >= best) break
    if (closed[n]) continue
    closed[n] = 1
    const tc = toCost.get(n)
    if (tc !== undefined && gs[n] + tc < best) {
      best = gs[n] + tc
      bestNode = n
    }
    for (const e of g.adj[n]) {
      const ng = gs[n] + e.w
      if (ng < gs[e.to]) {
        gs[e.to] = ng
        prev[e.to] = n
        heap.push(e.to, ng + h(e.to))
      }
    }
  }
  if (bestNode < 0) return null
  const chain: number[] = []
  for (let n = bestNode; n >= 0; n = prev[n]) chain.push(n)
  chain.reverse()
  const raw: Pt[] = [[sx, sz], ...chain.map((i): Pt => [g.nodes[i].x, g.nodes[i].z]), [gx, gz]]
  // trusted[k] refere-se a raw[k] (start = 0, fim = ultimo)
  const trusted = raw.map((_, k) => k > 0 && k <= chain.length && g.nodes[chain[k - 1]].trusted === true)
  return smooth(raw, trusted)
}

/** String pulling: pula para o ponto mais distante ainda visivel (com folga maior que a do grafo). */
function smooth(raw: Pt[], trusted: boolean[]): Pt[] {
  const out: Pt[] = []
  let i = 0
  const last = raw.length - 1
  while (i < last) {
    let j = Math.min(last, i + 16)
    // nunca "corta" por dentro da cadeia da ponte
    for (let k = i + 1; k <= j; k++) {
      if (trusted[k] && trusted[k - 1]) {
        j = k
        break
      }
    }
    while (j > i + 1 && !hasLineOfSight(raw[i][0], raw[i][1], raw[j][0], raw[j][1], 0.55)) j--
    out.push(raw[j])
    i = j
  }
  return out
}

export function pathLength(from: Pt, pts: Pt[]): number {
  let l = 0
  let px = from[0]
  let pz = from[1]
  for (const p of pts) {
    l += Math.hypot(p[0] - px, p[1] - pz)
    px = p[0]
    pz = p[1]
  }
  return l
}

/** Depuracao: componentes conexas do grafo (tamanho + um no de exemplo). */
export function graphComponents() {
  const g = getGraph()
  const seen = new Uint8Array(g.nodes.length)
  const out: { size: number; x: number; z: number }[] = []
  for (let i = 0; i < g.nodes.length; i++) {
    if (seen[i]) continue
    let size = 0
    const st = [i]
    seen[i] = 1
    while (st.length) {
      const n = st.pop()!
      size++
      for (const e of g.adj[n]) if (!seen[e.to]) { seen[e.to] = 1; st.push(e.to) }
    }
    out.push({ size, x: Math.round(g.nodes[i].x), z: Math.round(g.nodes[i].z) })
  }
  return out.sort((a, b) => b.size - a.size)
}

export function nodesIn(x0: number, x1: number, z0: number, z1: number) {
  const g = getGraph()
  return g.nodes.map((n, i) => ({ i, x: Math.round(n.x * 10) / 10, z: Math.round(n.z * 10) / 10, deg: g.adj[i].length })).filter((n) => n.x >= x0 && n.x <= x1 && n.z >= z0 && n.z <= z1)
}
