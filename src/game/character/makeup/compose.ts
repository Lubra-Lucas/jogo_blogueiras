import type { Makeup } from '../../../shared/appearance'
import { BROWS, CREASE, LOWER, MIRROR_X, MOUTH, UPPER, type Pt } from './landmarks'

/**
 * Compositor de maquiagem: desenha as camadas (Canvas 2D) na tela de projecao frontal 1024x1024.
 *  - cor (`color`): RGBA com alfa reto; o shader da boneca mistura por cima da pele (so no rosto).
 *  - efeitos (`fx`): R = brilho de glitter, G = brilho/umidade (rugosidade menor), B = metalico.
 * Regras: tudo e dado (`Makeup` JSON); o desenho de cada camada e uma funcao pura da tela; so regenera quando o JSON muda.
 */
export const SIZE = 1024

export interface FaceMasks {
  /** canvases de alfa (R/G/B da `doll_face_front.png`): labios, silhueta, olho aberto */
  lips: HTMLCanvasElement
  sil: HTMLCanvasElement
  eye: HTMLCanvasElement
}

function mk(w = SIZE, h = SIZE): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d', { willReadFrequently: false })!]
}

// ---------- cores ----------
export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  const n = m ? parseInt(m[1], 16) : 0x808080
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const rgba = (hex: string, a: number) => {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`
}
function shade(hex: string, k: number, sat = 0): string {
  const [r, g, b] = hexToRgb(hex)
  const l = 0.3 * r + 0.59 * g + 0.11 * b
  const f = (v: number) => Math.max(0, Math.min(255, Math.round((l + (v - l) * (1 + sat)) * k)))
  return `#${[f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}
function mixHex(a: string, b: string, t: number): string {
  const x = hexToRgb(a)
  const y = hexToRgb(b)
  return `#${[0, 1, 2].map((i) => Math.round(x[i] + (y[i] - x[i]) * t).toString(16).padStart(2, '0')).join('')}`
}
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------- geometria ----------
const OFF = 4000
/** Preenche formas com borda suave (sombra deslocada para fora da tela: funciona em qualquer navegador). */
function soft(ctx: CanvasRenderingContext2D, path: (c: CanvasRenderingContext2D) => void, color: string, alpha: number, blur: number) {
  ctx.save()
  ctx.shadowColor = rgba(color, alpha)
  ctx.shadowBlur = blur
  ctx.shadowOffsetX = OFF
  // o deslocamento da sombra e em pixels do dispositivo; a translacao respeita o espelho (scale -1)
  ctx.translate(ctx.getTransform().a < 0 ? OFF : -OFF, 0)
  ctx.fillStyle = '#000'
  ctx.beginPath()
  path(ctx)
  ctx.fill()
  ctx.restore()
}

/** Catmull-Rom -> bezier por pontos. */
function curveTo(c: CanvasRenderingContext2D, pts: Pt[], move = true) {
  if (move) c.moveTo(pts[0][0], pts[0][1])
  else c.lineTo(pts[0][0], pts[0][1])
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1])
  }
}
/** Amostra uma polilinha suave em n pontos. */
function sample(pts: Pt[], n: number): Pt[] {
  const out: Pt[] = []
  const segs = pts.length - 1
  for (let k = 0; k < n; k++) {
    const t = (k / (n - 1)) * segs
    const i = Math.min(segs - 1, Math.floor(t))
    const f = t - i
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const h = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (c - a) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f)
    out.push([h(p0[0], p1[0], p2[0], p3[0]), h(p0[1], p1[1], p2[1], p3[1])])
  }
  return out
}
const shift = (pts: Pt[], dx: number, dy: number): Pt[] => pts.map((p) => [p[0] + dx, p[1] + dy])
/** Normal (apontando para cima) e tangente num ponto i de uma polilinha amostrada. */
function frame(s: Pt[], i: number): { t: Pt; n: Pt } {
  const a = s[Math.max(0, i - 1)]
  const b = s[Math.min(s.length - 1, i + 1)]
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l = Math.hypot(dx, dy) || 1
  const t: Pt = [dx / l, dy / l]
  let n: Pt = [t[1], -t[0]]
  if (n[1] > 0) n = [-n[0], -n[1]]
  return { t, n }
}
/** Faixa de largura variavel ao redor de uma curva (polilinha amostrada). */
function ribbon(c: CanvasRenderingContext2D, s: Pt[], w: (u: number) => number) {
  const L: Pt[] = []
  const R: Pt[] = []
  s.forEach((p, i) => {
    const { n } = frame(s, i)
    const ww = w(i / (s.length - 1)) / 2
    L.push([p[0] + n[0] * ww, p[1] + n[1] * ww])
    R.push([p[0] - n[0] * ww, p[1] - n[1] * ww])
  })
  c.moveTo(L[0][0], L[0][1])
  L.forEach((p) => c.lineTo(p[0], p[1]))
  for (let i = R.length - 1; i >= 0; i--) c.lineTo(R[i][0], R[i][1])
  c.closePath()
}

/** Desenha `fn` para os dois olhos (A normal, B espelhado). */
function bothSides(ctx: CanvasRenderingContext2D, fn: (c: CanvasRenderingContext2D, side: 1 | -1) => void) {
  fn(ctx, 1)
  ctx.save()
  ctx.translate(MIRROR_X, 0)
  ctx.scale(-1, 1)
  fn(ctx, -1)
  ctx.restore()
}

// ---------- camadas ----------
interface Env {
  m: Makeup
  tone: string
  masks: FaceMasks
  fx: CanvasRenderingContext2D
}

const chan = (r: number, g: number, b: number, a: number) => `rgba(${r},${g},${b},${a})`

function eyeRegions() {
  const U = sample(UPPER, 24)
  const L = sample(LOWER, 24)
  const C = sample(CREASE, 24)
  return { U, L, C }
}

function layerShadow(ctx: CanvasRenderingContext2D, env: Env) {
  const sh = env.m.eyeshadow
  if (sh.style === 'none') return
  const { U, L, C } = eyeRegions()
  const I = sh.intensity
  const lid = (c: CanvasRenderingContext2D) => {
    c.moveTo(U[0][0], U[0][1])
    U.forEach((p) => c.lineTo(p[0], p[1]))
    for (let i = C.length - 1; i >= 0; i--) c.lineTo(C[i][0], C[i][1])
    c.closePath()
  }
  const socketTop = shift(C, -8, -52)
  const socket = (c: CanvasRenderingContext2D) => {
    c.moveTo(U[0][0], U[0][1])
    U.forEach((p) => c.lineTo(p[0], p[1]))
    for (let i = socketTop.length - 1; i >= 0; i--) c.lineTo(socketTop[i][0], socketTop[i][1])
    c.closePath()
  }
  const lowerSmudge = (c: CanvasRenderingContext2D) => {
    const top = L
    const bot = shift(L, 0, 34)
    c.moveTo(top[0][0], top[0][1])
    top.forEach((p) => c.lineTo(p[0], p[1]))
    for (let i = bot.length - 1; i >= 0; i--) c.lineTo(bot[i][0], bot[i][1])
    c.closePath()
  }
  bothSides(ctx, (c) => {
    switch (sh.style) {
      case 'wash':
        soft(c, socket, sh.c2, I * 0.55, 26)
        soft(c, lid, sh.c1, I * 0.85, 14)
        break
      case 'smoky':
        soft(c, socket, sh.c2, I * 0.75, 30)
        soft(c, lid, sh.c1, I * 1.0, 12)
        soft(c, lowerSmudge, sh.c1, I * 0.6, 12)
        soft(c, (cc) => cc.ellipse(158, 432, 62, 38, -0.4, 0, Math.PI * 2), shade(sh.c1, 0.6), I * 0.7, 20)
        break
      case 'cut': {
        soft(c, (cc) => {
          const top = shift(C, 0, 14)
          cc.moveTo(U[0][0], U[0][1])
          U.forEach((p) => cc.lineTo(p[0], p[1]))
          for (let i = top.length - 1; i >= 0; i--) cc.lineTo(top[i][0], top[i][1])
          cc.closePath()
        }, sh.c1, I * 1.0, 3)
        soft(c, (cc) => {
          const above = shift(C, -4, -46)
          cc.moveTo(C[0][0], C[0][1] + 14)
          C.forEach((p) => cc.lineTo(p[0], p[1] + 14))
          for (let i = above.length - 1; i >= 0; i--) cc.lineTo(above[i][0], above[i][1])
          cc.closePath()
        }, sh.c2, I * 0.8, 16)
        break
      }
      case 'halo':
        soft(c, (cc) => cc.ellipse(190, 440, 62, 46, -0.35, 0, Math.PI * 2), sh.c1, I * 0.95, 14)
        soft(c, (cc) => cc.ellipse(345, 484, 40, 46, 0.3, 0, Math.PI * 2), sh.c1, I * 0.85, 12)
        soft(c, (cc) => cc.ellipse(268, 420, 54, 30, 0.08, 0, Math.PI * 2), sh.c2, I * 0.95, 10)
        soft(c, socket, sh.c2, I * 0.28, 24)
        break
      case 'graphic': {
        soft(c, (cc) => {
          const a = shift(C, 10, -6)
          const b = shift(C, 12, -42)
          cc.moveTo(a[0][0], a[0][1])
          a.forEach((p) => cc.lineTo(p[0], p[1]))
          for (let i = b.length - 1; i >= 0; i--) cc.lineTo(b[i][0], b[i][1])
          cc.closePath()
        }, sh.c1, I, 1.5)
        soft(c, (cc) => {
          const a = shift(U, 0, -14)
          const b = shift(U, 0, -34)
          cc.moveTo(a[0][0], a[0][1])
          a.forEach((p) => cc.lineTo(p[0], p[1]))
          for (let i = b.length - 1; i >= 0; i--) cc.lineTo(b[i][0], b[i][1])
          cc.closePath()
        }, sh.c2, I, 1.5)
        break
      }
    }
  })
  // brilho (glitter/metalico) sobre a pálpebra
  if (sh.shimmer > 0.01) {
    bothSides(env.fx, (c) => {
      env.fx.save()
      env.fx.globalCompositeOperation = 'lighter'
      soft(c, lid, '#ff0000', sh.shimmer * 0.9, 8)
      soft(c, lid, '#0000ff', sh.shimmer * 0.7, 8)
      env.fx.restore()
    })
    // reflexo metalico no centro da palpebra tambem aparece na cor
    bothSides(ctx, (c) => soft(c, (cc) => cc.ellipse(262, 410, 46, 20, 0.05, 0, Math.PI * 2), mixHex(sh.c1, '#ffffff', 0.5), sh.shimmer * 0.35, 8))
  }
}

function layerLiner(ctx: CanvasRenderingContext2D, env: Env) {
  const ln = env.m.eyeliner
  if (ln.style === 'none') return
  const { U, C } = eyeRegions()
  const k = 0.6 + ln.thickness * 0.9
  const col = ln.color
  const thickLine = (c: CanvasRenderingContext2D, w0: number, w1: number) => {
    c.fillStyle = col
    c.beginPath()
    ribbon(c, U, (u) => w1 + (w0 - w1) * (1 - u)) // mais grosso no canto externo (u=0)
    c.fill()
  }
  bothSides(ctx, (c) => {
    c.save()
    switch (ln.style) {
      case 'tight':
        c.strokeStyle = col
        c.lineWidth = 6 * k
        c.lineCap = 'round'
        c.beginPath()
        curveTo(c, shift(U, 0, 4))
        c.stroke()
        break
      case 'classic':
      case 'color':
        thickLine(c, 22 * k, 6 * k)
        break
      case 'wing':
        thickLine(c, 20 * k, 6 * k)
        c.fillStyle = col
        c.beginPath()
        c.moveTo(210, 417)
        c.quadraticCurveTo(140, 405, 80 + (1 - k) * 10, 358)
        c.quadraticCurveTo(116, 408, 128, 444)
        c.quadraticCurveTo(170, 452, 214, 440)
        c.closePath()
        c.fill()
        break
      case 'graphic':
        thickLine(c, 12 * k, 5 * k)
        c.strokeStyle = col
        c.lineWidth = 9 * k
        c.lineCap = 'round'
        c.beginPath()
        curveTo(c, shift(C, 4, -4).slice(0, 5))
        c.stroke()
        break
    }
    c.restore()
  })
}

function layerLashes(ctx: CanvasRenderingContext2D, env: Env) {
  const ls = env.m.lashes
  if (ls.style === 'natural') return
  const { U, L } = eyeRegions()
  const r = rng(77)
  const len = 0.6 + ls.length * 0.9
  const cfg = {
    doll: { n: 30, base: 22, grow: 14, w: 3.2, lo: 12, loLen: 14, flick: 0.2 },
    dramatic: { n: 22, base: 28, grow: 52, w: 3, lo: 8, loLen: 16, flick: 0.55 },
    spider: { n: 14, base: 46, grow: 40, w: 2.1, lo: 11, loLen: 44, flick: 0.1 },
  }[ls.style]
  bothSides(ctx, (c) => {
    c.strokeStyle = ls.color
    c.lineCap = 'round'
    const upper = sample(U, cfg.n)
    upper.forEach((p, i) => {
      const u = i / (cfg.n - 1) // 0 externo -> 1 interno
      const { n, t } = frame(upper, i)
      const outer = 1 - u
      const L0 = (cfg.base + cfg.grow * Math.pow(outer, 1.4)) * len * (0.85 + r() * 0.3)
      // inclina para fora (esquerda no lado A) e para cima
      const dir: Pt = [n[0] - cfg.flick * outer * 1.3, n[1] - 0.15 * outer]
      const dl = Math.hypot(dir[0], dir[1])
      const tip: Pt = [p[0] + (dir[0] / dl) * L0, p[1] + (dir[1] / dl) * L0]
      const ctrl: Pt = [p[0] + (dir[0] / dl) * L0 * 0.55 - t[0] * 6 * -1, p[1] + (dir[1] / dl) * L0 * 0.55 + t[1] * 4]
      c.lineWidth = cfg.w * (0.8 + 0.4 * r())
      c.beginPath()
      c.moveTo(p[0], p[1])
      c.quadraticCurveTo(ctrl[0], ctrl[1], tip[0], tip[1])
      c.stroke()
    })
    const lower = sample(L, cfg.lo)
    lower.forEach((p, i) => {
      if (i === 0 || i === lower.length - 1) return
      const { n } = frame(lower, i)
      const L0 = cfg.loLen * len * (0.8 + r() * 0.4)
      const dir: Pt = [-n[0] - 0.25 * (1 - i / cfg.lo), -n[1]]
      c.lineWidth = cfg.w * 0.7
      c.beginPath()
      c.moveTo(p[0], p[1] + 2)
      c.quadraticCurveTo(p[0] + dir[0] * L0 * 0.6, p[1] + dir[1] * L0 * 0.6, p[0] + dir[0] * L0, p[1] + dir[1] * L0)
      c.stroke()
    })
  })
}

function layerBrows(ctx: CanvasRenderingContext2D, env: Env) {
  const b = env.m.brows
  if (b.style === 'painted') return
  const def = BROWS[b.style]
  const s = sample(def.pts, 40)
  const w0 = def.w * (0.6 + b.thickness * 0.9)
  const r = rng(31)
  bothSides(ctx, (c) => {
    // corpo (suave) + fios
    soft(c, (cc) => ribbon(cc, s, (u) => w0 * (0.5 + 0.5 * Math.sin(Math.PI * (0.25 + 0.75 * u)) * 0.9 + 0.1 * u)), b.color, 0.55, 5)
    soft(c, (cc) => ribbon(cc, s, (u) => w0 * 0.55 * (0.4 + u * 0.6)), shade(b.color, 0.8), 0.45, 3)
    c.strokeStyle = shade(b.color, 0.82)
    c.lineCap = 'round'
    const n = Math.round(60 + w0 * 2)
    for (let i = 0; i < n; i++) {
      const u = r()
      const idx = Math.min(s.length - 2, Math.floor(u * (s.length - 1)))
      const p = s[idx]
      const { t, n: nn } = frame(s, idx)
      const wd = (w0 * (0.5 + 0.5 * Math.sin(Math.PI * (0.25 + 0.75 * u)))) / 2
      const off = (r() * 2 - 1) * wd
      const bx = p[0] + nn[0] * off
      const by = p[1] + nn[1] * off
      // fio: segue a direcao da sobrancelha (de dentro para fora), levemente para cima
      const dirx = -t[0] * -1
      const L = 9 + r() * 7
      c.globalAlpha = 0.35 + r() * 0.35
      c.lineWidth = 1.3 + r() * 1.3
      c.beginPath()
      c.moveTo(bx, by)
      c.lineTo(bx + dirx * L * 0.9 + nn[0] * 2, by + t[1] * L * 0.9 + nn[1] * 2.5)
      c.stroke()
    }
    c.globalAlpha = 1
  })
}

function layerBase(ctx: CanvasRenderingContext2D, env: Env) {
  const { m, tone } = env
  const f = m.foundation
  if (f.coverage > 0.01 || f.shift !== 0) {
    const col = f.shift >= 0 ? mixHex(tone, '#ffffff', f.shift * 0.35) : shade(tone, 1 + f.shift * 0.32, 0.05)
    ctx.fillStyle = rgba(col, Math.max(f.coverage, Math.abs(f.shift) * 0.55))
    ctx.fillRect(0, 0, SIZE, SIZE)
  }
  const dark = shade(tone, 0.62, 0.35)
  if (m.contour > 0.01) {
    const a = m.contour * 0.5
    bothSides(ctx, (c) => {
      soft(c, (cc) => {
        cc.save()
        cc.translate(255, 745)
        cc.rotate(0.38)
        cc.ellipse(0, 0, 130, 28, 0, 0, Math.PI * 2)
        cc.restore()
      }, dark, a, 36)
      soft(c, (cc) => cc.ellipse(465, 590, 14, 78, 0.04, 0, Math.PI * 2), dark, a * 0.7, 20)
      soft(c, (cc) => {
        cc.save()
        cc.translate(220, 130)
        cc.rotate(-0.35)
        cc.ellipse(0, 0, 150, 30, 0, 0, Math.PI * 2)
        cc.restore()
      }, dark, a * 0.55, 34)
      soft(c, (cc) => {
        cc.save()
        cc.translate(330, 930)
        cc.rotate(0.55)
        cc.ellipse(0, 0, 130, 22, 0, 0, Math.PI * 2)
        cc.restore()
      }, dark, a * 0.55, 30)
    })
  }
  const bl = m.blush
  if (bl.style !== 'none') {
    const a = bl.amount * 0.7
    bothSides(ctx, (c) => {
      if (bl.style === 'apple') soft(c, (cc) => cc.ellipse(245, 662, 112, 98, 0, 0, Math.PI * 2), bl.color, a, 50)
      if (bl.style === 'draping') {
        soft(c, (cc) => {
          cc.save()
          cc.translate(228, 598)
          cc.rotate(0.32)
          cc.ellipse(0, 0, 170, 46, 0, 0, Math.PI * 2)
          cc.restore()
        }, bl.color, a, 40)
        soft(c, (cc) => cc.ellipse(180, 560, 60, 50, 0, 0, Math.PI * 2), bl.color, a * 0.6, 40)
      }
      if (bl.style === 'sunkissed') {
        soft(c, (cc) => cc.ellipse(300, 645, 150, 52, 0.06, 0, Math.PI * 2), bl.color, a * 0.75, 44)
        soft(c, (cc) => cc.ellipse(430, 650, 80, 36, 0, 0, Math.PI * 2), bl.color, a * 0.6, 34)
      }
    })
    if (bl.style === 'sunkissed') soft(ctx, (cc) => cc.ellipse(512, 678, 52, 38, 0, 0, Math.PI * 2), bl.color, a * 0.75, 26)
  }
  const hl = m.highlighter
  if (hl.amount > 0.01) {
    const a = hl.amount * 0.75
    bothSides(ctx, (c) => {
      c.save()
      c.strokeStyle = '#000'
      c.lineCap = 'round'
      const stroke = (pts: Pt[], w: number, blur: number, al: number) => soft(c, (cc) => ribbon(cc, sample(pts, 14), () => w), hl.color, al, blur)
      stroke([[150, 612], [250, 632], [340, 622]], 24, 20, a * 0.8)
      stroke([[150, 346], [250, 336]], 14, 12, a * 0.6)
      soft(c, (cc) => cc.ellipse(392, 536, 14, 16, 0, 0, Math.PI * 2), hl.color, a * 0.85, 10)
      c.restore()
    })
    soft(ctx, (cc) => ribbon(cc, sample([[512, 520], [512, 590], [512, 660]], 8), () => 22), hl.color, a * 0.8, 16)
    soft(ctx, (cc) => cc.ellipse(512, 772, 22, 9, 0, 0, Math.PI * 2), hl.color, a * 0.9, 8)
    soft(ctx, (cc) => cc.ellipse(512, 630, 28, 14, 0, 0, Math.PI * 2), hl.color, a * 0.6, 10)
    // brilho molhado/shimmer
    env.fx.save()
    env.fx.globalCompositeOperation = 'lighter'
    const g = (path: (c: CanvasRenderingContext2D) => void, al: number, blur: number) => {
      soft(env.fx, path, '#00ff00', al, blur)
      soft(env.fx, path, '#ff0000', al * 0.5, blur)
    }
    bothSides(env.fx, () => g((cc) => ribbon(cc, sample([[150, 612], [250, 632], [340, 622]], 14), () => 22), hl.amount, 16))
    g((cc) => ribbon(cc, sample([[512, 520], [512, 590], [512, 660]], 8), () => 20), hl.amount, 14)
    env.fx.restore()
  }
}

function layerSpots(ctx: CanvasRenderingContext2D, env: Env) {
  const { m, tone } = env
  if (m.freckles > 0.01) {
    const r = rng(1234)
    const col = shade(mixHex(tone, '#a0592f', 0.45), 0.85, 0.2)
    const n = Math.round(m.freckles * 190)
    for (let i = 0; i < n; i++) {
      const zone = r()
      let x: number
      let y: number
      if (zone < 0.4) {
        x = 512 + (r() * 2 - 1) * 120 * Math.sqrt(r())
        y = 640 + (r() * 2 - 1) * 55 * Math.sqrt(r())
      } else {
        const sd = zone < 0.7 ? 1 : -1
        x = 512 + sd * (190 + r() * 150)
        y = 625 + (r() * 2 - 1) * 55
      }
      const rad = 2 + r() * 4
      ctx.fillStyle = rgba(col, 0.28 + r() * 0.4)
      ctx.beginPath()
      ctx.ellipse(x, y, rad, rad * (0.8 + r() * 0.3), r() * 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  const marksPos: Record<string, Pt> = { cheek: [748, 718], lip: [588, 806], chin: [540, 905], brow: [850, 248], nose: [548, 652] }
  for (const mkSpot of m.marks) {
    const p = marksPos[mkSpot]
    if (!p) continue
    soft(ctx, (cc) => cc.arc(p[0], p[1], 6.5, 0, Math.PI * 2), '#2b1a16', 0.88, 2.5)
  }
  const gl = m.glitter
  if (gl.amount > 0.01) {
    const r = rng(909)
    const n = Math.round(gl.amount * 320)
    for (let i = 0; i < n; i++) {
      const sd = r() < 0.5 ? 1 : -1
      const zone = r()
      let x: number
      let y: number
      if (zone < 0.45) {
        x = 512 + sd * (190 + r() * 130)
        y = 590 + r() * 120
      } else if (zone < 0.8) {
        x = 512 + sd * (140 + r() * 230)
        y = 360 + r() * 110
      } else {
        x = 512 + sd * (r() * 90)
        y = 560 + r() * 120
      }
      const sz = 2.5 + r() * 5
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(r() * 3)
      ctx.fillStyle = rgba(r() < 0.35 ? '#ffffff' : gl.color, 0.55 + r() * 0.4)
      ctx.fillRect(-sz / 2, -sz / 2, sz, sz)
      ctx.restore()
      env.fx.fillStyle = chan(255, 80, 0, 1)
      env.fx.globalCompositeOperation = 'lighter'
      env.fx.fillRect(x - sz, y - sz, sz * 2, sz * 2)
      env.fx.globalCompositeOperation = 'source-over'
    }
  }
}

function gemPath(c: CanvasRenderingContext2D, kind: string, x: number, y: number, s: number, col: string) {
  c.save()
  c.translate(x, y)
  if (kind === 'pearl') {
    const g = c.createRadialGradient(-s * 0.3, -s * 0.35, s * 0.1, 0, 0, s)
    g.addColorStop(0, '#ffffff')
    g.addColorStop(0.35, col)
    g.addColorStop(1, shade(col, 0.68))
    c.fillStyle = g
    c.beginPath()
    c.arc(0, 0, s, 0, Math.PI * 2)
    c.fill()
  } else if (kind === 'star') {
    c.fillStyle = col
    c.beginPath()
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2
      const r = i % 2 ? s * 0.45 : s
      c.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    c.closePath()
    c.fill()
    c.strokeStyle = 'rgba(255,255,255,0.7)'
    c.lineWidth = 1.2
    c.stroke()
  } else if (kind === 'heart') {
    c.fillStyle = col
    c.beginPath()
    c.moveTo(0, s * 0.85)
    c.bezierCurveTo(-s * 1.3, s * 0.1, -s * 0.9, -s * 0.9, 0, -s * 0.35)
    c.bezierCurveTo(s * 0.9, -s * 0.9, s * 1.3, s * 0.1, 0, s * 0.85)
    c.fill()
    c.fillStyle = 'rgba(255,255,255,0.45)'
    c.beginPath()
    c.ellipse(-s * 0.4, -s * 0.2, s * 0.22, s * 0.14, -0.6, 0, Math.PI * 2)
    c.fill()
  } else {
    // cristal: losango facetado
    c.fillStyle = col
    c.beginPath()
    c.moveTo(0, -s * 1.1)
    c.lineTo(s * 0.8, 0)
    c.lineTo(0, s * 1.1)
    c.lineTo(-s * 0.8, 0)
    c.closePath()
    c.fill()
    c.fillStyle = 'rgba(255,255,255,0.5)'
    c.beginPath()
    c.moveTo(0, -s * 1.1)
    c.lineTo(s * 0.8, 0)
    c.lineTo(0, 0)
    c.closePath()
    c.fill()
    c.strokeStyle = 'rgba(255,255,255,0.75)'
    c.lineWidth = 1
    c.beginPath()
    c.moveTo(-s * 0.8, 0)
    c.lineTo(s * 0.8, 0)
    c.stroke()
  }
  c.restore()
}

function layerGems(ctx: CanvasRenderingContext2D, env: Env) {
  const g = env.m.gems
  if (g.style === 'none') return
  const pts: Array<[number, number, number]> = []
  const L = sample(LOWER, 9)
  if (g.style === 'cheek') pts.push([180, 640, 17], [222, 692, 11], [158, 702, 8])
  if (g.style === 'liner') L.slice(1, 8).forEach((p, i) => pts.push([p[0], p[1] + 30 + (i % 2) * 4, 8 - Math.abs(i - 3) * 0.7]))
  if (g.style === 'temple') pts.push([128, 520, 10], [120, 470, 8], [136, 565, 8])
  if (g.style === 'tear') pts.push([182, 626, 16], [214, 664, 9])
  if (g.style === 'brow') pts.push([140, 245, 8], [185, 238, 11], [235, 252, 8])
  bothSides(ctx, (c) => {
    pts.forEach(([x, y, s]) => gemPath(c, g.kind, x, y, s, g.color))
  })
  bothSides(env.fx, (c) => {
    c.save()
    c.globalCompositeOperation = 'lighter'
    pts.forEach(([x, y, s]) => {
      c.fillStyle = chan(g.kind === 'pearl' ? 0 : 255, 255, g.kind === 'pearl' ? 80 : 160, 1)
      c.beginPath()
      c.arc(x, y, s * 1.1, 0, Math.PI * 2)
      c.fill()
    })
    c.restore()
  })
}

function layerTattoo(ctx: CanvasRenderingContext2D, env: Env) {
  const t = env.m.tattoo
  if (t.style === 'none') return
  ctx.save()
  ctx.strokeStyle = rgba(t.color, 0.8)
  ctx.fillStyle = rgba(t.color, 0.8)
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const heart = (x: number, y: number, s: number) => {
    ctx.beginPath()
    ctx.moveTo(x, y + s * 0.85)
    ctx.bezierCurveTo(x - s * 1.3, y + s * 0.1, x - s * 0.9, y - s * 0.9, x, y - s * 0.35)
    ctx.bezierCurveTo(x + s * 0.9, y - s * 0.9, x + s * 1.3, y + s * 0.1, x, y + s * 0.85)
    ctx.stroke()
  }
  const star = (x: number, y: number, s: number, filled = false) => {
    ctx.beginPath()
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2
      const r = i % 2 ? s * 0.42 : s
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
    }
    ctx.closePath()
    filled ? ctx.fill() : ctx.stroke()
  }
  if (t.style === 'hearts') {
    heart(780, 700, 24)
    heart(822, 752, 13)
    heart(742, 758, 11)
  } else if (t.style === 'stars') {
    star(790, 690, 18, true)
    star(752, 740, 10, true)
    star(836, 730, 8)
    ctx.lineWidth = 1.6
    ctx.setLineDash([2, 7])
    ctx.beginPath()
    ctx.moveTo(790, 690)
    ctx.lineTo(752, 740)
    ctx.moveTo(790, 690)
    ctx.lineTo(836, 730)
    ctx.stroke()
  } else if (t.style === 'moon') {
    ctx.lineWidth = 3.4
    ctx.beginPath()
    ctx.arc(800, 700, 26, 0.7, Math.PI * 2 - 0.7)
    ctx.arc(812, 700, 21, Math.PI * 2 - 0.9, 0.9, true)
    ctx.stroke()
    star(838, 668, 7, true)
    ctx.beginPath()
    ctx.arc(742, 732, 4, 0, Math.PI * 2)
    ctx.fill()
  } else if (t.style === 'butterfly') {
    const wing = (sx: number) => {
      ctx.beginPath()
      ctx.moveTo(790, 700)
      ctx.bezierCurveTo(790 + sx * 34, 660, 790 + sx * 52, 690, 790 + sx * 20, 712)
      ctx.bezierCurveTo(790 + sx * 44, 724, 790 + sx * 32, 756, 790, 722)
      ctx.stroke()
    }
    wing(1)
    wing(-1)
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.moveTo(790, 696)
    ctx.lineTo(790, 726)
    ctx.moveTo(790, 696)
    ctx.quadraticCurveTo(784, 680, 776, 676)
    ctx.moveTo(790, 696)
    ctx.quadraticCurveTo(796, 680, 804, 676)
    ctx.stroke()
  }
  ctx.restore()
}

function layerLips(ctx: CanvasRenderingContext2D, env: Env) {
  const lp = env.m.lips
  const sh = env.masks.lips
  const tint = (col: string, scale = 1, alpha = 1) => {
    const [c, x] = mk()
    x.drawImage(sh, 0, 0)
    x.globalCompositeOperation = 'source-in'
    x.fillStyle = col
    x.fillRect(0, 0, SIZE, SIZE)
    return [c, x, scale, alpha] as const
  }
  if (lp.ombre) {
    const [c, x] = tint(lp.ombre)
    x.globalCompositeOperation = 'destination-in'
    const g = x.createRadialGradient(MOUTH[0], MOUTH[1] + 6, 6, MOUTH[0], MOUTH[1] + 6, 130)
    g.addColorStop(0, 'rgba(0,0,0,0.95)')
    g.addColorStop(0.55, 'rgba(0,0,0,0.6)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    x.fillStyle = g
    x.fillRect(0, 0, SIZE, SIZE)
    ctx.drawImage(c, 0, 0)
  }
  if (lp.liner) {
    const [c, x] = mk()
    x.translate(MOUTH[0], MOUTH[1])
    x.scale(1.075, 1.16)
    x.translate(-MOUTH[0], -MOUTH[1])
    x.drawImage(sh, 0, 0)
    x.setTransform(1, 0, 0, 1, 0, 0)
    x.globalCompositeOperation = 'destination-out'
    x.drawImage(sh, 0, 0)
    x.globalCompositeOperation = 'source-in'
    x.fillStyle = rgba(lp.liner, 0.85)
    x.fillRect(0, 0, SIZE, SIZE)
    ctx.save()
    if ('filter' in ctx) ctx.filter = 'blur(2.2px)'
    ctx.drawImage(c, 0, 0)
    ctx.restore()
  }
}

/** Camada "pele" recortada: nada sobre o olho aberto (a pintura da iris/esclera nao muda). */
function maskedLayer(env: Env, draw: (c: CanvasRenderingContext2D) => void, base: CanvasRenderingContext2D, avoidEye = true, avoidLips = false) {
  const [c, x] = mk()
  draw(x)
  x.globalCompositeOperation = 'destination-out'
  if (avoidEye) x.drawImage(env.masks.eye, 0, 0)
  if (avoidLips) x.drawImage(env.masks.lips, 0, 0)
  base.drawImage(c, 0, 0)
}

/** Compoe todas as camadas em `color` (RGBA) e `fx` (R glitter, G brilho, B metalico). */
export function composeMakeup(m: Makeup, tone: string, masks: FaceMasks, color: CanvasRenderingContext2D, fx: CanvasRenderingContext2D) {
  color.clearRect(0, 0, SIZE, SIZE)
  fx.globalCompositeOperation = 'source-over'
  fx.fillStyle = '#000'
  fx.fillRect(0, 0, SIZE, SIZE)
  const env: Env = { m, tone, masks, fx }
  maskedLayer(env, (c) => layerBase(c, env), color, true, true)
  maskedLayer(env, (c) => layerSpots(c, env), color, true, true)
  maskedLayer(env, (c) => layerShadow(c, env), color, true)
  layerLips(color, env)
  layerBrows(color, env)
  layerLiner(color, env)
  layerLashes(color, env)
  layerGems(color, env)
  layerTattoo(color, env)
}

/** Carrega `doll_face_front.png` e separa R/G/B em canvases de alfa. */
export async function loadFaceMasks(url: string): Promise<FaceMasks> {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = url
  await img.decode()
  const [, x] = mk()
  x.drawImage(img, 0, 0, SIZE, SIZE)
  const d = x.getImageData(0, 0, SIZE, SIZE).data
  const out = [0, 1, 2].map((ch) => {
    const [cc, cx] = mk()
    const id = cx.createImageData(SIZE, SIZE)
    for (let i = 0; i < SIZE * SIZE; i++) {
      id.data[i * 4 + 3] = d[i * 4 + ch]
    }
    cx.putImageData(id, 0, 0)
    return cc
  })
  return { lips: out[0], sil: out[1], eye: out[2] }
}
