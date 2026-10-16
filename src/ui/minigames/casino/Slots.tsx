import { useCallback, useEffect, useRef, useState } from 'react'
import { useAchievements } from '../../../game/casino/achievements'
import { fmtChips, useChips } from '../../../game/casino/chips'
import { finishRound } from '../../../game/casino/report'
import { casinoSfx } from '../../../game/minigames/casino/sfx'
import {
  LINES, PAYLINES, PAYTABLE, REELS, ROWS, SLOT_BETS, STRIPS, SYMBOLS, SYMBOL_NAME, THEORETICAL_RTP, drawStops, evalGrid,
  gridFromStops, type LineWin, type SymbolId, windowAt,
} from '../../../game/minigames/casino/slots'
import type { Difficulty } from '../../../game/minigames/shared/competition'
import { IcoInfo, SlotSymbol } from './art'
import { DifficultyPicker, Topbar } from './shared'
import { useCz } from './ui'

const CELL = 84
const MAX_BET: Record<Difficulty, number> = { facil: 50, normal: 100, dificil: 200, estrela: 200 }
/** Cada rolo para num instante fixo (sem suspense fabricado): 0,9 s + 0,32 s por rolo. */
const STOP_AT = (i: number) => 900 + i * 320

const LINE_COLORS = ['#f6e2a0', '#e0576b', '#6fb7a0', '#8fb3e8', '#e0a15a', '#c58be0', '#a3d36b', '#f08a5d', '#7fd0d6', '#d6d36b']

const pct = (v: number) => (v * 100).toFixed(1).replace('.', ',') + '%'

export function Slots({ onBack }: { onBack: () => void }) {
  const diff = useCz((c) => c.difficulty)
  const setDiff = useCz((c) => c.setDifficulty)
  const balance = useChips((c) => c.balance)
  const [bet, setBet] = useState(20)
  const [stops, setStops] = useState<number[]>(() => [4, 11, 18, 6, 13])
  const [spinning, setSpinning] = useState<boolean[]>(Array(REELS).fill(false))
  const [wins, setWins] = useState<LineWin[]>([])
  const [shownWin, setShownWin] = useState(0)
  const [totalWin, setTotalWin] = useState(0)
  const [msg, setMsg] = useState('Escolha a aposta e gire.')
  const [session, setSession] = useState({ spins: 0, net: 0 })
  const [paytable, setPaytable] = useState(false)
  const [rank, setRank] = useState(0)
  const [flash, setFlash] = useState(0)
  const timers = useRef<number[]>([])
  const busy = spinning.some(Boolean)

  const maxBet = MAX_BET[diff]
  useEffect(() => {
    if (bet > maxBet) setBet(maxBet)
  }, [bet, maxBet])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const spin = useCallback(() => {
    if (busy) return
    const chips = useChips.getState()
    if (!chips.wager(bet)) {
      setMsg('Fichas insuficientes. Diminua a aposta ou peça as fichas do dia no lobby.')
      return
    }
    // o sorteio acontece agora; a animação só revela o que já saiu
    const result = drawStops()
    const g = gridFromStops(result)
    const lineBet = bet / LINES
    const { wins: w, total } = evalGrid(g, lineBet)
    setWins([])
    setTotalWin(0)
    setShownWin(0)
    setMsg('Girando…')
    setSpinning(Array(REELS).fill(true))
    casinoSfx('lever')
    let tick = 0
    const iv = window.setInterval(() => {
      casinoSfx('reel')
      tick++
    }, 90)
    timers.current.push(iv)
    for (let i = 0; i < REELS; i++) {
      timers.current.push(window.setTimeout(() => {
        setStops((cur) => cur.map((s, j) => (j === i ? result[i] : s)))
        setSpinning((cur) => cur.map((s, j) => (j === i ? false : s)))
        casinoSfx('stop')
        if (i === REELS - 1) {
          clearInterval(iv)
          void tick
          finish(w, total)
        }
      }, STOP_AT(i)))
    }
    function finish(wl: LineWin[], total: number) {
      chips.collect(total)
      const net = total - bet
      const rep = finishRound('slots', useCz.getState().difficulty, net)
      setRank(rep.rank)
      setSession((s) => ({ spins: s.spins + 1, net: s.net + net }))
      setWins(wl)
      setTotalWin(total)
      const ach = useAchievements.getState()
      if (total >= bet * 30) ach.award('slots_big')
      if (wl.some((x) => x.count === 5 && (x.symbol === 'coroa' || x.symbol === 'estrela'))) ach.award('slots_royal')
      if (total === 0) {
        setMsg('Sem prêmio desta vez.')
        casinoSfx('lose')
        return
      }
      setFlash((f) => f + 1)
      casinoSfx(total >= bet * 10 ? 'big' : 'win')
      setMsg(total >= bet * 30 ? 'Grande prêmio!' : total >= bet * 5 ? 'Belo prêmio!' : 'Prêmio!')
      // contagem do valor
      const t0 = performance.now()
      const dur = Math.min(1600, 500 + total * 4)
      const step = (now: number) => {
        const u = Math.min(1, (now - t0) / dur)
        setShownWin(Math.round(total * (1 - (1 - u) ** 3)))
        if (u < 1) timers.current.push(requestAnimationFrame(step))
      }
      timers.current.push(requestAnimationFrame(step))
    }
  }, [bet, busy])

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        document.getElementById('sl-spin')?.click()
      }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  const winCells = new Set(wins.flatMap((w) => w.cells.map(([r, y]) => `${r}-${y}`)))
  const bets = SLOT_BETS.filter((b) => b <= maxBet)

  return (
    <div className="cz-screen sl">
      <Topbar title="Caça-níqueis Glam" onBack={onBack} game="slots" />
      <div className="cz-sidebar-row">
        <DifficultyPicker value={diff} onChange={setDiff} compact />
        <span className="cz-meta">RTP {pct(THEORETICAL_RTP)} · aposta máx. {fmtChips(maxBet)}</span>
        <button className={`cz-toggle${paytable ? ' on' : ''}`} aria-pressed={paytable} onClick={() => setPaytable(!paytable)}><IcoInfo /> Pagamentos</button>
      </div>

      <div className="sl-layout">
        <div className="sl-cabinet">
          <div className="sl-marquee">
            <span>GLAM</span><i /> <span>SLOTS</span>
          </div>
          <div className="sl-window" style={{ ['--cell' as string]: `${CELL}px` }}>
            {STRIPS.map((_, r) => (
              <div key={r} className="sl-reel" style={{ height: CELL * ROWS }}>
                {spinning[r] ? (
                  <div className="sl-strip spin">
                    {[...STRIPS[r], ...STRIPS[r]].slice(0, 20).map((s, i) => (
                      <div key={i} className="sl-cell"><SlotSymbol id={s} size={60} /></div>
                    ))}
                  </div>
                ) : (
                  <div className="sl-strip settle" key={stops[r] + '-' + flash + '-' + r}>
                    {windowAt(r, stops[r]).map((s, y) => (
                      <div key={y} className={`sl-cell${winCells.has(`${r}-${y}`) ? ' win' : ''}`}><SlotSymbol id={s} size={60} /></div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <svg className="sl-lines" viewBox={`0 0 ${REELS * (CELL + 6)} ${ROWS * CELL}`} preserveAspectRatio="none" aria-hidden>
              {wins.map((w) => (
                <polyline
                  key={w.line}
                  points={w.cells.map(([r, y]) => `${r * (CELL + 6) + CELL / 2},${y * CELL + CELL / 2}`).join(' ')}
                  fill="none" stroke={LINE_COLORS[w.line % LINE_COLORS.length]} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity=".85" className="sl-linepath"
                />
              ))}
            </svg>
          </div>
          <div className="sl-display">
            <div className="sl-readout"><small>Aposta</small><b>{fmtChips(bet)}</b></div>
            <div className="sl-readout wide" role="status" aria-live="polite">
              <small>{msg}</small>
              <b className={totalWin > 0 ? 'pos' : ''}>{totalWin > 0 ? `+${fmtChips(shownWin)}` : '—'}</b>
            </div>
            <div className="sl-readout"><small>Sessão</small><b className={session.net > 0 ? 'pos' : session.net < 0 ? 'neg' : ''}>{session.net > 0 ? '+' : ''}{fmtChips(session.net)}</b></div>
          </div>
          <div className="sl-ctrl">
            <div className="sl-bets" role="radiogroup" aria-label="Aposta por giro">
              {bets.map((b) => (
                <button key={b} role="radio" aria-checked={bet === b} className={bet === b ? 'on' : ''} disabled={busy} onClick={() => (casinoSfx('chip'), setBet(b))}>{b}</button>
              ))}
            </div>
            <button id="sl-spin" className="sl-spinbtn" onClick={spin} disabled={busy || balance < bet}>{busy ? '…' : 'Girar'}</button>
          </div>
          {wins.length > 0 && (
            <ul className="sl-winlist" aria-label="Linhas premiadas">
              {wins.map((w) => (
                <li key={w.line}><i style={{ background: LINE_COLORS[w.line % LINE_COLORS.length] }} />Linha {w.line + 1}: {w.count}× {SYMBOL_NAME[w.symbol]} <b>+{fmtChips(w.pay * (bet / LINES))}</b></li>
              ))}
            </ul>
          )}
          {rank > 0 && <div className="cz-meta sl-rank">Ranking de hoje nos Caça-níqueis: {rank}º</div>}
        </div>

        <aside className={`sl-pay${paytable ? ' open' : ''}`} aria-label="Tabela de pagamentos">
          <h3>Tabela de pagamentos</h3>
          <p className="cz-sub">Multiplicador da aposta por linha ({fmtChips(bet / LINES)} por linha). Da esquerda para a direita; a Estrela é curinga.</p>
          <table>
            <thead><tr><th>Símbolo</th><th>3</th><th>4</th><th>5</th></tr></thead>
            <tbody>
              {[...SYMBOLS].sort((a, b) => PAYTABLE[b][2] - PAYTABLE[a][2]).map((s: SymbolId) => (
                <tr key={s}>
                  <td><SlotSymbol id={s} size={30} /> <span>{SYMBOL_NAME[s]}</span></td>
                  {PAYTABLE[s].map((m, i) => <td key={i}>{m}×</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="cz-sub">10 linhas fixas. Retorno teórico {pct(THEORETICAL_RTP)}: a casa fica com {pct(1 - THEORETICAL_RTP)} a longo prazo. Os rolos param em posições sorteadas de forma uniforme.</p>
          <div className="sl-linemap" aria-hidden>
            {PAYLINES.map((p, i) => (
              <svg key={i} viewBox="0 0 50 30" width="50" height="30">
                <rect x="0" y="0" width="50" height="30" rx="3" fill="#00000030" />
                <polyline points={p.map((row, r) => `${5 + r * 10},${5 + row * 10}`).join(' ')} fill="none" stroke={LINE_COLORS[i]} strokeWidth="2" />
              </svg>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
