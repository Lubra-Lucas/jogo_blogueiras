import { CanvasTexture, RepeatWrapping, SRGBColorSpace, TextureLoader, type Texture } from 'three'
import type { FloorStyle } from './types'

const SIZE = 512

function mk(draw: (g: CanvasRenderingContext2D, n: number) => void): Texture {
  const c = document.createElement('canvas')
  c.width = c.height = SIZE
  const g = c.getContext('2d')!
  draw(g, SIZE)
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  return t
}

function rand(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) * k))
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) * k))
  const b = Math.max(0, Math.min(255, (n & 255) * k))
  return `rgb(${r | 0},${g | 0},${b | 0})`
}

const cache = new Map<string, { map: Texture; emissive?: Texture }>()

/** Textura repetivel do piso (uma repeticao = `tile` metros). */
export function floorTextures(f: FloorStyle): { map: Texture; emissive?: Texture } {
  const key = `${f.kind}|${f.a}|${f.b}`
  const hit = cache.get(key)
  if (hit) return hit
  let out: { map: Texture; emissive?: Texture }
  switch (f.kind) {
    case 'checker':
      out = {
        map: mk((g, n) => {
          const h = n / 2
          g.fillStyle = f.a
          g.fillRect(0, 0, n, n)
          g.fillStyle = f.b
          g.fillRect(0, 0, h, h)
          g.fillRect(h, h, h, h)
          g.strokeStyle = 'rgba(0,0,0,0.08)'
          g.lineWidth = 2
          g.strokeRect(0, 0, h, h)
          g.strokeRect(h, h, h, h)
          g.strokeRect(h, 0, h, h)
          g.strokeRect(0, h, h, h)
        }),
      }
      break
    case 'wood':
      out = {
        map: mk((g, n) => {
          const r = rand(7)
          const planks = 5
          const pw = n / planks
          for (let i = 0; i < planks; i++) {
            const len = n / 2
            for (let j = 0; j < 2; j++) {
              const off = (i % 2) * (len / 2) + j * len
              const k = 0.86 + r() * 0.26
              g.fillStyle = shade(r() > 0.5 ? f.a : f.b, k)
              g.fillRect(i * pw, off - (i % 2 ? len / 2 : 0), pw, len)
              g.fillStyle = 'rgba(0,0,0,0.07)'
              g.fillRect(i * pw, off - (i % 2 ? len / 2 : 0), pw, 2)
              for (let s = 0; s < 6; s++) {
                g.fillStyle = `rgba(60,30,10,${0.03 + r() * 0.04})`
                g.fillRect(i * pw + r() * pw, off - (i % 2 ? len / 2 : 0), 1 + r() * 2, len)
              }
            }
            g.fillStyle = 'rgba(0,0,0,0.18)'
            g.fillRect(i * pw, 0, 2, n)
          }
        }),
      }
      break
    case 'marble':
      out = {
        map: mk((g, n) => {
          g.fillStyle = f.a
          g.fillRect(0, 0, n, n)
          const r = rand(11)
          for (let i = 0; i < 38; i++) {
            let x = r() * n
            let y = r() * n
            g.beginPath()
            g.moveTo(x, y)
            const a = r() * Math.PI * 2
            for (let s = 0; s < 14; s++) {
              x += Math.cos(a + (r() - 0.5) * 1.4) * 22
              y += Math.sin(a + (r() - 0.5) * 1.4) * 22
              g.lineTo(((x % n) + n) % n, ((y % n) + n) % n)
            }
            g.strokeStyle = f.b
            g.globalAlpha = 0.12 + r() * 0.25
            g.lineWidth = 0.6 + r() * 1.6
            g.stroke()
          }
          g.globalAlpha = 1
          g.strokeStyle = 'rgba(0,0,0,0.18)'
          g.lineWidth = 3
          g.strokeRect(0, 0, n, n)
        }),
      }
      break
    case 'lacquer':
      out = {
        map: mk((g, n) => {
          const gr = g.createLinearGradient(0, 0, n, n)
          gr.addColorStop(0, f.a)
          gr.addColorStop(1, f.b)
          g.fillStyle = gr
          g.fillRect(0, 0, n, n)
          g.strokeStyle = 'rgba(255,255,255,0.05)'
          g.lineWidth = 2
          g.strokeRect(0, 0, n, n)
        }),
      }
      break
    case 'concrete':
      out = {
        map: mk((g, n) => {
          g.fillStyle = f.a
          g.fillRect(0, 0, n, n)
          const r = rand(5)
          for (let i = 0; i < 2600; i++) {
            g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'
            g.fillRect(r() * n, r() * n, 1 + r() * 3, 1 + r() * 3)
          }
          g.strokeStyle = f.b
          g.lineWidth = 3
          g.strokeRect(0, 0, n, n)
        }),
      }
      break
    case 'dance': {
      const lines = (col: string, bg: string | null) =>
        mk((g, n) => {
          if (bg) {
            g.fillStyle = bg
            g.fillRect(0, 0, n, n)
          } else {
            g.fillStyle = '#000'
            g.fillRect(0, 0, n, n)
          }
          g.fillStyle = col
          g.fillRect(0, 0, n, 6)
          g.fillRect(0, 0, 6, n)
          g.fillRect(n / 2, 0, 3, n)
          g.fillRect(0, n / 2, n, 3)
        })
      out = { map: lines(f.b, f.a), emissive: lines(f.b, null) }
      break
    }
    default:
      out = { map: mk((g, n) => { g.fillStyle = f.a; g.fillRect(0, 0, n, n) }) }
  }
  cache.set(key, out)
  return out
}

let carpet: Texture | null = null
export function casinoCarpet(): Texture {
  if (!carpet) {
    carpet = new TextureLoader().load(`${import.meta.env.BASE_URL}assets/casino/carpet.png`)
    carpet.wrapS = carpet.wrapT = RepeatWrapping
    carpet.colorSpace = SRGBColorSpace
    carpet.anisotropy = 8
  }
  return carpet
}
