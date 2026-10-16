import { Component, useEffect, useRef, type ReactNode } from 'react'
import { useAchievements } from '../../../game/casino/achievements'
import { ASK_BELOW, ASK_CHIPS, DAILY_CHIPS, GAME_LABEL, fmtChips, useChips, type GameId } from '../../../game/casino/chips'
import { casinoSfx } from '../../../game/minigames/casino/sfx'
import { Blackjack } from './Blackjack'
import { Lounge3D } from './Lounge3D'
import { Poker } from './Poker'
import { Roulette } from './Roulette'
import { Slots } from './Slots'
import { Suit, SlotSymbol, IcoGift, IcoTrophy } from './art'
import { FICHAS_NOTE } from './help'
import { AchToasts, BreakReminder, DifficultyPicker, HowTo, RankPanel, Topbar } from './shared'
import { useCz, type Screen } from './ui'
import './casino.css'

class SceneBoundary extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false }
  static getDerivedStateFromError() {
    return { err: true }
  }
  render() {
    return this.state.err ? <div className="cz-canvas cz-canvas--fallback" /> : this.props.children
  }
}

const GAMES: { id: GameId; title: string; blurb: string; edge: string }[] = [
  { id: 'blackjack', title: 'Blackjack', blurb: 'Chegue perto de 21 sem estourar. Dobre, divida e use a estratégia.', edge: 'Casa ≈ 0,5% com estratégia' },
  { id: 'poker', title: "Texas Hold'em", blurb: 'Mesa livre ou torneio Sit & Go contra cinco estilos de jogadoras.', edge: 'Contra jogadoras, sem casa' },
  { id: 'roleta', title: 'Roleta', blurb: 'Roda europeia com um zero. Fichas arrastáveis, todas as apostas.', edge: 'Casa 2,70%' },
  { id: 'slots', title: 'Caça-níqueis', blurb: 'Cinco rolos, dez linhas, símbolos de moda e tabela transparente.', edge: 'Retorno 96,6%' },
]

function GameIcon({ id }: { id: GameId }) {
  if (id === 'blackjack') return <span className="cz-gicon"><Suit s={3} size={26} color="#efe6d2" /></span>
  if (id === 'poker') return <span className="cz-gicon"><Suit s={2} size={26} color="#efe6d2" /></span>
  if (id === 'slots') return <span className="cz-gicon"><SlotSymbol id="coroa" size={30} /></span>
  return (
    <span className="cz-gicon">
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden>
        <circle cx="16" cy="16" r="13" fill="none" stroke="#efe6d2" strokeWidth="2" />
        <circle cx="16" cy="16" r="7" fill="none" stroke="#efe6d2" strokeWidth="2" strokeDasharray="3 2.4" />
        <circle cx="16" cy="16" r="2" fill="#efe6d2" />
        <circle cx="25" cy="10" r="2" fill="#efe6d2" />
      </svg>
    </span>
  )
}

function Lobby({ onExit }: { onExit: () => void }) {
  const balance = useChips((s) => s.balance)
  const canDaily = useChips((s) => s.lastDaily !== todayKey())
  const canAsk = useChips((s) => s.lastAsk !== todayKey() && s.balance < ASK_BELOW)
  const diff = useCz((s) => s.difficulty)
  const setDiff = useCz((s) => s.setDifficulty)
  const setScreen = useCz((s) => s.setScreen)
  const setFocus = useCz((s) => s.setFocus)
  const rankOpen = useCz((s) => s.rankOpen)
  const title = useAchievements((s) => s.title)
  void balance
  return (
    <div className="cz-lobby">
      <Topbar title="Lounge de Jogos" onBack={onExit} />
      <div className="cz-panel">
        <section className="cz-gift" aria-label="Fichas grátis">
          <IcoGift />
          <div>
            <b>Fichas do dia</b>
            <small>{canDaily ? `Receba ${fmtChips(DAILY_CHIPS)} fichas grátis hoje.` : 'Você já recebeu as fichas de hoje. Volte amanhã!'}</small>
          </div>
          <button className="cz-btn primary" disabled={!canDaily} onClick={() => (useChips.getState().claimDaily(), casinoSfx('chips'))}>Receber</button>
        </section>
        {(canAsk || (useChips.getState().balance < ASK_BELOW)) && (
          <section className="cz-gift" aria-label="Pedir fichas">
            <IcoGift />
            <div>
              <b>Pedir fichas</b>
              <small>{canAsk ? `Acabaram? Peça mais ${ASK_CHIPS} fichas (uma vez por dia).` : 'O pedido de hoje já foi usado.'}</small>
            </div>
            <button className="cz-btn" disabled={!canAsk} onClick={() => (useChips.getState().askChips(), casinoSfx('chips'))}>Pedir</button>
          </section>
        )}
        <div className="cz-diffrow">
          <span className="cz-label">Dificuldade</span>
          <DifficultyPicker value={diff} onChange={setDiff} compact />
        </div>
        <div className="cz-games" role="list">
          {GAMES.map((g) => (
            <button key={g.id} role="listitem" className="cz-game" onMouseEnter={() => setFocus(g.id)} onFocus={() => setFocus(g.id)} onMouseLeave={() => setFocus('lobby')} onClick={() => (casinoSfx('tick'), setScreen(g.id))}>
              <GameIcon id={g.id} />
              <span className="cz-gtxt"><b>{GAME_LABEL[g.id] === 'Pôquer' ? "Texas Hold'em" : g.title}</b><small>{g.blurb}</small><em>{g.edge}</em></span>
            </button>
          ))}
        </div>
        <div className="cz-row cz-lobby-actions">
          <button className="cz-btn" onClick={() => useCz.getState().setRankOpen(true)}><IcoTrophy /> Rankings e conquistas</button>
          {title && <span className="cz-pill gold">{title}</span>}
        </div>
        <p className="cz-note">{FICHAS_NOTE}</p>
      </div>
      {rankOpen && <RankPanel onClose={() => useCz.getState().setRankOpen(false)} />}
    </div>
  )
}

const todayKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

const Q = new URLSearchParams(window.location.search)

export function CasinoGame({ onExit }: { onExit: () => void }) {
  const screen = useCz((s) => s.screen)
  const focus = useCz((s) => s.focus)
  const since = useRef(Date.now())

  useEffect(() => {
    const st = useCz.getState()
    st.setScreen('lobby')
    if (import.meta.env.DEV) {
      const g = Q.get('cgame') as GameId | null
      if (g && g in GAME_LABEL) st.setScreen(g)
      const d = Q.get('cdiff')
      if (d === 'facil' || d === 'normal' || d === 'dificil' || d === 'estrela') st.setDifficulty(d)
    }
  }, [])

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return
      const st = useCz.getState()
      if (st.help || st.rankOpen) return
      if (st.screen === 'lobby') onExit()
      else st.setScreen('lobby')
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onExit])

  const back = () => useCz.getState().setScreen('lobby')
  const lobby = screen === 'lobby'

  return (
    <div className="cz-root" data-screen={screen}>
      {lobby && (
        <SceneBoundary>
          <Lounge3D focus={focus as Screen} onPick={(g) => useCz.getState().setScreen(g)} onHover={(g) => useCz.getState().setFocus(g)} />
        </SceneBoundary>
      )}
      {lobby && <Lobby onExit={onExit} />}
      {screen === 'blackjack' && <Blackjack onBack={back} />}
      {screen === 'poker' && <Poker onBack={back} />}
      {screen === 'roleta' && <Roulette onBack={back} />}
      {screen === 'slots' && <Slots onBack={back} />}
      <HowTo />
      <AchToasts />
      <BreakReminder since={since.current} onLeave={onExit} />
    </div>
  )
}
