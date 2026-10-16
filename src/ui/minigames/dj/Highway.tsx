import { useEffect, useRef } from 'react'
import { live, session } from '../../../game/minigames/dj/controller'

export const LANE_COLORS = ['#34e0ff', '#8f6bff', '#ffb340', '#ff4fa3']
const LANE_COLORS_2 = ['#34e0ff', '#ffb340']

const curve = (p: number) => Math.pow(Math.max(0, p), 1.35)

/** Pista de notas desenhada em canvas (perspectiva simples). Lê o relógio do áudio via `live.t`. */
export function Highway({ onLayout }: { onLayout?: (r: { left: number; width: number; hitY: number; height: number }) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current!
    const g = cv.getContext('2d')!
    let raf = 0
    let w = 0
    let h = 0
    const resize = () => {
      const r = cv.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = r.width
      h = r.height
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      onLayout?.({ left: r.left, width: r.width, hitY: r.top + h * 0.88, height: r.height })
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(cv)

    const draw = () => {
      raf = requestAnimationFrame(draw)
      const s = session
      g.clearRect(0, 0, w, h)
      if (!s) return
      const { chart, run } = s
      const n = chart.laneCount
      const colors = n === 4 ? LANE_COLORS : LANE_COLORS_2
      const y0 = h * 0.03
      const y1 = h * 0.88
      const cx = w / 2
      const laneW = w / n
      const yAt = (p: number) => y0 + (y1 - y0) * curve(p)
      const wAt = (p: number) => 0.4 + 0.6 * curve(p)
      const xAt = (lane: number, p: number) => cx + (lane - (n - 1) / 2) * laneW * wAt(p)
      const t = live.t
      const pOf = (nt: number) => 1 - (nt - t) / chart.approach

      // pista
      const top = (n * laneW * 0.4) / 2
      const bot = (n * laneW) / 2
      const grad = g.createLinearGradient(0, y0, 0, y1)
      grad.addColorStop(0, 'rgba(6,8,18,0.35)')
      grad.addColorStop(1, 'rgba(6,8,18,0.9)')
      g.fillStyle = grad
      g.beginPath()
      g.moveTo(cx - top, y0)
      g.lineTo(cx + top, y0)
      g.lineTo(cx + bot, y1 + 26)
      g.lineTo(cx - bot, y1 + 26)
      g.closePath()
      g.fill()
      g.strokeStyle = `rgba(140,160,255,${0.3 + live.kick * 0.25})`
      g.lineWidth = 1
      for (let i = 0; i <= n; i++) {
        g.beginPath()
        g.moveTo(cx + (i - n / 2) * laneW * 0.4, y0)
        g.lineTo(cx + (i - n / 2) * laneW, y1 + 26)
        g.stroke()
      }
      if (live.fever) {
        g.strokeStyle = `rgba(255,179,64,${0.5 + live.kick * 0.4})`
        g.lineWidth = 2.5
        g.beginPath()
        g.moveTo(cx - top, y0)
        g.lineTo(cx - bot, y1 + 26)
        g.moveTo(cx + top, y0)
        g.lineTo(cx + bot, y1 + 26)
        g.stroke()
      }

      // notas (de trás para frente)
      for (let i = chart.notes.length - 1; i >= 0; i--) {
        const nt = chart.notes[i]
        const st = run.state[i]
        if (st === 'hit' || st === 'done') continue
        const p = pOf(nt.t)
        const pEnd = nt.type === 'hold' ? pOf(nt.t + nt.dur) : p
        if (p < -0.1 && pEnd < -0.1) continue
        if (pEnd > 1.2 && p > 1.2) continue
        const missed = st === 'missed'
        const held = st === 'held'
        const pHead = held ? Math.min(1, p) : p
        const alpha = missed ? 0.28 : 1
        const yh = yAt(pHead)
        const ww = wAt(pHead)
        g.globalAlpha = alpha
        if (nt.type === 'scratch') {
          const x0 = cx - (n * laneW * ww) / 2 + 4
          const wide = n * laneW * ww - 8
          const hh = 20 * ww + 6
          g.fillStyle = '#ff4fa3'
          g.shadowColor = '#ff4fa3'
          g.shadowBlur = 16
          rr(g, x0, yh - hh / 2, wide, hh, 8)
          g.fill()
          g.shadowBlur = 0
          g.strokeStyle = '#fff'
          g.lineWidth = 2.5 * ww
          g.lineCap = 'round'
          g.lineJoin = 'round'
          const dir = nt.dir
          for (let k = -1; k <= 1; k++) {
            const ax = cx + k * wide * 0.18
            g.beginPath()
            g.moveTo(ax - dir * 7 * ww, yh - 6 * ww)
            g.lineTo(ax + dir * 4 * ww, yh)
            g.lineTo(ax - dir * 7 * ww, yh + 6 * ww)
            g.stroke()
          }
        } else {
          const col = colors[nt.lane]
          const xw = Math.min(laneW * 0.84, 150) * ww
          const x = xAt(nt.lane, pHead)
          if (nt.type === 'hold') {
            const ye = yAt(Math.max(pEnd, -0.1))
            g.fillStyle = col
            g.globalAlpha = alpha * (held ? 0.85 : 0.4)
            rr(g, x - xw * 0.2, Math.min(ye, yh), xw * 0.4, Math.abs(yh - ye), 6)
            g.fill()
            g.globalAlpha = alpha
          }
          const hh = 20 * ww + 6
          g.fillStyle = col
          g.shadowColor = col
          g.shadowBlur = held ? 22 : 12
          rr(g, x - xw / 2, yh - hh / 2, xw, hh, 9 * ww + 2)
          g.fill()
          g.shadowBlur = 0
          g.fillStyle = 'rgba(255,255,255,0.55)'
          rr(g, x - xw / 2 + 3, yh - hh / 2 + 2, xw - 6, hh * 0.32, 5)
          g.fill()
        }
        g.globalAlpha = 1
      }

      // linha de acerto e receptores
      g.strokeStyle = `rgba(230,236,255,${0.55 + live.kick * 0.35})`
      g.lineWidth = 2
      g.shadowColor = live.fever ? '#ffb340' : '#8f6bff'
      g.shadowBlur = 14
      g.beginPath()
      g.moveTo(cx - bot - 6, y1)
      g.lineTo(cx + bot + 6, y1)
      g.stroke()
      g.shadowBlur = 0
      for (let l = 0; l < n; l++) {
        const x = xAt(l, 1)
        const flash = live.laneFlash[l]
        const col = colors[l]
        g.beginPath()
        g.arc(x, y1, Math.min(laneW * 0.3, 36) + flash * 6, 0, Math.PI * 2)
        g.fillStyle = flash > 0.02 || live.held[l] ? hexA(col, 0.25 + flash * 0.5) : 'rgba(10,14,30,0.7)'
        g.fill()
        g.lineWidth = 2.5
        g.strokeStyle = col
        g.stroke()
      }
    }
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [onLayout])

  return <canvas ref={ref} className="dj-highway" />
}

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2))
  g.beginPath()
  g.moveTo(x + rad, y)
  g.arcTo(x + w, y, x + w, y + h, rad)
  g.arcTo(x + w, y + h, x, y + h, rad)
  g.arcTo(x, y + h, x, y, rad)
  g.arcTo(x, y, x + w, y, rad)
  g.closePath()
}
function hexA(hex: string, a: number) {
  const v = parseInt(hex.slice(1), 16)
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`
}
