/** Carga do placar final do Estilista na competicao ao vivo; vem de outra jogadora, entao so se confia no formato. */
export interface MatchEntry {
  look: object
  points: number
}

/** uma entrada por cliente (mesmo indice); null quando aquele look ou ponto e invalido */
export function parseMatchData(d: unknown): (MatchEntry | null)[] {
  const o = d as { looks?: unknown[]; points?: unknown[] } | null
  if (!o || !Array.isArray(o.looks) || !Array.isArray(o.points)) return []
  const pts = o.points
  return o.looks.map((look, i) => {
    const points = pts[i]
    return look && typeof look === 'object' && typeof points === 'number' && Number.isFinite(points) ? { look, points } : null
  })
}
