/**
 * Personagens 2D vetoriais do "Cadê a Blogueira?", montados por partes (corpo, cabelo, roupa, acessórios).
 * Origem = centro dos pés; a figura tem 100 unidades de altura (vezes `scale`). Estilo boneca de vinil:
 * contorno fino, brilho especular no cabelo/sapato/bolsa.
 */
import { COLORS, HAIR_COLORS, SKINS, type Look, type Person, type Pet, type Pose } from '../../../game/minigames/procura/gen'

const shadeCache = new Map<string, string>()
/** Clareia (amt > 0) ou escurece (amt < 0) uma cor hex. */
export function shade(hex: string, amt: number): string {
  const key = hex + amt
  const hit = shadeCache.get(key)
  if (hit) return hit
  const n = parseInt(hex.slice(1), 16)
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))))
  const out = `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`
  shadeCache.set(key, out)
  return out
}

const OUT = 'rgba(20,14,18,0.55)'

export interface DrawOpts {
  /** espessura extra do contorno (alto contraste) */
  contrast: boolean
}

function poly(c: CanvasRenderingContext2D, pts: number[]) {
  c.moveTo(pts[0], pts[1])
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1])
  c.closePath()
}

function fillStroke(c: CanvasRenderingContext2D, fill: string | CanvasGradient, o: DrawOpts, lw = 0.9) {
  c.fillStyle = fill
  c.fill()
  c.lineWidth = o.contrast ? lw * 2.2 : lw
  c.strokeStyle = o.contrast ? '#07080c' : OUT
  c.stroke()
}

function limb(c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, w: number, color: string, o: DrawOpts) {
  c.beginPath()
  c.lineCap = 'round'
  c.lineWidth = w + (o.contrast ? 2 : 0.9)
  c.strokeStyle = o.contrast ? '#07080c' : OUT
  c.moveTo(x0, y0)
  c.lineTo(x1, y1)
  c.stroke()
  c.lineWidth = w
  c.strokeStyle = color
  c.beginPath()
  c.moveTo(x0, y0)
  c.lineTo(x1, y1)
  c.stroke()
}

/** Desenha uma pessoa. `x,y` = pés no espaço atual; `scale` = tamanho do mundo (1 = 100 unidades de altura). */
export function drawPerson(c: CanvasRenderingContext2D, p: Pick<Person, 'look' | 'pose' | 'flip'>, x: number, y: number, scale: number, o: DrawOpts) {
  const l = p.look
  const skin = SKINS[l.skin]
  const skinD = shade(skin, -0.16)
  const top = COLORS[l.topColor].hex
  const bottom = COLORS[l.bottomColor].hex
  const hair = HAIR_COLORS[l.hairColor].hex
  const sh = [12, 14, 16.5][l.build] // meia largura dos ombros
  const pose: Pose = p.pose
  const sit = pose === 'sit'
  const dy = sit ? 20 : 0 // tronco desce quando sentada

  c.save()
  c.translate(x, y)
  c.scale(p.flip ? -scale : scale, scale)

  // sombra
  c.fillStyle = 'rgba(30,24,20,0.22)'
  c.beginPath()
  c.ellipse(sit ? 6 : 0, 0.5, sit ? 24 : 15, 3.6, 0, 0, Math.PI * 2)
  c.fill()

  if (sit) {
    // banco
    c.beginPath()
    poly(c, [-20, -20, 22, -20, 22, -17, -20, -17])
    fillStroke(c, '#8a6a47', o, 0.7)
    c.beginPath()
    c.rect(-17, -17, 3, 17)
    c.rect(17, -17, 3, 17)
    fillStroke(c, '#5d4630', o, 0.6)
  }

  const headY = -84 + dy
  const shoulderY = -69.5 + dy
  const waistY = -42 + dy

  // ---- cabelo atrás
  c.beginPath()
  switch (l.hairStyle) {
    case 'long':
      c.moveTo(-13, headY - 4)
      c.quadraticCurveTo(-16, shoulderY + 14, -12, waistY + 4)
      c.lineTo(12, waistY + 4)
      c.quadraticCurveTo(16, shoulderY + 14, 13, headY - 4)
      c.closePath()
      fillStroke(c, hair, o)
      break
    case 'bob':
      c.moveTo(-13, headY - 4)
      c.quadraticCurveTo(-15, headY + 14, -11, headY + 15)
      c.lineTo(11, headY + 15)
      c.quadraticCurveTo(15, headY + 14, 13, headY - 4)
      c.closePath()
      fillStroke(c, hair, o)
      break
    case 'pony':
      c.moveTo(7, headY - 8)
      c.quadraticCurveTo(24, headY - 4, 19, headY + 20)
      c.quadraticCurveTo(16, headY + 8, 9, headY + 2)
      c.closePath()
      fillStroke(c, hair, o)
      break
    case 'curly':
      for (const [cx, cy, r] of [[-12, headY - 2, 6.5], [12, headY - 2, 6.5], [-13, headY + 8, 6], [13, headY + 8, 6], [-9, headY - 12, 6], [9, headY - 12, 6], [0, headY - 15, 7]] as const) {
        c.moveTo(cx + r, cy)
        c.arc(cx, cy, r, 0, Math.PI * 2)
      }
      fillStroke(c, hair, o, 0.7)
      break
    default:
      break
  }

  // ---- pernas / sapatos
  const hipY = -42 + dy
  const legW = l.build === 0 ? 4.6 : l.build === 1 ? 5.2 : 5.8
  const pants = l.outfit === 'jumpsuit' || (l.outfit === 'topbottom' && l.bottom !== 'skirt')
  const legCol = pants ? (l.outfit === 'jumpsuit' ? top : bottom) : skin
  const shortsLen = l.outfit === 'topbottom' && l.bottom === 'shorts'
  const shoe = shade(COLORS[(l.bottomColor + 4) % COLORS.length].hex, -0.25)
  if (sit) {
    for (const k of [-1, 1]) {
      const bx = 3 + k * 2.2
      limb(c, bx, -22, 17 + k * 1.2, -22, legW, shortsLen ? skin : legCol, o)
      limb(c, 17 + k * 1.2, -22, 17 + k * 1.2, -4, legW * 0.88, shortsLen ? skin : legCol, o)
      c.beginPath()
      poly(c, [14 + k * 1.2, -4, 22 + k * 1.2, -4, 22 + k * 1.2, -1, 14 + k * 1.2, -1])
      fillStroke(c, shoe, o, 0.6)
    }
  } else {
    const walk = pose === 'walk'
    const legs: Array<[number, number]> = walk ? [[-4, -5.5], [4, 5.5]] : [[-3.2, -3.2], [3.2, 3.2]]
    for (const [hx, fx] of legs) {
      limb(c, hx, hipY + 2, fx, -4.5, legW, shortsLen ? skin : legCol, o)
      if (shortsLen) limb(c, hx, hipY + 2, hx + (fx - hx) * 0.25, hipY + 12, legW + 0.8, bottom, o)
      c.beginPath()
      c.ellipse(fx + (fx >= 0 ? 1.8 : -1.8) * (walk ? 0.6 : 1), -2, 4.6, 2.6, 0, 0, Math.PI * 2)
      fillStroke(c, shoe, o, 0.6)
      c.fillStyle = 'rgba(255,255,255,0.45)'
      c.beginPath()
      c.ellipse(fx + 0.5, -3, 1.6, 0.8, -0.3, 0, Math.PI * 2)
      c.fill()
    }
  }

  // ---- tronco e roupa
  const torso = new Path2D()
  const skirtLen = l.outfit === 'dress' ? -16 : l.bottom === 'skirt' && l.outfit === 'topbottom' ? -20 : 0
  if (l.outfit === 'dress') {
    torso.moveTo(-sh, shoulderY)
    torso.quadraticCurveTo(-sh * 0.7, waistY - 4, -sh * 0.72, waistY)
    torso.lineTo(-sh * 1.3, skirtLen + dy)
    torso.quadraticCurveTo(0, skirtLen + dy + 3, sh * 1.3, skirtLen + dy)
    torso.lineTo(sh * 0.72, waistY)
    torso.quadraticCurveTo(sh * 0.7, waistY - 4, sh, shoulderY)
    torso.quadraticCurveTo(0, shoulderY - 3, -sh, shoulderY)
  } else {
    torso.moveTo(-sh, shoulderY)
    torso.quadraticCurveTo(-sh * 0.72, waistY - 6, -sh * 0.74, waistY + (l.outfit === 'jumpsuit' ? 6 : 0))
    torso.lineTo(sh * 0.74, waistY + (l.outfit === 'jumpsuit' ? 6 : 0))
    torso.quadraticCurveTo(sh * 0.72, waistY - 6, sh, shoulderY)
    torso.quadraticCurveTo(0, shoulderY - 3, -sh, shoulderY)
  }
  // saia / calça-curta do conjunto: cobre o quadril
  if (l.outfit === 'topbottom' && l.bottom !== 'pants') {
    const sk = new Path2D()
    if (l.bottom === 'skirt') {
      sk.moveTo(-sh * 0.78, waistY - 1)
      sk.lineTo(-sh * 1.2, waistY + 21)
      sk.quadraticCurveTo(0, waistY + 24, sh * 1.2, waistY + 21)
      sk.lineTo(sh * 0.78, waistY - 1)
      sk.closePath()
    } else {
      sk.moveTo(-sh * 0.78, waistY - 1)
      sk.lineTo(-sh * 0.95, waistY + 12)
      sk.lineTo(sh * 0.95, waistY + 12)
      sk.lineTo(sh * 0.78, waistY - 1)
      sk.closePath()
    }
    c.fillStyle = bottom
    c.fill(sk)
    c.lineWidth = o.contrast ? 2 : 0.9
    c.strokeStyle = o.contrast ? '#07080c' : OUT
    c.stroke(sk)
  } else if (l.outfit === 'topbottom' && l.bottom === 'pants') {
    // calça sobe até a cintura
    c.fillStyle = bottom
    c.fillRect(-sh * 0.72, waistY - 1, sh * 1.44, 8)
  }
  // braços (atrás do tronco quando de lado) – desenhados antes só no braço de trás
  const sleeve = l.outfit === 'dress' && (l.topColor + l.skin) % 3 === 0 ? skin : top
  const armW = l.build === 0 ? 3.6 : 4.2
  const photo = pose === 'photo'
  if (!photo) {
    const swing = pose === 'walk' ? 5 : 1.5
    limb(c, -sh + 1, shoulderY + 3, -sh - 2 - swing * 0.3, waistY + 4 - swing, armW, skin, o)
  }
  c.fillStyle = top
  c.fill(torso)
  c.save()
  c.clip(torso)
  if (l.pattern === 'stripes') {
    c.fillStyle = shade(top, COLORS[l.topColor].hex === '#f1ede3' ? -0.45 : 0.55)
    for (let yy = shoulderY - 2; yy < 0; yy += 5) c.fillRect(-30, yy, 60, 2.2)
  } else if (l.pattern === 'dots') {
    c.fillStyle = shade(top, COLORS[l.topColor].hex === '#f1ede3' ? -0.5 : 0.6)
    for (let yy = shoulderY; yy < 0; yy += 6) for (let xx = -24 + ((yy / 6) & 1) * 3; xx < 24; xx += 6) {
      c.beginPath()
      c.arc(xx, yy, 1.2, 0, Math.PI * 2)
      c.fill()
    }
  }
  // brilho de vinil no ombro/peito
  c.fillStyle = 'rgba(255,255,255,0.22)'
  c.fillRect(-sh, shoulderY - 2, 4.5, 40)
  if (l.pro) {
    c.fillStyle = '#26292f'
    c.fillRect(-sh, shoulderY - 2, 5, 40)
    c.fillRect(sh - 5, shoulderY - 2, 5, 40)
  }
  c.restore()
  c.lineWidth = o.contrast ? 2 : 0.9
  c.strokeStyle = o.contrast ? '#07080c' : OUT
  c.stroke(torso)
  if (l.outfit === 'dress' || l.outfit === 'jumpsuit') {
    // cinto fino
    c.fillStyle = shade(top, -0.3)
    c.fillRect(-sh * 0.73, waistY - 1.5, sh * 1.46, 2.4)
  }

  // ---- pescoço
  c.fillStyle = skin
  c.fillRect(-2.6, headY + 10, 5.2, shoulderY - headY - 8)
  c.fillStyle = skinD
  c.fillRect(-2.6, headY + 11, 5.2, 2.6)

  // ---- braço da frente / pose
  if (photo) {
    const camY = headY + 3
    limb(c, sh - 1, shoulderY + 3, 9, camY + 6, armW, l.outfit === 'dress' ? skin : sleeve, o)
    limb(c, -sh + 1, shoulderY + 3, -7, camY + 6, armW, l.outfit === 'dress' ? skin : sleeve, o)
  } else {
    const swing = pose === 'walk' ? -5 : 0
    limb(c, sh - 1, shoulderY + 3, sh + 2 + swing * 0.3, waistY + 4 + swing, armW, skin, o)
    if (l.outfit !== 'dress') {
      // manga curta
      limb(c, sh - 1, shoulderY + 3, sh + 0.5, shoulderY + 11, armW + 0.6, sleeve, o)
      limb(c, -sh + 1, shoulderY + 3, -sh - 0.5, shoulderY + 11, armW + 0.6, sleeve, o)
    }
  }

  // ---- cachecol
  if (l.scarf >= 0) {
    const sc = COLORS[l.scarf].hex
    c.beginPath()
    poly(c, [-6.5, shoulderY - 3, 6.5, shoulderY - 3, 7.5, shoulderY + 1.5, -7.5, shoulderY + 1.5])
    fillStroke(c, sc, o, 0.7)
    c.beginPath()
    poly(c, [2, shoulderY + 1, 7, shoulderY + 1, 6.2, shoulderY + 13, 1.4, shoulderY + 12])
    fillStroke(c, shade(sc, -0.12), o, 0.7)
  }

  // ---- bolsa
  if (l.bag !== 'none') drawBag(c, l, sh, shoulderY, waistY, o)

  // ---- câmera / celular
  if (l.pro) {
    // alça e câmera grande com lente longa
    c.strokeStyle = '#15171b'
    c.lineWidth = 1.4
    c.beginPath()
    c.moveTo(-6, shoulderY - 1)
    c.quadraticCurveTo(-3, shoulderY + 20, 8, shoulderY + 14)
    c.stroke()
    const cy = photo ? headY + 4 : shoulderY + 16
    c.beginPath()
    c.roundRect(-8, cy - 4.5, 16, 9, 1.8)
    fillStroke(c, '#23262c', o, 0.7)
    c.beginPath()
    c.roundRect(8, cy - 3.6, 14, 7.2, 2)
    fillStroke(c, '#34383f', o, 0.7)
    c.fillStyle = '#9ec7e8'
    c.beginPath()
    c.ellipse(22, cy, 1.5, 3.2, 0, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = 'rgba(255,255,255,0.4)'
    c.fillRect(-6, cy - 3.4, 8, 1.2)
  } else if (l.tourist && !photo) {
    c.beginPath()
    c.roundRect(-4.5, shoulderY + 12, 9, 6, 1.4)
    fillStroke(c, '#2c2f36', o, 0.6)
    c.fillStyle = '#9ec7e8'
    c.beginPath()
    c.arc(0, shoulderY + 15, 1.8, 0, Math.PI * 2)
    c.fill()
  } else if (photo) {
    c.beginPath()
    c.roundRect(-3.2, headY + 3, 6.4, 8.5, 1.4)
    fillStroke(c, '#1b1d22', o, 0.6)
    c.fillStyle = '#6fa6d8'
    c.fillRect(-2.2, headY + 4.2, 4.4, 6)
  }

  // ---- cabeça e rosto
  c.beginPath()
  c.ellipse(0, headY, 10.6, 12, 0, 0, Math.PI * 2)
  fillStroke(c, skin, o, 0.9)
  c.fillStyle = 'rgba(255,255,255,0.22)'
  c.beginPath()
  c.ellipse(-4, headY - 4, 2.4, 4.2, 0.3, 0, Math.PI * 2)
  c.fill()
  // bochechas, olhos e boca
  c.fillStyle = 'rgba(214,96,110,0.28)'
  c.beginPath()
  c.ellipse(-6, headY + 3.5, 2.2, 1.4, 0, 0, Math.PI * 2)
  c.ellipse(6, headY + 3.5, 2.2, 1.4, 0, 0, Math.PI * 2)
  c.fill()
  if (l.glasses === 'none') {
    c.fillStyle = '#2a1c1c'
    c.beginPath()
    c.ellipse(-4.2, headY, 1.4, 1.9, 0, 0, Math.PI * 2)
    c.ellipse(4.2, headY, 1.4, 1.9, 0, 0, Math.PI * 2)
    c.fill()
    c.strokeStyle = '#2a1c1c'
    c.lineWidth = 0.7
    c.beginPath()
    c.moveTo(-6.2, headY - 1.2)
    c.lineTo(-7.2, headY - 2.2)
    c.moveTo(6.2, headY - 1.2)
    c.lineTo(7.2, headY - 2.2)
    c.stroke()
  }
  c.fillStyle = (l.skin + l.hairColor) % 4 === 0 ? '#9c2f3c' : '#c4585f'
  c.beginPath()
  c.ellipse(0, headY + 6.8, 2.4, 1.2, 0, 0, Math.PI * 2)
  c.fill()

  // ---- cabelo à frente
  drawFrontHair(c, l, headY, hair, o)

  // ---- óculos
  if (l.glasses !== 'none') drawGlasses(c, l.glasses, headY, o)

  // ---- chapéu
  if (l.hat !== 'none') drawHat(c, l, headY, o)

  c.restore()
}

function drawFrontHair(c: CanvasRenderingContext2D, l: Look, headY: number, hair: string, o: DrawOpts) {
  c.beginPath()
  // calota de cabelo (cobre o topo da cabeça)
  c.moveTo(-11.2, headY + 1)
  c.bezierCurveTo(-12.5, headY - 16, 12.5, headY - 16, 11.2, headY + 1)
  c.bezierCurveTo(10, headY - 5, 5, headY - 8.5, 1, headY - 8.2)
  c.bezierCurveTo(-4, headY - 8, -9, headY - 4, -11.2, headY + 1)
  c.closePath()
  fillStroke(c, hair, o, 0.8)
  if (l.hairStyle === 'bun') {
    c.beginPath()
    c.arc(0, headY - 15.5, 5.6, 0, Math.PI * 2)
    fillStroke(c, hair, o, 0.8)
  }
  if (l.hairStyle === 'short') {
    c.beginPath()
    c.moveTo(-11, headY + 1)
    c.lineTo(-11, headY + 5)
    c.lineTo(-9, headY + 1)
    c.moveTo(11, headY + 1)
    c.lineTo(11, headY + 5)
    c.lineTo(9, headY + 1)
    c.fillStyle = hair
    c.fill()
  }
  if (l.hairStyle === 'curly') {
    for (const [cx, cy] of [[-8, headY - 8], [-3, headY - 11], [3, headY - 11], [8, headY - 8]] as const) {
      c.beginPath()
      c.arc(cx, cy, 4.2, 0, Math.PI * 2)
      fillStroke(c, hair, o, 0.6)
    }
  }
  // franja lateral
  c.beginPath()
  c.moveTo(-10, headY - 3)
  c.quadraticCurveTo(-1, headY - 9, 8, headY - 5)
  c.quadraticCurveTo(0, headY - 4, -7, headY + 3)
  c.closePath()
  c.fillStyle = shade(hair, -0.1)
  c.fill()
  // brilho de vinil
  c.strokeStyle = 'rgba(255,255,255,0.5)'
  c.lineWidth = 1.2
  c.lineCap = 'round'
  c.beginPath()
  c.arc(-1, headY - 3, 9.6, Math.PI * 1.12, Math.PI * 1.42)
  c.stroke()
}

function drawGlasses(c: CanvasRenderingContext2D, g: Look['glasses'], headY: number, o: DrawOpts) {
  c.lineWidth = o.contrast ? 1.8 : 1.15
  c.strokeStyle = '#14141a'
  c.fillStyle = 'rgba(150,190,215,0.35)'
  const lens = (cx: number, side: number) => {
    c.beginPath()
    if (g === 'round') c.arc(cx, headY, 3.9, 0, Math.PI * 2)
    else if (g === 'square') c.roundRect(cx - 3.8, headY - 3, 7.6, 6, 1)
    else if (g === 'cat') {
      c.moveTo(cx - 3.9 * side, headY - 1)
      c.lineTo(cx + 4.2 * side, headY - 3.6)
      c.lineTo(cx + 3.6 * side, headY + 2.4)
      c.quadraticCurveTo(cx, headY + 4, cx - 3.9 * side, headY + 1.6)
      c.closePath()
    } else {
      c.moveTo(cx - 4 * side, headY - 2.6)
      c.lineTo(cx + 4 * side, headY - 2.6)
      c.quadraticCurveTo(cx + 4 * side, headY + 4.6, cx - 0.5 * side, headY + 4.2)
      c.quadraticCurveTo(cx - 4.2 * side, headY + 3, cx - 4 * side, headY - 2.6)
      c.closePath()
    }
    c.fill()
    c.stroke()
  }
  lens(-5.2, -1)
  lens(5.2, 1)
  c.beginPath()
  c.moveTo(-1.4, headY - 0.6)
  c.lineTo(1.4, headY - 0.6)
  c.stroke()
  c.beginPath()
  c.moveTo(-9, headY - 1)
  c.lineTo(-10.6, headY - 2)
  c.moveTo(9, headY - 1)
  c.lineTo(10.6, headY - 2)
  c.stroke()
}

function drawHat(c: CanvasRenderingContext2D, l: Look, headY: number, o: DrawOpts) {
  const col = COLORS[l.hatColor].hex
  const dark = shade(col, -0.28)
  const topY = headY - 8
  switch (l.hat) {
    case 'sun':
      c.beginPath()
      c.ellipse(0, topY + 1, 22, 5.2, 0, 0, Math.PI * 2)
      fillStroke(c, col, o, 0.9)
      c.beginPath()
      c.moveTo(-9, topY)
      c.bezierCurveTo(-9, topY - 14, 9, topY - 14, 9, topY)
      c.closePath()
      fillStroke(c, col, o, 0.9)
      c.fillStyle = dark
      c.fillRect(-9, topY - 3.4, 18, 2.8)
      break
    case 'fedora':
      c.beginPath()
      c.ellipse(0, topY + 1.6, 16, 3.8, 0, 0, Math.PI * 2)
      fillStroke(c, col, o, 0.9)
      c.beginPath()
      c.moveTo(-8.6, topY + 1)
      c.lineTo(-7, topY - 11)
      c.quadraticCurveTo(0, topY - 13, 7, topY - 11)
      c.lineTo(8.6, topY + 1)
      c.closePath()
      fillStroke(c, col, o, 0.9)
      c.fillStyle = dark
      c.fillRect(-8.4, topY - 3.6, 16.8, 3)
      break
    case 'beret':
      c.beginPath()
      c.ellipse(2, topY - 3, 14, 6.4, -0.12, 0, Math.PI * 2)
      fillStroke(c, col, o, 0.9)
      c.fillStyle = dark
      c.fillRect(1, topY - 10.6, 2, 2.4)
      break
    case 'cap':
      c.beginPath()
      c.moveTo(-10.8, topY + 3)
      c.bezierCurveTo(-11, topY - 13, 11, topY - 13, 10.8, topY + 3)
      c.closePath()
      fillStroke(c, col, o, 0.9)
      c.beginPath()
      c.moveTo(3, topY + 2.4)
      c.quadraticCurveTo(15, topY + 0.5, 18, topY + 4)
      c.lineTo(5, topY + 5)
      c.closePath()
      fillStroke(c, dark, o, 0.8)
      break
    case 'beanie':
      c.beginPath()
      c.moveTo(-11, topY + 4)
      c.bezierCurveTo(-12, topY - 14, 12, topY - 14, 11, topY + 4)
      c.closePath()
      fillStroke(c, col, o, 0.9)
      c.beginPath()
      c.roundRect(-11.6, topY + 0.8, 23.2, 4.6, 1.6)
      fillStroke(c, dark, o, 0.8)
      c.beginPath()
      c.arc(0, topY - 10.2, 2.9, 0, Math.PI * 2)
      fillStroke(c, shade(col, 0.35), o, 0.7)
      break
  }
  c.fillStyle = 'rgba(255,255,255,0.28)'
  c.beginPath()
  c.ellipse(-3.6, topY - 5.5, 2.4, 1, -0.5, 0, Math.PI * 2)
  c.fill()
}

function drawBag(c: CanvasRenderingContext2D, l: Look, sh: number, shoulderY: number, waistY: number, o: DrawOpts) {
  const col = COLORS[l.bagColor].hex
  const gold = COLORS[l.bagColor].hex === '#d4a93c'
  const hi = gold ? '#fff0b8' : 'rgba(255,255,255,0.5)'
  if (l.bag === 'tote') {
    const bx = sh + 3
    const by = waistY + 4
    c.strokeStyle = shade(col, -0.35)
    c.lineWidth = 1.4
    c.beginPath()
    c.moveTo(bx - 3, by)
    c.quadraticCurveTo(bx + 1, by - 11, bx + 5, by)
    c.stroke()
    c.beginPath()
    c.roundRect(bx - 5.5, by, 15, 15, 2)
    fillStroke(c, col, o, 0.8)
    c.fillStyle = hi
    c.fillRect(bx - 4, by + 1.5, 2, 11)
  } else if (l.bag === 'clutch') {
    const bx = sh + 4
    const by = waistY + 7
    c.beginPath()
    c.roundRect(bx - 6, by, 14, 8.5, 1.8)
    fillStroke(c, col, o, 0.8)
    c.fillStyle = hi
    c.fillRect(bx - 4.5, by + 1.2, 8, 1.4)
    c.fillStyle = gold ? '#8a6a2b' : '#d4b06a'
    c.beginPath()
    c.arc(bx + 1, by + 4.2, 1, 0, Math.PI * 2)
    c.fill()
  } else {
    c.strokeStyle = shade(col, -0.3)
    c.lineWidth = 1.3
    c.beginPath()
    c.moveTo(sh * 0.7, shoulderY - 1)
    c.lineTo(-sh * 0.9, waistY + 6)
    c.stroke()
    c.beginPath()
    c.roundRect(-sh - 6, waistY + 3, 10.5, 8.5, 1.6)
    fillStroke(c, col, o, 0.8)
    c.fillStyle = hi
    c.fillRect(-sh - 4.6, waistY + 4.4, 6, 1.3)
  }
}

// ---------------------------------------------------------------- bichinhos
const COATS = [
  ['#e9dcc3', '#cdb994'],
  ['#8a5a36', '#5f3b22'],
  ['#2a2623', '#17140f'],
  ['#c79a62', '#a07440'],
  ['#c9c6c0', '#9d9a94'],
]

export function drawPet(c: CanvasRenderingContext2D, p: Pick<Pet, 'species' | 'coat' | 'bow' | 'flip'>, x: number, y: number, scale: number, o: DrawOpts) {
  const [a, b] = COATS[p.coat % COATS.length]
  c.save()
  c.translate(x, y)
  c.scale(p.flip ? -scale : scale, scale)
  c.fillStyle = 'rgba(30,24,20,0.22)'
  c.beginPath()
  c.ellipse(0, 0.5, 15, 3, 0, 0, Math.PI * 2)
  c.fill()
  const dog = p.species === 'dog'
  // cauda
  c.strokeStyle = b
  c.lineWidth = 3.2
  c.lineCap = 'round'
  c.beginPath()
  c.moveTo(-10, -13)
  if (dog) c.quadraticCurveTo(-18, -20, -15, -26)
  else c.bezierCurveTo(-20, -14, -20, -26, -13, -28)
  c.stroke()
  // patas
  for (const lx of [-7, -3, 5, 9]) {
    c.beginPath()
    c.roundRect(lx - 1.8, -8.5, 3.6, 8.5, 1.6)
    fillStroke(c, lx < 0 ? b : a, o, 0.6)
  }
  // corpo
  c.beginPath()
  c.ellipse(0, -13, dog ? 12 : 10.5, dog ? 7 : 6.2, 0, 0, Math.PI * 2)
  fillStroke(c, a, o, 0.8)
  // cabeça
  const hx = 11
  const hy = dog ? -21 : -20
  if (!dog) {
    c.beginPath()
    poly(c, [hx - 6, hy - 3, hx - 4.6, hy - 11, hx - 0.6, hy - 5])
    poly(c, [hx + 6, hy - 3, hx + 4.6, hy - 11, hx + 0.6, hy - 5])
    fillStroke(c, a, o, 0.7)
  }
  c.beginPath()
  c.ellipse(hx, hy, 7, 6.3, 0, 0, Math.PI * 2)
  fillStroke(c, a, o, 0.8)
  if (dog) {
    c.beginPath()
    c.ellipse(hx - 5.6, hy - 1, 2.6, 5.2, 0.3, 0, Math.PI * 2)
    fillStroke(c, b, o, 0.7)
    c.beginPath()
    c.ellipse(hx + 6.2, hy + 2, 3.6, 2.8, 0, 0, Math.PI * 2)
    fillStroke(c, shade(a, 0.12), o, 0.7)
    c.fillStyle = '#17120f'
    c.beginPath()
    c.arc(hx + 8.6, hy + 1.2, 1.2, 0, Math.PI * 2)
    c.fill()
  }
  c.fillStyle = '#17120f'
  c.beginPath()
  c.arc(hx + 2.6, hy - 1.6, 1.15, 0, Math.PI * 2)
  c.arc(hx - 1.6, hy - 1.6, 1.15, 0, Math.PI * 2)
  c.fill()
  if (!dog) {
    c.strokeStyle = 'rgba(20,14,18,0.6)'
    c.lineWidth = 0.5
    c.beginPath()
    c.moveTo(hx + 4, hy + 1.5)
    c.lineTo(hx + 8.5, hy + 0.5)
    c.moveTo(hx + 4, hy + 2.6)
    c.lineTo(hx + 8.5, hy + 3.4)
    c.stroke()
  }
  // laço
  if (p.bow >= 0) {
    const bc = COLORS[p.bow].hex
    const bx = hx - 2
    const by = hy - 6.2
    c.beginPath()
    poly(c, [bx, by, bx - 6, by - 4.2, bx - 6, by + 3.8])
    poly(c, [bx, by, bx + 6, by - 4.2, bx + 6, by + 3.8])
    fillStroke(c, bc, o, 0.8)
    c.beginPath()
    c.arc(bx, by, 1.8, 0, Math.PI * 2)
    fillStroke(c, shade(bc, -0.25), o, 0.6)
  }
  c.restore()
}
