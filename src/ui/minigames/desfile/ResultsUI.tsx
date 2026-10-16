import { useState } from 'react'
import { makeThumb, savePhoto } from '../../../game/minigames/desfile/persist'
import { useDesfileStore } from '../../../game/minigames/desfile/store'
import { playSfx } from '../../../game/minigames/audio'

const MEDAL = ['🥇', '🥈', '🥉', '4º', '5º']

/** Ranking final + recompensas + foto do pódio + salvar look. */
export function ResultsUI({ getCanvas, onExit }: { getCanvas: () => HTMLCanvasElement | null; onExit: () => void }) {
  const result = useDesfileStore((s) => s.result)
  const theme = useDesfileStore((s) => s.theme)
  const saved = useDesfileStore((s) => s.saved)
  const [flash, setFlash] = useState(0)
  const [note, setNote] = useState<string | null>(null)
  if (!result) return null
  const { ranking, playerRank, rewards } = result

  const photo = async () => {
    const canvas = getCanvas()
    if (!canvas) return
    playSfx('serve')
    setFlash((n) => n + 1)
    try {
      const thumb = await makeThumb(canvas)
      const ok = savePhoto({ id: `desfile-${Date.now()}`, thumb, title: `${theme.name}: ${playerRank}º lugar`, themeId: theme.id, date: Date.now() })
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `passarela-${theme.id}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setNote(ok ? 'Foto salva! Ela vai para o seu feed.' : 'Foto baixada (sem espaço para guardar no feed).')
    } catch {
      setNote('Não consegui tirar a foto agora.')
    }
    window.setTimeout(() => setNote(null), 3500)
  }

  return (
    <>
      {flash > 0 && <div key={flash} className="dz-flash" />}
      <aside className="dz-panel dz-results">
        <h2 className="dz-title">{playerRank === 1 ? 'Você venceu!' : `Você ficou em ${playerRank}º lugar`}</h2>
        <div className="dz-theme-line">
          {theme.icon} {theme.name}
          {result.newBest && <span className="dz-newbest">Novo recorde!</span>}
        </div>
        <ol className="dz-rank">
          {ranking.map((c, i) => (
            <li key={c.id} className={c.isPlayer ? 'me' : ''} style={{ ['--i' as string]: i }}>
              <span className="dz-medal">{MEDAL[i]}</span>
              <span className="dz-rname">
                {c.emoji} {c.name}
              </span>
              <b>{c.score100}</b>
            </li>
          ))}
        </ol>
        <div className="dz-rewards" aria-label="Recompensas">
          <span>✨ +{rewards.coins} Brilhos</span>
          <span>⭐ +{rewards.xp} XP</span>
          <span>📸 +{rewards.fame} Fama</span>
          <span>💃 +{rewards.modelXp} Modelo</span>
        </div>
        {result.prevBest !== null && !result.newBest && (
          <div className="dz-best">Recorde neste tema: {result.prevBest} pts</div>
        )}
        {note && <div className="dz-note" role="status">{note}</div>}
        <div className="dz-row wrap">
          <button className="dz-btn ghost" onClick={photo}>
            📸 Tirar foto
          </button>
          <button className="dz-btn ghost" disabled={saved} onClick={() => (playSfx('tip'), useDesfileStore.getState().saveLook())}>
            {saved ? '✓ Look salvo' : '💾 Salvar este look'}
          </button>
        </div>
        <div className="dz-row wrap">
          <button className="dz-btn primary" onClick={() => (playSfx('done'), useDesfileStore.getState().begin())}>
            Jogar de novo
          </button>
          <button className="dz-btn ghost" onClick={onExit}>
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}
