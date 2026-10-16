import { useEffect, useMemo, useState } from 'react'
import { fmtChips, useChips } from '../../../game/casino/chips'
import { BOT_STYLES, hintFor } from '../../../game/minigames/casino/pokerBots'
import type { Seat } from '../../../game/minigames/casino/pokerEngine'
import { evaluate, handName } from '../../../game/minigames/casino/pokerEval'
import { CASH, SNG, usePoker } from '../../../game/minigames/casino/pokerStore'
import { Avatar, CardBack, CardFace, ChipStack } from './art'
import { Board, DifficultyPicker, Modal, Topbar } from './shared'
import { useCz } from './ui'

const POS: Record<number, [number, number][]> = {
  1: [[50, 9]],
  2: [[22, 14], [78, 14]],
  3: [[10, 46], [50, 8], [90, 46]],
  4: [[10, 56], [28, 10], [72, 10], [90, 56]],
  5: [[8, 58], [17, 15], [50, 6], [83, 15], [92, 58]],
}

function SeatView({ seat, pos, isButton, thinking, reveal, level, place }: {
  seat: Seat; pos: [number, number]; isButton: boolean; thinking: boolean; reveal: boolean; level: number; place?: number
}) {
  const st = BOT_STYLES[seat.style % BOT_STYLES.length]
  const showFaces = reveal && !seat.folded && !seat.out
  const [x, y] = pos
  // aposta fica entre o lugar e o centro da mesa
  const bx = x + (50 - x) * 0.38
  const by = y + (46 - y) * 0.42
  return (
    <>
      <div className={`pk-seat${seat.folded ? ' folded' : ''}${seat.out ? ' out' : ''}${thinking ? ' thinking' : ''}${seat.allIn ? ' allin' : ''}`} style={{ left: `${x}%`, top: `${y}%` }} data-level={level}>
        <div className="pk-av">
          <Avatar styleIdx={seat.style} expr={seat.out ? 'sad' : seat.expr} size={54} folded={seat.folded || seat.out} />
          {isButton && <span className="pk-btn" title="Botão do dealer">D</span>}
        </div>
        <div className="pk-info">
          <b>{seat.name}</b>
          <span>{seat.out ? (place ? `${place}º lugar` : 'Fora') : fmtChips(seat.stack)}</span>
        </div>
        {!seat.out && (
          <div className="pk-hole" aria-hidden>
            {seat.cards.length > 0 && (showFaces ? seat.cards.map((c, i) => <CardFace key={i} card={c} width={34} />) : seat.cards.map((_, i) => <CardBack key={i} width={34} style={{ opacity: seat.folded ? 0.25 : 1 }} />))}
          </div>
        )}
        {seat.last && !seat.out && <span className={`pk-said s-${seat.last.replace(/\W/g, '').toLowerCase()}`}>{seat.last}</span>}
        <small className="pk-style">{st.title}</small>
      </div>
      {seat.bet > 0 && (
        <div className="pk-bet" style={{ left: `${bx}%`, top: `${by}%` }}><ChipStack amount={seat.bet} size={24} /><b>{fmtChips(seat.bet)}</b></div>
      )}
    </>
  )
}

function Setup() {
  const s = usePoker()
  const diff = useCz((c) => c.difficulty)
  const setDiff = useCz((c) => c.setDifficulty)
  const balance = useChips((c) => c.balance)
  const cost = s.mode === 'sng' ? SNG.buyIn : s.buyIn
  const lack = balance < cost
  return (
    <div className="pk-setup">
      <div className="cz-tabs" role="tablist">
        <button role="tab" aria-selected={s.mode === 'cash'} className={s.mode === 'cash' ? 'on' : ''} onClick={() => s.setup({ mode: 'cash' })}>Mesa livre</button>
        <button role="tab" aria-selected={s.mode === 'sng'} className={s.mode === 'sng' ? 'on' : ''} onClick={() => s.setup({ mode: 'sng' })}>Torneio Sit &amp; Go</button>
      </div>
      <p className="cz-sub">
        {s.mode === 'cash'
          ? `Blinds ${CASH.sb}/${CASH.bb}. Você leva fichas para a mesa e sai quando quiser; o que sobrar volta para o seu saldo.`
          : `5 jogadoras, ${fmtChips(SNG.stack)} fichas de torneio cada e blinds que sobem a cada ${SNG.handsPerLevel} mãos. Inscrição ${SNG.buyIn} fichas; prêmios: ${SNG.prizes.join(' / ')} para os 3 primeiros.`}
      </p>
      <div className="pk-opts">
        <div><span className="cz-label">Dificuldade</span><DifficultyPicker value={diff} onChange={setDiff} compact /></div>
        {s.mode === 'cash' && (
          <>
            <div>
              <span className="cz-label">Adversárias</span>
              <div className="cz-seg cz-seg--s">{[3, 4, 5].map((n) => <button key={n} className={s.nBots === n ? 'on' : ''} onClick={() => s.setup({ nBots: n })}>{n}</button>)}</div>
            </div>
            <div>
              <span className="cz-label">Fichas na mesa</span>
              <div className="cz-seg cz-seg--s">{CASH.buyIns.map((n) => <button key={n} className={s.buyIn === n ? 'on' : ''} onClick={() => s.setup({ buyIn: n })}>{fmtChips(n)}</button>)}</div>
            </div>
          </>
        )}
      </div>
      <div className="pk-roster">
        {BOT_STYLES.map((b, i) => (
          <div key={b.name} className="pk-card">
            <Avatar styleIdx={i} expr={i === 2 ? 'confident' : i === 1 ? 'happy' : 'neutral'} size={58} />
            <b>{b.name}</b>
            <em>{b.title}</em>
            <p>{b.blurb}</p>
          </div>
        ))}
      </div>
      {s.message && <p className="cz-warn" role="alert">{s.message}</p>}
      <div className="cz-actions">
        <button className="cz-btn primary big" disabled={lack} onClick={() => s.start()}>
          {s.mode === 'sng' ? `Entrar no torneio · ${SNG.buyIn}` : `Sentar à mesa · ${fmtChips(s.buyIn)}`}
        </button>
        {lack && <span className="cz-meta">Saldo insuficiente.</span>}
      </div>
    </div>
  )
}

export function Poker({ onBack }: { onBack: () => void }) {
  const s = usePoker()
  const diff = useCz((c) => c.difficulty)
  const [raise, setRaise] = useState(0)
  const e = s.eng

  useEffect(() => {
    usePoker.getState().setup({ difficulty: diff })
  }, [diff])
  useEffect(() => () => {
    const st = usePoker.getState()
    if (st.stage === 'playing') st.leave()
  }, [])

  const me = e?.seats[0]
  const opt = e && s.waiting ? e.options(0) : null
  useEffect(() => {
    if (opt) setRaise(opt.minRaiseTo)
  }, [s.tick, s.waiting]) // eslint-disable-line react-hooks/exhaustive-deps

  const hint = useMemo(() => (e && s.waiting && diff === 'facil' ? hintFor(e, 0) : null), [s.tick, s.waiting, diff]) // eslint-disable-line react-hooks/exhaustive-deps

  const myHand = useMemo(() => {
    if (!e || !me || me.cards.length < 2 || me.folded) return ''
    if (e.board.length < 3) return ''
    return handName(evaluate([...me.cards, ...e.board]))
  }, [s.tick]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const k = (ev: KeyboardEvent) => {
      const st = usePoker.getState()
      if (!st.waiting || !st.eng) return
      const o = st.eng.options(0)
      if (ev.code === 'KeyF') st.humanAct({ type: 'fold' })
      else if (ev.code === 'KeyC' || ev.code === 'Space') {
        ev.preventDefault()
        st.humanAct(o.canCheck ? { type: 'check' } : { type: 'call' })
      }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  const title = s.mode === 'sng' && s.stage !== 'setup' ? 'Torneio Sit & Go' : "Texas Hold'em"

  if (s.stage === 'setup' || !e || !me) {
    return (
      <div className="cz-screen pk">
        <Topbar title={title} onBack={onBack} game="poker" />
        <Setup />
      </div>
    )
  }

  const bots = e.seats.slice(1)
  const positions = POS[bots.length] ?? POS[4]
  const toCall = opt?.toCall ?? 0
  const pot = e.pot
  const [sb, bb] = [e.sb, e.bb]
  const showdownReveal = s.revealed || (e.phase === 'done' && e.showdown)
  const myCards = me.cards

  const act = (type: 'fold' | 'check' | 'call') => s.humanAct({ type })
  const doRaise = (to: number) => s.humanAct({ type: 'raise', to })

  return (
    <div className="cz-screen pk">
      <Topbar title={title} onBack={() => { s.leave(); onBack() }} game="poker" />
      <div className="cz-sidebar-row">
        <span className="cz-pill">Blinds {fmtChips(sb)}/{fmtChips(bb)}{s.mode === 'sng' ? ` · nível ${s.level + 1}` : ''}</span>
        <span className="cz-pill">Mão {e.handNo}</span>
        {s.mode === 'cash' && <span className="cz-pill">Sessão: {s.sessionNet > 0 ? '+' : ''}{fmtChips(s.sessionNet)}</span>}
        <button className="cz-btn small" onClick={() => { s.leave() }}>{s.mode === 'cash' ? 'Sair da mesa' : 'Desistir'}</button>
      </div>

      <div className="pk-table">
        <div className="pk-felt">
          <div className="pk-center">
            <div className="pk-board">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className={`pk-slot${e.board[i] ? ' on' : ''}`}>
                  {e.board[i] && <CardFace card={e.board[i]} width={58} className="pk-boardcard" />}
                </div>
              ))}
            </div>
            <div className="pk-pot"><ChipStack amount={Math.max(pot, 10)} size={26} /> Pote <b>{fmtChips(pot)}</b></div>
            <div className="pk-msg" role="status" aria-live="polite">{s.message}</div>
          </div>
          {bots.map((b, i) => (
            <SeatView key={b.id} seat={b} pos={positions[i]} isButton={e.button === b.id} thinking={s.thinking === b.id} reveal={showdownReveal} level={s.level} place={s.places[b.id]} />
          ))}
          <div className="pk-me">
            <div className="pk-mecards">
              {myCards.map((c, i) => <CardFace key={i} card={c} width={66} className="pk-hole-big" style={{ opacity: me.folded ? 0.4 : 1, transform: `rotate(${i ? 5 : -5}deg)` }} />)}
            </div>
            <div className="pk-meinfo">
              <b>Você{e.button === 0 ? ' · botão' : ''}</b>
              <span>{fmtChips(me.stack)} fichas</span>
              {me.last && <span className="pk-said">{me.last}</span>}
              {myHand && diff !== 'estrela' && <span className="cz-pill">{myHand}</span>}
            </div>
            {me.bet > 0 && <div className="pk-bet pk-bet-me"><ChipStack amount={me.bet} size={24} /><b>{fmtChips(me.bet)}</b></div>}
          </div>
        </div>
      </div>

      <div className="cz-controls">
        {s.waiting && opt && (
          <>
            {hint && <div className="cz-hint">Chance de vitória ≈ {Math.round(hint.equity * 100)}% · {hint.text}</div>}
            <div className="cz-row">
              <button className="cz-btn" onClick={() => act('fold')}>Desistir<small>F</small></button>
              <button className="cz-btn primary" onClick={() => act(opt.canCheck ? 'check' : 'call')}>
                {opt.canCheck ? 'Passar' : toCall >= me.stack ? `All-in ${fmtChips(me.stack)}` : `Pagar ${fmtChips(toCall)}`}<small>C</small>
              </button>
              {opt.canRaise && (
                <button className="cz-btn primary" onClick={() => doRaise(raise)}>
                  {raise >= opt.maxRaiseTo ? 'All-in' : e.currentBet > 0 ? `Aumentar para ${fmtChips(raise)}` : `Apostar ${fmtChips(raise)}`}
                </button>
              )}
            </div>
            {opt.canRaise && (
              <div className="cz-row pk-slider">
                <button className="cz-btn small" onClick={() => setRaise(Math.max(opt.minRaiseTo, Math.min(opt.maxRaiseTo, Math.round((e.currentBet + pot / 2) / 5) * 5)))}>½ pote</button>
                <button className="cz-btn small" onClick={() => setRaise(Math.max(opt.minRaiseTo, Math.min(opt.maxRaiseTo, Math.round((e.currentBet + pot) / 5) * 5)))}>Pote</button>
                <input type="range" min={opt.minRaiseTo} max={opt.maxRaiseTo} step={Math.max(1, Math.floor(bb / 2))} value={raise} onChange={(ev) => setRaise(Number(ev.target.value))} aria-label="Valor da aposta" />
                <button className="cz-btn small" onClick={() => setRaise(opt.maxRaiseTo)}>All-in</button>
              </div>
            )}
          </>
        )}
        {!s.waiting && s.awaitNext && (
          <div className="cz-row">
            <button className="cz-btn primary big" onClick={s.nextHand}>Próxima mão</button>
          </div>
        )}
        {!s.waiting && !s.awaitNext && s.stage === 'playing' && <div className="cz-row cz-wait">{s.thinking >= 0 ? `${e.seats[s.thinking]?.name} está pensando…` : 'Aguarde…'}</div>}
      </div>

      {s.stage === 'ended' && (
        <Modal label="Fim da partida" wide>
          <h2 className="cz-h2">{s.mode === 'sng' ? s.message : 'Você saiu da mesa'}</h2>
          {s.mode === 'sng' && (
            <>
              <p className="cz-p">{s.prize > 0 ? `Prêmio: ${fmtChips(s.prize)} fichas (inscrição ${SNG.buyIn}).` : 'Sem prêmio desta vez. Os 3 primeiros lugares são premiados.'}</p>
              <ol className="cz-board">
                {e.seats.map((x) => ({ x, p: s.places[x.id] ?? 99 })).sort((a, b) => a.p - b.p).map(({ x, p }) => (
                  <li key={x.id} className={x.human ? 'you' : ''}><span className="pos">{p === 99 ? '—' : p}</span><span className="nm">{x.name}</span><b>{SNG.prizes[p - 1] ? fmtChips(SNG.prizes[p - 1]) : ''}</b></li>
                ))}
              </ol>
            </>
          )}
          {s.report && (
            <>
              <p className="cz-sub">Ranking de hoje no Pôquer: {s.report.rank}º lugar</p>
              <Board board={s.report.board} />
            </>
          )}
          <div className="cz-actions">
            <button className="cz-btn primary" onClick={() => s.toSetup()}>Jogar de novo</button>
            <button className="cz-btn" onClick={() => { s.toSetup(); onBack() }}>Voltar ao lounge</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
