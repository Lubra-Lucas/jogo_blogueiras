import type { MapApi } from '../../travel/worlds'
import { MIAMI, MIAMI_POIS, MIAMI_ROADS, PIER, SAND_X, SEA, pierHeadX } from './layout'

/** Desenho 2D de Miami Beach (minimapa e mapa grande), norte para cima: mar a direita (leste). */
const X0 = -260
const X1 = 260
const Z0 = -230
const Z1 = 230
const S = 2.2 // px por metro do mapa-base

let cached: HTMLCanvasElement | null = null
const bx = (x: number) => (x - X0) * S
const bz = (z: number) => (z - Z0) * S

const PAL: Record<string, string> = {
  mint: '#a8dcc6', peach: '#f6c6a2', cream: '#f5ead0', sky: '#a8d0ea', lemon: '#f4e29a', white: '#fbf7ee', aqua: '#8fd6d2',
}

function base(): HTMLCanvasElement {
  if (cached) return cached
  const c = document.createElement('canvas')
  c.width = Math.round((X1 - X0) * S)
  c.height = Math.round((Z1 - Z0) * S)
  const g = c.getContext('2d')!
  g.save()
  g.scale(S, S)
  g.translate(-X0, -Z0)
  g.lineJoin = 'round'
  // terra (calcada) e mar
  g.fillStyle = '#f0e8d4'
  g.fillRect(X0, Z0, X1 - X0, Z1 - Z0)
  g.fillStyle = '#6cd0d8'
  g.fillRect(SEA.shoreX + 3.5, Z0, X1 - SEA.shoreX, Z1 - Z0)
  const sh = g.createLinearGradient(SEA.shoreX, 0, SEA.shoreX + 40, 0)
  sh.addColorStop(0, '#d8f2ea')
  sh.addColorStop(0.15, '#8be0dc')
  sh.addColorStop(1, '#3aa8cf')
  g.fillStyle = sh
  g.fillRect(SEA.shoreX + 3.5, Z0, 200, Z1 - Z0)
  // areia e gramado
  g.fillStyle = '#f2dfb4'
  g.fillRect(SAND_X, Z0, SEA.shoreX + 3.5 - SAND_X, Z1 - Z0)
  g.fillStyle = '#a5dd8e'
  g.fillRect(17, Z0, SAND_X - 17, Z1 - Z0)
  // vias
  const stroke = (pts: readonly (readonly [number, number])[], w: number, col: string) => {
    g.strokeStyle = col
    g.lineWidth = w
    g.lineCap = 'butt'
    g.beginPath()
    pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])))
    g.stroke()
  }
  for (const r of MIAMI_ROADS) {
    if (r.kind === 'path') stroke(r.points, r.width, r.id === 'ciclovia' ? '#e59a82' : r.id === 'pier' ? '#c99a6a' : r.id === 'calcadao' ? '#f7e0cc' : '#fbf1de')
    else stroke(r.points, r.width, '#fffaf0')
  }
  for (const r of MIAMI_ROADS) if (r.kind !== 'path') stroke(r.points, r.width - (r.kind === 'avenue' ? 4 : 3), '#8a8d98')
  // predios
  for (const b of MIAMI.buildings) {
    g.save()
    g.translate(b.x, b.z)
    g.rotate(-b.rot)
    g.fillStyle = PAL[b.pal] ?? '#e8dcc0'
    g.strokeStyle = 'rgba(40,70,80,0.5)'
    g.lineWidth = 0.5
    g.fillRect(-b.w / 2, -b.d / 2, b.w, b.d)
    g.strokeRect(-b.w / 2, -b.d / 2, b.w, b.d)
    g.restore()
  }
  // torres de salva-vidas
  for (const [x, z] of MIAMI.towers) {
    g.fillStyle = '#f08a73'
    g.fillRect(x - 1.4, z - 1.4, 2.8, 2.8)
  }
  // pier
  g.fillStyle = '#b88a5c'
  g.fillRect(PIER.x0, PIER.z - 2.4, pierHeadX - PIER.x0 + 4, 4.8)
  g.restore()
  cached = c
  return c
}

function dot(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, letter: string) {
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fillStyle = color
  g.fill()
  g.lineWidth = Math.max(1, r * 0.22)
  g.strokeStyle = '#fff'
  g.stroke()
  g.fillStyle = '#26404a'
  g.font = `700 ${Math.round(r * 1.25)}px system-ui, sans-serif`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(letter, x, y + r * 0.06)
}

function arrow(g: CanvasRenderingContext2D, x: number, y: number, yaw: number, s: number) {
  g.save()
  g.translate(x, y)
  g.rotate(Math.PI - yaw)
  g.beginPath()
  g.moveTo(0, -s * 1.25)
  g.lineTo(s * 0.85, s * 0.9)
  g.lineTo(0, s * 0.4)
  g.lineTo(-s * 0.85, s * 0.9)
  g.closePath()
  g.fillStyle = '#ff3d8b'
  g.fill()
  g.lineWidth = Math.max(1.5, s * 0.22)
  g.strokeStyle = '#fff'
  g.stroke()
  g.restore()
}

export const MIAMI_MAP: MapApi = {
  mini(g, px, size, ox, oz, yaw, radiusM) {
    const b = base()
    g.clearRect(0, 0, px, px)
    g.save()
    g.beginPath()
    g.arc(px / 2, px / 2, px / 2 - 2, 0, Math.PI * 2)
    g.clip()
    g.fillStyle = '#6cd0d8'
    g.fillRect(0, 0, px, px)
    const sw = radiusM * 2 * S
    g.drawImage(b, bx(ox) - sw / 2, bz(oz) - sw / 2, sw, sw, 0, 0, px, px)
    const k = px / (radiusM * 2)
    for (const p of MIAMI_POIS) {
      const x = (p.x - ox) * k + px / 2
      const y = (p.z - oz) * k + px / 2
      if (Math.hypot(x - px / 2, y - px / 2) > px / 2 + 4) continue
      dot(g, x, y, Math.max(5, px * 0.045), p.color, p.icon)
    }
    g.restore()
    arrow(g, px / 2, px / 2, yaw, Math.max(5, px * 0.05))
    g.beginPath()
    g.arc(px / 2, px / 2, px / 2 - 1.5, 0, Math.PI * 2)
    g.lineWidth = Math.max(2, size * 0.02)
    g.strokeStyle = '#d4af37'
    g.stroke()
  },
  big(g, px, ox, oz, yaw) {
    const b = base()
    g.clearRect(0, 0, px, px)
    const span = 340
    const cx = 12
    const cz = 0
    g.drawImage(b, bx(cx - span / 2), bz(cz - span / 2), span * S, span * S, 0, 0, px, px)
    const k = px / span
    const toX = (x: number) => (x - (cx - span / 2)) * k
    const toZ = (z: number) => (z - (cz - span / 2)) * k
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    const label = (t: string, x: number, z: number, size: number, color = '#1d4a58') => {
      g.font = `italic 700 ${size}px 'Playfair Display', Georgia, serif`
      g.lineWidth = size * 0.28
      g.strokeStyle = 'rgba(255,255,255,0.92)'
      g.lineJoin = 'round'
      g.strokeText(t, toX(x), toZ(z))
      g.fillStyle = color
      g.fillText(t, toX(x), toZ(z))
    }
    const fs = Math.max(11, px * 0.03)
    label('Mar de Miami Beach', 138, 20, fs * 0.9, '#0d5a78')
    label('Praia', 72, 108, fs * 0.8)
    label('Lummus Park', 34, -108, fs * 0.7)
    label('Ocean Drive', 8, -126, fs * 0.6)
    label('Collins Ave', -34, -126, fs * 0.6)
    label('Lincoln Road', -52, -9, fs * 0.6)
    label('Aeroporto', -122, -26, fs * 0.7)
    label('Píer', 124, 52, fs * 0.6, '#7a4a20')
    for (const p of MIAMI_POIS) dot(g, toX(p.x), toZ(p.z), px * 0.017, p.color, p.icon)
    arrow(g, toX(ox), toZ(oz), yaw, Math.max(7, px * 0.016))
  },
}
