import { useCallback, useEffect, useRef, useState } from 'react'
import { useAchievements } from '../../../game/casino/achievements'
import { fmtChips, useChips } from '../../../game/casino/chips'
import { finishRound, type RoundReport } from '../../../game/casino/report'
import {
  KIND_LABEL, PAYS, ROULETTE_LIMITS, WHEEL_ORDER, betKey, colorOf, column, corner, dozen, numAt, outside, pocketAngle,
  sixline, spin, split, straight, street, totalReturn, totalStake, type BetSpec, type PlacedBet,
} from '../../../game/minigames/casino/roulette'
import { casinoSfx } from '../../../game/minigames/casino/sfx'
import { CHIP_VALUES, ChipArt, IcoClear, IcoRepeat, IcoUndo } from './art'
import { ChipRack, DifficultyPicker, Topbar } from './shared'
import { useCz } from './ui'

/* ---------- tabuleiro ---------- */
const CW = 46
const CH = 46
interface Spot { key: string; spec: BetSpec; x: number; y: number; w: number; h: number; z: number; label?: string; cls?: string }

function buildSpots(): Spot[] {
  const spots: Spot[] = []
  const add = (spec: BetSpec, x: number, y: number, w: number, h: number, z: number, label?: string, cls?: string) =>
    spots.push({ key: betKey(spec), spec, x, y, w, h, z, label, cls })
  // zero
  add(straight(0), 0, 0, CW, 3 * CH, 0, '0', 'green')
  for (let r = 0; r < 12; r++) {
    for (let c = 0; c < 3; c++) {
      const n = numAt(r, c)
      add(straight(n), (r + 1) * CW, (2 - c) * CH, CW, CH, 0, String(n), colorOf(n))
    }
  }
  add(column(2), 13 * CW, 0, CW, CH, 0, '2:1', 'out')
  add(column(1), 13 * CW, CH, CW, CH, 0, '2:1', 'out')
  add(column(0), 13 * CW, 2 * CH, CW, CH, 0, '2:1', 'out')
  for (let d = 0; d < 3; d++) add(dozen(d as 0 | 1 | 2), (1 + d * 4) * CW, 3 * CH, 4 * CW, CH, 0, ['1ª dúzia', '2ª dúzia', '3ª dúzia'][d], 'out')
  const outs: ['low' | 'even' | 'red' | 'black' | 'odd' | 'high', string][] = [['low', '1 a 18'], ['even', 'Par'], ['red', ''], ['black', ''], ['odd', 'Ímpar'], ['high', '19 a 36']]
  outs.forEach(([k, label], i) => add(outside(k), (1 + i * 2) * CW, 4 * CH, 2 * CW, CH, 0, label, k === 'red' ? 'red-out' : k === 'black' ? 'black-out' : 'out'))
  // cavalos (horizontais: entre colunas vizinhas do tabuleiro, mesma fileira)
  for (let r = 0; r < 11; r++) for (let c = 0; c < 3; c++) add(split(numAt(r, c), numAt(r + 1, c)), (r + 2) * CW - 7, (2 - c) * CH + CH / 2 - 7, 14, 14, 2)
  for (let r = 0; r < 12; r++) for (let c = 0; c < 2; c++) add(split(numAt(r, c), numAt(r, c + 1)), (r + 1) * CW + CW / 2 - 7, (2 - c) * CH - 7, 14, 14, 2)
  for (let c = 0; c < 3; c++) add(split(0, numAt(0, c)), CW - 7, (2 - c) * CH + CH / 2 - 7, 14, 14, 2)
  // quadras
  for (let r = 0; r < 11; r++) for (let c = 0; c < 2; c++) add(corner(r, c), (r + 2) * CW - 8, (2 - c) * CH - 8, 16, 16, 3)
  // linhas (3 números) e sextinas na borda de baixo do tabuleiro
  for (let r = 0; r < 12; r++) add(street(r), (r + 1) * CW + CW / 2 - 8, 3 * CH - 8, 16, 16, 3)
  for (let r = 0; r < 11; r++) add(sixline(r), (r + 2) * CW - 8, 3 * CH - 8, 16, 16, 4)
  return spots
}
const SPOTS = buildSpots()
const SPOT_BY_KEY = new Map(SPOTS.map((s) => [s.key, s]))

/* ---------- roda ---------- */
const R_OUT = 138
const R_TRACK = 124
const R_POCKET = 100
const R_IN = 72

function polar(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180
  return [150 + r * Math.sin(a), 150 - r * Math.cos(a)]
}
function wedge(i: number): string {
  const a0 = ((i - 0.5) * 360) / 37
  const a1 = ((i + 0.5) * 360) / 37
  const p = [polar(R_POCKET + 12, a0), polar(R_POCKET + 12, a1), polar(R_IN, a1), polar(R_IN, a0)]
  return `M${p[0][0]} ${p[0][1]} A${R_POCKET + 12} ${R_POCKET + 12} 0 0 1 ${p[1][0]} ${p[1][1]} L${p[2][0]} ${p[2][1]} A${R_IN} ${R_IN} 0 0 0 ${p[3][0]} ${p[3][1]}Z`
}
const FILL = { red: '#9d1a2b', black: '#16161b', green: '#176b44' } as const

const SPIN_MS = 6200

export function Roulette({ onBack }: { onBack: () => void }) {
  const diff = useCz((c) => c.difficulty)
  const setDiff = useCz((c) => c.setDifficulty)
  const balance = useChips((c) => c.balance)
  const [chip, setChip] = useState<number>(10)
  const [bets, setBets] = useState<PlacedBet[]>([])
  const [undo, setUndo] = useState<string[]>([])
  const [last, setLast] = useState<PlacedBet[]>([])
  const [history, setHistory] = useState<number[]>([])
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<{ n: number; ret: number; stake: number; report: RoundReport } | null>(null)
  const [drag, setDrag] = useState<{ v: number; x: number; y: number } | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const wheelRef = useRef<SVGGElement>(null)
  const ballRef = useRef<SVGCircleElement>(null)
  const raf = useRef(0)
  const alive = useRef(true)
  useEffect(() => () => {
    alive.current = false
    cancelAnimationFrame(raf.current)
  }, [])

  const stake = totalStake(bets)
  const maxTotal = ROULETTE_LIMITS.maxTotal

  const place = useCallback((spec: BetSpec, v: number) => {
    if (spinning) return
    setBets((cur) => {
      const total = totalStake(cur)
      if (total + v > maxTotal || total + v > useChips.getState().balance) {
        casinoSfx('lose')
        return cur
      }
      casinoSfx('chip')
      const k = betKey(spec)
      setUndo((u) => [...u, k + '|' + v])
      const i = cur.findIndex((b) => betKey(b.spec) === k)
      if (i >= 0) return cur.map((b, j) => (j === i ? { ...b, amount: b.amount + v } : b))
      return [...cur, { spec, amount: v }]
    })
    setResult(null)
  }, [spinning, maxTotal])

  const undoLast = () => {
    if (spinning || !undo.length) return
    const [k, v] = undo[undo.length - 1].split('|')
    setUndo(undo.slice(0, -1))
    setBets((cur) => cur.flatMap((b) => (betKey(b.spec) === k ? (b.amount - Number(v) > 0 ? [{ ...b, amount: b.amount - Number(v) }] : []) : [b])))
  }

  /* arrastar ficha da bandeja até o tabuleiro */
  const onChipDown = (v: number, e: React.PointerEvent) => {
    if (spinning) return
    let moved = false
    const sx = e.clientX
    const sy = e.clientY
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) return
      moved = true
      setDrag({ v, x: ev.clientX, y: ev.clientY })
    }
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      setDrag(null)
      if (!moved) return
      const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-spot]') as HTMLElement | null
      const spot = el ? SPOT_BY_KEY.get(el.dataset.spot as string) : null
      if (spot) place(spot.spec, v)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  const run = () => {
    if (spinning || stake < ROULETTE_LIMITS.minBet) return
    const chips = useChips.getState()
    if (!chips.wager(stake)) return
    const n = spin()
    setSpinning(true)
    setResult(null)
    setLast(bets)
    casinoSfx('lever')
    const t0 = performance.now()
    const A = 780 // graus que a roda gira durante o giro
    const turns = 7 // voltas da bola (sentido contrário)
    const p = pocketAngle(n)
    const wheelStart = Math.random() * 360
    let lastIdx = -1
    const frame = (now: number) => {
      if (!alive.current) return
      const u = Math.min(1, (now - t0) / SPIN_MS)
      const wheel = wheelStart + A * (2 * u - u * u)
      const rel = p + 360 * turns * (1 - u) ** 2.4 // posição da bola relativa à roda
      const ground = wheel + rel
      // raio: pista alta, depois cai para a casa com pequenos quiques
      const s = u < 0.58 ? 0 : Math.min(1, (u - 0.58) / 0.38)
      const bounce = u > 0.9 ? Math.cos((u - 0.9) * 90) * (1 - u) * 36 * Math.abs(Math.sin((u - 0.9) * 50)) : 0
      const r = R_TRACK - (R_TRACK - R_POCKET) * (s * s * (3 - 2 * s)) + bounce
      const [bx, by] = polar(r, ground)
      wheelRef.current?.setAttribute('transform', `rotate(${wheel} 150 150)`)
      ballRef.current?.setAttribute('cx', String(bx))
      ballRef.current?.setAttribute('cy', String(by))
      if (u > 0.35 && u < 1) {
        const idx = Math.floor((((rel % 360) + 360) % 360) / (360 / 37))
        if (idx !== lastIdx) {
          lastIdx = idx
          if (u > 0.55) casinoSfx('ball')
          else if (idx % 3 === 0) casinoSfx('tick')
        }
      }
      if (u < 1) {
        raf.current = requestAnimationFrame(frame)
        return
      }
      // resultado
      const placed = bets
      const ret = totalReturn(placed, n)
      useChips.getState().collect(ret)
      const report = finishRound('roleta', useCz.getState().difficulty, ret - stake)
      const ach = useAchievements.getState()
      if (placed.some((b) => b.spec.kind === 'straight' && b.spec.nums[0] === n)) {
        ach.award('roulette_pleno')
        if (ach.bump('pleno') >= 3) ach.award('roulette_3')
      }
      casinoSfx(ret > stake * 4 ? 'big' : ret > stake ? 'win' : ret === stake ? 'push' : 'lose')
      setHistory((h) => [n, ...h].slice(0, 14))
      setResult({ n, ret, stake, report })
      setSpinning(false)
      setBets([])
      setUndo([])
    }
    raf.current = requestAnimationFrame(frame)
  }

  // tecla Enter gira
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.code === 'Enter') document.getElementById('rl-spin')?.click()
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  const hoverSpot = hover ? SPOT_BY_KEY.get(hover) : null
  const net = result ? result.ret - result.stake : 0

  return (
    <div className="cz-screen rl">
      <Topbar title="Roleta europeia" onBack={onBack} game="roleta" />
      <div className="cz-sidebar-row">
        <DifficultyPicker value={diff} onChange={setDiff} compact />
        <span className="cz-meta">Casa: 2,70% em todas as apostas · máx. {fmtChips(maxTotal)} por giro</span>
      </div>
      <div className="cz-felt rl-felt">
        <div className="rl-top">
          <svg className="rl-wheel" viewBox="0 0 300 300" role="img" aria-label="Roda da roleta">
            <defs>
              <radialGradient id="rl-wood" cx=".5" cy=".5" r=".5"><stop offset=".8" stopColor="#4a2d18" /><stop offset="1" stopColor="#25140a" /></radialGradient>
              <radialGradient id="rl-cone" cx=".4" cy=".35" r=".8"><stop offset="0" stopColor="#f3e2a2" /><stop offset=".6" stopColor="#c9a24a" /><stop offset="1" stopColor="#6e5320" /></radialGradient>
            </defs>
            <circle cx="150" cy="150" r={R_OUT + 8} fill="url(#rl-wood)" />
            <circle cx="150" cy="150" r={R_OUT} fill="#0c0c0f" stroke="#c9a24a" strokeWidth="2" />
            <circle cx="150" cy="150" r={R_TRACK + 4} fill="none" stroke="#3a2a14" strokeWidth="14" opacity=".55" />
            <g ref={wheelRef}>
              {WHEEL_ORDER.map((n, i) => (
                <g key={n}>
                  <path d={wedge(i)} fill={FILL[colorOf(n)]} stroke="#c9a24a" strokeWidth=".8" />
                  <text
                    x={polar(R_POCKET + 1, (i * 360) / 37)[0]}
                    y={polar(R_POCKET + 1, (i * 360) / 37)[1]}
                    fontSize="9.5" fontWeight="700" fill="#f4ead0" textAnchor="middle" dominantBaseline="central"
                    transform={`rotate(${(i * 360) / 37} ${polar(R_POCKET + 1, (i * 360) / 37)[0]} ${polar(R_POCKET + 1, (i * 360) / 37)[1]})`}
                  >{n}</text>
                </g>
              ))}
              <circle cx="150" cy="150" r={R_IN} fill="#241810" stroke="#c9a24a" strokeWidth="1.500" />
              <circle cx="150" cy="150" r="46" fill="url(#rl-cone)" />
              {[0, 90, 180, 270].map((a) => (
                <path key={a} d="M150 104v-14M150 110a40 40 0 010 0" stroke="#7a5a1c" strokeWidth="5" strokeLinecap="round" transform={`rotate(${a + 45} 150 150)`} />
              ))}
              <circle cx="150" cy="150" r="9" fill="#f3e2a2" stroke="#6e5320" />
            </g>
            <circle ref={ballRef} cx="150" cy={150 - R_TRACK} r="5.200" fill="#f7f3e8" stroke="#9a948a" strokeWidth=".8" />
          </svg>
          <div className="rl-side">
            <div className="rl-result" aria-live="polite">
              {spinning ? <span className="rl-spinning">A bola está girando…</span> : result ? (
                <>
                  <span className={`rl-num n-${colorOf(result.n)}`}>{result.n}</span>
                  <div>
                    <b className={net > 0 ? 'pos' : net < 0 ? 'neg' : ''}>{net > 0 ? '+' : ''}{fmtChips(net)} fichas</b>
                    <small>Ranking de hoje: {result.report.rank}º</small>
                  </div>
                </>
              ) : <span className="rl-spinning">Faça suas apostas.</span>}
            </div>
            <div className="rl-hist" aria-label="Últimos números">
              {history.length === 0 && <small>Sem giros ainda.</small>}
              {history.map((n, i) => <span key={i} className={`rl-dot n-${colorOf(n)}`}>{n}</span>)}
            </div>
            <div className="rl-info">
              {hoverSpot
                ? <><b>{KIND_LABEL[hoverSpot.spec.kind]}</b> · paga {PAYS[hoverSpot.spec.kind]} para 1 · {hoverSpot.spec.nums.length} {hoverSpot.spec.nums.length === 1 ? 'número' : 'números'}</>
                : 'Passe o dedo ou o mouse sobre o tabuleiro para ver o pagamento.'}
            </div>
          </div>
        </div>

        <div className="rl-boardwrap">
          <svg className="rl-board" viewBox={`0 0 ${14 * CW} ${5 * CH}`} role="group" aria-label="Tabuleiro de apostas">
            {[...SPOTS].sort((a, b) => a.z - b.z).map((s) => {
              const main = s.z === 0
              return (
                <g key={s.key} data-spot={s.key} onPointerEnter={() => setHover(s.key)} onPointerLeave={() => setHover(null)} onClick={() => place(s.spec, chip)} className={`rl-spot${main ? '' : ' mini'}`}>
                  <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={main ? 2 : 6} className={`rl-cell ${s.cls ?? ''}`} />
                  {s.label && <text x={s.x + s.w / 2} y={s.y + s.h / 2} className="rl-lbl" textAnchor="middle" dominantBaseline="central">{s.label}</text>}
                  {s.cls === 'red-out' && <path d={`M${s.x + s.w / 2} ${s.y + 11} l14 12 l-14 12 l-14 -12z`} fill="#9d1a2b" stroke="#efe6d2" strokeWidth="1.200" />}
                  {s.cls === 'black-out' && <path d={`M${s.x + s.w / 2} ${s.y + 11} l14 12 l-14 12 l-14 -12z`} fill="#16161b" stroke="#efe6d2" strokeWidth="1.200" />}
                </g>
              )
            })}
            {bets.map((b) => {
              const s = SPOT_BY_KEY.get(betKey(b.spec))
              if (!s) return null
              const cx = s.x + s.w / 2
              const cy = s.y + s.h / 2
              const v = b.amount >= 1000 ? 1000 : b.amount >= 500 ? 500 : b.amount >= 100 ? 100 : b.amount >= 50 ? 50 : 10
              return (
                <g key={'c' + s.key} transform={`translate(${cx - 14} ${cy - 14})`} pointerEvents="none" className="rl-placed">
                  <foreignObject width="28" height="28"><div style={{ width: 28, height: 28 }}><ChipArt value={v} size={28} label="" /></div></foreignObject>
                  <text x="14" y="18" textAnchor="middle" fontSize="9.500" fontWeight="800" fill={v === 10 ? '#2c2a24' : '#fff'} stroke="#0008" strokeWidth=".4">{b.amount >= 1000 ? `${b.amount / 1000}k` : b.amount}</text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      <div className="cz-controls">
        <ChipRack values={CHIP_VALUES} selected={chip} onSelect={setChip} onDragStart={onChipDown} disabled={spinning || balance <= 0} />
        <div className="cz-row">
          <div className="cz-stake">Apostado: <b>{fmtChips(stake)}</b></div>
          <button className="cz-btn" onClick={undoLast} disabled={spinning || !undo.length}><IcoUndo /> Desfazer</button>
          <button className="cz-btn" onClick={() => (setBets([]), setUndo([]))} disabled={spinning || !bets.length}><IcoClear /> Limpar</button>
          <button className="cz-btn" onClick={() => { setBets(last.map((b) => ({ ...b }))); setUndo([]); setResult(null) }} disabled={spinning || !last.length || bets.length > 0}><IcoRepeat /> Repetir</button>
          <button className="cz-btn" onClick={() => setBets((cur) => (totalStake(cur) * 2 <= maxTotal && totalStake(cur) * 2 <= balance ? cur.map((b) => ({ ...b, amount: b.amount * 2 })) : cur))} disabled={spinning || !bets.length}>Dobrar</button>
          <button id="rl-spin" className="cz-btn primary big" onClick={run} disabled={spinning || stake < ROULETTE_LIMITS.minBet}>Girar</button>
        </div>
      </div>
      {drag && (
        <div className="cz-ghost" style={{ left: drag.x, top: drag.y }}><ChipArt value={drag.v} size={46} /></div>
      )}
    </div>
  )
}
