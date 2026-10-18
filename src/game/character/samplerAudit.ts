import type { WebGLRenderer } from 'three'

/**
 * Auditoria de samplers (`?samplers=1`): conta, por programa de shader, quantas texturas ele amostra
 * (incluindo os mapas de sombra e o envMap do three) e compara com `renderer.capabilities.maxTextures`.
 * Resultado em `window.__samplers` e no console (`[SAMPLERS]`).
 */
const SAMPLER_TYPES = new Set([35678, 35680, 35679, 36289, 36292, 36293, 36298, 36299, 36300, 36303, 36306, 36307, 36308, 36311])
export const AUDIT = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('samplers')

/** `?maxtex=16`: finge uma GPU com N unidades de textura (a de teste, SwiftShader, tem 32 e nunca mostraria o aviso do three). Precisa rodar antes do renderer. */
const FAKE = typeof window !== 'undefined' ? Number(new URLSearchParams(window.location.search).get('maxtex')) : 0
if (FAKE > 0 && typeof WebGL2RenderingContext !== 'undefined') {
  const orig = WebGL2RenderingContext.prototype.getParameter
  WebGL2RenderingContext.prototype.getParameter = function (this: WebGL2RenderingContext, p: number) {
    if (p === 0x8872 || p === 0x8b4c) return Math.min(FAKE, orig.call(this, p) as number) // MAX_TEXTURE_IMAGE_UNITS / MAX_VERTEX_TEXTURE_IMAGE_UNITS
    return orig.call(this, p)
  }
}

interface SeqItem { id: string; type?: number; size?: number; seq?: SeqItem[] }

function countSeq(seq: SeqItem[], out: string[]): number {
  let n = 0
  for (const u of seq) {
    if (u.seq) n += countSeq(u.seq, out)
    else if (u.type !== undefined && SAMPLER_TYPES.has(u.type)) {
      const c = u.size ?? 1
      n += c
      out.push(c > 1 ? `${u.id}x${c}` : u.id)
    }
  }
  return n
}

export function auditSamplers(gl: WebGLRenderer) {
  const rows: Array<{ name: string; samplers: number; list: string[] }> = []
  for (const p of gl.info.programs ?? []) {
    const list: string[] = []
    const n = countSeq(((p as unknown as { getUniforms: () => { seq: SeqItem[] } }).getUniforms()).seq, list)
    rows.push({ name: (p as unknown as { name: string }).name, samplers: n, list })
  }
  const max = gl.capabilities.maxTextures
  const worst = rows.reduce((m, r) => Math.max(m, r.samplers), 0)
  ;(window as unknown as { __samplers: unknown }).__samplers = { max, worst, rows }
  console.info('[SAMPLERS]', JSON.stringify({ max, worst, rows: rows.filter((r) => r.samplers >= 8).map((r) => ({ n: r.name, s: r.samplers, l: r.list.join(',') })) }))
}
