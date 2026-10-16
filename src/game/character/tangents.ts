import { BufferAttribute, type BufferGeometry } from 'three'

/**
 * Tangentes suaves por vertice (soma ponderada por area das tangentes dos triangulos, ortonormalizada contra a normal).
 * Sem o atributo `tangent`, o three deriva o referencial da normal map por triangulo (derivadas de UV), o que da
 * aspecto facetado ("papel dobrado") em malha de poucos poligonos com UV distorcido. Faz uma vez por geometria.
 */
export function ensureTangents(geo: BufferGeometry) {
  if (geo.getAttribute('tangent')) return
  const pos = geo.getAttribute('position')
  const nor = geo.getAttribute('normal')
  const uv = geo.getAttribute('uv')
  const idx = geo.index
  if (!pos || !nor || !uv || !idx) return
  const n = pos.count
  const tan = new Float32Array(n * 3)
  const bit = new Float32Array(n * 3)
  const ia = idx.array
  for (let f = 0; f < ia.length; f += 3) {
    const a = ia[f], b = ia[f + 1], c = ia[f + 2]
    const e1x = pos.getX(b) - pos.getX(a), e1y = pos.getY(b) - pos.getY(a), e1z = pos.getZ(b) - pos.getZ(a)
    const e2x = pos.getX(c) - pos.getX(a), e2y = pos.getY(c) - pos.getY(a), e2z = pos.getZ(c) - pos.getZ(a)
    const du1 = uv.getX(b) - uv.getX(a), dv1 = uv.getY(b) - uv.getY(a)
    const du2 = uv.getX(c) - uv.getX(a), dv2 = uv.getY(c) - uv.getY(a)
    const det = du1 * dv2 - du2 * dv1
    if (Math.abs(det) < 1e-14) continue
    const r = 1 / det
    // glTF: V aponta para baixo na textura; (du,dv) ja esta no espaco do arquivo, a mesma convencao do shader do three
    const tx = (e1x * dv2 - e2x * dv1) * r, ty = (e1y * dv2 - e2y * dv1) * r, tz = (e1z * dv2 - e2z * dv1) * r
    const bx = (e2x * du1 - e1x * du2) * r, by = (e2y * du1 - e1y * du2) * r, bz = (e2z * du1 - e1z * du2) * r
    // peso: area do triangulo (|e1 x e2|) / |t| para nao favorecer UV esticado: usa so a area
    const cx = e1y * e2z - e1z * e2y, cy = e1z * e2x - e1x * e2z, cz = e1x * e2y - e1y * e2x
    const w = Math.hypot(cx, cy, cz)
    const tl = Math.hypot(tx, ty, tz) || 1
    const bl = Math.hypot(bx, by, bz) || 1
    for (const v of [a, b, c]) {
      tan[v * 3] += (tx / tl) * w; tan[v * 3 + 1] += (ty / tl) * w; tan[v * 3 + 2] += (tz / tl) * w
      bit[v * 3] += (bx / bl) * w; bit[v * 3 + 1] += (by / bl) * w; bit[v * 3 + 2] += (bz / bl) * w
    }
  }
  const out = new Float32Array(n * 4)
  for (let v = 0; v < n; v++) {
    const nx = nor.getX(v), ny = nor.getY(v), nz = nor.getZ(v)
    let tx = tan[v * 3], ty = tan[v * 3 + 1], tz = tan[v * 3 + 2]
    const d = nx * tx + ny * ty + nz * tz
    tx -= nx * d; ty -= ny * d; tz -= nz * d
    const l = Math.hypot(tx, ty, tz)
    if (l < 1e-8) { // degenerado: qualquer perpendicular
      tx = Math.abs(nx) < 0.9 ? 1 : 0; ty = Math.abs(nx) < 0.9 ? 0 : 1; tz = 0
      const dd = nx * tx + ny * ty + nz * tz
      tx -= nx * dd; ty -= ny * dd; tz -= nz * dd
    }
    const L = Math.hypot(tx, ty, tz) || 1
    tx /= L; ty /= L; tz /= L
    // sinal da bitangente: (n x t) . b
    const cx = ny * tz - nz * ty, cy = nz * tx - nx * tz, cz = nx * ty - ny * tx
    const s = cx * bit[v * 3] + cy * bit[v * 3 + 1] + cz * bit[v * 3 + 2] < 0 ? -1 : 1
    out[v * 4] = tx; out[v * 4 + 1] = ty; out[v * 4 + 2] = tz; out[v * 4 + 3] = s
  }
  geo.setAttribute('tangent', new BufferAttribute(out, 4))
}
