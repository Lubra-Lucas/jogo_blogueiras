/**
 * Cenários 2D do "Cadê a Blogueira?": fundo desenhado por código (uma vez por cena, em canvas fora da tela).
 * Paleta do mundo real: pedra, creme, terracota, azul-marinho, verdes, madeira e metais; rosa só em detalhes raros.
 */
import { rng } from '../../../game/minigames/shared/competition'
import type { Prop, Scene } from '../../../game/minigames/procura/gen'
import { shade } from './drawPeople'

type C = CanvasRenderingContext2D

function lin(c: C, x0: number, y0: number, x1: number, y1: number, stops: Array<[number, string]>): CanvasGradient {
  const g = c.createLinearGradient(x0, y0, x1, y1)
  for (const [o, col] of stops) g.addColorStop(o, col)
  return g
}
function rad(c: C, x: number, y: number, r0: number, r1: number, stops: Array<[number, string]>): CanvasGradient {
  const g = c.createRadialGradient(x, y, r0, x, y, r1)
  for (const [o, col] of stops) g.addColorStop(o, col)
  return g
}
function shadow(c: C, x: number, y: number, rx: number, ry: number, a = 0.22) {
  c.fillStyle = `rgba(30,24,20,${a})`
  c.beginPath()
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  c.fill()
}
const line = 'rgba(25,18,16,0.4)'

export function drawBackground(c: C, scene: Scene): void {
  const { W, H, horizon: hz, theme } = scene
  const r = rng(scene.seed ^ 0x77aa33)
  switch (theme) {
    case 'praca': bgPraca(c, W, H, hz, r); break
    case 'avenida': bgAvenida(c, W, H, hz, r); break
    case 'praia': bgPraia(c, W, H, hz, r); break
    case 'shopping': bgShopping(c, W, H, hz, r); break
    case 'palco': bgPalco(c, W, H, hz, r); break
  }
  const props = [...scene.props].sort((a, b) => a.y - b.y)
  for (const p of props) drawProp(c, p, scene)
}

// ---------------------------------------------------------------- fachadas
const FACADE = ['#e8dcc4', '#d3a27a', '#b9c7b4', '#e1c47a', '#c7cfd8', '#a98f7a', '#efe3d0', '#9fb3bd']
function facade(c: C, x: number, base: number, w: number, h: number, col: string, r: () => number, awning = true) {
  c.fillStyle = lin(c, x, base - h, x + w, base, [[0, shade(col, 0.12)], [1, shade(col, -0.12)]])
  c.fillRect(x, base - h, w, h)
  c.fillStyle = shade(col, -0.25)
  c.fillRect(x - 4, base - h - 8, w + 8, 10) // cornija
  c.fillStyle = 'rgba(255,255,255,0.35)'
  c.fillRect(x - 4, base - h - 8, w + 8, 2)
  const cols = Math.max(2, Math.round(w / 46))
  const rows = Math.max(2, Math.round(h / 66))
  const ww = (w - 20) / cols
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < cols; j++) {
      const wx = x + 10 + j * ww + ww * 0.18
      const wy = base - h + 22 + i * ((h - 90) / Math.max(1, rows - 1))
      const lit = r() < 0.3
      c.fillStyle = lit ? lin(c, wx, wy, wx, wy + 34, [[0, '#f8e7b4'], [1, '#e2b968']]) : lin(c, wx, wy, wx, wy + 34, [[0, '#7f9db0'], [1, '#3e5668']])
      c.fillRect(wx, wy, ww * 0.64, 34)
      c.fillStyle = 'rgba(255,255,255,0.28)'
      c.beginPath()
      c.moveTo(wx, wy)
      c.lineTo(wx + ww * 0.3, wy)
      c.lineTo(wx, wy + 18)
      c.fill()
      c.strokeStyle = shade(col, -0.4)
      c.lineWidth = 2
      c.strokeRect(wx, wy, ww * 0.64, 34)
      c.fillStyle = shade(col, -0.3)
      c.fillRect(wx - 4, wy + 34, ww * 0.64 + 8, 4)
    }
  }
  // térreo
  c.fillStyle = shade(col, -0.32)
  c.fillRect(x, base - 62, w, 62)
  if (awning) {
    const ac = ['#a62b32', '#1e2f5a', '#2a7a58', '#d19a26'][Math.floor(r() * 4)]
    const sx = x + 8
    const sw = w - 16
    const n = Math.round(sw / 16)
    for (let i = 0; i < n; i++) {
      c.fillStyle = i % 2 ? '#f1ede3' : ac
      c.beginPath()
      c.moveTo(sx + (i * sw) / n, base - 60)
      c.lineTo(sx + ((i + 1) * sw) / n, base - 60)
      c.lineTo(sx + ((i + 1) * sw) / n + 3, base - 38)
      c.lineTo(sx + (i * sw) / n + 3, base - 38)
      c.fill()
    }
    c.fillStyle = 'rgba(0,0,0,0.18)'
    c.fillRect(sx, base - 38, sw + 3, 4)
    c.fillStyle = lin(c, 0, base - 34, 0, base, [[0, '#2b3a46'], [1, '#6a8190']])
    c.fillRect(sx + 4, base - 34, sw - 8, 34)
  }
}

function skyline(c: C, W: number, hz: number, r: () => number, hMin: number, hMax: number, palette = FACADE, awning = true) {
  let x = -20
  while (x < W + 20) {
    const w = 150 + r() * 120
    const h = hMin + r() * (hMax - hMin)
    facade(c, x, hz + 4, w, h, palette[Math.floor(r() * palette.length)], r, awning)
    x += w + 2
  }
}

// ---------------------------------------------------------------- praça
function bgPraca(c: C, W: number, H: number, hz: number, r: () => number) {
  c.fillStyle = lin(c, 0, 0, 0, hz, [[0, '#a9cde0'], [1, '#f2e8d2']])
  c.fillRect(0, 0, W, hz + 10)
  // nuvens
  c.fillStyle = 'rgba(255,255,255,0.65)'
  for (let i = 0; i < 6; i++) {
    const cx = r() * W
    const cy = 30 + r() * hz * 0.35
    for (let k = 0; k < 4; k++) {
      c.beginPath()
      c.ellipse(cx + k * 34, cy + (k % 2) * 5, 48 - k * 4, 16, 0, 0, Math.PI * 2)
      c.fill()
    }
  }
  skyline(c, W, hz, r, hz * 0.5, hz * 0.88)
  // ruas de pedra
  const g = lin(c, 0, hz, 0, H, [[0, '#cfc6b4'], [0.5, '#dad2c1'], [1, '#c9c0ae']])
  c.fillStyle = g
  c.fillRect(0, hz, W, H - hz)
  cobbles(c, W, H, hz, '#8d836f')
  // bandeirolas
  const cols = ['#b3262f', '#1e2f5a', '#d19a26', '#f1ede3', '#2a7a58']
  for (let s = 0; s < 3; s++) {
    const y0 = 20 + s * (hz * 0.17)
    c.strokeStyle = 'rgba(60,45,35,0.7)'
    c.lineWidth = 1.5
    c.beginPath()
    c.moveTo(-10, y0)
    c.quadraticCurveTo(W / 2, y0 + 110, W + 10, y0 + 20)
    c.stroke()
    for (let t = 0.02; t < 1; t += 0.026) {
      const px = -10 + t * (W + 20)
      const py = (1 - t) * (1 - t) * y0 + 2 * t * (1 - t) * (y0 + 110) + t * t * (y0 + 20)
      c.fillStyle = cols[Math.floor(t * 200 + s) % cols.length]
      c.beginPath()
      c.moveTo(px - 8, py)
      c.lineTo(px + 8, py)
      c.lineTo(px, py + 20)
      c.fill()
    }
  }
}

function cobbles(c: C, W: number, H: number, hz: number, col: string) {
  c.strokeStyle = col
  c.globalAlpha = 0.22
  c.lineWidth = 1.5
  let y = hz
  let step = 7
  while (y < H) {
    c.beginPath()
    c.moveTo(0, y)
    c.lineTo(W, y)
    c.stroke()
    y += step
    step *= 1.09
  }
  const vx = W / 2
  for (let i = -26; i <= 26; i++) {
    c.beginPath()
    c.moveTo(vx + i * 8, hz)
    c.lineTo(vx + i * (W / 24), H)
    c.stroke()
  }
  c.globalAlpha = 1
}

// ---------------------------------------------------------------- avenida
function bgAvenida(c: C, W: number, H: number, hz: number, r: () => number) {
  c.fillStyle = lin(c, 0, 0, 0, hz, [[0, '#b7c8d6'], [1, '#ece6da']])
  c.fillRect(0, 0, W, hz + 10)
  // boutiques
  let x = -10
  const names = ['MAISON', 'ATELIÊ', 'COUTURE', 'VOGUE & CO', 'LINHO', 'ÉLITE', 'SEDA', 'MODA']
  const pal = ['#2c3340', '#e8e0d0', '#6e1f2e', '#d6cdbb', '#1f4a3a', '#c9b79c']
  let i = 0
  while (x < W + 10) {
    const w = 200 + r() * 80
    const h = hz * 0.62 + r() * hz * 0.18
    const col = pal[i % pal.length]
    facade(c, x, hz + 4, w, h, col, r, false)
    // vitrine grande
    c.fillStyle = lin(c, 0, hz - 70, 0, hz + 4, [[0, '#f6e6bd'], [1, '#c9a35a']])
    c.fillRect(x + 12, hz - 70, w - 24, 70)
    c.fillStyle = 'rgba(255,255,255,0.3)'
    c.beginPath()
    c.moveTo(x + 12, hz - 70)
    c.lineTo(x + 70, hz - 70)
    c.lineTo(x + 12, hz - 20)
    c.fill()
    c.fillStyle = shade(col, -0.45)
    c.fillRect(x + 12, hz - 92, w - 24, 20)
    c.fillStyle = '#e6c985'
    c.font = '700 13px "Playfair Display", serif'
    c.textAlign = 'center'
    c.fillText(names[i % names.length], x + w / 2, hz - 77)
    x += w + 3
    i++
  }
  // asfalto + calçada
  c.fillStyle = lin(c, 0, hz, 0, H, [[0, '#6c6f78'], [1, '#4d5058']])
  c.fillRect(0, hz, W, H - hz)
  c.fillStyle = lin(c, 0, hz, 0, hz + (H - hz) * 0.14, [[0, '#cfc7b6'], [1, '#bdb4a2']])
  c.fillRect(0, hz, W, (H - hz) * 0.14)
  // passarela (carpete marfim com friso azul-marinho)
  const y0 = hz + (H - hz) * 0.38
  const y1 = hz + (H - hz) * 0.84
  c.fillStyle = lin(c, 0, y0, 0, y1, [[0, '#e9e1d0'], [1, '#f5efe2']])
  c.fillRect(0, y0, W, y1 - y0)
  c.fillStyle = '#1e2f5a'
  c.fillRect(0, y0, W, 5)
  c.fillRect(0, y1 - 6, W, 6)
  c.fillStyle = '#d4b06a'
  c.fillRect(0, y0 + 5, W, 2)
  c.fillRect(0, y1 - 8, W, 2)
  c.setLineDash([26, 22])
  c.strokeStyle = 'rgba(30,47,90,0.22)'
  c.lineWidth = 3
  c.beginPath()
  c.moveTo(0, (y0 + y1) / 2)
  c.lineTo(W, (y0 + y1) / 2)
  c.stroke()
  c.setLineDash([])
  // feixes dos refletores
  for (let k = 0; k < Math.round(W / 420); k++) {
    const sx = ((k + 0.5) / Math.round(W / 420)) * W
    c.fillStyle = lin(c, 0, 0, 0, y1, [[0, 'rgba(255,248,225,0.0)'], [1, 'rgba(255,248,225,0.2)']])
    c.beginPath()
    c.moveTo(sx - 6, 0)
    c.lineTo(sx + 6, 0)
    c.lineTo(sx + 130, y1)
    c.lineTo(sx - 130, y1)
    c.fill()
  }
  // faixas laterais
  c.strokeStyle = 'rgba(255,255,255,0.35)'
  c.lineWidth = 2
  c.beginPath()
  c.moveTo(0, hz + (H - hz) * 0.14)
  c.lineTo(W, hz + (H - hz) * 0.14)
  c.stroke()
}

// ---------------------------------------------------------------- praia
function bgPraia(c: C, W: number, H: number, hz: number, r: () => number) {
  c.fillStyle = lin(c, 0, 0, 0, hz, [[0, '#5aa9de'], [1, '#d6eef3']])
  c.fillRect(0, 0, W, hz + 4)
  c.fillStyle = rad(c, W * 0.8, hz * 0.3, 4, 120, [[0, 'rgba(255,252,230,1)'], [0.25, 'rgba(255,244,200,0.8)'], [1, 'rgba(255,244,200,0)']])
  c.fillRect(0, 0, W, hz)
  c.fillStyle = 'rgba(255,255,255,0.8)'
  for (let i = 0; i < 7; i++) {
    const cx = r() * W
    const cy = 24 + r() * hz * 0.5
    for (let k = 0; k < 5; k++) {
      c.beginPath()
      c.ellipse(cx + k * 30, cy + (k % 2) * 6, 42 - k * 3, 13, 0, 0, Math.PI * 2)
      c.fill()
    }
  }
  // mar
  const seaB = hz + (H - hz) * 0.12
  c.fillStyle = lin(c, 0, hz, 0, seaB, [[0, '#1d7f9c'], [0.6, '#2aa6b6'], [1, '#6fd0cf']])
  c.fillRect(0, hz, W, seaB - hz)
  c.strokeStyle = 'rgba(255,255,255,0.45)'
  c.lineWidth = 2
  for (let k = 0; k < 5; k++) {
    const yy = hz + 6 + k * ((seaB - hz) / 5.5)
    c.beginPath()
    for (let x = 0; x <= W; x += 14) c.lineTo(x, yy + Math.sin(x * 0.045 + k * 2) * 2.5)
    c.stroke()
  }
  // espuma e areia molhada
  c.fillStyle = 'rgba(255,255,255,0.8)'
  c.beginPath()
  c.moveTo(0, seaB)
  for (let x = 0; x <= W; x += 20) c.lineTo(x, seaB + 6 + Math.sin(x * 0.03) * 5)
  c.lineTo(W, seaB - 4)
  c.lineTo(0, seaB - 4)
  c.fill()
  c.fillStyle = lin(c, 0, seaB, 0, H, [[0, '#cdb88a'], [0.12, '#e6d3a8'], [1, '#ecdcb8']])
  c.beginPath()
  c.moveTo(0, seaB + 8)
  for (let x = 0; x <= W; x += 20) c.lineTo(x, seaB + 8 + Math.sin(x * 0.03) * 5)
  c.lineTo(W, H)
  c.lineTo(0, H)
  c.fill()
  // grãos
  c.fillStyle = 'rgba(150,120,70,0.13)'
  for (let i = 0; i < W / 3; i++) {
    c.fillRect(r() * W, seaB + 20 + r() * (H - seaB - 20), 2, 1.4)
  }
}

// ---------------------------------------------------------------- shopping
function bgShopping(c: C, W: number, H: number, hz: number, r: () => number) {
  c.fillStyle = lin(c, 0, 0, 0, hz, [[0, '#d9d2c4'], [1, '#efe9dd']])
  c.fillRect(0, 0, W, hz + 4)
  // claraboias
  for (let k = 0; k < Math.round(W / 330); k++) {
    const sx = ((k + 0.5) / Math.round(W / 330)) * W
    c.fillStyle = lin(c, 0, 0, 0, 70, [[0, '#fffdf3'], [1, '#e9f2f6']])
    c.beginPath()
    c.moveTo(sx - 90, 0)
    c.lineTo(sx + 90, 0)
    c.lineTo(sx + 66, 64)
    c.lineTo(sx - 66, 64)
    c.fill()
    c.strokeStyle = '#8a8478'
    c.lineWidth = 3
    for (let b = -2; b <= 2; b++) {
      c.beginPath()
      c.moveTo(sx + b * 36, 0)
      c.lineTo(sx + b * 26, 64)
      c.stroke()
    }
  }
  // parede de fundo
  c.fillStyle = lin(c, 0, 70, 0, hz, [[0, '#cfc7b6'], [1, '#e2dccf']])
  c.fillRect(0, 70, W, hz - 70)
  // piso polido
  c.fillStyle = lin(c, 0, hz, 0, H, [[0, '#d4d0c8'], [0.35, '#eceae4'], [1, '#d9d6cf']])
  c.fillRect(0, hz, W, H - hz)
  cobbles(c, W, H, hz, '#8d897f')
  // reflexos de luz no piso
  for (let k = 0; k < Math.round(W / 330); k++) {
    const sx = ((k + 0.5) / Math.round(W / 330)) * W
    c.fillStyle = rad(c, sx, hz + (H - hz) * 0.4, 10, 260, [[0, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']])
    c.fillRect(sx - 260, hz, 520, H - hz)
  }
  void r
}

// ---------------------------------------------------------------- palco neon
function bgPalco(c: C, W: number, H: number, hz: number, r: () => number) {
  c.fillStyle = lin(c, 0, 0, 0, hz, [[0, '#070a1b'], [1, '#1e2748']])
  c.fillRect(0, 0, W, hz + 4)
  c.fillStyle = 'rgba(255,255,255,0.7)'
  for (let i = 0; i < 90; i++) c.fillRect(r() * W, r() * hz * 0.5, 1.5, 1.5)
  // prédios ao fundo
  let x = 0
  while (x < W) {
    const w = 70 + r() * 90
    const h = hz * 0.35 + r() * hz * 0.5
    c.fillStyle = shade('#151b34', r() * 0.15)
    c.fillRect(x, hz - h, w, h + 6)
    for (let wy = hz - h + 10; wy < hz - 6; wy += 16) {
      for (let wx = x + 8; wx < x + w - 10; wx += 14) {
        if (r() < 0.32) {
          c.fillStyle = r() < 0.8 ? 'rgba(244,200,120,0.85)' : 'rgba(80,225,235,0.85)'
          c.fillRect(wx, wy, 6, 8)
        }
      }
    }
    x += w + 2
  }
  // piso escuro refletivo
  c.fillStyle = lin(c, 0, hz, 0, H, [[0, '#1b2038'], [1, '#0f1224']])
  c.fillRect(0, hz, W, H - hz)
  cobbles(c, W, H, hz, '#35e8ff')
}

// ---------------------------------------------------------------- objetos
function drawProp(c: C, p: Prop, scene: Scene) {
  c.save()
  c.translate(p.x, p.y)
  c.scale(p.s, p.s)
  const hzAbs = scene.horizon
  switch (p.type) {
    case 'fountain': {
      shadow(c, 0, 4, 150, 30, 0.25)
      c.fillStyle = lin(c, 0, -20, 0, 30, [[0, '#d8d2c4'], [1, '#a9a290']])
      c.beginPath()
      c.ellipse(0, 0, 130, 38, 0, 0, Math.PI * 2)
      c.fill()
      c.strokeStyle = line
      c.lineWidth = 1.5
      c.stroke()
      c.fillStyle = lin(c, 0, -26, 0, 26, [[0, '#6fc3cf'], [1, '#2a8fa6']])
      c.beginPath()
      c.ellipse(0, -2, 114, 30, 0, 0, Math.PI * 2)
      c.fill()
      c.fillStyle = '#cfc8b7'
      c.fillRect(-12, -78, 24, 78)
      c.beginPath()
      c.ellipse(0, -78, 44, 12, 0, 0, Math.PI * 2)
      c.fill()
      c.strokeStyle = 'rgba(210,240,248,0.9)'
      c.lineWidth = 2.5
      for (let k = -3; k <= 3; k++) {
        c.beginPath()
        c.moveTo(0, -84)
        c.quadraticCurveTo(k * 14, -140 + Math.abs(k) * 8, k * 24, -66)
        c.stroke()
      }
      break
    }
    case 'stall': {
      shadow(c, 0, 4, 70, 9)
      c.fillStyle = '#8b6a47'
      c.fillRect(-56, -44, 112, 44)
      c.fillStyle = '#6e5236'
      c.fillRect(-56, -44, 112, 5)
      const cols = [['#a62b32', '#f1ede3'], ['#1e2f5a', '#f1ede3'], ['#2a7a58', '#f1ede3'], ['#d19a26', '#f1ede3']][p.v % 4]
      for (let i = 0; i < 8; i++) {
        c.fillStyle = cols[i % 2]
        c.beginPath()
        c.moveTo(-64 + i * 16, -106)
        c.lineTo(-48 + i * 16, -106)
        c.lineTo(-52 + i * 16, -80)
        c.lineTo(-68 + i * 16, -80)
        c.fill()
      }
      c.fillStyle = '#5a4630'
      c.fillRect(-60, -106, 4, 64)
      c.fillRect(56, -106, 4, 64)
      // mercadorias
      const gs = ['#c8402f', '#e0a52a', '#3f8c4f', '#f1ede3']
      for (let i = 0; i < 7; i++) {
        c.fillStyle = gs[(i + p.v) % gs.length]
        c.beginPath()
        c.arc(-44 + i * 14.5, -50, 6, 0, Math.PI * 2)
        c.fill()
      }
      break
    }
    case 'tree': {
      shadow(c, 0, 4, 60, 8, 0.22)
      c.fillStyle = '#6e5236'
      c.fillRect(-6, -90, 12, 90)
      const greens = ['#3f7d4a', '#4f8f4f', '#2f6a45'][p.v % 3]
      for (const [cx, cy, rr] of [[0, -135, 52], [-34, -112, 38], [34, -112, 38], [0, -100, 44]] as const) {
        c.fillStyle = rad(c, cx - 10, cy - 14, 4, rr, [[0, shade(greens, 0.25)], [1, greens]])
        c.beginPath()
        c.arc(cx, cy, rr, 0, Math.PI * 2)
        c.fill()
      }
      break
    }
    case 'palm': {
      shadow(c, 0, 4, 40, 7, 0.2)
      c.strokeStyle = '#8a6a47'
      c.lineWidth = 11
      c.lineCap = 'round'
      c.beginPath()
      c.moveTo(0, 0)
      c.quadraticCurveTo(14, -90, 6, -170)
      c.stroke()
      c.strokeStyle = '#6e5236'
      c.lineWidth = 2
      for (let k = 0; k < 8; k++) {
        c.beginPath()
        c.moveTo(-4, -k * 20)
        c.lineTo(10, -k * 20 - 6)
        c.stroke()
      }
      for (let k = 0; k < 7; k++) {
        const a = -Math.PI * 0.95 + (k / 6) * Math.PI * 0.9
        c.fillStyle = k % 2 ? '#2f7a4f' : '#3d9060'
        c.beginPath()
        c.moveTo(6, -172)
        c.quadraticCurveTo(6 + Math.cos(a) * 60, -172 + Math.sin(a) * 60 - 20, 6 + Math.cos(a) * 100, -172 + Math.sin(a) * 40 + 28)
        c.quadraticCurveTo(6 + Math.cos(a) * 60, -172 + Math.sin(a) * 40, 6, -170)
        c.fill()
      }
      break
    }
    case 'lamp': {
      shadow(c, 0, 3, 14, 4)
      c.fillStyle = '#2a2d36'
      c.fillRect(-3, -150, 6, 150)
      c.fillRect(-9, -8, 18, 8)
      c.beginPath()
      c.arc(0, -156, 11, 0, Math.PI * 2)
      c.fillStyle = scene.theme === 'palco' ? '#5ff0ff' : '#f7e6b0'
      c.fill()
      c.fillStyle = rad(c, 0, -156, 4, 40, [[0, 'rgba(255,240,190,0.45)'], [1, 'rgba(255,240,190,0)']])
      c.fillRect(-40, -196, 80, 80)
      break
    }
    case 'mannequin': {
      shadow(c, 0, 3, 20, 5)
      const col = ['#1e2f5a', '#e8e0d0', '#6e1f2e', '#1b1b20'][p.v % 4]
      c.fillStyle = col
      c.beginPath()
      c.moveTo(-14, -112)
      c.lineTo(14, -112)
      c.lineTo(10, -70)
      c.lineTo(24, 0)
      c.lineTo(-24, 0)
      c.lineTo(-10, -70)
      c.fill()
      c.fillStyle = '#d8cfc0'
      c.beginPath()
      c.ellipse(0, -126, 7, 9, 0, 0, Math.PI * 2)
      c.fill()
      c.fillStyle = 'rgba(255,255,255,0.3)'
      c.fillRect(-12, -110, 4, 60)
      break
    }
    case 'stanchion': {
      c.fillStyle = '#d4b06a'
      c.fillRect(-2, -34, 4, 34)
      c.beginPath()
      c.arc(0, -36, 5, 0, Math.PI * 2)
      c.fill()
      c.fillRect(-8, -3, 16, 3)
      c.strokeStyle = '#6e1f2e'
      c.lineWidth = 3
      c.beginPath()
      c.moveTo(0, -30)
      c.quadraticCurveTo(70, -14, 140, -30)
      c.stroke()
      break
    }
    case 'planter': {
      shadow(c, 0, 3, 30, 6)
      c.fillStyle = scene.theme === 'shopping' ? '#e3ddd0' : '#6b5a48'
      c.fillRect(-26, -34, 52, 34)
      c.fillStyle = 'rgba(255,255,255,0.25)'
      c.fillRect(-26, -34, 6, 34)
      for (let k = 0; k < 7; k++) {
        c.fillStyle = k % 2 ? '#2f7a4f' : '#3f8c5a'
        c.beginPath()
        c.ellipse(-18 + k * 6, -52, 6, 26 + (k % 3) * 6, (k - 3) * 0.16, 0, Math.PI * 2)
        c.fill()
      }
      break
    }
    case 'umbrella': {
      const cols = [['#1e2f5a', '#f1ede3'], ['#a62b32', '#f1ede3'], ['#d19a26', '#f1ede3'], ['#2a7a58', '#f1ede3']][p.v % 4]
      shadow(c, 8, 4, 48, 8)
      c.strokeStyle = '#6e5a3c'
      c.lineWidth = 3
      c.beginPath()
      c.moveTo(0, 0)
      c.lineTo(0, -90)
      c.stroke()
      for (let i = 0; i < 6; i++) {
        c.fillStyle = cols[i % 2]
        c.beginPath()
        c.moveTo(0, -102)
        c.quadraticCurveTo(-56 + i * 18.6, -108, -56 + i * 18.6 - 4, -78)
        c.lineTo(-56 + (i + 1) * 18.6 - 4, -78)
        c.quadraticCurveTo(-56 + (i + 1) * 18.6, -108, 0, -102)
        c.fill()
      }
      break
    }
    case 'towel': {
      const cols = ['#1e2f5a', '#f1ede3', '#a62b32', '#2a9d9d', '#d19a26', '#6b3f98']
      c.fillStyle = cols[p.v % cols.length]
      c.beginPath()
      c.moveTo(-34, -6)
      c.lineTo(34, -6)
      c.lineTo(40, 9)
      c.lineTo(-40, 9)
      c.fill()
      c.fillStyle = 'rgba(255,255,255,0.45)'
      for (let k = -2; k <= 2; k++) c.fillRect(k * 14 - 3, -4, 5, 11)
      break
    }
    case 'tower': {
      shadow(c, 0, 3, 50, 8)
      c.fillStyle = '#e8e0d0'
      c.fillRect(-28, -70, 56, 70)
      c.fillStyle = '#b3262f'
      c.fillRect(-28, -70, 56, 10)
      c.fillStyle = '#f1ede3'
      c.fillRect(-36, -84, 72, 16)
      c.fillStyle = '#1e2f5a'
      c.fillRect(-36, -84, 72, 5)
      c.fillStyle = '#9fc4d6'
      c.fillRect(-16, -54, 32, 24)
      c.fillStyle = '#7a5f3e'
      c.fillRect(-5, -120, 4, 38)
      c.fillStyle = '#b3262f'
      c.beginPath()
      c.moveTo(-1, -120)
      c.lineTo(24, -112)
      c.lineTo(-1, -104)
      c.fill()
      break
    }
    case 'boat': {
      c.fillStyle = '#f1ede3'
      c.beginPath()
      c.moveTo(-40, -4)
      c.lineTo(40, -4)
      c.lineTo(30, 10)
      c.lineTo(-30, 10)
      c.fill()
      c.fillStyle = '#1e2f5a'
      c.fillRect(-36, -4, 72, 4)
      c.fillStyle = '#f1ede3'
      c.beginPath()
      c.moveTo(0, -60)
      c.lineTo(26, -8)
      c.lineTo(0, -8)
      c.fill()
      c.strokeStyle = '#5a4630'
      c.lineWidth = 2
      c.beginPath()
      c.moveTo(0, -62)
      c.lineTo(0, -4)
      c.stroke()
      break
    }
    case 'net': {
      c.strokeStyle = '#5a4630'
      c.lineWidth = 4
      c.beginPath()
      c.moveTo(-150, 0)
      c.lineTo(-150, -110)
      c.moveTo(150, 0)
      c.lineTo(150, -110)
      c.stroke()
      c.fillStyle = 'rgba(255,255,255,0.25)'
      c.fillRect(-150, -110, 300, 40)
      c.strokeStyle = 'rgba(255,255,255,0.7)'
      c.lineWidth = 1
      for (let k = -150; k <= 150; k += 10) {
        c.beginPath()
        c.moveTo(k, -110)
        c.lineTo(k, -70)
        c.stroke()
      }
      for (let k = -110; k <= -70; k += 10) {
        c.beginPath()
        c.moveTo(-150, k)
        c.lineTo(150, k)
        c.stroke()
      }
      break
    }
    case 'shop': {
      const w = 340
      const cols = ['#2c3340', '#6e1f2e', '#1f4a3a', '#d6cdbb', '#1e2f5a'][p.v % 5]
      c.fillStyle = shade(cols, -0.1)
      c.fillRect(-w / 2, -hzAbs * 0.25 - 14, w, hzAbs * 0.25 + 18)
      c.fillStyle = lin(c, 0, -80, 0, 0, [[0, '#f8ecc7'], [1, '#d8b66e']])
      c.fillRect(-w / 2 + 14, -80, w - 28, 78)
      // vitrine com sombras de manequins
      for (let k = 0; k < 4; k++) {
        c.fillStyle = 'rgba(40,30,30,0.5)'
        c.beginPath()
        c.ellipse(-w / 2 + 48 + k * 80, -56, 8, 11, 0, 0, Math.PI * 2)
        c.fill()
        c.beginPath()
        c.moveTo(-w / 2 + 38 + k * 80, -46)
        c.lineTo(-w / 2 + 58 + k * 80, -46)
        c.lineTo(-w / 2 + 64 + k * 80, -2)
        c.lineTo(-w / 2 + 32 + k * 80, -2)
        c.fill()
      }
      c.fillStyle = 'rgba(255,255,255,0.25)'
      c.fillRect(-w / 2 + 14, -80, 6, 78)
      c.fillStyle = shade(cols, -0.4)
      c.fillRect(-w / 2 + 10, -hzAbs * 0.25 + 10, w - 20, 34)
      c.fillStyle = '#e6c985'
      c.font = '700 20px "Playfair Display", serif'
      c.textAlign = 'center'
      c.fillText(['BOUTIQUE', 'OUTLET', 'ACESSÓRIOS', 'CALÇADOS', 'MODA JOVEM'][p.v % 5], 0, -hzAbs * 0.25 + 34)
      break
    }
    case 'pillar': {
      shadow(c, 0, 3, 28, 6)
      c.fillStyle = lin(c, -20, 0, 20, 0, [[0, '#f0ece2'], [0.5, '#fff'], [1, '#c9c3b4']])
      c.fillRect(-20, -150, 40, 150)
      c.fillStyle = '#b9b2a2'
      c.fillRect(-26, -10, 52, 10)
      c.fillRect(-26, -156, 52, 8)
      break
    }
    case 'kiosk': {
      shadow(c, 0, 4, 80, 10)
      c.fillStyle = '#2c3340'
      c.fillRect(-60, -70, 120, 70)
      c.fillStyle = lin(c, 0, -62, 0, -26, [[0, '#f8ecc7'], [1, '#d8b66e']])
      c.fillRect(-52, -62, 104, 36)
      for (let i = 0; i < 8; i++) {
        c.fillStyle = i % 2 ? '#f1ede3' : '#1e2f5a'
        c.fillRect(-64 + i * 16, -96, 16, 28)
      }
      c.fillStyle = '#d4b06a'
      c.fillRect(-60, -30, 120, 6)
      break
    }
    case 'bench': {
      shadow(c, 0, 3, 50, 6)
      c.fillStyle = '#8a6a47'
      c.fillRect(-44, -26, 88, 8)
      c.fillRect(-44, -48, 88, 6)
      c.fillRect(-44, -40, 88, 5)
      c.fillStyle = '#2a2d36'
      c.fillRect(-40, -18, 5, 18)
      c.fillRect(35, -18, 5, 18)
      break
    }
    case 'stage': {
      const w = Math.min(scene.W * 0.55, 1100)
      c.fillStyle = '#10142a'
      c.fillRect(-w / 2, -150, w, 150)
      c.fillStyle = lin(c, -w / 2, -150, w / 2, -40, [[0, '#35e8ff'], [0.5, '#2a3b7a'], [1, '#e8a53a']])
      c.fillRect(-w / 2 + 40, -140, w - 80, 90)
      for (let k = 0; k < 14; k++) {
        c.fillStyle = `rgba(255,255,255,${0.06 + (k % 3) * 0.05})`
        c.fillRect(-w / 2 + 40 + k * ((w - 80) / 14), -140, 3, 90)
      }
      c.fillStyle = '#1b2038'
      c.fillRect(-w / 2 - 20, -36, w + 40, 36)
      c.fillStyle = '#35e8ff'
      c.fillRect(-w / 2 - 20, -38, w + 40, 3)
      // treliça e luzes
      c.fillStyle = '#2b3047'
      c.fillRect(-w / 2, -176, w, 10)
      const lc = ['#35e8ff', '#e8a53a', '#f1ede3', '#c76fe0']
      for (let k = 0; k < 9; k++) {
        const lx = -w / 2 + 30 + k * ((w - 60) / 8)
        c.fillStyle = lc[k % 4]
        c.beginPath()
        c.arc(lx, -164, 7, 0, Math.PI * 2)
        c.fill()
        c.fillStyle = lin(c, lx, -164, lx, 100, [[0, lc[k % 4] + '77'], [1, lc[k % 4] + '00']])
        c.beginPath()
        c.moveTo(lx - 5, -160)
        c.lineTo(lx + 5, -160)
        c.lineTo(lx + (k - 4) * 34 + 60, 130)
        c.lineTo(lx + (k - 4) * 34 - 60, 130)
        c.fill()
      }
      break
    }
    case 'speaker': {
      c.fillStyle = '#12151f'
      c.fillRect(-26, -78, 52, 78)
      c.strokeStyle = '#35e8ff'
      c.lineWidth = 2
      c.strokeRect(-26, -78, 52, 78)
      c.fillStyle = '#2a2f40'
      c.beginPath()
      c.arc(0, -52, 14, 0, Math.PI * 2)
      c.arc(0, -20, 9, 0, Math.PI * 2)
      c.fill()
      break
    }
    case 'spot': {
      const lc = ['rgba(53,232,255,', 'rgba(232,165,58,', 'rgba(241,237,227,'][p.v % 3]
      c.fillStyle = rad(c, 0, 0, 4, 120, [[0, lc + '0.32)'], [1, lc + '0)']])
      c.beginPath()
      c.ellipse(0, 0, 130, 40, 0, 0, Math.PI * 2)
      c.fill()
      break
    }
  }
  c.restore()
}
