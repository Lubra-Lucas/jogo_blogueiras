import { NAIL_H, NAIL_W, type Polish } from './data'
import { CELL, GH, GW, insideCount, regionMask, tolMask, NAIL_PATH, type RegionId } from './geometry'

const SCALE = 2

export interface PaintOpts {
  region: RegionId
  brush: number
  maxSpeed: number
  ink: number
  tol: number
}

export interface PaintScore {
  /** 0..1 cobertura (traços falhos valem 0,55) */
  coverage: number
  /** 0..1 limpeza (1 = sem borrão) */
  clean: number
  /** área suja relativa */
  smudge: number
}

/**
 * Camada de tinta de uma unha: um canvas (para ver) e uma grade de células (para pontuar).
 * Células: 0 vazia, 1 traço falho, 2 tinta cheia.
 */
export class PaintLayer {
  readonly canvas: HTMLCanvasElement
  readonly fx: HTMLCanvasElement
  readonly grid = new Uint8Array(GW * GH)
  ink = 1
  private ctx: CanvasRenderingContext2D
  private fxCtx: CanvasRenderingContext2D
  private last: { x: number; y: number; t: number } | null = null
  private speed = 0
  private fill: string | CanvasGradient = '#000'
  private polish: Polish | null = null
  private sparkSeed = 7
  private total: number
  dirty = true
  /** última velocidade normalizada (0..1+) para o cursor */
  heat = 0

  constructor(readonly opts: PaintOpts) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = NAIL_W * SCALE
    this.canvas.height = NAIL_H * SCALE
    this.fx = document.createElement('canvas')
    this.fx.width = this.canvas.width
    this.fx.height = this.canvas.height
    this.ctx = this.canvas.getContext('2d')!
    this.fxCtx = this.fx.getContext('2d')!
    this.ctx.scale(SCALE, SCALE)
    this.total = insideCount(opts.region)
  }

  setPolish(p: Polish | null, colorOverride?: string) {
    this.polish = p
    const c = this.ctx
    if (colorOverride) {
      this.fill = colorOverride
      return
    }
    if (!p) return
    if (p.kind === 'solid') this.fill = p.c1
    else if (p.kind === 'ombre') {
      const g = c.createLinearGradient(0, 290, 0, 40)
      g.addColorStop(0, p.c1)
      g.addColorStop(0.2, p.c1)
      g.addColorStop(1, p.c2 ?? p.c1)
      this.fill = g
    } else if (p.kind === 'chrome') {
      const g = c.createLinearGradient(40, 30, 200, 290)
      const a = p.c1
      const b = p.c2 ?? p.c1
      g.addColorStop(0, a)
      g.addColorStop(0.28, b)
      g.addColorStop(0.45, '#ffffff')
      g.addColorStop(0.62, a)
      g.addColorStop(0.85, b)
      g.addColorStop(1, a)
      this.fill = g
    } else this.fill = p.c1
  }

  private mark(x: number, y: number, r: number, thin: boolean, x1?: number, y1?: number) {
    const ex = x1 ?? x
    const ey = y1 ?? y
    const minX = Math.max(0, Math.floor((Math.min(x, ex) - r) / CELL))
    const maxX = Math.min(GW - 1, Math.floor((Math.max(x, ex) + r) / CELL))
    const minY = Math.max(0, Math.floor((Math.min(y, ey) - r) / CELL))
    const maxY = Math.min(GH - 1, Math.floor((Math.max(y, ey) + r) / CELL))
    const dx = ex - x
    const dy = ey - y
    const len2 = dx * dx + dy * dy
    const len = Math.sqrt(len2) || 1
    for (let j = minY; j <= maxY; j++)
      for (let i = minX; i <= maxX; i++) {
        const cx = i * CELL + CELL / 2
        const cy = j * CELL + CELL / 2
        const t = len2 > 0 ? Math.max(0, Math.min(1, ((cx - x) * dx + (cy - y) * dy) / len2)) : 0
        const px = x + dx * t
        const py = y + dy * t
        const d = Math.hypot(cx - px, cy - py)
        if (d > r) continue
        const idx = j * GW + i
        if (thin) {
          // listras: cruza o traço em 3 faixas finas
          const o = ((cx - px) * -dy + (cy - py) * dx) / len
          const stripe = Math.min(Math.abs(o + r * 0.62), Math.abs(o), Math.abs(o - r * 0.62))
          if (stripe > r * 0.2 + CELL * 0.35) continue
          if (this.grid[idx] < 1) this.grid[idx] = 1
        } else this.grid[idx] = 2
      }
  }

  private strokeSeg(x0: number, y0: number, x1: number, y1: number, thin: boolean) {
    const c = this.ctx
    const r = this.opts.brush
    c.lineCap = 'round'
    c.lineJoin = 'round'
    c.strokeStyle = this.fill
    c.fillStyle = this.fill
    if (!thin) {
      c.lineWidth = r * 2
      c.beginPath()
      c.moveTo(x0, y0)
      c.lineTo(x1, y1)
      c.stroke()
    } else {
      const len = Math.hypot(x1 - x0, y1 - y0) || 1
      const nx = -(y1 - y0) / len
      const ny = (x1 - x0) / len
      c.lineWidth = r * 0.44
      for (const k of [-0.62, 0, 0.62]) {
        c.beginPath()
        c.moveTo(x0 + nx * r * k, y0 + ny * r * k)
        c.lineTo(x1 + nx * r * k, y1 + ny * r * k)
        c.stroke()
      }
    }
    this.dirty = true
  }

  begin(x: number, y: number, now: number) {
    this.last = { x, y, t: now }
    this.speed = 0
    if (this.ink > 0.02) {
      this.ctx.fillStyle = this.fill
      this.ctx.beginPath()
      this.ctx.arc(x, y, this.opts.brush, 0, Math.PI * 2)
      this.ctx.fill()
      this.mark(x, y, this.opts.brush, false)
      this.dirty = true
    }
  }

  /** Move o pincel. Retorna true se desenhou. */
  move(x: number, y: number, now: number): boolean {
    const l = this.last
    if (!l) {
      this.begin(x, y, now)
      return true
    }
    const dist = Math.hypot(x - l.x, y - l.y)
    if (dist < 0.4) return false
    const dt = Math.max(1, now - l.t)
    this.speed = this.speed * 0.6 + (dist / dt) * 0.4
    this.heat = this.speed / this.opts.maxSpeed
    const drained = dist / this.opts.ink
    const empty = this.ink <= 0.02
    const thin = this.speed > this.opts.maxSpeed || this.ink < 0.18
    if (!empty) {
      this.strokeSeg(l.x, l.y, x, y, thin)
      this.mark(l.x, l.y, this.opts.brush, thin, x, y)
      this.ink = Math.max(0, this.ink - drained)
    }
    this.last = { x, y, t: now }
    return !empty
  }

  end() {
    this.last = null
    this.speed = 0
    this.heat = 0
  }

  dip() {
    this.ink = 1
  }

  score(): PaintScore {
    const m = regionMask(this.opts.region)
    const tm = tolMask(this.opts.region, this.opts.tol)
    let cov = 0
    let out = 0
    for (let i = 0; i < this.grid.length; i++) {
      const g = this.grid[i]
      if (!g) continue
      if (m[i]) cov += g === 2 ? 1 : 0.55
      else if (!tm[i]) out += 1
    }
    const coverage = Math.min(1, cov / this.total)
    const smudge = out / this.total
    return { coverage, smudge, clean: Math.max(0, 1 - smudge * 3.2) }
  }

  /** Remove tudo que está fora da unha/região (botão de limpeza do modo Fácil). */
  cleanup() {
    const c = this.ctx
    c.save()
    c.globalCompositeOperation = 'destination-in'
    c.fillStyle = '#000'
    if (this.opts.region === 'nail') c.fill(new Path2D(NAIL_PATH))
    else {
      c.beginPath()
      c.rect(0, 0, NAIL_W, 0)
      c.clip()
    }
    c.restore()
    if (this.opts.region === 'tip') {
      // região da francesinha: reaproveita a máscara de células
      c.save()
      c.globalCompositeOperation = 'destination-out'
      const m = regionMask('tip')
      for (let j = 0; j < GH; j++)
        for (let i = 0; i < GW; i++) if (!m[j * GW + i]) c.fillRect(i * CELL, j * CELL, CELL, CELL)
      c.restore()
    }
    const m = regionMask(this.opts.region)
    for (let i = 0; i < this.grid.length; i++) if (!m[i]) this.grid[i] = 0
    this.dirty = true
  }

  /** Redesenha o canvas de efeito (glitter, olho de gato...) e retorna o canvas final. */
  render(): HTMLCanvasElement {
    if (!this.dirty) return this.fx
    this.dirty = false
    const f = this.fxCtx
    f.setTransform(1, 0, 0, 1, 0, 0)
    f.clearRect(0, 0, this.fx.width, this.fx.height)
    f.drawImage(this.canvas, 0, 0)
    const p = this.polish
    if (p && (p.kind === 'glitter' || p.kind === 'cateye')) {
      f.save()
      f.scale(SCALE, SCALE)
      f.globalCompositeOperation = 'source-atop'
      if (p.kind === 'glitter') {
        let s = this.sparkSeed
        const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
        for (let i = 0; i < 420; i++) {
          const x = rnd() * NAIL_W
          const y = rnd() * NAIL_H
          const sz = 0.7 + rnd() * 1.7
          f.fillStyle = rnd() > 0.35 ? p.c2! : '#ffffff'
          f.globalAlpha = 0.55 + rnd() * 0.45
          f.fillRect(x, y, sz, sz)
        }
      } else {
        const g = f.createLinearGradient(60, 270, 190, 60)
        g.addColorStop(0, 'rgba(0,0,0,0)')
        g.addColorStop(0.38, p.c2 + '00')
        g.addColorStop(0.5, p.c2!)
        g.addColorStop(0.62, p.c2 + '00')
        g.addColorStop(1, 'rgba(0,0,0,0)')
        f.fillStyle = g
        f.fillRect(0, 0, NAIL_W, NAIL_H)
      }
      f.restore()
    }
    return this.fx
  }
}
