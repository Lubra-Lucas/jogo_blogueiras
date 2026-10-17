import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { isMuted, playSfx, setMuted } from '../../../game/minigames/audio'
import { DIFFICULTY_LABEL, dailySeed, type Difficulty } from '../../../game/minigames/shared/competition'
import { bestOf, settle, starsFor, type Settled } from '../../../game/minigames/shared/settle'
import {
  DIFF_CFG, ROUNDS, SCORE, STAR_TH, THEME_NAME, TYPICAL, generateScene, personHeight, themeFor,
  type Entity, type Scene, type SceneTarget, type ThemeId,
} from '../../../game/minigames/procura/gen'
import { useProfileStore } from '../../../state/profileStore'
import { DiffPicker, IcoBulb, IcoHelp, IcoSearch, Overlay, ResultsCard, TopBar, Tutorial, markSeen, pref, seen, setPref, type TutStep } from '../shared/kit'
import { drawPerson, drawPet } from './drawPeople'
import { drawBackground } from './drawScene'
import './procura.css'

const TUT_KEY = 'jdb.procura.tutorial'
const CONTRAST_KEY = 'jdb.procura.contrast'

const HINTS: Record<Difficulty, string> = {
  facil: 'Cenas menores, 3 dicas, erro custa 2 s e as descrições têm poucos detalhes.',
  normal: 'Cenas médias, 2 dicas e erro custa 3 s.',
  dificil: 'Muita gente parecida (só a cor muda), 1 dica e erro custa 4 s.',
  estrela: 'Multidão enorme, 4 detalhes por alvo, sem dicas e erro custa 5 s.',
}

const TUT: TutStep[] = [
  { title: 'Leia a lista', body: 'Embaixo (ou ao lado, no celular deitado) está o que procurar: o retrato e a descrição. Há muita gente parecida, então confira cada detalhe: formato, acessório e cor.', fig: <div className="nj-tut-fig"><IcoSearch /></div> },
  { title: 'Explore a cena', body: 'No celular, arraste para mover e use dois dedos (pinça) para dar zoom. No computador, arraste com o mouse e use a roda para aproximar.', fig: <div className="nj-tut-fig"><IcoHelp /></div> },
  { title: 'Toque no alvo', body: 'Tocar na pessoa certa marca o alvo. Tocar errado custa tempo e pontos. A lâmpada dá uma dica: um círculo grande perto do alvo (poucas por partida).', fig: <div className="nj-tut-fig"><IcoBulb /></div> },
]

interface Game {
  difficulty: Difficulty
  daily: boolean
  seed: number
  round: number
  scene: Scene
  found: Set<number> // ids de entidades já achadas
  time: number
  total: number
  score: number
  combo: number
  bestCombo: number
  wrong: number
  hintsLeft: number
  hintsUsed: number
  foundTargets: number
  totalTargets: number
  lastFoundAt: number
  portraits: string[]
  phase: 'intro' | 'playing' | 'paused' | 'transition' | 'done'
  hint: { x: number; y: number; r: number; until: number } | null
  flashes: Array<{ x: number; y: number; t: number; ok: boolean }>
  settled: Settled | null
  finalScore: number
  timeLeftBonus: number
  allDone: boolean
}

const UNIT = 1.25
const boxOf = (e: Entity) => {
  const h = e.kind === 'person' ? personHeight(e.s) : 36 * UNIT * e.s
  const hw = (e.kind === 'person' ? 17 : 17) * UNIT * e.s
  return { x0: e.x - hw, x1: e.x + hw, y0: e.y - h - 4, y1: e.y + 3 }
}

function makePortrait(t: SceneTarget): string {
  const cv = document.createElement('canvas')
  cv.width = 120
  cv.height = 150
  const c = cv.getContext('2d')!
  c.fillStyle = '#efe7d6'
  c.fillRect(0, 0, 120, 150)
  const s = t.sample
  if (s.kind === 'person') drawPerson(c, s, 60, 144, 1.36, { contrast: false })
  else drawPet(c, { ...s, flip: false }, 56, 118, 3.4, { contrast: false })
  return cv.toDataURL('image/png')
}

function buildRound(g: Game, round: number, theme?: ThemeId) {
  const scene = generateScene(g.seed, round, g.difficulty, theme ?? themeFor(g.seed, round))
  g.scene = scene
  g.round = round
  g.found = new Set()
  g.hint = null
  g.hintsLeft = DIFF_CFG[g.difficulty].hints
  g.portraits = scene.targets.map(makePortrait)
}

export function ProcuraGame({ onExit }: { onExit: () => void }) {
  const [, force] = useReducer((x: number) => x + 1, 0)
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [daily, setDaily] = useState(false)
  const [muted, setMutedState] = useState(isMuted())
  const [contrast, setContrast] = useState(() => pref(CONTRAST_KEY))
  const [tutorial, setTutorial] = useState(false)
  const [live, setLive] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bgRef = useRef<HTMLCanvasElement | null>(null)
  const gRef = useRef<Game | null>(null)
  const view = useRef({ z: 1, cx: 0, cy: 0 })
  const size = useRef({ w: 0, h: 0, dpr: 1 })
  const dirty = useRef(true)
  const contrastRef = useRef(contrast)
  contrastRef.current = contrast

  const empty = useMemo<Game>(() => {
    const scene = generateScene(1, 0, 'facil', 'praca')
    return {
      difficulty: 'normal', daily: false, seed: 1, round: 0, scene, found: new Set(), time: 0, total: 1, score: 0, combo: 0, bestCombo: 0, wrong: 0,
      hintsLeft: 0, hintsUsed: 0, foundTargets: 0, totalTargets: 0, lastFoundAt: 0, portraits: [], phase: 'intro', hint: null, flashes: [], settled: null,
      finalScore: 0, timeLeftBonus: 0, allDone: false,
    }
  }, [])
  if (!gRef.current) gRef.current = empty
  const g = gRef.current

  // ---------------------------------------------------------------- vista
  const clampView = useCallback(() => {
    const { w, h } = size.current
    const sc = gRef.current!.scene
    const v = view.current
    if (!w || !h) return
    const minZ = Math.max(w / sc.W, h / sc.H)
    v.z = Math.max(minZ, Math.min(Math.max(minZ * 2.2, 2.4), v.z))
    const hw = w / (2 * v.z)
    const hh = h / (2 * v.z)
    v.cx = Math.max(hw, Math.min(sc.W - hw, v.cx))
    v.cy = Math.max(hh, Math.min(sc.H - hh, v.cy))
    dirty.current = true
  }, [])

  const resetView = useCallback(() => {
    const { w, h } = size.current
    const sc = gRef.current!.scene
    if (!w || !h) return
    view.current = { z: Math.max(w / sc.W, h / sc.H), cx: sc.W / 2, cy: sc.H * 0.6 }
    clampView()
  }, [clampView])

  const renderBg = useCallback(() => {
    const sc = gRef.current!.scene
    const r = Math.min(2, 3800 / sc.W)
    const cv = document.createElement('canvas')
    cv.width = Math.round(sc.W * r)
    cv.height = Math.round(sc.H * r)
    const c = cv.getContext('2d')!
    c.scale(r, r)
    drawBackground(c, sc)
    if (contrastRef.current) {
      c.setTransform(1, 0, 0, 1, 0, 0)
      c.globalCompositeOperation = 'source-over'
      c.fillStyle = 'rgba(244,240,230,0.55)'
      c.fillRect(0, 0, cv.width, cv.height)
    }
    bgRef.current = cv
    dirty.current = true
  }, [])

  // ---------------------------------------------------------------- tamanho do canvas
  useEffect(() => {
    const el = wrapRef.current
    const cv = canvasRef.current
    if (!el || !cv) return
    const fit = () => {
      const r = el.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      size.current = { w: Math.max(1, r.width), h: Math.max(1, r.height), dpr }
      cv.width = Math.round(r.width * dpr)
      cv.height = Math.round(r.height * dpr)
      cv.style.width = `${r.width}px`
      cv.style.height = `${r.height}px`
      clampView()
    }
    fit()
    resetView()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [clampView, resetView])

  useEffect(() => {
    renderBg()
  }, [contrast, renderBg])

  // ---------------------------------------------------------------- laço de desenho e tempo
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let lastSec = -1
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const G = gRef.current!
      if (G.phase === 'playing') {
        G.time -= dt
        const sec = Math.ceil(G.time)
        if (sec !== lastSec) {
          lastSec = sec
          force()
        }
        if (G.time <= 0) finish(false)
      }
      const cv = canvasRef.current
      const anim = G.hint || G.flashes.length > 0 || G.found.size > 0
      if (cv && bgRef.current && (dirty.current || anim)) {
        dirty.current = false
        paint(cv, G, bgRef.current, view.current, size.current, contrastRef.current, now)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onHide = () => {
      if (document.hidden && gRef.current!.phase === 'playing') pause()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------------------------------------------------------------- fluxo
  const start = () => {
    const seed = daily ? dailySeed('procura') : Math.floor(Math.random() * 2 ** 31)
    const cfg = DIFF_CFG[difficulty]
    const G = gRef.current!
    Object.assign(G, {
      difficulty, daily, seed, time: cfg.time, total: cfg.time, score: 0, combo: 0, bestCombo: 0, wrong: 0, hintsUsed: 0, foundTargets: 0,
      lastFoundAt: cfg.time, flashes: [], settled: null, finalScore: 0, timeLeftBonus: 0, allDone: false, phase: 'playing' as const,
    })
    buildRound(G, 0)
    G.totalTargets = 0
    for (let r = 0; r < ROUNDS; r++) G.totalTargets += r === 2 ? 3 : 2
    renderBg()
    resetView()
    playSfx('click')
    force()
    if (!seen(TUT_KEY)) {
      G.phase = 'paused'
      setTutorial(true)
    }
  }

  const pause = () => {
    const G = gRef.current!
    if (G.phase === 'playing') {
      G.phase = 'paused'
      force()
    }
  }
  const resume = () => {
    const G = gRef.current!
    if (G.phase === 'paused') {
      G.phase = 'playing'
      force()
    }
  }

  function finish(allDone: boolean) {
    const G = gRef.current!
    if (G.phase === 'done') return
    G.allDone = allDone
    const bonus = allDone ? Math.round(Math.max(0, G.time) * SCORE.timeBonus) : 0
    G.timeLeftBonus = bonus
    G.finalScore = Math.max(0, G.score + bonus)
    const stars = starsFor(G.finalScore, STAR_TH)
    G.settled = settle({
      rankId: 'procura', difficulty: G.difficulty, score: G.finalScore, typical: TYPICAL[G.difficulty], stars, profession: 'Fotógrafa',
      playerName: useProfileStore.getState().name,
    })
    G.phase = 'done'
    G.hint = null
    playSfx(stars >= 2 ? 'done' : 'serve')
    force()
  }

  const nextRound = () => {
    const G = gRef.current!
    if (G.round + 1 >= ROUNDS) return finish(true)
    buildRound(G, G.round + 1)
    renderBg()
    resetView()
    G.phase = 'playing'
    G.lastFoundAt = G.time
    force()
  }

  // ---------------------------------------------------------------- toque
  const tapAt = useCallback((wx: number, wy: number) => {
    const G = gRef.current!
    if (G.phase !== 'playing') return
    const tol = 10 / view.current.z
    let hit: Entity | null = null
    let bestD = Infinity
    for (let i = G.scene.entities.length - 1; i >= 0; i--) {
      const e = G.scene.entities[i]
      const b = boxOf(e)
      if (wx < b.x0 - tol || wx > b.x1 + tol || wy < b.y0 - tol || wy > b.y1 + tol) continue
      const d = Math.hypot(wx - e.x, (wy - (b.y0 + b.y1) / 2) * 0.8) - (e.y > 0 ? 0 : 0)
      if (d < bestD) {
        bestD = d
        hit = e
      }
    }
    const now = performance.now()
    if (!hit) {
      G.flashes.push({ x: wx, y: wy, t: now, ok: false })
      penalize(G)
      return
    }
    if (G.found.has(hit.id)) return
    const t = G.scene.targets.find((x) => x.ids.includes(hit!.id))
    if (!t) {
      G.flashes.push({ x: hit.x, y: hit.y - 40, t: now, ok: false })
      penalize(G)
      return
    }
    G.found.add(hit.id)
    G.flashes.push({ x: hit.x, y: hit.y - 40, t: now, ok: true })
    G.combo++
    G.bestCombo = Math.max(G.bestCombo, G.combo)
    const done = t.ids.filter((id) => G.found.has(id)).length
    const speed = Math.max(0, Math.round(60 - (G.lastFoundAt - G.time) * 1.6))
    G.score += Math.round(SCORE.found / t.count) + Math.min(SCORE.comboMax, SCORE.combo * (G.combo - 1)) / t.count + speed / t.count
    G.score = Math.round(G.score)
    G.lastFoundAt = G.time
    if (done === t.count) {
      G.foundTargets++
      setLive(`Alvo encontrado: ${t.text.replace('Ache ', '')}`)
    } else setLive(`Mais um: ${done} de ${t.count}`)
    playSfx(G.combo >= 3 ? 'combo' : 'serve')
    dirty.current = true
    if (G.scene.targets.every((x) => x.ids.every((id) => G.found.has(id)))) {
      G.score += SCORE.roundDone
      G.phase = 'transition'
      playSfx('tip')
      window.setTimeout(nextRound, 1300)
    }
    force()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function penalize(G: Game) {
    const cfg = DIFF_CFG[G.difficulty]
    G.wrong++
    G.combo = 0
    G.time -= cfg.penaltySec
    G.score = Math.max(0, G.score - SCORE.wrong)
    playSfx('bad')
    setLive('Não é esse. Perdeu um pouco de tempo.')
    dirty.current = true
    force()
  }

  const useHint = () => {
    const G = gRef.current!
    if (G.phase !== 'playing' || G.hintsLeft <= 0) return
    const t = G.scene.targets.find((x) => x.ids.some((id) => !G.found.has(id)))
    if (!t) return
    const id = t.ids.find((i) => !G.found.has(i))!
    const e = G.scene.entities.find((x) => x.id === id)!
    const R = 240
    const a = ((id * 2654435761) % 628) / 100
    G.hint = { x: e.x + Math.cos(a) * R * 0.45, y: e.y - 50 + Math.sin(a) * R * 0.45, r: R, until: performance.now() + 4500 }
    G.hintsLeft--
    G.hintsUsed++
    G.score = Math.max(0, G.score - SCORE.hint)
    // centraliza a dica na tela
    view.current.cx = G.hint.x
    view.current.cy = G.hint.y
    clampView()
    playSfx('tap')
    force()
  }

  // ---------------------------------------------------------------- gestos
  const ptrs = useRef(new Map<number, { x: number; y: number }>())
  const gest = useRef({ sx: 0, sy: 0, moved: false, lastDist: 0 })
  const toWorld = (sx: number, sy: number) => {
    const { w, h } = size.current
    const v = view.current
    return { x: (sx - w / 2) / v.z + v.cx, y: (sy - h / 2) / v.z + v.cy }
  }
  const zoomAt = (sx: number, sy: number, k: number) => {
    const v = view.current
    const before = toWorld(sx, sy)
    v.z *= k
    clampView()
    const { w, h } = size.current
    v.cx = before.x - (sx - w / 2) / v.z
    v.cy = before.y - (sy - h / 2) / v.z
    clampView()
  }
  const rel = (e: React.PointerEvent | React.WheelEvent) => {
    const r = wrapRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const onDown = (e: React.PointerEvent) => {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    const p = rel(e)
    ptrs.current.set(e.pointerId, p)
    if (ptrs.current.size === 1) gest.current = { sx: p.x, sy: p.y, moved: false, lastDist: 0 }
    else {
      gest.current.moved = true
      const [a, b] = [...ptrs.current.values()]
      gest.current.lastDist = Math.hypot(a.x - b.x, a.y - b.y)
    }
  }
  const onMove = (e: React.PointerEvent) => {
    const prev = ptrs.current.get(e.pointerId)
    if (!prev) return
    const p = rel(e)
    ptrs.current.set(e.pointerId, p)
    const v = view.current
    if (ptrs.current.size >= 2) {
      const [a, b] = [...ptrs.current.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      const mx = (a.x + b.x) / 2
      const my = (a.y + b.y) / 2
      if (gest.current.lastDist > 0) zoomAt(mx, my, d / gest.current.lastDist)
      gest.current.lastDist = d
      v.cx -= (p.x - prev.x) / 2 / v.z
      v.cy -= (p.y - prev.y) / 2 / v.z
      clampView()
    } else {
      if (!gest.current.moved && Math.hypot(p.x - gest.current.sx, p.y - gest.current.sy) > 7) gest.current.moved = true
      if (gest.current.moved) {
        v.cx -= (p.x - prev.x) / v.z
        v.cy -= (p.y - prev.y) / v.z
        clampView()
      }
    }
  }
  const onUp = (e: React.PointerEvent) => {
    const p = rel(e)
    const single = ptrs.current.size === 1
    ptrs.current.delete(e.pointerId)
    if (single && !gest.current.moved && e.type === 'pointerup') {
      const w = toWorld(p.x, p.y)
      tapAt(w.x, w.y)
    }
    if (ptrs.current.size < 2) gest.current.lastDist = 0
  }
  const onWheel = (e: React.WheelEvent) => {
    const p = rel(e)
    zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.0015))
  }

  // teclado (PC): setas movem, + e - dão zoom, Esc pausa, H dica
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const G = gRef.current!
      const v = view.current
      const step = 80 / v.z
      if (e.code === 'Escape') {
        if (tutorial) return
        if (G.phase === 'playing') pause()
        else if (G.phase === 'paused') resume()
        else if (G.phase === 'intro' || G.phase === 'done') onExit()
        return
      }
      if (G.phase !== 'playing') return
      if (e.code === 'ArrowLeft') v.cx -= step
      else if (e.code === 'ArrowRight') v.cx += step
      else if (e.code === 'ArrowUp') v.cy -= step
      else if (e.code === 'ArrowDown') v.cy += step
      else if (e.code === 'Equal' || e.code === 'NumpadAdd') zoomAt(size.current.w / 2, size.current.h / 2, 1.25)
      else if (e.code === 'Minus' || e.code === 'NumpadSubtract') zoomAt(size.current.w / 2, size.current.h / 2, 0.8)
      else if (e.code === 'KeyH') useHint()
      else return
      e.preventDefault()
      clampView()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorial])

  // ganchos de DEV para automação (screenshots e partidas completas)
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as { __procura?: unknown }
    w.__procura = {
      state: () => ({ phase: gRef.current!.phase, round: gRef.current!.round, score: gRef.current!.score, time: gRef.current!.time, theme: gRef.current!.scene.theme, ents: gRef.current!.scene.entities.length, size: [gRef.current!.scene.W, gRef.current!.scene.H] }),
      solveNext: (wrong = false) => {
        const G = gRef.current!
        if (wrong) {
          const e = G.scene.entities.find((x) => !G.scene.targets.some((t) => t.ids.includes(x.id)))!
          tapAt(e.x, e.y - 30)
          return
        }
        const t = G.scene.targets.find((x) => x.ids.some((id) => !G.found.has(id)))
        if (!t) return
        const e = G.scene.entities.find((x) => x.id === t.ids.find((id) => !G.found.has(id)))!
        tapAt(e.x, e.y - 30)
      },
      setView: (z: number, cx: number, cy: number) => {
        Object.assign(view.current, { z, cx, cy })
        clampView()
      },
      focusTarget: (i: number, z = 1.4) => {
        const G = gRef.current!
        const e = G.scene.entities.find((x) => x.id === G.scene.targets[i].ids[0])!
        Object.assign(view.current, { z, cx: e.x, cy: e.y - 40 })
        clampView()
      },
      hint: () => useHint(),
      load: (theme: ThemeId, round = 0) => {
        buildRound(gRef.current!, round, theme)
        renderBg()
        resetView()
        force()
      },
      finish: () => finish(false),
    }
    return () => {
      delete w.__procura
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const phase = g.phase
  const toggleContrast = () => {
    const v = !contrast
    setContrast(v)
    setPref(CONTRAST_KEY, v)
    dirty.current = true
  }
  const st = g.settled
  const nStars = st?.stars ?? 0

  return (
    <div className={`nj pr${contrast ? ' nj--hc' : ''}`} data-phase={phase}>
      <TopBar
        title="Cadê a Blogueira?"
        time={g.time}
        total={g.total}
        score={g.score}
        playing={phase === 'playing'}
        muted={muted}
        onExit={onExit}
        onMute={() => (setMuted(!muted), setMutedState(!muted))}
        onPause={pause}
        contrast={contrast}
        onContrast={toggleContrast}
      />
      <div className="pr-main">
        <div className="pr-scene" ref={wrapRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel}>
          <canvas ref={canvasRef} role="img" aria-label={`Cena: ${THEME_NAME[g.scene.theme]}`} />
          {phase !== 'intro' && (
            <div className="pr-scene-tag">
              <b>{THEME_NAME[g.scene.theme]}</b>
              <span>Cena {g.round + 1} de {ROUNDS}</span>
            </div>
          )}
          {phase === 'transition' && <div className="pr-banner">Cena concluída!</div>}
        </div>
        <aside className="pr-targets" aria-label="O que procurar">
          {g.scene.targets.map((t, i) => {
            const n = t.ids.filter((id) => g.found.has(id)).length
            const done = n === t.count
            return (
              <div key={t.id} className={`pr-target${done ? ' done' : ''}`}>
                {g.portraits[i] && <img src={g.portraits[i]} alt="" width={40} height={50} draggable={false} />}
                <div className="pr-target-txt">
                  <span>{t.text}</span>
                  {t.count > 1 && <em>{n} de {t.count}</em>}
                </div>
                <i className="pr-tick" aria-label={done ? 'Encontrado' : 'Procurando'}>{done ? <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg> : null}</i>
              </div>
            )
          })}
          <button className="pr-hint" onClick={useHint} disabled={phase !== 'playing' || g.hintsLeft <= 0} aria-label={`Dica, restam ${g.hintsLeft}`}>
            <IcoBulb />Dica <b>{g.hintsLeft}</b>
          </button>
        </aside>
      </div>
      <div className="sr-only" role="status" aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{live}</div>

      {phase === 'intro' && (
        <Overlay>
          <h1>Cadê a Blogueira?</h1>
          <p>Uma cena lotada, uma lista de alvos. Ache cada um pela descrição antes que o tempo acabe: {ROUNDS} cenas por partida.</p>
          <DiffPicker value={difficulty} onChange={setDifficulty} hints={HINTS} />
          <label className="nj-check"><input type="checkbox" checked={daily} onChange={(e) => setDaily(e.target.checked)} /><span>Desafio do dia: mesmas cenas para todas</span></label>
          <label className="nj-check"><input type="checkbox" checked={contrast} onChange={toggleContrast} /><span>Alto contraste: fundo suave e contornos fortes nas pessoas</span></label>
          <div className="nj-stats">
            <div><b>{bestOf('procura', difficulty)}</b><small>Recorde ({DIFFICULTY_LABEL[difficulty]})</small></div>
            <div><b>{DIFF_CFG[difficulty].time}s</b><small>Tempo total</small></div>
          </div>
          <div className="nj-actions">
            <button className="nj-cta" onClick={start}>Começar</button>
            <button className="nj-cta nj-cta--ghost" onClick={() => setTutorial(true)}><IcoHelp />Como jogar</button>
            <button className="nj-cta nj-cta--ghost" onClick={onExit}>Sair</button>
          </div>
          <div className="nj-keys">PC: arraste, roda do mouse para zoom, setas movem, + e - zoom, H dica.</div>
        </Overlay>
      )}
      {phase === 'paused' && !tutorial && (
        <Overlay>
          <h2>Pausado</h2>
          <p>A multidão espera por você.</p>
          <div className="nj-actions">
            <button className="nj-cta" onClick={resume}>Continuar</button>
            <button className="nj-cta nj-cta--ghost" onClick={() => setTutorial(true)}>Como jogar</button>
            <button className="nj-cta nj-cta--ghost" onClick={onExit}>Sair</button>
          </div>
        </Overlay>
      )}
      {tutorial && (
        <Tutorial
          steps={TUT}
          onDone={() => {
            markSeen(TUT_KEY)
            setTutorial(false)
            if (gRef.current!.phase === 'paused') resume()
          }}
        />
      )}
      {phase === 'done' && st && (
        <ResultsCard
          message={['Tente de novo, a multidão engana!', 'Bom olhar!', 'Olho de lince!', 'Detetive da moda!'][nStars]}
          stars={nStars}
          score={g.finalScore}
          best={bestOf('procura', g.difficulty)}
          newBest={st.newBest}
          daily={g.daily}
          lines={[
            ['Alvos encontrados', `${g.foundTargets} de ${g.totalTargets}`],
            ['Erros', String(g.wrong)],
            ['Dicas usadas', String(g.hintsUsed)],
            ['Melhor sequência', String(g.bestCombo)],
            ['Bônus de tempo', `+${g.timeLeftBonus}`],
          ]}
          coins={st.coins}
          xp={st.xp}
          profXp={st.profXp}
          profession="Fotógrafa"
          board={st.board}
          rank={st.rank}
          thresholds={STAR_TH}
          onAgain={start}
          onChange={() => {
            gRef.current!.phase = 'intro'
            force()
          }}
          onExit={onExit}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------- pintura
function paint(cv: HTMLCanvasElement, G: Game, bg: HTMLCanvasElement, v: { z: number; cx: number; cy: number }, sz: { w: number; h: number; dpr: number }, contrast: boolean, now: number) {
  const c = cv.getContext('2d')!
  const { w, h, dpr } = sz
  c.setTransform(dpr, 0, 0, dpr, 0, 0)
  c.fillStyle = '#10141c'
  c.fillRect(0, 0, w, h)
  const sc = G.scene
  c.save()
  c.translate(w / 2 - v.cx * v.z, h / 2 - v.cy * v.z)
  c.scale(v.z, v.z)
  c.imageSmoothingQuality = 'high'
  c.drawImage(bg, 0, 0, sc.W, sc.H)
  const vx0 = v.cx - w / (2 * v.z) - 80
  const vx1 = v.cx + w / (2 * v.z) + 80
  const vy0 = v.cy - h / (2 * v.z) - 20
  const vy1 = v.cy + h / (2 * v.z) + 220
  const o = { contrast }
  for (const e of sc.entities) {
    if (e.x < vx0 || e.x > vx1 || e.y < vy0 || e.y > vy1) continue
    if (e.kind === 'person') drawPerson(c, e, e.x, e.y, e.s * UNIT, o)
    else drawPet(c, e, e.x, e.y, e.s * UNIT, o)
  }
  // marcadores de alvos achados
  for (const e of sc.entities) {
    if (!G.found.has(e.id)) continue
    const b = boxOf(e)
    const cx = (b.x0 + b.x1) / 2
    const cy = (b.y0 + b.y1) / 2
    const rr = Math.max(b.x1 - b.x0, b.y1 - b.y0) * 0.55
    const pulse = 1 + Math.sin(now / 260) * 0.04
    c.lineWidth = 5 / Math.sqrt(v.z)
    c.strokeStyle = '#0f1a2c'
    c.beginPath()
    c.ellipse(cx, cy, rr * 0.72 * pulse, rr * pulse, 0, 0, Math.PI * 2)
    c.stroke()
    c.lineWidth = 3 / Math.sqrt(v.z)
    c.strokeStyle = '#f4d37a'
    c.stroke()
  }
  // dica
  if (G.hint) {
    if (now > G.hint.until) G.hint = null
    else {
      const k = Math.min(1, (G.hint.until - now) / 700)
      c.globalAlpha = k
      c.setLineDash([18, 12])
      c.lineWidth = 6 / Math.sqrt(v.z)
      c.strokeStyle = '#0f1a2c'
      c.beginPath()
      c.arc(G.hint.x, G.hint.y, G.hint.r, 0, Math.PI * 2)
      c.stroke()
      c.lineWidth = 3.5 / Math.sqrt(v.z)
      c.strokeStyle = '#f4d37a'
      c.stroke()
      c.setLineDash([])
      c.globalAlpha = 1
    }
  }
  // flashes de acerto/erro
  G.flashes = G.flashes.filter((f) => now - f.t < 700)
  for (const f of G.flashes) {
    const k = (now - f.t) / 700
    c.globalAlpha = 1 - k
    c.lineCap = 'round'
    if (f.ok) {
      c.fillStyle = '#f4d37a'
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        c.beginPath()
        c.arc(f.x + Math.cos(a) * (20 + k * 60), f.y + Math.sin(a) * (20 + k * 60), 5 * (1 - k), 0, Math.PI * 2)
        c.fill()
      }
    } else {
      c.strokeStyle = '#d4505e'
      c.lineWidth = 7 / Math.sqrt(v.z)
      const s = 18 + k * 8
      c.beginPath()
      c.moveTo(f.x - s, f.y - s)
      c.lineTo(f.x + s, f.y + s)
      c.moveTo(f.x + s, f.y - s)
      c.lineTo(f.x - s, f.y + s)
      c.stroke()
    }
    c.globalAlpha = 1
  }
  c.restore()
}

export default ProcuraGame
