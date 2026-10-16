import { useEffect, useMemo, useRef, useState } from 'react'
import { playSfx } from '../../../game/minigames/audio'
import { rng } from '../../../game/minigames/shared/competition'
import { isUnlocked } from '../../../game/minigames/petshared/level'
import { BANHO_MAX, BANHO_TYPICAL, GRADE_LABEL, SENSITIVE, gaugePos, gradeTap, makeSpots, paramsFor, scrub, stage1Score, stage2Score, type Spot, type TapGrade } from '../../../game/minigames/petbanho/logic'
import { PetArt } from '../../pets/minigame/PetArt'
import { Shell, type PlayProps, type ResultInput } from '../../pets/minigame/Shell'
import { IconPaw } from '../../pets/icons'
import './banho.css'

interface Foam {
  x: number
  y: number
  r: number
}

const VB = { w: 400, h: 420 }

function toSvg(el: HTMLElement, cx: number, cy: number) {
  const r = el.getBoundingClientRect()
  const k = Math.min(r.width / VB.w, r.height / VB.h)
  const ox = r.left + (r.width - VB.w * k) / 2
  const oy = r.top + (r.height - VB.h * k) / 2
  return { x: (cx - ox) / k, y: (cy - oy) / k }
}

function Play({ difficulty, seed, level, paused, look, onFinish }: PlayProps) {
  const P = useMemo(() => paramsFor(difficulty, isUnlocked('shampoo', level)), [difficulty, level])
  const golden = isUnlocked('escova', level)
  const spots = useRef<Spot[]>(makeSpots(seed, P.spots, P.spotR))
  const foam = useRef<Foam[]>([])
  const wiggles = useRef(0)
  const sensDist = useRef(0)
  const pointer = useRef<{ x: number; y: number } | null>(null)
  const last = useRef<{ x: number; y: number } | null>(null)
  const stageBox = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState<1 | 2 | 'mid'>(1)
  const [left, setLeft] = useState(P.time)
  const [, force] = useState(0)
  const s1 = useRef(0)
  // estagio 2
  const tapsLeft = useRef(P.taps)
  const pts = useRef<number[]>([])
  const combo = useRef(0)
  const bestCombo = useRef(0)
  const center = useRef(0.5)
  const clock = useRef(0)
  const [pos, setPos] = useState(0)
  const [fb, setFb] = useState<{ id: number; grade: TapGrade } | null>(null)
  const done = useRef(false)
  const randTap = useRef(rng(seed + 77))
  const [warn, setWarn] = useState(0)
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  // laco de tempo
  useEffect(() => {
    let raf = 0
    let prev = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      if (!pausedRef.current && !done.current) {
        if (stage === 1) {
          setLeft((l) => {
            const n = l - dt
            return n < 0 ? 0 : n
          })
        } else if (stage === 2) {
          clock.current += dt
          setPos(gaugePos(clock.current, P.gaugeSpeed * (1 + (P.taps - tapsLeft.current) * 0.04)))
        }
        force((v) => (v + 1) % 1000)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [stage, P])

  // fim do estagio 1
  useEffect(() => {
    if (stage !== 1) return
    const all = spots.current.every((s) => s.done >= 1)
    if (left <= 0 || all) {
      s1.current = stage1Score(spots.current, left, P.time, wiggles.current)
      playSfx(all ? 'done' : 'tap')
      setStage('mid')
      window.setTimeout(() => {
        center.current = 0.25 + randTap.current() * 0.5
        clock.current = 0
        setStage(2)
      }, 1100)
    }
  })

  const move = (e: React.PointerEvent) => {
    if (stage !== 1 || paused || !pointer.current) return
    const el = stageBox.current
    if (!el) return
    const p = toSvg(el, e.clientX, e.clientY)
    const prev = last.current ?? p
    const dist = Math.hypot(p.x - prev.x, p.y - prev.y)
    pointer.current = p
    last.current = p
    const r = scrub(spots.current, p.x, p.y, dist, P.gain)
    if (dist > 0.5) {
      const f = foam.current
      f.push({ x: p.x, y: p.y, r: 9 + (dist % 7) })
      if (f.length > 220) f.shift()
    }
    if (r.cleaned) playSfx('tap')
    if (r.sensitive) {
      sensDist.current += dist
      if (sensDist.current > 55) {
        sensDist.current = 0
        wiggles.current += 1
        setWarn((w) => w + 1)
        playSfx('bad')
      }
    }
  }

  const tap = () => {
    if (stage !== 2 || paused || done.current) return
    const g = gradeTap(pos, center.current, P.zoneW)
    pts.current.push(g.pts)
    if (g.grade === 'errou' || g.grade === 'bom') combo.current = 0
    else combo.current += 1
    bestCombo.current = Math.max(bestCombo.current, combo.current)
    playSfx(g.grade === 'errou' ? 'bad' : g.grade === 'perfeito' ? 'combo' : 'tap')
    setFb({ id: Date.now(), grade: g.grade })
    tapsLeft.current -= 1
    center.current = 0.2 + randTap.current() * 0.6
    if (tapsLeft.current <= 0) {
      done.current = true
      window.setTimeout(() => finish(), 700)
    }
  }
  const tapRef = useRef(tap)
  tapRef.current = tap

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) {
        e.preventDefault()
        e.stopPropagation()
        tapRef.current()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  const finish = () => {
    const s2 = stage2Score(pts.current, bestCombo.current, golden)
    const score = s1.current + s2
    const typ = BANHO_TYPICAL[difficulty]
    const ratio = score / typ
    const clean = Math.round((spots.current.reduce((a, s) => a + s.done, 0) / Math.max(1, spots.current.length)) * 100)
    const res: ResultInput = {
      score,
      judge: ratio >= 1.15 ? 'Banho de campeã!' : ratio >= 0.85 ? 'Pet brilhando!' : ratio >= 0.5 ? 'Bom banho' : 'Dá para melhorar',
      lines: [
        { label: 'Limpeza', value: `${clean}%` },
        { label: 'Cuidado (olhos e nariz)', value: wiggles.current === 0 ? 'Sem sustos' : `${wiggles.current} susto${wiggles.current > 1 ? 's' : ''}` },
        { label: 'Enxágue', value: `${pts.current.filter((p) => p >= 80).length} de ${P.taps} no alvo` },
        { label: 'Melhor sequência', value: String(bestCombo.current) },
      ],
    }
    onFinish(res)
  }

  const clean = Math.round((spots.current.reduce((a, s) => a + s.done, 0) / Math.max(1, spots.current.length)) * 100)
  const m = pointer.current
  return (
    <div className="bn-root">
      <div className="bn-hud">
        <div className="bn-title">
          <IconPaw /> {stage === 2 ? 'Enxaguar' : 'Ensaboar'}
        </div>
        {stage === 1 || stage === 'mid' ? (
          <>
            <div className="bn-bar" title="Tempo">
              <i style={{ width: `${(left / P.time) * 100}%` }} />
            </div>
            <div className="bn-stat">Limpeza {clean}%</div>
          </>
        ) : (
          <div className="bn-stat">
            Rodadas {P.taps - tapsLeft.current}/{P.taps} · Sequência {combo.current}
          </div>
        )}
      </div>

      <div
        className="bn-stage"
        ref={stageBox}
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          if (stage === 2) return tap()
          if (stage !== 1) return
          e.currentTarget.setPointerCapture(e.pointerId)
          const p = toSvg(e.currentTarget, e.clientX, e.clientY)
          pointer.current = p
          last.current = p
        }}
        onPointerMove={move}
        onPointerUp={() => {
          pointer.current = null
          last.current = null
        }}
        onPointerCancel={() => {
          pointer.current = null
          last.current = null
        }}
      >
        <PetArt look={look} pose="sit" wiggle={warn > 0 && m !== null && SENSITIVE.some((z) => Math.hypot(m.x - z.x, m.y - z.y) < z.r)}>
          {spots.current.map((s) => (
            <g key={s.id} opacity={1 - s.done * 0.92}>
              <circle cx={s.x} cy={s.y} r={s.r} fill="#6f5238" opacity="0.62" />
              <circle cx={s.x - s.r * 0.25} cy={s.y - s.r * 0.2} r={s.r * 0.4} fill="#5a4129" opacity="0.5" />
            </g>
          ))}
          {P.hint &&
            stage === 1 &&
            SENSITIVE.map((z, i) => <circle key={i} cx={z.x} cy={z.y} r={z.r} fill="none" stroke="#c9485b" strokeWidth="2.5" strokeDasharray="5 5" opacity="0.8" />)}
          {stage === 1 && foam.current.map((f, i) => <circle key={i} cx={f.x} cy={f.y} r={f.r} fill="#fff" opacity="0.72" stroke="#cfe8f0" strokeWidth="1.5" />)}
          {stage === 2 &&
            Array.from({ length: tapsLeft.current }, (_, i) => {
              const a = i * 2.4
              return <circle key={i} cx={200 + Math.cos(a) * (70 + (i % 3) * 22)} cy={290 + Math.sin(a) * 52 - (i % 4) * 8} r={20 + (i % 3) * 5} fill="#fff" opacity="0.86" stroke="#cfe8f0" strokeWidth="2" />
            })}
          {m && stage === 1 && <ellipse cx={m.x} cy={m.y} rx="16" ry="12" fill="#f0c453" stroke="#b88a1c" strokeWidth="2.5" />}
        </PetArt>
        {stage === 'mid' && <div className="bn-banner">Ensaboado! Agora enxágue</div>}
        {stage === 1 && warn > 0 && <div className="bn-warn" key={warn}>Cuidado com os olhos e o nariz!</div>}
        {stage === 1 && spots.current.every((s) => s.done === 0) && <div className="bn-hintbar">Arraste a esponja sobre as manchas</div>}
      </div>

      {stage === 2 && (
        <div className="bn-gauge-wrap">
          <div className="bn-gauge" aria-label="Pressão da água">
            <i className="bn-zone" style={{ left: `${(center.current - P.zoneW / 2) * 100}%`, width: `${P.zoneW * 100}%` }} />
            <i className="bn-zone bn-zone--core" style={{ left: `${(center.current - P.zoneW * 0.15) * 100}%`, width: `${P.zoneW * 0.3 * 100}%` }} />
            <b className="bn-needle" style={{ left: `${pos * 100}%` }} />
          </div>
          <button type="button" className="ps-btn bn-tap" onClick={tap}>
            Enxaguar
          </button>
          {fb && (
            <div className={`bn-fb bn-fb--${fb.grade}`} key={fb.id}>
              {GRADE_LABEL[fb.grade]}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function BanhoGame({ onExit }: { onExit: () => void }) {
  return (
    <Shell
      id="petbanho"
      title="Banho e Tosa"
      tagline="Deixe o pet limpinho e cheiroso. Capricho vale pontos."
      accent="#2f8a76"
      icon={<IconPaw />}
      max={BANHO_MAX}
      typical={BANHO_TYPICAL}
      diffNotes={{
        facil: '4 manchas grandes, áreas sensíveis marcadas, tempo de sobra',
        normal: '6 manchas, ponteiro moderado',
        dificil: '8 manchas pequenas e faixa de enxágue estreita',
        estrela: '9 manchas, sem dicas, ponteiro rápido',
      }}
      steps={[
        { title: 'Ensaboe', text: 'Arraste a esponja sobre as manchas marrons até sumirem. Evite os olhos e o nariz: o pet se assusta e você perde pontos.' },
        { title: 'Enxágue', text: 'Toque (ou use Espaço) quando o ponteiro estiver na faixa verde. O centro vale mais pontos.' },
        { title: 'Sequência', text: 'Acertos seguidos em "Perfeito" e "Ótimo" formam uma sequência com bônus. O tempo restante também conta.' },
      ]}
      play={(p) => <Play {...p} />}
      onExit={onExit}
    />
  )
}
