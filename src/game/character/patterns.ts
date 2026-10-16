import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three'

/**
 * Estampas de roupa geradas por canvas (sem arquivos): a cor base da peca vira o fundo e a cor do detalhe
 * (slot "trim", ou um contraste automatico) vira o motivo. Texturas em cache por (estampa, cores).
 * Pecas podem declarar `patterns` no manifesto com ids destas estampas (ou texturas proprias).
 */
export const PATTERN_IDS = ['stripes', 'dots', 'plaid', 'gingham', 'floral', 'houndstooth', 'leopard', 'hearts', 'stars', 'checker'] as const

const N = 512
const cache = new Map<string, CanvasTexture>()

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

function lum(hex: string): number {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16)
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
}
/** Cor de motivo com contraste minimo contra o fundo. */
export function motifColor(base: string, motif: string | undefined): string {
  if (motif && Math.abs(lum(motif) - lum(base)) > 0.18) return motif
  return lum(base) > 0.55 ? '#2a2230' : '#fff6ee'
}

function heart(c: CanvasRenderingContext2D, x: number, y: number, s: number) {
  c.beginPath()
  c.moveTo(x, y + s * 0.85)
  c.bezierCurveTo(x - s * 1.3, y + s * 0.1, x - s * 0.9, y - s * 0.9, x, y - s * 0.35)
  c.bezierCurveTo(x + s * 0.9, y - s * 0.9, x + s * 1.3, y + s * 0.1, x, y + s * 0.85)
  c.fill()
}
function star(c: CanvasRenderingContext2D, x: number, y: number, s: number) {
  c.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2
    const r = i % 2 ? s * 0.45 : s
    c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
  }
  c.closePath()
  c.fill()
}

function draw(id: string, c: CanvasRenderingContext2D, base: string, motif: string) {
  c.fillStyle = base
  c.fillRect(0, 0, N, N)
  c.fillStyle = motif
  c.strokeStyle = motif
  switch (id) {
    case 'stripes':
      for (let i = 0; i < 4; i++) c.fillRect(0, i * 128 + 32, N, 64)
      break
    case 'dots':
      for (let y = 0; y < 4; y++)
        for (let x = 0; x < 4; x++) {
          c.beginPath()
          c.arc(x * 128 + 64 + (y % 2) * 64, y * 128 + 64, 26, 0, Math.PI * 2)
          c.fill()
        }
      break
    case 'gingham':
      c.globalAlpha = 0.5
      for (let i = 0; i < 8; i++) {
        c.fillRect(i * 64 + 16, 0, 32, N)
        c.fillRect(0, i * 64 + 16, N, 32)
      }
      c.globalAlpha = 1
      break
    case 'plaid':
      c.globalAlpha = 0.55
      c.fillRect(64, 0, 96, N)
      c.fillRect(0, 64, N, 96)
      c.fillRect(320, 0, 32, N)
      c.fillRect(0, 320, N, 32)
      c.globalAlpha = 1
      c.fillRect(224, 0, 6, N)
      c.fillRect(0, 224, N, 6)
      c.fillRect(448, 0, 6, N)
      c.fillRect(0, 448, N, 6)
      break
    case 'checker':
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2) c.fillRect(x * 64, y * 64, 64, 64)
      break
    case 'houndstooth': {
      const s = 32
      for (let y = 0; y < N / s; y++)
        for (let x = 0; x < N / s; x++) {
          if ((x + y) % 2 === 0) continue
          const X = x * s
          const Y = y * s
          c.beginPath()
          c.moveTo(X, Y)
          c.lineTo(X + s, Y)
          c.lineTo(X + s * 0.5, Y + s * 0.5)
          c.lineTo(X + s, Y + s)
          c.lineTo(X, Y + s)
          c.lineTo(X + s * 0.5, Y + s * 0.5)
          c.closePath()
          c.fill()
        }
      break
    }
    case 'floral': {
      const r = rng(11)
      for (let k = 0; k < 14; k++) {
        const x = (k % 4) * 128 + 64 + (Math.floor(k / 4) % 2) * 64 + (r() - 0.5) * 20
        const y = Math.floor(k / 4) * 128 + 64 + (r() - 0.5) * 20
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 2 + k
          c.beginPath()
          c.ellipse(x + Math.cos(a) * 17, y + Math.sin(a) * 17, 13, 9, a, 0, Math.PI * 2)
          c.fill()
        }
        c.fillStyle = base
        c.beginPath()
        c.arc(x, y, 6, 0, Math.PI * 2)
        c.fill()
        c.fillStyle = motif
      }
      break
    }
    case 'leopard': {
      const r = rng(5)
      for (let k = 0; k < 46; k++) {
        const x = r() * N
        const y = r() * N
        const rad = 14 + r() * 12
        for (const ox of [-N, 0, N])
          for (const oy of [-N, 0, N]) {
            c.lineWidth = rad * 0.42
            c.beginPath()
            c.ellipse(x + ox, y + oy, rad, rad * 0.75, r() * 3, 0.5, Math.PI * 2 - 0.4)
            c.stroke()
          }
      }
      break
    }
    case 'hearts':
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) heart(c, x * 128 + 64 + (y % 2) * 64, y * 128 + 64, 26)
      break
    case 'stars':
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) star(c, x * 128 + 64 + (y % 2) * 64, y * 128 + 64, 26)
      break
    default:
      break
  }
}

/** Textura da estampa (cacheada). `scale` = repeticoes no UV. */
export function patternTexture(id: string, base: string, motif: string, scale = 4): Texture {
  const key = `${id}|${base}|${motif}|${scale}`
  let t = cache.get(key)
  if (!t) {
    const cv = document.createElement('canvas')
    cv.width = cv.height = N
    draw(id, cv.getContext('2d')!, base, motif)
    t = new CanvasTexture(cv)
    t.colorSpace = SRGBColorSpace
    t.flipY = false
    t.wrapS = t.wrapT = RepeatWrapping
    t.repeat.set(scale, scale)
    t.anisotropy = 4
    cache.set(key, t)
    if (cache.size > 40) {
      const k = cache.keys().next().value as string
      cache.get(k)?.dispose()
      cache.delete(k)
    }
  }
  return t
}
