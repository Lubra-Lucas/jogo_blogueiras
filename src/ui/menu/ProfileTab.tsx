import { useState } from 'react'
import { CURRENCY_NAME, fameTitle, NO_PROFESSION, PROFESSIONS, professionLevel, useProfileStore, xpToNext } from '../../state/profileStore'
import { useAppearanceStore } from '../../state/appearanceStore'
import { IconPencil } from './icons'
import { VitrinePanel } from './EditionsSection'
import { useInventory } from '../../game/market/api'

/** Atributos de "flavor": derivados de nivel, visitas e do que esta vestido (sem regra de jogo ainda). */
function useStats() {
  const level = useProfileStore((s) => s.level)
  const visited = useProfileStore((s) => s.visited.length)
  const fame = useProfileStore((s) => s.fame)
  const a = useAppearanceStore((s) => s.appearance)
  const worn = Object.keys(a.outfit).length + a.accessories.length
  const morphs = Object.values(a.morphs).filter((v) => v > 0.05).length
  const cap = (n: number) => Math.min(100, Math.round(n))
  return [
    { id: 'Estilo', v: cap(14 + level * 3 + worn * 7), color: '#a98bf0' },
    { id: 'Carisma', v: cap(12 + level * 4 + visited * 2), color: '#f08fb8' },
    { id: 'Beleza', v: cap(20 + level * 2 + morphs * 3 + (a.hair.id ? 6 : 0)), color: '#3fbfa3' },
    { id: 'Fama', v: cap(level * 5 + visited * 3 + fame), color: '#e8a93a' },
  ]
}

export function ProfileTab() {
  const p = useProfileStore()
  const [name, setName] = useState(p.name)
  const [status, setStatus] = useState(p.status)
  const need = xpToNext(p.level)
  const stats = useStats()
  const title = useInventory((s) => s.equippedTitle)
  const profXp = p.professionXp
  const commitName = () => {
    p.setName(name)
    setName(useProfileStore.getState().name)
  }
  return (
    <>
      <div className="panel">
        <div className="prof__top">
          <div className="badge-level">
            <small>NÍVEL</small>
            <b>{p.level}</b>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="name-edit">
              <input
                className="name-input"
                value={name}
                maxLength={20}
                aria-label="Nome da personagem"
                onChange={(e) => setName(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur(), undefined)}
              />
              <IconPencil width={16} height={16} style={{ color: '#a79bb0', flex: 'none' }} />
            </div>
            <div className="row-wrap" style={{ marginTop: 4 }}>
              <span className="chip chip--gold">{fameTitle(p.level)}</span>
              <span className="chip">{p.profession ?? NO_PROFESSION}</span>
            </div>
            {title && (
              <div className="row-wrap" style={{ marginTop: 4 }}>
                <span className="chip chip--gold">{title}</span>
              </div>
            )}
          </div>
          <div className="coins" title={CURRENCY_NAME}>
            <span className="coin-dot" />
            {p.coins}
          </div>
        </div>
        <h4>Experiência</h4>
        <div className="bar" style={{ ['--bar' as string]: '#f08fb8' }}>
          <i style={{ width: `${Math.min(100, (p.xp / need) * 100)}%` }} />
          <span>
            {Math.floor(p.xp)} / {need} XP
          </span>
        </div>
      </div>

      <div className="panel">
        <h3>Status</h3>
        <input className="text-input" value={status} maxLength={60} placeholder="Como você está hoje?" aria-label="Status" onChange={(e) => setStatus(e.target.value)} onBlur={() => p.setStatus(status)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
      </div>

      <div className="panel">
        <h3>Atributos</h3>
        {stats.map((s) => (
          <div className="stat" key={s.id}>
            <span>{s.id}</span>
            <div className="bar" style={{ ['--bar' as string]: s.color }}>
              <i style={{ width: `${s.v}%` }} />
            </div>
            <b>{s.v}</b>
          </div>
        ))}
      </div>

      <VitrinePanel />

      <div className="panel">
        <h3>Profissões</h3>
        <div className="row-wrap">
          {PROFESSIONS.map((n) => {
            const xp = profXp[n] ?? 0
            return (
              <span key={n} className={`chip${xp > 0 ? ' chip--gold' : ''}`} title={`${Math.floor(xp)} XP`}>
                {n} · Nv {professionLevel(xp)} · {Math.floor(xp)} XP
              </span>
            )
          })}
        </div>
        <p style={{ margin: '8px 0 0', font: '600 12px var(--corpo)', color: 'var(--tinta-suave)' }}>O XP de cada profissão sobe jogando os minijogos (Cabeleireira vale para Salão Express e Manicure).</p>
      </div>
    </>
  )
}
