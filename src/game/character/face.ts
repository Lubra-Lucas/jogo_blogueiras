import { CanvasTexture, Color, LinearFilter, SRGBColorSpace, SphereGeometry, type BufferGeometry } from 'three'
import type { FaceAppearance } from '../../shared/appearance'
import { deformHead, jawFactor } from './body'
import { rng } from './geometry'

/**
 * Rosto desenhado em camadas num CanvasTexture e aplicado por um "decalque": um pedaco de esfera
 * (a mesma forma da cabeca, 1,2% maior) so na frente. Nao precisa de UV da cabeca.
 *
 * Mapeamento do canvas: x linear no azimute (-A..A), y linear na elevacao (TH0..TH1).
 * Tamanhos dos tracos sao dados em METROS (M px por metro na vertical; na horizontal o x e
 * esticado por 1/(cos(elev)*queixo) para compensar a curvatura).
 */
export const FACE_SIZE = 1024
const A = 0.95 // meio-azimute coberto (rad)
const TH0 = 0.8 // theta (colatitude) do topo
const TH1 = 2.7 // theta da base
const K = FACE_SIZE / (2 * A) // px por rad
const M = K / 0.155 // px por metro (raio medio da cabeca)

const px = (a: number) => (a + A) * K
const py = (e: number) => (Math.PI / 2 - e - TH0) * K
const hscale = (e: number) => 1 / (Math.cos(e) * jawFactor(Math.sin(e)))

/** Elevacoes (rad) dos tracos. */
export const FACE_E = { eye: -0.12, nose: -0.42, mouth: -0.66, cheek: -0.36 } as const
const EYE_A = 0.315

// ---------------------------------------------------------------- utilidades de cor

function rgba(c: Color, a: number): string {
  // Color guarda valores lineares: converte para sRGB antes de escrever no canvas
  const s = c.clone().convertLinearToSRGB()
  return `rgba(${Math.round(s.r * 255)},${Math.round(s.g * 255)},${Math.round(s.b * 255)},${a})`
}
function shade(base: Color, dl: number, ds = 0): Color {
  const hsl = { h: 0, s: 0, l: 0 }
  base.getHSL(hsl)
  return new Color().setHSL(hsl.h, Math.min(1, Math.max(0, hsl.s + ds)), Math.min(1, Math.max(0, hsl.l + dl)))
}

type Pt = readonly [number, number]

function quad(p0: Pt, c: Pt, p1: Pt, t: number): Pt {
  const u = 1 - t
  return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]]
}

/** Traco que afina de w0 para w1 ao longo de uma curva quadratica (preenchido). */
function taperStroke(ctx: CanvasRenderingContext2D, p0: Pt, c: Pt, p1: Pt, w0: number, w1: number) {
  const n = 12
  const left: Pt[] = []
  const right: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const p = quad(p0, c, p1, t)
    const q = quad(p0, c, p1, Math.min(1, t + 0.02))
    const r = quad(p0, c, p1, Math.max(0, t - 0.02))
    let tx = q[0] - r[0]
    let ty = q[1] - r[1]
    const l = Math.hypot(tx, ty) || 1
    tx /= l
    ty /= l
    const w = (w0 + (w1 - w0) * t) / 2
    left.push([p[0] - ty * w, p[1] + tx * w])
    right.push([p[0] + ty * w, p[1] - tx * w])
  }
  ctx.beginPath()
  ctx.moveTo(left[0][0], left[0][1])
  for (let i = 1; i <= n; i++) ctx.lineTo(left[i][0], left[i][1])
  for (let i = n; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1])
  ctx.closePath()
  ctx.fill()
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.quadraticCurveTo(x, y, x + r * 0.9, y)
  ctx.quadraticCurveTo(x, y, x, y + r)
  ctx.quadraticCurveTo(x, y, x - r * 0.9, y)
  ctx.quadraticCurveTo(x, y, x, y - r)
  ctx.fill()
}

/** Desenha na pose do traco: origem no (azimute, elevacao), x local para fora do rosto se `side` != 0. */
function at(ctx: CanvasRenderingContext2D, a: number, e: number, side: number, fn: () => void) {
  ctx.save()
  ctx.translate(px(a), py(e))
  ctx.scale((side || 1) * hscale(e), 1)
  fn()
  ctx.restore()
}

// ---------------------------------------------------------------- olhos

interface EyeShape {
  w: number
  up: number
  low: number
  lift: number
  iris: number
}
/** Estilos de olho (metros). */
const EYE_STYLES: Record<string, EyeShape> = {
  round: { w: 0.069, up: 0.047, low: 0.024, lift: 0.007, iris: 0.0235 },
  almond: { w: 0.076, up: 0.036, low: 0.021, lift: 0.014, iris: 0.019 },
  doe: { w: 0.065, up: 0.051, low: 0.027, lift: 0, iris: 0.0255 },
}

function eyeCurves(s: EyeShape) {
  const w = s.w * M
  const up = s.up * M
  const low = s.low * M
  const lift = s.lift * M
  const I: Pt = [-w / 2, lift / 2]
  const O: Pt = [w / 2, -lift / 2]
  const uc1: Pt = [-w * 0.27, I[1] - up * 1.33]
  const uc2: Pt = [w * 0.24, O[1] - up * 1.33]
  const lc1: Pt = [w * 0.2, O[1] + low * 1.33]
  const lc2: Pt = [-w * 0.28, I[1] + low * 1.33]
  const bez = (p0: Pt, c1: Pt, c2: Pt, p1: Pt, t: number): Pt => {
    const u = 1 - t
    const a = u * u * u
    const b = 3 * u * u * t
    const c = 3 * u * t * t
    const d = t * t * t
    return [a * p0[0] + b * c1[0] + c * c2[0] + d * p1[0], a * p0[1] + b * c1[1] + c * c2[1] + d * p1[1]]
  }
  return {
    w,
    up,
    low,
    I,
    O,
    uc1,
    uc2,
    lc1,
    lc2,
    upper: (t: number) => bez(I, uc1, uc2, O, t),
    lower: (t: number) => bez(O, lc1, lc2, I, t), // de fora para dentro
  }
}

function drawEye(
  ctx: CanvasRenderingContext2D,
  a: number,
  face: FaceAppearance,
  skinDark: Color,
) {
  const side = Math.sign(a)
  const s = EYE_STYLES[face.eyes.style] ?? EYE_STYLES.round
  const lashColor = new Color(face.lashes.color)
  const irisColor = new Color(face.eyes.iris)

  at(ctx, a, FACE_E.eye, side, () => {
    const g = eyeCurves(s)
    const { w, up, I, O } = g
    const path = () => {
      ctx.beginPath()
      ctx.moveTo(I[0], I[1])
      ctx.bezierCurveTo(g.uc1[0], g.uc1[1], g.uc2[0], g.uc2[1], O[0], O[1])
      ctx.bezierCurveTo(g.lc1[0], g.lc1[1], g.lc2[0], g.lc2[1], I[0], I[1])
      ctx.closePath()
    }

    // --- sombra de olho (gradiente sobre a palpebra) + vinco
    if (face.eyes.shadow) {
      const sc = new Color(face.eyes.shadow)
      const op = face.eyes.shadowOpacity ?? 0.5
      ctx.save()
      ctx.translate(w * 0.05, -up * 0.6)
      ctx.scale(1, 0.62)
      const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.85)
      grd.addColorStop(0, rgba(sc, op))
      grd.addColorStop(0.55, rgba(sc, op * 0.55))
      grd.addColorStop(1, rgba(sc, 0))
      ctx.fillStyle = grd
      ctx.fillRect(-w, -w, w * 2, w * 2)
      ctx.restore()
      // acento mais escuro no canto externo
      ctx.save()
      ctx.translate(w * 0.34, -up * 0.2)
      ctx.scale(1, 0.8)
      const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.34)
      g2.addColorStop(0, rgba(shade(sc, -0.15), op * 0.8))
      g2.addColorStop(1, rgba(sc, 0))
      ctx.fillStyle = g2
      ctx.fillRect(-w, -w, w * 2, w * 2)
      ctx.restore()
    }
    // vinco da palpebra
    ctx.save()
    ctx.strokeStyle = rgba(shade(skinDark, -0.12, 0.1), 0.5)
    ctx.lineWidth = 0.0017 * M
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(I[0] + w * 0.12, I[1] - up * 1.05)
    ctx.bezierCurveTo(g.uc1[0], g.uc1[1] - up * 0.4, g.uc2[0], g.uc2[1] - up * 0.4, O[0] + w * 0.04, O[1] - up * 0.7)
    ctx.stroke()
    ctx.restore()

    // --- branco do olho + iris (recortado pela forma do olho)
    ctx.save()
    path()
    ctx.clip()
    const wg = ctx.createLinearGradient(0, -up, 0, up * 0.5)
    wg.addColorStop(0, '#e8dce6')
    wg.addColorStop(0.35, '#fffafc')
    wg.addColorStop(1, '#ffffff')
    ctx.fillStyle = wg
    ctx.fillRect(-w, -up * 2, w * 2, up * 4)

    const ir = s.iris * M
    const icx = w * 0.0
    const icy = up * 0.1
    const ig = ctx.createRadialGradient(icx, icy, ir * 0.15, icx, icy, ir)
    ig.addColorStop(0, rgba(shade(irisColor, 0.02), 1))
    ig.addColorStop(0.5, rgba(irisColor, 1))
    ig.addColorStop(0.88, rgba(shade(irisColor, -0.2, 0.03), 1))
    ig.addColorStop(1, rgba(shade(irisColor, -0.3, 0.03), 1))
    ctx.fillStyle = ig
    ctx.beginPath()
    ctx.arc(icx, icy, ir, 0, Math.PI * 2)
    ctx.fill()
    // brilho inferior da iris (luz refratada)
    const bg = ctx.createRadialGradient(icx, icy + ir * 0.62, 0, icx, icy + ir * 0.62, ir * 0.75)
    bg.addColorStop(0, rgba(shade(irisColor, 0.3, 0.05), 0.6))
    bg.addColorStop(1, rgba(irisColor, 0))
    ctx.fillStyle = bg
    ctx.beginPath()
    ctx.arc(icx, icy, ir * 0.97, 0, Math.PI * 2)
    ctx.fill()
    // anel limbal
    ctx.strokeStyle = rgba(shade(irisColor, -0.45), 0.7)
    ctx.lineWidth = ir * 0.1
    ctx.beginPath()
    ctx.arc(icx, icy, ir * 0.96, 0, Math.PI * 2)
    ctx.stroke()
    // pupila
    ctx.fillStyle = rgba(shade(irisColor, -0.42, -0.1), 1)
    ctx.beginPath()
    ctx.arc(icx, icy, ir * 0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#120a18'
    ctx.beginPath()
    ctx.arc(icx, icy, ir * 0.3, 0, Math.PI * 2)
    ctx.fill()
    // brilhos (2 sparkles + um mini)
    ctx.fillStyle = 'rgba(255,255,255,0.97)'
    ctx.beginPath()
    ctx.arc(icx - ir * 0.34, icy - ir * 0.36, ir * 0.25, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.88)'
    ctx.beginPath()
    ctx.arc(icx + ir * 0.34, icy + ir * 0.4, ir * 0.11, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    star(ctx, icx + ir * 0.5, icy - ir * 0.2, ir * 0.16)

    // sombra da palpebra superior sobre o olho
    const ls = ctx.createLinearGradient(0, -up, 0, up * 0.35)
    ls.addColorStop(0, rgba(shade(skinDark, -0.1), 0.5))
    ls.addColorStop(1, rgba(skinDark, 0))
    ctx.fillStyle = ls
    ctx.fillRect(-w, -up * 2, w * 2, up * 2.4)
    ctx.restore()

    // --- linha dos cilios superiores (mais grossa no canto externo)
    ctx.strokeStyle = rgba(lashColor, 1)
    ctx.fillStyle = rgba(lashColor, 1)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 0.0036 * M
    ctx.beginPath()
    ctx.moveTo(I[0], I[1])
    ctx.bezierCurveTo(g.uc1[0], g.uc1[1], g.uc2[0], g.uc2[1], O[0], O[1])
    ctx.stroke()
    ctx.lineWidth = 0.0058 * M
    ctx.beginPath()
    for (let i = 0; i <= 10; i++) {
      const p = g.upper(0.35 + 0.55 * (i / 10))
      if (i === 0) ctx.moveTo(p[0], p[1])
      else ctx.lineTo(p[0], p[1])
    }
    ctx.stroke()

    // --- delineado "gatinho"
    if (face.lashes.style === 'wing') {
      const t0 = 0.62
      const start = g.upper(t0)
      const tip: Pt = [O[0] + w * 0.28, O[1] - w * 0.12]
      ctx.beginPath()
      ctx.moveTo(start[0], start[1] - 2)
      ctx.quadraticCurveTo(O[0] - w * 0.05, O[1] - up * 0.28, tip[0], tip[1])
      ctx.quadraticCurveTo(O[0] + w * 0.1, O[1] - up * 0.1, O[0] - w * 0.02, O[1] + 3)
      for (let i = 0; i <= 8; i++) {
        const p = g.upper(1 - (1 - t0) * (i / 8))
        ctx.lineTo(p[0], p[1] + 1)
      }
      ctx.closePath()
      ctx.fill()
    } else if (face.lashes.style === 'dramatic') {
      // delineado grosso curto
      ctx.lineWidth = 0.0048 * M
      ctx.beginPath()
      for (let i = 0; i <= 10; i++) {
        const p = g.upper(0.35 + 0.65 * (i / 10))
        if (i === 0) ctx.moveTo(p[0], p[1])
        else ctx.lineTo(p[0], p[1])
      }
      ctx.lineTo(O[0] + w * 0.07, O[1] - up * 0.12)
      ctx.stroke()
    }

    // --- cilios superiores (curvos, mais longos no canto externo) + flicks
    const style = face.lashes.style
    const count = style === 'dramatic' ? 15 : style === 'wing' ? 11 : 9
    const lenBase = (style === 'dramatic' ? 0.0125 : 0.0098) * M
    for (let i = 0; i < count; i++) {
      const t = 0.1 + 0.9 * (i / (count - 1))
      const P = g.upper(t)
      const P2 = g.upper(Math.min(1, t + 0.03))
      const P1 = g.upper(Math.max(0, t - 0.03))
      let tx = P2[0] - P1[0]
      let ty = P2[1] - P1[1]
      const tl = Math.hypot(tx, ty) || 1
      tx /= tl
      ty /= tl
      // normal para cima e varrida para fora
      let nx = ty + (0.2 + 1.0 * Math.pow(t, 1.4))
      let ny = -tx
      const nl = Math.hypot(nx, ny) || 1
      nx /= nl
      ny /= nl
      const L = lenBase * (0.5 + 0.95 * Math.pow(t, 1.3))
      const c: Pt = [P[0] + nx * L * 0.55 - tx * L * 0.05, P[1] + ny * L * 0.55 - ty * L * 0.05]
      const e: Pt = [P[0] + nx * L + tx * L * 0.3, P[1] + ny * L + ty * L * 0.3 - L * 0.08]
      taperStroke(ctx, P, c, e, 0.0032 * M, 0.0003 * M)
    }
    if (style === 'wing' || style === 'dramatic') {
      for (let i = 0; i < 3; i++) {
        const t = 0.8 + i * 0.1
        const P = g.upper(Math.min(t, 1))
        const L = lenBase * (1.7 + i * 0.25)
        const ang = -0.95 - i * 0.22 // para cima/fora (y negativo = cima)
        const e: Pt = [P[0] + Math.cos(ang + Math.PI * 0.0) * L * 0.8 + L * 0.35, P[1] + Math.sin(ang) * L * 0.75]
        const c: Pt = [P[0] + L * 0.2, P[1] - L * 0.55]
        taperStroke(ctx, P, c, e, 0.0034 * M, 0.0003 * M)
      }
    }
    // --- cilios inferiores (sutis)
    ctx.fillStyle = rgba(lashColor, 0.55)
    for (let i = 0; i < 6; i++) {
      const t = 0.04 + 0.5 * (i / 5)
      const P = g.lower(t)
      const L = 0.0052 * M * (1 - t * 0.5)
      const e: Pt = [P[0] + L * 0.6, P[1] + L * 0.85]
      const c: Pt = [P[0] + L * 0.1, P[1] + L * 0.55]
      taperStroke(ctx, P, c, e, 0.0011 * M, 0.00015 * M)
    }
  })
}

function drawBrow(ctx: CanvasRenderingContext2D, a: number, face: FaceAppearance) {
  const side = Math.sign(a)
  const col = new Color(face.brows.color)
  at(ctx, a, FACE_E.eye, side, () => {
    ctx.fillStyle = rgba(col, 0.92)
    ctx.shadowColor = rgba(col, 0.6)
    ctx.shadowBlur = 0.0016 * M
    if (face.brows.style === 'straight') {
      taperStroke(ctx, [-0.029 * M, -0.056 * M], [0.008 * M, -0.06 * M], [0.047 * M, -0.056 * M], 0.0085 * M, 0.0045 * M)
    } else {
      taperStroke(ctx, [-0.029 * M, -0.054 * M], [0.02 * M, -0.068 * M], [0.047 * M, -0.048 * M], 0.0095 * M, 0.0035 * M)
    }
    ctx.shadowBlur = 0
  })
}

// ---------------------------------------------------------------- boca

function drawLips(ctx: CanvasRenderingContext2D, face: FaceAppearance, skinDark: Color) {
  const col = new Color(face.lips.color)
  const pout = face.lips.style === 'pout'
  const hw = (pout ? 0.021 : 0.029) * M
  const h1 = (pout ? 0.011 : 0.0105) * M
  const h2 = (pout ? 0.0165 : 0.0145) * M
  const dip = pout ? 0.9 : 0.72
  at(ctx, 0, FACE_E.mouth, 0, () => {
    // contorno suave (batom mais escuro nas bordas)
    ctx.beginPath()
    ctx.moveTo(-hw, 0)
    ctx.bezierCurveTo(-hw * 0.62, -h1 * 1.15, -hw * 0.26, -h1 * 1.35, 0, -h1 * dip)
    ctx.bezierCurveTo(hw * 0.26, -h1 * 1.35, hw * 0.62, -h1 * 1.15, hw, 0)
    ctx.bezierCurveTo(hw * 0.62, h2 * 1.3, -hw * 0.62, h2 * 1.3, -hw, 0)
    ctx.closePath()
    const g = ctx.createLinearGradient(0, -h1 * 1.3, 0, h2 * 1.1)
    g.addColorStop(0, rgba(shade(col, 0.02), 1))
    g.addColorStop(0.45, rgba(shade(col, 0.06), 1))
    g.addColorStop(1, rgba(shade(col, 0.12), 1))
    ctx.fillStyle = g
    ctx.fill()
    // linha da boca
    ctx.strokeStyle = rgba(shade(col, -0.25), 0.75)
    ctx.lineWidth = 0.0012 * M
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-hw * 0.98, 0)
    ctx.quadraticCurveTo(0, h1 * 0.28, hw * 0.98, 0)
    ctx.stroke()
    // cantos
    ctx.fillStyle = rgba(skinDark, 0.25)
    ctx.beginPath()
    ctx.arc(-hw * 1.04, -h1 * 0.05, 0.0016 * M, 0, Math.PI * 2)
    ctx.arc(hw * 1.04, -h1 * 0.05, 0.0016 * M, 0, Math.PI * 2)
    ctx.fill()
    // brilho (gloss)
    const gl = ctx.createRadialGradient(-hw * 0.12, h2 * 0.42, 0, -hw * 0.12, h2 * 0.42, hw * 0.4)
    gl.addColorStop(0, 'rgba(255,255,255,0.95)')
    gl.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gl
    ctx.save()
    ctx.translate(-hw * 0.12, h2 * 0.42)
    ctx.scale(1, 0.42)
    ctx.translate(hw * 0.12, -h2 * 0.42)
    ctx.beginPath()
    ctx.arc(-hw * 0.12, h2 * 0.42, hw * 0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.beginPath()
    ctx.ellipse(-hw * 0.5, -h1 * 0.55, hw * 0.14, h1 * 0.14, -0.2, 0, Math.PI * 2)
    ctx.fill()
  })
}

// ---------------------------------------------------------------- composicao

/** Desenha todas as camadas do rosto no canvas (transparente fora dos tracos). */
export function drawFace(canvas: HTMLCanvasElement, face: FaceAppearance, skinTone: string): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const skin = new Color(skinTone)
  const skinDark = shade(skin, -0.16, 0.08)

  // blush (camada de base, sob os olhos)
  for (const sd of [-1, 1]) {
    at(ctx, sd * 0.64, FACE_E.cheek, sd, () => {
      const bc = new Color(face.blush.color)
      ctx.save()
      ctx.scale(1, 0.62)
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.036 * M)
      g.addColorStop(0, rgba(bc, face.blush.opacity))
      g.addColorStop(0.55, rgba(bc, face.blush.opacity * 0.5))
      g.addColorStop(1, rgba(bc, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(0, 0, 0.036 * M, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    })
  }

  // nariz: sombra sutil sob a ponta + brilho no dorso
  at(ctx, 0, FACE_E.nose - 0.07, 0, () => {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.014 * M)
    g.addColorStop(0, rgba(skinDark, 0.28))
    g.addColorStop(1, rgba(skinDark, 0))
    ctx.fillStyle = g
    ctx.fillRect(-0.02 * M, -0.02 * M, 0.04 * M, 0.04 * M)
    ctx.fillStyle = rgba(skinDark, 0.5)
    ctx.beginPath()
    ctx.ellipse(-0.0052 * M, -0.0035 * M, 0.0013 * M, 0.0009 * M, 0, 0, Math.PI * 2)
    ctx.ellipse(0.0052 * M, -0.0035 * M, 0.0013 * M, 0.0009 * M, 0, 0, Math.PI * 2)
    ctx.fill()
  })
  at(ctx, 0, FACE_E.nose + 0.06, 0, () => {
    ctx.fillStyle = 'rgba(255,255,255,0.14)'
    ctx.beginPath()
    ctx.ellipse(0, 0, 0.0024 * M, 0.0046 * M, 0, 0, Math.PI * 2)
    ctx.fill()
  })

  drawLips(ctx, face, skinDark)
  for (const sd of [-1, 1]) drawEye(ctx, sd * EYE_A, face, skinDark)
  for (const sd of [-1, 1]) drawBrow(ctx, sd * EYE_A, face)

  // extras
  const extras = face.extras ?? []
  const rnd = rng(1234)
  if (extras.includes('freckles')) {
    ctx.fillStyle = rgba(shade(skinDark, -0.08, 0.1), 0.55)
    for (let i = 0; i < 26; i++) {
      const sd = i % 2 ? 1 : -1
      const a = sd * (0.12 + rnd() * 0.5)
      const e = FACE_E.nose + 0.1 + rnd() * 0.22
      at(ctx, a, e, 0, () => {
        ctx.beginPath()
        ctx.arc(0, 0, (0.0009 + rnd() * 0.0009) * M, 0, Math.PI * 2)
        ctx.fill()
      })
    }
  }
  if (extras.includes('beautyMark')) {
    at(ctx, -0.34, FACE_E.mouth - 0.1, 0, () => {
      ctx.fillStyle = 'rgba(40,24,30,0.85)'
      ctx.beginPath()
      ctx.arc(0, 0, 0.0015 * M, 0, Math.PI * 2)
      ctx.fill()
    })
  }
  if (extras.includes('glitter')) {
    const colors = ['rgba(255,255,255,0.95)', 'rgba(255,226,140,0.95)', 'rgba(255,190,230,0.95)']
    for (let i = 0; i < 22; i++) {
      const sd = i % 2 ? 1 : -1
      const near = i < 12
      const a = sd * (near ? 0.5 + rnd() * 0.3 : 0.55 + rnd() * 0.25)
      const e = near ? FACE_E.eye + (rnd() - 0.5) * 0.18 : FACE_E.cheek + (rnd() - 0.5) * 0.14
      ctx.fillStyle = colors[i % 3]
      at(ctx, a, e, 0, () => star(ctx, 0, 0, (0.0016 + rnd() * 0.002) * M))
    }
  }
}

export class FaceTexture {
  readonly canvas: HTMLCanvasElement
  readonly texture: CanvasTexture

  constructor() {
    this.canvas = document.createElement('canvas')
    this.canvas.width = FACE_SIZE
    this.canvas.height = FACE_SIZE
    this.texture = new CanvasTexture(this.canvas)
    this.texture.colorSpace = SRGBColorSpace
    this.texture.anisotropy = 4
    // sem mipmaps: texels transparentes (preto) nao contaminam o rosto a distancia
    this.texture.generateMipmaps = false
    this.texture.minFilter = LinearFilter
  }

  redraw(face: FaceAppearance, skinTone: string): void {
    drawFace(this.canvas, face, skinTone)
    if (import.meta.env.DEV) (window as unknown as { __faceCanvas: unknown }).__faceCanvas = this.canvas
    this.texture.needsUpdate = true
  }

  dispose(): void {
    this.texture.dispose()
  }
}

/** Geometria do decalque do rosto: recorte frontal da cabeca, 1,2% maior. */
export function createFaceDecalGeometry(): BufferGeometry {
  const g = new SphereGeometry(1, 32, 24, Math.PI / 2 - A, 2 * A, TH0, TH1 - TH0)
  return deformHead(g, 1.012)
}
