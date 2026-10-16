import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DIFFICULTY_LABEL, DIFFICULTY_REWARD, dailySeed, rng, submitScore, type Difficulty, type Entry } from '../../../game/minigames/shared/competition'
import { playSfx } from '../../../game/minigames/audio'
import { grantRewards } from '../../../game/minigames/rewards'
import { useProfileStore } from '../../../state/profileStore'
import {
  CFG, HEARTS, LANES, RALLIES, RATING_LABEL, TYPICAL, WINDOW, addSpikeResult, addTouch, makeRally, newTally, rate, rewardsFor, spikeResult, tellTime,
  type Rally, type Rating, type Tally,
} from '../../../game/minigames/volei/logic'
import './volei.css'

const ID = 'volei'
const BEST_KEY = 'jdb.volei.best'
const TUT_KEY = 'jdb.volei.tutorialDone'
const readNum = (k: string) => {
  try {
    return Number(localStorage.getItem(k)) || 0
  } catch {
    return 0
  }
}
const writeStr = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* sem armazenamento */
  }
}

// ---------------------------------------------------------------- geometria da quadra (u,v em 0..1; v=0 fundo do adversario, 1 = fundo da jogadora)
const LANE_U = [0.2, 0.5, 0.8]
const SERVE = (u: number): [number, number] => [u, 0.07]
const DIG: [number, number] = [0.56, 0.86]
const SETTER: [number, number] = [0.3, 0.68]
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const ease = (t: number) => t * t * (3 - 2 * t)

type EPhase = 'intro' | 'receive' | 'set' | 'spike' | 'result'
interface Popup {
  text: string
  x: number
  y: number
  t: number
  color: string
}
interface Engine {
  cfg: (typeof CFG)[Difficulty]
  rand: () => number
  idx: number
  rally: Rally
  phase: EPhase
  t: number
  dur: number
  from: [number, number]
  to: [number, number]
  peak: number
  lane: number
  pressed: boolean
  tally: Tally
  popups: Popup[]
  /** bola solta depois do corte */
  after: { from: [number, number]; to: [number, number]; t: number; dur: number; peak: number } | null
  lastRating: Rating | null
  over: boolean
  paused: boolean
  /** quanto do voo do corte ja passou (para a bloqueadora) */
  lost: boolean
}

function startRally(e: Engine) {
  e.rally = makeRally(e.rand, e.idx, e.cfg)
  e.phase = 'intro'
  e.t = 0
  e.dur = 0.7
  e.lane = 1
  e.pressed = false
  e.after = null
  e.lost = false
  e.lastRating = null
}

function setPhase(e: Engine, p: EPhase) {
  e.phase = p
  e.t = 0
  e.pressed = false
  if (p === 'receive') {
    e.dur = e.rally.tReceive
    e.from = SERVE(e.rally.serveU)
    e.to = DIG
    e.peak = 1
  } else if (p === 'set') {
    e.dur = e.rally.tSet
    e.from = DIG
    e.to = SETTER
    e.peak = 0.7
  } else if (p === 'spike') {
    e.dur = e.rally.tSpike
    e.from = SETTER
    e.to = [LANE_U[e.lane], 0.585]
    e.peak = 0.6
  } else if (p === 'result') {
    e.dur = 1.0
  }
}

/** posicao (u,v) e altura da bola no instante atual */
function ballAt(e: Engine): { u: number; v: number; h: number } {
  if (e.after) {
    const k = Math.min(1, e.after.t / e.after.dur)
    return { u: lerp(e.after.from[0], e.after.to[0], k), v: lerp(e.after.from[1], e.after.to[1], k), h: e.after.peak * 4 * k * (1 - k) + 0.04 }
  }
  if (e.phase === 'intro') return { u: e.rally.serveU, v: 0.07, h: 0.45 + 0.08 * Math.sin(e.t * 9) }
  if (e.phase === 'result') return { u: e.to[0], v: e.to[1], h: 0.03 }
  const k = Math.min(1, e.t / e.dur)
  return { u: lerp(e.from[0], e.to[0], k), v: lerp(e.from[1], e.to[1], k), h: e.peak * 4 * k * (1 - k) + (e.phase === 'receive' ? 0.04 : 0.1 + 0.25 * k) }
}

/** faixa (0..2, fracionaria) em que a bloqueadora esta agora */
function blockerLane(e: Engine): number {
  const r = e.rally
  if (e.phase === 'intro' || e.phase === 'receive') return 1
  const total = r.tSet + r.tSpike
  const now = e.phase === 'set' ? e.t : r.tSet + (e.phase === 'spike' ? e.t : r.tSpike)
  const swapStart = total - tellTime(e.cfg) - 0.16
  const k = Math.max(0, Math.min(1, (now - Math.max(0.2, swapStart)) / 0.16))
  // chega a faixa de inclinacao cedo (durante o levantamento) e depois a final
  const early = Math.min(1, now / Math.max(0.3, r.tSet * 0.7))
  const lean = lerp(1, r.leanLane, ease(early))
  return lerp(lean, r.blockerLane, ease(k))
}

// ---------------------------------------------------------------- desenho
function person(g: CanvasRenderingContext2D, x: number, y: number, s: number, o: { jump?: number; arms?: number; top: string; shorts: string; hair: string; skin: string; facing?: number }) {
  const j = (o.jump ?? 0) * s * 1.1
  const f = o.facing ?? 1
  g.save()
  g.translate(x, y - j)
  g.scale(s, s)
  // sombra
  g.save()
  g.translate(0, j / s)
  g.fillStyle = 'rgba(80,60,30,0.22)'
  g.beginPath()
  g.ellipse(0, 0, 15, 5, 0, 0, Math.PI * 2)
  g.fill()
  g.restore()
  g.lineCap = 'round'
  // pernas
  g.strokeStyle = o.skin
  g.lineWidth = 7
  g.beginPath()
  g.moveTo(-5, -20)
  g.lineTo(-6, -2)
  g.moveTo(5, -20)
  g.lineTo(6, -2)
  g.stroke()
  // short
  g.fillStyle = o.shorts
  g.beginPath()
  g.roundRect(-10, -30, 20, 14, 5)
  g.fill()
  // torso (regata)
  g.fillStyle = o.top
  g.beginPath()
  g.roundRect(-9.5, -52, 19, 25, 8)
  g.fill()
  // bracos
  const a = o.arms ?? 0
  g.strokeStyle = o.skin
  g.lineWidth = 5.5
  g.beginPath()
  g.moveTo(-9, -48)
  g.lineTo(-13 - 3 * f, -48 + 18 - a * 34)
  g.moveTo(9, -48)
  g.lineTo(13 + 3 * f, -48 + 18 - a * 34)
  g.stroke()
  // cabeca + cabelo
  g.fillStyle = o.skin
  g.beginPath()
  g.arc(0, -61, 8.4, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = o.hair
  g.beginPath()
  g.arc(0, -63, 8.9, Math.PI * 1.02, Math.PI * 1.98)
  g.fill()
  g.beginPath()
  g.arc(-4 * f, -69.5, 4.6, 0, Math.PI * 2) // coque
  g.fill()
  g.restore()
}

function draw(g: CanvasRenderingContext2D, W: number, H: number, e: Engine, time: number) {
  const yTop = H * 0.2
  const yBot = H * 0.88
  const cx = W / 2
  const halfW = (v: number) => W * (0.3 + 0.19 * v)
  const X = (u: number, v: number) => cx + (u - 0.5) * 2 * halfW(v)
  const Y = (v: number) => yTop + v * (yBot - yTop)
  const sc = (v: number) => (0.62 + 0.55 * v) * (W / 420) * 0.85
  // ceu + mar + areia
  const sky = g.createLinearGradient(0, 0, 0, H * 0.18)
  sky.addColorStop(0, '#6cc4f0')
  sky.addColorStop(1, '#cdeff6')
  g.fillStyle = sky
  g.fillRect(0, 0, W, H)
  const sea = g.createLinearGradient(0, H * 0.1, 0, H * 0.24)
  sea.addColorStop(0, '#34b9d4')
  sea.addColorStop(1, '#8fe6df')
  g.fillStyle = sea
  g.fillRect(0, H * 0.1, W, H * 0.14)
  g.fillStyle = 'rgba(255,255,255,0.55)'
  for (let i = 0; i < 6; i++) g.fillRect(((i * 97 + time * 18) % (W + 60)) - 30, H * (0.125 + (i % 3) * 0.03), 40 + (i % 2) * 22, 2)
  const sand = g.createLinearGradient(0, H * 0.22, 0, H)
  sand.addColorStop(0, '#f5e4bc')
  sand.addColorStop(1, '#e9cf9a')
  g.fillStyle = sand
  g.fillRect(0, H * 0.22, W, H)
  // quadra (trapezio)
  g.beginPath()
  g.moveTo(X(0, 0), Y(0))
  g.lineTo(X(1, 0), Y(0))
  g.lineTo(X(1, 1), Y(1))
  g.lineTo(X(0, 1), Y(1))
  g.closePath()
  g.fillStyle = 'rgba(255,248,226,0.5)'
  g.fill()
  g.lineWidth = 3
  g.strokeStyle = '#fffaf0'
  g.stroke()
  // faixas da rede (guias): verde = livre agora
  const bl = blockerLane(e)
  const setting = e.phase === 'set' || (e.phase === 'receive' && e.t > e.dur * 0.55)
  for (let i = 0; i < LANES; i++) {
    const free = Math.abs(bl - i) > 0.62
    const x = X(LANE_U[i], 0.58)
    const y = Y(0.58)
    g.save()
    g.globalAlpha = setting || e.phase === 'spike' ? 0.95 : 0.35
    g.fillStyle = e.cfg.guides ? (free ? 'rgba(80,200,150,0.5)' : 'rgba(240,120,100,0.5)') : 'rgba(255,255,255,0.35)'
    g.beginPath()
    g.ellipse(x, y, 34 * sc(0.58), 12 * sc(0.58), 0, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }
  // rede
  const ny = Y(0.5)
  const nl = X(-0.02, 0.5)
  const nr = X(1.02, 0.5)
  const nh = 56 * sc(0.5)
  g.fillStyle = 'rgba(255,255,255,0.16)'
  g.fillRect(nl, ny - nh, nr - nl, nh)
  g.strokeStyle = 'rgba(255,255,255,0.45)'
  g.lineWidth = 1
  for (let i = 1; i < 14; i++) {
    g.beginPath()
    g.moveTo(nl + ((nr - nl) * i) / 14, ny - nh)
    g.lineTo(nl + ((nr - nl) * i) / 14, ny)
    g.stroke()
  }
  for (let i = 1; i < 4; i++) {
    g.beginPath()
    g.moveTo(nl, ny - (nh * i) / 4)
    g.lineTo(nr, ny - (nh * i) / 4)
    g.stroke()
  }
  g.fillStyle = '#fffaf0'
  g.fillRect(nl, ny - nh - 3, nr - nl, 5)
  g.fillStyle = '#d6dee3'
  g.fillRect(nl - 4, ny - nh - 6, 6, nh + 12)
  g.fillRect(nr - 2, ny - nh - 6, 6, nh + 12)

  // bloqueadora (adversaria): pula quando o corte esta chegando
  const jumpK = e.phase === 'spike' ? Math.max(0, (e.t / e.dur - 0.55) / 0.45) : e.phase === 'result' && e.rally ? 0.6 : 0
  const bu = lerp(LANE_U[0], LANE_U[2], bl / 2)
  person(g, X(bu, 0.45), Y(0.45), sc(0.45), { top: '#e9856b', shorts: '#2f6d78', hair: '#2a1a12', skin: '#c98e6a', jump: Math.sin(Math.min(1, jumpK) * Math.PI) * 0.5, arms: jumpK > 0 ? 1 : 0.35, facing: -1 })
  // sacadora no fundo
  person(g, X(e.rally.serveU, 0.05), Y(0.05), sc(0.05), { top: '#fbf7ee', shorts: '#e9856b', hair: '#6b4a2f', skin: '#efcdbd', arms: e.phase === 'intro' ? 0.9 : 0.3, facing: -1 })

  // jogadora (voce): vai ate o ponto do toque
  const pp = e.phase === 'spike' ? lerp(0, 1, Math.min(1, e.t / e.dur)) : 0
  const pos: [number, number] = e.phase === 'receive' || e.phase === 'intro' ? DIG : e.phase === 'set' ? [lerp(DIG[0], SETTER[0] + 0.08, ease(Math.min(1, e.t / e.dur))), lerp(DIG[1], SETTER[1] + 0.05, ease(Math.min(1, e.t / e.dur)))] : [lerp(SETTER[0] + 0.08, LANE_U[e.lane], ease(pp)), lerp(SETTER[1] + 0.05, 0.64, ease(pp))]
  const hitting = e.phase === 'spike' && e.t / e.dur > 0.5
  person(g, X(pos[0], pos[1]), Y(pos[1]), sc(pos[1]), {
    top: '#35c0bd', shorts: '#fbf7ee', hair: '#d8b46e', skin: '#efcdbd',
    jump: hitting ? Math.sin(Math.min(1, (e.t / e.dur - 0.5) / 0.5) * Math.PI) * 0.55 : 0,
    arms: e.phase === 'set' ? 0.85 : hitting ? 1 : 0.15,
  })

  // alvo + anel de timing
  if (e.phase === 'receive' || e.phase === 'set' || e.phase === 'spike') {
    const tgt = e.to
    const tx = X(tgt[0], tgt[1])
    const ty = Y(tgt[1])
    const R = 24 * sc(tgt[1])
    const k = Math.max(0, 1 - e.t / e.dur)
    g.lineWidth = 3
    g.strokeStyle = 'rgba(255,255,255,0.95)'
    g.beginPath()
    g.ellipse(tx, ty, R, R * 0.4, 0, 0, Math.PI * 2)
    g.stroke()
    if (e.cfg.guides) {
      const rr = R * (1 + 2.6 * k)
      g.strokeStyle = k < 0.07 ? '#ffe27a' : '#35c0bd'
      g.lineWidth = 4
      g.beginPath()
      g.ellipse(tx, ty, rr, rr * 0.4, 0, 0, Math.PI * 2)
      g.stroke()
    }
  }

  // bola + sombra
  const b = ballAt(e)
  const bx = X(b.u, b.v)
  const by = Y(b.v)
  const br = 10 * sc(b.v) * 1.1
  g.fillStyle = 'rgba(80,60,30,0.28)'
  g.beginPath()
  g.ellipse(bx, by, br * 1.1, br * 0.42, 0, 0, Math.PI * 2)
  g.fill()
  const lift = b.h * H * 0.2
  g.save()
  g.translate(bx, by - lift - br)
  const bg = g.createRadialGradient(-br * 0.3, -br * 0.3, br * 0.1, 0, 0, br)
  bg.addColorStop(0, '#ffffff')
  bg.addColorStop(1, '#e9e4da')
  g.fillStyle = bg
  g.beginPath()
  g.arc(0, 0, br, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = '#2f9fd0'
  g.lineWidth = Math.max(1.5, br * 0.16)
  g.beginPath()
  g.arc(0, 0, br * 0.78, 0.2, 1.7)
  g.stroke()
  g.strokeStyle = '#f6cf45'
  g.beginPath()
  g.arc(0, 0, br * 0.78, 3.3, 4.8)
  g.stroke()
  g.restore()

  // popups
  for (const p of e.popups) {
    g.globalAlpha = Math.max(0, 1 - p.t / 1.1)
    g.font = `800 ${Math.round(W * 0.056)}px system-ui, sans-serif`
    g.textAlign = 'center'
    g.lineWidth = 5
    g.strokeStyle = 'rgba(255,255,255,0.95)'
    g.strokeText(p.text, p.x, p.y - p.t * 38)
    g.fillStyle = p.color
    g.fillText(p.text, p.x, p.y - p.t * 38)
  }
  g.globalAlpha = 1
}

// ---------------------------------------------------------------- componente
type Screen = 'menu' | 'play' | 'results'
interface Results {
  tally: Tally
  stars: number
  coins: number
  xp: number
  board: Entry[]
  rank: number
  newBest: boolean
  difficulty: Difficulty
  daily: boolean
}

const TUTORIAL = [
  { t: 'Receba o saque', d: 'Um anel encolhe em volta do alvo. Toque num botão quando ele encostar na marca para fazer a manchete.' },
  { t: 'Levante e escolha a faixa', d: 'No segundo toque, a faixa em que você aperta é por onde vai o corte: esquerda, centro ou direita. Verde = livre, vermelho = bloqueadora.' },
  { t: 'Leia a bloqueadora e corte', d: 'Ela se mexe e às vezes finge. Acerte o tempo do corte: perfeito vale mais, e cortes seguidos aumentam o combo.' },
]

export default function VoleiGame({ onExit }: { onExit: () => void }) {
  const name = useProfileStore((s) => s.name)
  const [screen, setScreen] = useState<Screen>('menu')
  const [diff, setDiff] = useState<Difficulty>('normal')
  const [daily, setDaily] = useState(false)
  const [tut, setTut] = useState<number | null>(() => (readNum(TUT_KEY) ? null : 0))
  const [hud, setHud] = useState({ score: 0, combo: 0, hearts: HEARTS, rally: 1, phase: 'intro' as EPhase })
  const [res, setRes] = useState<Results | null>(null)
  const [paused, setPaused] = useState(false)
  const [best, setBest] = useState(() => readNum(BEST_KEY))
  const canvas = useRef<HTMLCanvasElement>(null)
  const eng = useRef<Engine | null>(null)
  const pausedRef = useRef(false)
  pausedRef.current = paused || tut !== null

  const finish = useCallback(
    (e: Engine) => {
      e.over = true
      const t = e.tally
      const d = diffRef.current
      const factor = DIFFICULTY_REWARD[d]
      const r = rewardsFor(t.score, d, t.kills, factor)
      grantRewards({ coins: t.rallies > 0 ? r.coins : 0, xp: t.rallies > 0 ? r.xp : 0 })
      const sub = submitScore(ID, d, t.score, TYPICAL[d], name)
      if (t.score > readNum(BEST_KEY)) writeStr(BEST_KEY, String(t.score))
      setBest(Math.max(readNum(BEST_KEY), t.score))
      setRes({ tally: { ...t }, stars: r.stars, coins: r.coins, xp: r.xp, board: sub.board, rank: sub.rank, newBest: sub.newBest, difficulty: d, daily: dailyRef.current })
      playSfx('done')
      setScreen('results')
    },
    [name],
  )
  const diffRef = useRef(diff)
  diffRef.current = diff
  const dailyRef = useRef(daily)
  dailyRef.current = daily

  const start = () => {
    const cfg = CFG[diff]
    const rand = daily ? rng(dailySeed(ID + ':' + diff)) : rng((Date.now() ^ 0x9e3779b9) >>> 0)
    const e = {
      cfg, rand, idx: 0, phase: 'intro', t: 0, dur: 0.7, from: [0.5, 0.07], to: DIG, peak: 1, lane: 1, pressed: false, tally: newTally(), popups: [], after: null,
      lastRating: null, over: false, paused: false, lost: false,
    } as unknown as Engine
    startRally(e)
    eng.current = e
    setHud({ score: 0, combo: 0, hearts: HEARTS, rally: 1, phase: 'intro' })
    setRes(null)
    setPaused(false)
    setScreen('play')
  }

  const popup = (e: Engine, text: string, color: string, near: 'ball' | 'hit' = 'hit') => {
    const c = canvas.current
    if (!c) return
    e.popups.push({ text, x: c.clientWidth * 0.5 + (near === 'ball' ? 0 : (e.rand() - 0.5) * 40), y: c.clientHeight * 0.52, t: 0, color })
  }

  const syncHud = (e: Engine) => setHud({ score: e.tally.score, combo: e.tally.combo, hearts: e.tally.hearts, rally: Math.min(RALLIES, e.idx + 1), phase: e.phase })

  const endRally = (e: Engine, lost: boolean) => {
    e.tally.rallies += 1
    if (lost) {
      e.tally.hearts -= 1
      e.tally.combo = 0
      playSfx('bad')
    }
    setPhase(e, 'result')
    syncHud(e)
  }

  /** toque do jogador: `lane` so importa no levantamento */
  const press = useCallback((lane: number) => {
    const e = eng.current
    if (!e || e.over || pausedRef.current) return
    if (e.phase !== 'receive' && e.phase !== 'set' && e.phase !== 'spike') return
    if (e.pressed) return
    const err = e.t - e.dur
    // toques muito cedo (antes da janela "ok" + folga) sao ignorados
    const early = -(0.55 * e.cfg.win + 0.1)
    if (err < early) return
    e.pressed = true
    const r = rate(err, e.cfg)
    e.lastRating = r
    const gained = addTouch(e.tally, r)
    if (e.phase === 'set') e.lane = lane
    if (r === 'miss') {
      popup(e, 'Errou!', '#d9534f')
      endRally(e, true)
      return
    }
    playSfx(r === 'perfect' ? 'combo' : 'tap')
    popup(e, `${RATING_LABEL[r]} +${gained}`, r === 'perfect' ? '#d99a00' : r === 'good' ? '#2f9fd0' : '#6a7a88')
    if (e.phase === 'receive') setPhase(e, 'set')
    else if (e.phase === 'set') setPhase(e, 'spike')
    else {
      const bl = Math.round(blockerLane(e))
      const sr = spikeResult(e.lane, bl)
      const g2 = addSpikeResult(e.tally, sr, r)
      if (sr === 'kill') {
        e.after = { from: e.to, to: [LANE_U[e.lane], 0.14], t: 0, dur: 0.38, peak: 0.12 }
        playSfx('serve')
        popup(e, `Ponto! +${g2}`, '#1f9a6a')
      } else {
        e.after = { from: e.to, to: [LANE_U[e.lane], 0.66], t: 0, dur: 0.5, peak: 0.45 }
        playSfx('bad')
        popup(e, 'Bloqueada!', '#d9534f')
      }
      endRally(e, false)
    }
    syncHud(e)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // laco do jogo
  useEffect(() => {
    if (screen !== 'play') return
    let raf = 0
    let last = performance.now()
    let time = 0
    const c = canvas.current
    if (!c) return
    const g = c.getContext('2d')
    if (!g) return
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const e = eng.current
      if (!e) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const W = c.clientWidth
      const H = c.clientHeight
      if (c.width !== Math.round(W * dpr)) {
        c.width = Math.round(W * dpr)
        c.height = Math.round(H * dpr)
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (!pausedRef.current && !e.over) {
        time += dt
        e.t += dt
        if (e.after) e.after.t += dt
        for (const p of e.popups) p.t += dt
        e.popups = e.popups.filter((p) => p.t < 1.1)
        if (e.phase === 'intro' && e.t >= e.dur) {
          setPhase(e, 'receive')
          playSfx('serve')
          syncHud(e)
        } else if ((e.phase === 'receive' || e.phase === 'set' || e.phase === 'spike') && !e.pressed && e.t > e.dur + WINDOW.ok * e.cfg.win + 0.05) {
          e.pressed = true
          e.lastRating = 'miss'
          e.tally.combo = 0
          popup(e, 'Tarde demais!', '#d9534f')
          endRally(e, true)
        } else if (e.phase === 'result' && e.t >= e.dur) {
          if (e.tally.hearts <= 0 || e.tally.rallies >= RALLIES) finish(e)
          else {
            e.idx += 1
            startRally(e)
            syncHud(e)
          }
        }
      }
      draw(g, W, H, e, time)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [screen, finish])

  // teclado
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.repeat) return
      if (ev.code === 'Escape') {
        if (tut !== null) setTut(null)
        else if (screen === 'play') setPaused((p) => !p)
        else onExit()
        return
      }
      if (screen !== 'play') return
      if (ev.code === 'ArrowLeft' || ev.code === 'KeyA') press(0)
      else if (ev.code === 'ArrowRight' || ev.code === 'KeyD') press(2)
      else if (ev.code === 'Space' || ev.code === 'ArrowUp' || ev.code === 'KeyW' || ev.code === 'Enter') {
        ev.preventDefault()
        press(1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [screen, press, onExit, tut])

  const closeTut = () => {
    writeStr(TUT_KEY, '1')
    setTut(null)
  }
  const hearts = useMemo(() => Array.from({ length: HEARTS }, (_, i) => i < hud.hearts), [hud.hearts])

  return (
    <div className="vb-root" role="dialog" aria-label="Vôlei de Praia">
      <div className="vb-top">
        <button type="button" className="vb-x" aria-label="Sair" onClick={onExit}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        <h2 className="vb-title">Vôlei de Praia</h2>
        {screen === 'play' && (
          <>
            <span className="vb-hearts" aria-label={`${hud.hearts} vidas`}>
              {hearts.map((on, i) => (
                <svg key={i} viewBox="0 0 24 24" width="22" height="22" className={on ? 'on' : ''}>
                  <path d="M12 20.5s-7.500-4.600-7.500-10A4.300 4.300 0 0 1 12 7.800 4.300 4.300 0 0 1 19.500 10.500c0 5.400-7.500 10-7.500 10z" fill="currentColor" />
                </svg>
              ))}
            </span>
            <button type="button" className="vb-pause" onClick={() => setPaused(true)} aria-label="Pausar">
              II
            </button>
          </>
        )}
      </div>

      {screen === 'play' && (
        <>
          <div className="vb-hud">
            <span>
              <small>Pontos</small>
              <b>{hud.score}</b>
            </span>
            <span>
              <small>Combo</small>
              <b>{hud.combo > 0 ? `x${hud.combo}` : '-'}</b>
            </span>
            <span>
              <small>Ponto</small>
              <b>
                {hud.rally}/{RALLIES}
              </b>
            </span>
          </div>
          <canvas ref={canvas} className="vb-canvas" onPointerDown={() => press(1)} />
          <div className="vb-hint">
            {hud.phase === 'set' ? 'Escolha a faixa: verde está livre' : hud.phase === 'spike' ? 'Corte agora no tempo certo' : hud.phase === 'receive' ? 'Manchete: toque quando o anel encostar' : ' '}
          </div>
          <div className="vb-pad">
            {['Esquerda', 'Centro', 'Direita'].map((l, i) => (
              <button key={l} type="button" className={`vb-lane vb-lane--${i}`} onPointerDown={(ev) => (ev.stopPropagation(), press(i))}>
                <span className="vb-lane__ar">{i === 0 ? '‹' : i === 2 ? '›' : '•'}</span>
                {l}
              </button>
            ))}
          </div>
        </>
      )}

      {screen === 'menu' && (
        <div className="vb-card">
          <div className="vb-hero" aria-hidden>
            <i className="vb-hero__sun" />
            <i className="vb-hero__sea" />
            <i className="vb-hero__ball" />
          </div>
          <p className="vb-lead">Três toques por timing: manchete, levantada e corte. Leia a bloqueadora e escolha a faixa livre.</p>
          <div className="vb-diff" role="radiogroup" aria-label="Dificuldade">
            {(['facil', 'normal', 'dificil', 'estrela'] as Difficulty[]).map((d) => (
              <button key={d} type="button" role="radio" aria-checked={diff === d} className={diff === d ? 'on' : ''} onClick={() => setDiff(d)}>
                {DIFFICULTY_LABEL[d]}
              </button>
            ))}
          </div>
          <label className="vb-daily">
            <input type="checkbox" checked={daily} onChange={(ev) => setDaily(ev.target.checked)} /> Desafio do dia (mesma partida para todas)
          </label>
          <div className="vb-best">Seu recorde: <b>{best}</b></div>
          <div className="vb-actions">
            <button type="button" className="vb-btn vb-btn--pri" onClick={start}>
              Jogar
            </button>
            <button type="button" className="vb-btn" onClick={() => setTut(0)}>
              Como jogar
            </button>
          </div>
        </div>
      )}

      {screen === 'results' && res && (
        <div className="vb-card">
          <h3 className="vb-res-title">{res.stars >= 3 ? 'Show de bola!' : res.stars === 2 ? 'Ótima partida!' : res.stars === 1 ? 'Boa partida!' : 'Quase lá!'}</h3>
          <div className="vb-stars" aria-label={`${res.stars} estrelas`}>
            {[0, 1, 2].map((i) => (
              <svg key={i} viewBox="0 0 24 24" width="38" height="38" className={i < res.stars ? 'on' : ''}>
                <path d="M12 3l2.600 5.600 6.100.8-4.500 4.200 1.200 6L12 16.600 6.600 19.600l1.200-6L3.300 9.400l6.100-.8z" fill="currentColor" />
              </svg>
            ))}
          </div>
          <div className="vb-score">{res.tally.score}<small>{res.newBest ? ' novo recorde!' : ''}</small></div>
          <ul className="vb-stats">
            <li>Cortes certeiros <b>{res.tally.kills}</b></li>
            <li>Toques perfeitos <b>{res.tally.perfects}</b></li>
            <li>Bloqueios sofridos <b>{res.tally.blocks}</b></li>
            <li>Maior combo <b>{res.tally.bestCombo}</b></li>
          </ul>
          <div className="vb-rew">+{res.coins} Brilhos · +{res.xp} XP</div>
          <ol className="vb-board">
            {res.board.slice(0, 6).map((en, i) => (
              <li key={i} className={en.you ? 'you' : ''}>
                <span>{i + 1}</span>
                <b>{en.name}</b>
                <em>{en.score}</em>
              </li>
            ))}
          </ol>
          <div className="vb-note">Ranking do dia {res.daily ? '(desafio do dia)' : ''} · posição {res.rank}</div>
          <div className="vb-actions">
            <button type="button" className="vb-btn vb-btn--pri" onClick={() => setScreen('menu')}>
              Jogar de novo
            </button>
            <button type="button" className="vb-btn" onClick={onExit}>
              Sair
            </button>
          </div>
        </div>
      )}

      {paused && screen === 'play' && (
        <div className="vb-overlay">
          <div className="vb-card vb-card--sm">
            <h3 className="vb-res-title">Pausado</h3>
            <div className="vb-actions">
              <button type="button" className="vb-btn vb-btn--pri" onClick={() => setPaused(false)}>
                Continuar
              </button>
              <button type="button" className="vb-btn" onClick={() => (setPaused(false), setScreen('menu'))}>
                Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {tut !== null && (
        <div className="vb-overlay">
          <div className="vb-card vb-card--sm">
            <div className="vb-step">Passo {tut + 1} de {TUTORIAL.length}</div>
            <h3 className="vb-res-title">{TUTORIAL[tut].t}</h3>
            <p className="vb-lead">{TUTORIAL[tut].d}</p>
            <div className="vb-actions">
              {tut < TUTORIAL.length - 1 ? (
                <button type="button" className="vb-btn vb-btn--pri" onClick={() => setTut(tut + 1)}>
                  Próximo
                </button>
              ) : (
                <button type="button" className="vb-btn vb-btn--pri" onClick={closeTut}>
                  Entendi
                </button>
              )}
              <button type="button" className="vb-btn" onClick={closeTut}>
                Pular
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
