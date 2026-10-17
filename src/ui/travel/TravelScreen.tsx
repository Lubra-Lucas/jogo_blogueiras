import { useEffect, useState } from 'react'
import { CURRENCY_NAME, fameTitle, useProfileStore, xpToNext } from '../../state/profileStore'
import { DESTINATIONS, type TravelDestination } from '../../game/travel/destinations'
import { checkTravel, devUnlock, startTravel } from '../../game/travel/actions'
import { useTravelStore } from '../../game/travel/travelStore'
import { navigateTo } from '../../game/navigation/navigation'
import { IClose, ICheck, ILock, IPin, IPlane } from './icons'
import './travel.css'

/** cartao do destino: ceu do destino, nome, descricao, nivel, preco e botao (ou cadeado e "Nivel X necessario") */
function Card({ d, here, onGo, busy }: { d: TravelDestination; here: boolean; onGo: (id: string) => void; busy: boolean }) {
  const [confirm, setConfirm] = useState(false)
  const level = useProfileStore((s) => s.level)
  const coins = useProfileStore((s) => s.coins)
  const visited = useTravelStore((s) => s.visited.includes(d.id))
  const locked = level < d.minLevel && !devUnlock()
  const poor = !locked && d.price > 0 && coins < d.price
  const free = d.price === 0
  return (
    <article className={`tv-card${locked ? ' tv-card--locked' : ''}${here ? ' tv-card--here' : ''}`} aria-label={d.name}>
      <div className="tv-card__sky" style={{ background: `linear-gradient(180deg, ${d.sky[0]} 0%, ${d.sky[1]} 58%, ${d.sky[2]} 100%)` }}>
        <i className="tv-card__sun" />
        <i className={`tv-card__ground tv-card__ground--${d.approach}`} />
        {locked && (
          <span className="tv-card__lock">
            <ILock width={30} height={30} />
          </span>
        )}
      </div>
      <div className="tv-card__body">
        <h3>{d.name}</h3>
        <p>{d.blurb}</p>
        <div className="tv-chips">
          <span className="tv-chip">Nível {d.minLevel}+</span>
          <span className="tv-chip">{free ? 'Passagem grátis' : `${d.price} ${CURRENCY_NAME}`}</span>
          {visited && !here && (
            <span className="tv-chip tv-chip--ok">
              <ICheck width={11} height={11} /> Já visitada
            </span>
          )}
        </div>
        {here ? (
          <div className="tv-here">
            <IPin width={15} height={15} /> Você está aqui
          </div>
        ) : locked ? (
          <div className="tv-locked" role="status">
            <ILock width={16} height={16} /> Libera no nível {d.minLevel}
            <small>Você está no nível {level}</small>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="tv-go"
              disabled={busy || poor}
              onClick={() => (free || confirm ? onGo(d.id) : setConfirm(true))}
            >
              <IPlane width={18} height={18} />
              {poor ? `Faltam ${d.price - coins} ${CURRENCY_NAME}` : free ? 'Embarcar (grátis)' : confirm ? `Confirmar · ${d.price} ${CURRENCY_NAME}` : `Comprar passagem · ${d.price}`}
            </button>
            {confirm && !poor && (
              <button type="button" className="tv-link tv-cancel" onClick={() => setConfirm(false)}>
                Cancelar
              </button>
            )}
          </>
        )}
      </div>
    </article>
  )
}

/**
 * Tela de check-in do aeroporto (balcao): lista os destinos do registro com nivel minimo e preco. Destino bloqueado mostra o
 * cadeado e "Nivel X necessario". `mode="phone"`: o mesmo painel pelo celular (com atalho para ir ao aeroporto). Comprar pede uma confirmacao do preco.
 */
export function TravelScreen({ onClose, mode = 'counter' }: { onClose: () => void; mode?: 'counter' | 'phone' }) {
  const cityId = useTravelStore((s) => s.cityId)
  const flight = useTravelStore((s) => s.flight)
  const level = useProfileStore((s) => s.level)
  const xp = useProfileStore((s) => s.xp)
  const coins = useProfileStore((s) => s.coins)
  const [msg, setMsg] = useState('')
  const here = DESTINATIONS.find((d) => d.id === cityId)
  const need = xpToNext(level)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const go = (id: string) => {
    const c = checkTravel(id)
    if (!c.ok) {
      setMsg(c.msg)
      return
    }
    onClose()
    void startTravel(id)
  }
  const toAirport = () => {
    onClose()
    void navigateTo('aeroporto')
  }

  return (
    <div className="tv-root" role="dialog" aria-label={mode === 'phone' ? 'Viagens' : 'Check-in do aeroporto'}>
      <div className="tv-panel glass" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
        <header className="tv-head">
          <span className="tv-head__ic">
            <IPlane width={22} height={22} />
          </span>
          <div className="tv-head__t">
            <h2>{mode === 'phone' ? 'Viagens' : 'Check-in'}</h2>
            <span>
              {mode === 'phone' ? 'Cidade atual' : 'Aeroporto'}: <b>{here?.name ?? 'Cidade'}</b>
            </span>
          </div>
          <button type="button" className="tv-x" aria-label="Fechar" onClick={onClose}>
            <IClose width={20} height={20} />
          </button>
        </header>

        <div className="tv-me">
          <span>
            Nível <b>{level}</b> · {fameTitle(level)}
          </span>
          <span className="tv-me__bar" aria-hidden>
            <i style={{ width: `${Math.min(100, (xp / need) * 100)}%` }} />
          </span>
          <span>
            {coins} {CURRENCY_NAME}
          </span>
        </div>

        <div className="tv-list">
          {DESTINATIONS.map((d) => (
            <Card key={d.id} d={d} here={d.id === cityId} onGo={go} busy={!!flight} />
          ))}
        </div>

        {msg && (
          <div className="tv-msg" role="alert">
            {msg}
          </div>
        )}
        {mode === 'phone' ? (
          <div className="tv-foot">
            <span>Compre aqui ou no balcão do aeroporto{cityId === 'main' ? ' (borda oeste da cidade)' : ''}.</span>
            <button type="button" className="tv-link" onClick={toAirport}>
              <IPin width={15} height={15} /> Ir ao aeroporto
            </button>
          </div>
        ) : (
          <div className="tv-foot">
            <span>Voltar para casa é sempre grátis. Mais cidades chegam em breve.</span>
          </div>
        )}
      </div>
    </div>
  )
}
