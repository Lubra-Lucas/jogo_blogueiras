import { CITY, ROAD_SPEC, type Shape } from '../game/world/city/layout'

/** Desenho 2D da cidade a partir dos dados de layout (minimapa e mapa grande). Norte para cima. */

const MARGIN = 60 // m de agua alem do perimetro
export const MAP_SCALE = 2.5 // px por metro no mapa-base

const DISTRICT_COLOR: Record<string, string> = {
  centro: '#d9e8f7',
  moda: '#f2eadb',
  neon: '#4a3a78',
  jardim: '#cdeedd',
  futuro: '#c3d1e0',
}
const BUILDING_COLOR: Record<string, string> = {
  y2k: '#a9cdee',
  luxo: '#fbf6ee',
  neon: '#1b1238',
  romantico: '#f4b896',
  futuro: '#9aa8bd',
}

function shapePath(g: CanvasRenderingContext2D, s: Shape) {
  g.beginPath()
  if (s.t === 'circle') g.arc(s.cx, s.cz, s.r, 0, Math.PI * 2)
  else g.rect(s.x0, s.z0, s.x1 - s.x0, s.z1 - s.z0)
}

let cached: HTMLCanvasElement | null = null

/** Mapa-base (cidade toda + margem de agua), pintado uma vez. */
export function getBaseMap(): HTMLCanvasElement {
  if (cached) return cached
  const size = Math.round((CITY.half + MARGIN) * 2 * MAP_SCALE)
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')!
  g.fillStyle = '#8fd0f0'
  g.fillRect(0, 0, size, size)
  g.save()
  g.scale(MAP_SCALE, MAP_SCALE)
  g.translate(CITY.half + MARGIN, CITY.half + MARGIN)
  g.lineJoin = 'round'
  g.lineCap = 'butt'

  g.fillStyle = '#f1e6d6'
  g.fillRect(-CITY.half, -CITY.half, CITY.half * 2, CITY.half * 2)
  for (const d of CITY.districts) {
    g.fillStyle = DISTRICT_COLOR[d.id] ?? d.ground
    shapePath(g, d.bounds)
    g.fill()
  }
  for (const a of CITY.areas) {
    if (a.kind === 'parque') {
      g.fillStyle = '#b4ebd0'
      shapePath(g, a.bounds)
      g.fill()
    }
  }
  const strokeRoad = (pts: readonly (readonly [number, number])[], w: number, color: string) => {
    g.strokeStyle = color
    g.lineWidth = w
    g.beginPath()
    pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])))
    g.stroke()
  }
  for (const r of CITY.roads) strokeRoad(r.points, r.width, r.kind === 'path' ? '#ecd9b9' : '#fff7ee')
  for (const r of CITY.roads) {
    if (r.kind !== 'path') strokeRoad(r.points, r.width - ROAD_SPEC[r.kind].sidewalk * 2, '#9a8fb0')
  }
  for (const a of CITY.areas) {
    if (a.kind === 'praca') {
      g.fillStyle = a.id === 'praca-neon' ? '#6a4aa3' : a.color
      shapePath(g, a.bounds)
      g.fill()
      g.strokeStyle = '#e6b84f'
      g.lineWidth = 0.8
      g.stroke()
    }
  }
  const lk = CITY.lake
  g.fillStyle = '#58b8ea'
  g.beginPath()
  g.arc(lk.cx, lk.cz, lk.r, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = '#fff7ee'
  g.lineWidth = 1.6
  g.stroke()

  for (const b of CITY.blocks) {
    const style = CITY.districts.find((d) => d.id === b.district)!.style
    g.save()
    g.translate(b.x, b.z)
    g.rotate(-b.rot)
    g.fillStyle = BUILDING_COLOR[style]
    g.strokeStyle = 'rgba(60,30,70,0.45)'
    g.lineWidth = 0.5
    if (b.shape === 'cyl') {
      g.beginPath()
      g.arc(0, 0, b.w / 2, 0, Math.PI * 2)
      g.fill()
      g.stroke()
    } else {
      g.fillRect(-b.w / 2, -b.d / 2, b.w, b.d)
      g.strokeRect(-b.w / 2, -b.d / 2, b.w, b.d)
    }
    g.restore()
  }

  // Bairro Futuro: cerca tracejada
  const F = CITY.futuro
  g.strokeStyle = '#ff9d2e'
  g.lineWidth = 1.2
  g.setLineDash([5, 4])
  g.strokeRect(F.x0, F.z0, F.x1 - F.x0, F.z1 - F.z0)
  g.setLineDash([])

  // perimetro
  g.strokeStyle = '#5fae7a'
  g.lineWidth = 3
  g.strokeRect(-CITY.half, -CITY.half, CITY.half * 2, CITY.half * 2)
  g.restore()
  cached = c
  return c
}

/** Converte metros do mundo em pixels do mapa-base. */
export const worldToBase = (v: number) => (v + CITY.half + MARGIN) * MAP_SCALE

function poiDot(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, letter: string) {
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fillStyle = color
  g.fill()
  g.lineWidth = Math.max(1, r * 0.22)
  g.strokeStyle = '#fff'
  g.stroke()
  g.fillStyle = '#4a2a48'
  g.font = `700 ${Math.round(r * 1.25)}px system-ui, sans-serif`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(letter, x, y + r * 0.06)
}

function arrow(g: CanvasRenderingContext2D, x: number, y: number, yaw: number, s: number) {
  g.save()
  g.translate(x, y)
  g.rotate(Math.PI - yaw) // yaw 0 = olhando para +Z (baixo no mapa)
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

/** Minimapa redondo centrado no jogador (norte para cima). */
export function drawMini(g: CanvasRenderingContext2D, px: number, size: number, ox: number, oz: number, yaw: number, radiusM: number) {
  const base = getBaseMap()
  g.clearRect(0, 0, px, px)
  g.save()
  g.beginPath()
  g.arc(px / 2, px / 2, px / 2 - 2, 0, Math.PI * 2)
  g.clip()
  g.fillStyle = '#8fd0f0'
  g.fillRect(0, 0, px, px)
  const sw = radiusM * 2 * MAP_SCALE
  g.drawImage(base, worldToBase(ox) - sw / 2, worldToBase(oz) - sw / 2, sw, sw, 0, 0, px, px)
  const k = px / (radiusM * 2)
  for (const p of CITY.pois) {
    if (p.kind === 'spawn') continue
    const x = (p.x - ox) * k + px / 2
    const y = (p.z - oz) * k + px / 2
    if (Math.hypot(x - px / 2, y - px / 2) > px / 2 + 4) continue
    poiDot(g, x, y, Math.max(5, px * 0.045), p.color, p.icon)
  }
  g.restore()
  arrow(g, px / 2, px / 2, yaw, Math.max(5, px * 0.05))
  g.beginPath()
  g.arc(px / 2, px / 2, px / 2 - 1.5, 0, Math.PI * 2)
  g.lineWidth = Math.max(2, size * 0.02)
  g.strokeStyle = '#d4af37'
  g.stroke()
}

/** Mapa grande: cidade inteira com nomes dos bairros. */
export function drawBig(g: CanvasRenderingContext2D, px: number, ox: number, oz: number, yaw: number) {
  const base = getBaseMap()
  g.clearRect(0, 0, px, px)
  const span = (CITY.half + 12) * 2
  const sx = worldToBase(-CITY.half - 12)
  const sw = span * MAP_SCALE
  g.drawImage(base, sx, sx, sw, sw, 0, 0, px, px)
  const k = px / span
  const toX = (x: number) => (x + CITY.half + 12) * k
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  const label = (text: string, x: number, y: number, size: number, color = '#4a2a48') => {
    g.font = `italic 700 ${size}px 'Playfair Display', Georgia, serif`
    g.lineWidth = size * 0.28
    g.strokeStyle = 'rgba(255,255,255,0.92)'
    g.lineJoin = 'round'
    g.strokeText(text, x, y)
    g.fillStyle = color
    g.fillText(text, x, y)
  }
  const fs = Math.max(12, px * 0.032)
  const place: Record<string, [number, number]> = {
    centro: [0, -54],
    moda: [0, -176],
    neon: [158, -52],
    jardim: [0, 196],
    futuro: [-156, 0],
  }
  for (const d of CITY.districts) {
    const [x, z] = place[d.id] ?? d.center
    label(d.name, toX(x), toX(z), fs)
  }
  label('Parque do Lago', toX(0), toX(70), fs * 0.8)
  label('Praça das Vitrines', toX(0), toX(-72), fs * 0.62)
  label('Boulevard Noturno', toX(88), toX(-9), fs * 0.62)
  label('Em breve', toX(-156), toX(14), fs * 0.7, '#c46a00')
  for (const p of CITY.pois) poiDot(g, toX(p.x), toX(p.z), px * 0.017, p.color, p.icon)
  arrow(g, toX(ox), toX(oz), yaw, Math.max(7, px * 0.016))
}
