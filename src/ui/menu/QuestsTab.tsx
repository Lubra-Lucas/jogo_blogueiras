import { QUESTS } from '../../state/quests'
import { CURRENCY_NAME, useProfileStore } from '../../state/profileStore'
import { IconCamera, IconCheck, IconLock, IconPin } from './icons'

export function QuestsTab() {
  const done = useProfileStore((s) => s.done)
  const finished = QUESTS.filter((q) => done.includes(q.id)).length
  return (
    <>
      <div className="panel">
        <h3>Missões</h3>
        <div className="bar" style={{ ['--bar' as string]: '#e8a93a' }}>
          <i style={{ width: `${(finished / QUESTS.length) * 100}%` }} />
          <span>
            {finished} de {QUESTS.length} concluídas
          </span>
        </div>
        <p style={{ margin: '8px 0 0', font: '600 12.5px var(--corpo)', color: 'var(--tinta-suave)' }}>Passeie pela cidade: visitar os lugares conclui as missões automaticamente.</p>
      </div>
      {QUESTS.map((q) => {
        const ok = done.includes(q.id)
        const soon = !q.visit
        return (
          <div key={q.id} className={`panel quest${ok ? ' quest--done' : ''}`}>
            <div className="quest__ico">{ok ? <IconCheck /> : soon ? <IconCamera /> : <IconPin />}</div>
            <div style={{ minWidth: 0 }}>
              <h5>{q.title}</h5>
              <p>{q.desc}</p>
              {ok ? <span className="chip">Concluída</span> : soon ? (
                <span className="chip chip--lock">
                  <IconLock width={12} height={12} /> Em breve
                </span>
              ) : (
                <span className="chip chip--gold">Em andamento</span>
              )}
            </div>
            <div className="quest__rew">
              <span className="chip chip--gold">+{q.xp} XP</span>
              <span className="chip">
                +{q.coins} {CURRENCY_NAME}
              </span>
            </div>
          </div>
        )
      })}
    </>
  )
}
