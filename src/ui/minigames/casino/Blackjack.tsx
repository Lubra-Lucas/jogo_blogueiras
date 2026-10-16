import { useEffect } from 'react'
import { fmtChips, useChips } from '../../../game/casino/chips'
import { ACTION_LABEL, handValue, isNaturalBlackjack, type BjAction, type BjResult } from '../../../game/minigames/casino/blackjack'
import { BJ_MAX_BET, useBlackjack, type BjHand } from '../../../game/minigames/casino/blackjackStore'
import type { Card } from '../../../game/minigames/casino/cards'
import { CHIP_VALUES, CardBack, CardFace, ChipArt, ChipStack, IcoBulb, IcoClear, IcoRepeat } from './art'
import { ChipRack, DifficultyPicker, Topbar } from './shared'
import { useCz } from './ui'

const RESULT_LABEL: Record<BjResult, string> = { bj: 'Blackjack', win: 'Venceu', push: 'Empate', lose: 'Perdeu', bust: 'Estourou' }

function Hand({ cards, hideSecond, total, tag, active, cw }: { cards: Card[]; hideSecond?: boolean; total?: string; tag?: string; active?: boolean; cw: number }) {
  return (
    <div className={`bj-hand${active ? ' active' : ''}`}>
      <div className="bj-cards" style={{ ['--cw' as string]: `${cw}px` }}>
        {cards.map((c, i) => (
          <div key={i} className="bj-card" style={{ ['--i' as string]: i }}>
            {hideSecond && i === 1 ? <CardBack width={cw} /> : <CardFace card={c} width={cw} />}
          </div>
        ))}
      </div>
      <div className="bj-tags">
        {total && <span className="cz-pill">{total}</span>}
        {tag && <span className={`cz-pill res res-${tag}`}>{RESULT_LABEL[tag as BjResult]}</span>}
      </div>
    </div>
  )
}

function handTotal(h: BjHand): string {
  const v = handValue(h.cards)
  if (v.bust) return `${v.total}`
  if (isNaturalBlackjack(h.cards) && !h.split) return '21'
  return v.soft && v.total < 21 ? `${v.total - 10} / ${v.total}` : String(v.total)
}

export function Blackjack({ onBack }: { onBack: () => void }) {
  const s = useBlackjack()
  const diff = useCz((c) => c.difficulty)
  const setDiff = useCz((c) => c.setDifficulty)
  const balance = useChips((c) => c.balance)

  useEffect(() => {
    useBlackjack.getState().setDifficulty(diff)
  }, [diff])
  useEffect(() => () => useBlackjack.getState().reset(), [])

  const sug: BjAction | null = diff === 'facil' && s.hint ? s.suggestion() : null
  const can = { double: s.canDouble(), split: s.canSplit() }
  const playing = s.phase === 'player'
  const betting = s.phase === 'bet' || s.phase === 'done'

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const st = useBlackjack.getState()
      if (e.code === 'KeyH' && st.phase === 'player') st.act('hit')
      else if (e.code === 'KeyS' && st.phase === 'player') st.act('stand')
      else if (e.code === 'KeyD' && st.phase === 'player') st.act('double')
      else if (e.code === 'KeyP' && st.phase === 'player') st.act('split')
      else if (e.code === 'Enter' && (st.phase === 'bet' || st.phase === 'done')) st.deal()
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  const dealerTotal = s.holeHidden && s.dealer.length ? String(handValue([s.dealer[0]]).total) : s.dealer.length ? String(handValue(s.dealer).total) : ''
  const cw = 64

  return (
    <div className="cz-screen bj">
      <Topbar title="Blackjack" onBack={onBack} game="blackjack" />
      <div className="cz-sidebar-row">
        <DifficultyPicker value={diff} onChange={setDiff} compact />
        <span className="cz-meta">Aposta máx. {fmtChips(BJ_MAX_BET[diff])} · Sapato: {s.cardsLeft} cartas</span>
        {diff === 'facil' && (
          <button className={`cz-toggle${s.hint ? ' on' : ''}`} aria-pressed={s.hint} onClick={() => s.setHint(!s.hint)}><IcoBulb /> Dica</button>
        )}
      </div>

      <div className="cz-felt bj-felt">
        <div className="cz-rim">A banca para em qualquer 17 · Blackjack paga 3 para 2 · Sem seguro</div>
        <div className="bj-shoe" aria-hidden><CardBack width={44} /><CardBack width={44} /></div>
        <div className="bj-dealer">
          <div className="cz-seatlabel">Banca</div>
          <Hand cards={s.dealer} hideSecond={s.holeHidden} total={dealerTotal || undefined} cw={cw} />
        </div>
        <div className="bj-msg" role="status" aria-live="polite">{s.message}</div>
        <div className="bj-player">
          {s.hands.length === 0 && (
            <div className="bj-betspot">
              <div className="bj-ring">{s.bet > 0 ? <ChipStack amount={s.bet} size={46} /> : <span>Aposte aqui</span>}</div>
              <b>{s.bet > 0 ? fmtChips(s.bet) : ''}</b>
            </div>
          )}
          <div className="bj-hands">
            {s.hands.map((h, i) => (
              <div key={i} className="bj-handwrap">
                <Hand cards={h.cards} total={handTotal(h)} tag={h.result} active={playing && i === s.active && s.hands.length > 1} cw={cw} />
                <div className="bj-bet"><ChipArt value={h.bet >= 500 ? 500 : h.bet >= 100 ? 100 : 50} size={22} label="" /> {fmtChips(h.bet)}{h.doubled ? ' (dobrada)' : ''}{h.payout !== undefined && h.payout > 0 ? <em> +{fmtChips(h.payout)}</em> : null}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="cz-controls">
        {betting && (
          <>
            <ChipRack values={CHIP_VALUES} onSelect={(v) => s.addBet(v)} disabled={balance <= 0} />
            <div className="cz-row">
              <button className="cz-btn" onClick={s.clearBet} disabled={s.phase !== 'bet' || s.bet === 0}><IcoClear /> Limpar</button>
              <button className="cz-btn" onClick={s.repeatBet} disabled={s.lastBet < 10}><IcoRepeat /> Repetir {s.lastBet >= 10 ? fmtChips(s.lastBet) : ''}</button>
              <button className="cz-btn primary big" onClick={s.deal} disabled={s.phase === 'bet' ? s.bet < 10 : false}>
                {s.phase === 'done' ? 'Nova rodada' : `Dar cartas ${s.bet >= 10 ? '· ' + fmtChips(s.bet) : ''}`}
              </button>
            </div>
          </>
        )}
        {playing && (
          <div className="cz-row">
            {(['hit', 'stand', 'double', 'split'] as BjAction[]).map((a) => {
              const off = (a === 'double' && !can.double) || (a === 'split' && !can.split)
              return (
                <button key={a} className={`cz-btn act${sug === a ? ' hint' : ''}${a === 'stand' ? '' : ' primary'}`} disabled={off} onClick={() => s.act(a)}>
                  {ACTION_LABEL[a]}<small>{({ hit: 'H', stand: 'S', double: 'D', split: 'P' })[a]}</small>
                </button>
              )
            })}
          </div>
        )}
        {playing && sug && <div className="cz-hint"><IcoBulb /> Estratégia básica: {ACTION_LABEL[sug].toLowerCase()}.</div>}
        {!betting && !playing && <div className="cz-row cz-wait">Aguarde…</div>}
        {s.phase === 'done' && s.report && (
          <div className="cz-result">
            <b className={s.net > 0 ? 'pos' : s.net < 0 ? 'neg' : ''}>{s.net > 0 ? '+' : ''}{fmtChips(s.net)} fichas</b>
            <span>Ranking de hoje no Blackjack: {s.report.rank}º lugar</span>
          </div>
        )}
      </div>
    </div>
  )
}
