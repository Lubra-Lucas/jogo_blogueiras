import { useState } from 'react'
import { ACHIEVEMENTS, STREAK_REWARDS, useEconomyStore } from '../../game/economy/economyStore'
import { dayKey, economyNow } from '../../game/economy/clock'
import { IconCheck } from '../menu/icons'
import { IconFlame, IconGift, IconTrophy } from './icons'
import { CurrencyIcon, fmt } from './parts'

/** Recompensa diária (sequência de 7 dias), missões do dia e conquistas. */
export function DailyPanel() {
  const eco = useEconomyStore()
  const [got, setGot] = useState<string | null>(null)
  const available = eco.dailyAvailable()
  const continues = eco.lastClaim === dayKey(economyNow() - 86400000)
  const shown = available && !continues ? 0 : eco.streak
  const next = available ? (continues ? eco.streak + 1 : 1) : eco.streak
  const todayIdx = Math.max(0, next - 1) % STREAK_REWARDS.length
  const missions = eco.missionsToday()

  const claim = () => {
    const r = eco.claimDaily()
    if (r) setGot(`+${fmt(r.brilhos)} Brilhos${r.diamantes ? ` e +${r.diamantes} Diamantes` : ''}`)
  }

  return (
    <div className="sh-daily">
      <section className="sh-sec">
        <h4>
          <IconGift /> Recompensa diária
        </h4>
        <div className="sh-streak" role="list">
          {STREAK_REWARDS.map((r, i) => {
            const done = available ? i < todayIdx : i <= todayIdx
            const current = available && i === todayIdx
            return (
              <div key={i} role="listitem" className={`sh-streak__d${done ? ' is-done' : ''}${current ? ' is-now' : ''}`}>
                <small>Dia {i + 1}</small>
                <CurrencyIcon currency={r.diamantes ? 'diamantes' : 'brilhos'} size={20} />
                <b>{r.diamantes ? `${r.brilhos}+${r.diamantes}` : r.brilhos}</b>
                {done && <i className="sh-streak__ok"><IconCheck /></i>}
              </div>
            )
          })}
        </div>
        <div className="sh-daily__row">
          <span className="sh-daily__streak">
            <IconFlame /> Sequência: <b>{shown}</b> {shown === 1 ? 'dia' : 'dias'}
          </span>
          <button type="button" className="sh-btn sh-btn--buy" disabled={!available} onClick={claim}>
            {available ? 'Resgatar' : 'Volte amanhã'}
          </button>
        </div>
        {got && <p className="sh-ok" role="status">{got}</p>}
        <p className="sh-fine">Faltou um dia? A sequência recomeça no dia 1. Os Diamantes do dia 7 são de graça.</p>
      </section>

      <section className="sh-sec">
        <h4>Missões do dia</h4>
        {missions.map((m) => {
          const v = Math.min(m.target, eco.counters[m.counter])
          const claimed = eco.claimedMissions.includes(m.id)
          const ready = v >= m.target && !claimed
          return (
            <div key={m.id} className={`sh-mis${claimed ? ' is-done' : ''}`}>
              <div className="sh-mis__top">
                <span>{m.title}</span>
                <em>
                  <CurrencyIcon currency={m.reward.currency} size={14} /> {m.reward.amount}
                  {m.xp ? ` · ${m.xp} XP` : ''}
                </em>
              </div>
              <div className="sh-bar">
                <i style={{ width: `${(v / m.target) * 100}%` }} />
                <span>
                  {fmt(v)} / {fmt(m.target)}
                </span>
              </div>
              {ready && (
                <button type="button" className="sh-btn sh-btn--buy sh-btn--sm" onClick={() => eco.claimMission(m.id)}>
                  Resgatar
                </button>
              )}
              {claimed && <small className="sh-ok">Concluída</small>}
            </div>
          )
        })}
        <p className="sh-fine">As missões do dia renovam à meia-noite.</p>
      </section>

      <section className="sh-sec">
        <h4>
          <IconTrophy /> Conquistas
        </h4>
        <ul className="sh-ach">
          {ACHIEVEMENTS.map((a) => {
            const ok = eco.achievements.includes(a.id)
            return (
              <li key={a.id} className={ok ? 'is-done' : ''}>
                <span>
                  <b>{a.title}</b>
                  <small>{a.desc}</small>
                </span>
                <em>
                  <CurrencyIcon currency="diamantes" size={14} /> {a.diamonds}
                </em>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
