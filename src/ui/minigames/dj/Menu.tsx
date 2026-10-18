import { useMemo } from 'react'
import { playSfx } from '../../../game/minigames/audio'
import { DIFFICULTY_LABEL, getLeaderboard, type Difficulty } from '../../../game/minigames/shared/competition'
import { getProfessionXp } from '../../../game/minigames/rewards'
import { PROFESSION, todaysSong, useDjStore } from '../../../game/minigames/dj/controller'
import { hasCalibrated } from '../../../game/minigames/dj/engine'
import { djLevel, djXpForLevel } from '../../../game/minigames/dj/run'
import { SONGS, songDuration } from '../../../game/minigames/dj/songs'
import { joinLobby, leaveLobby, startMatch, useVersusStore, versusAvailable } from '../../../game/net/versus'
import { getCtx } from '../../../game/minigames/dj/engine'
import { useProfileStore } from '../../../state/profileStore'
import { IcCalendar, IcHelp, IcLock, IcNote, IcPlay, IcSliders, IcVinyl } from './icons'

const DIFFS: Difficulty[] = ['facil', 'normal', 'dificil', 'estrela']
const DIFF_NOTE: Record<Difficulty, string> = {
  facil: '2 pistas, notas lentas, janelas largas',
  normal: '4 pistas',
  dificil: 'Notas longas e scratch',
  estrela: 'Cartela densa, sem folga',
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`

export function Menu({ onPlay, onCalibrate }: { onPlay: () => void; onCalibrate: () => void }) {
  const { songId, difficulty, set } = useDjStore()
  const name = useProfileStore((s) => s.name)
  const xp = useProfileStore((s) => s.professionXp?.[PROFESSION] ?? 0) || getProfessionXp(PROFESSION)
  const level = djLevel(xp)
  const lo = djXpForLevel(level)
  const hi = djXpForLevel(level + 1)
  const pct = Math.min(100, Math.round(((xp - lo) / Math.max(1, hi - lo)) * 100))
  const daily = todaysSong()
  const lobby = useVersusStore((s) => s.lobby)
  const inLobby = useVersusStore((s) => s.gameId) !== null
  const best = useMemo(() => {
    const out: Record<string, number> = {}
    for (const s of SONGS) out[s.id] = getLeaderboard(`dj-${s.id}`, difficulty, 1, name).find((e) => e.you)?.score ?? 0
    out.daily = getLeaderboard('dj-diario', difficulty, 1, name).find((e) => e.you)?.score ?? 0
    return out
  }, [difficulty, name])

  const play = (id: string, isDaily: boolean) => {
    playSfx('click')
    set({ songId: id, daily: isDaily })
    useDjStore.setState({ daily: isDaily, songId: id })
    onPlay()
  }

  return (
    <div className="dj-menu">
      <div className="dj-menu-head">
        <div className="dj-badge">
          <IcVinyl size={26} />
        </div>
        <div className="dj-menu-title">
          <h1>DJ da Noite</h1>
          <p>
            Nível de DJ {level} <span className="dj-dot" /> {name}
          </p>
        </div>
        <div className="dj-xp" title="XP de DJ">
          <i style={{ width: `${pct}%` }} />
        </div>
      </div>

      <button className="dj-daily" onClick={() => play(daily.id, true)}>
        <span className="dj-daily-ic">
          <IcCalendar size={22} />
        </span>
        <span className="dj-daily-txt">
          <b>Desafio do dia</b>
          <small>
            {daily.name} · {daily.bpm} BPM · mesma partida para todas
          </small>
        </span>
        <span className="dj-daily-best">{best.daily ? best.daily.toLocaleString('pt-BR') : 'Jogar'}</span>
      </button>

      <div className="dj-label">Dificuldade</div>
      <div className="dj-seg" role="tablist">
        {DIFFS.map((d) => (
          <button key={d} role="tab" aria-selected={d === difficulty} className={d === difficulty ? 'on' : ''} onClick={() => set({ difficulty: d })}>
            {DIFFICULTY_LABEL[d]}
          </button>
        ))}
      </div>
      <div className="dj-hint">{DIFF_NOTE[difficulty]}</div>

      <div className="dj-label">Músicas</div>
      <div className="dj-songs">
        {SONGS.map((s) => {
          const locked = level < s.unlock
          return (
            <button
              key={s.id}
              className={`dj-song${s.id === songId ? ' on' : ''}${locked ? ' locked' : ''}`}
              style={{ ['--c1' as string]: s.colors[0], ['--c2' as string]: s.colors[1] }}
              disabled={locked}
              onClick={() => (s.id === songId ? play(s.id, false) : set({ songId: s.id }))}
            >
              <span className="dj-song-art">{locked ? <IcLock size={20} /> : <IcNote size={20} />}</span>
              <span className="dj-song-txt">
                <b>{s.name}</b>
                <small>
                  {s.genre} · {s.bpm} BPM · {fmt(songDuration(s))}
                </small>
              </span>
              <span className="dj-song-right">{locked ? `Nível ${s.unlock}` : best[s.id] ? best[s.id].toLocaleString('pt-BR') : ''}</span>
            </button>
          )
        })}
      </div>

      {versusAvailable() && (
        <>
          <div className="dj-label">Competição ao vivo</div>
          {inLobby ? (
            <>
              <div className="dj-hint">Na sala: {lobby.map((p) => p.name).join(', ')}</div>
              <div className="dj-menu-actions">
                <button className="dj-btn primary" disabled={lobby.length < 2} onClick={() => startMatch({ songId, difficulty })}>
                  Começar competição
                </button>
                <button className="dj-btn" onClick={leaveLobby}>Sair da sala</button>
              </div>
            </>
          ) : (
            <div className="dj-menu-actions">
              <button
                className="dj-btn"
                onClick={() => {
                  getCtx() // precisa de um gesto da jogadora para liberar o audio
                  joinLobby('dj')
                }}
              >
                Competir
              </button>
            </div>
          )}
        </>
      )}

      <div className="dj-menu-actions">
        <button className="dj-btn primary big" onClick={() => play(songId, false)}>
          <IcPlay size={20} /> Tocar
        </button>
        <button className="dj-btn" onClick={() => set({ showHelp: true })}>
          <IcHelp size={18} /> Como jogar
        </button>
        <button className={`dj-btn${hasCalibrated() ? '' : ' glow'}`} onClick={onCalibrate}>
          <IcSliders size={18} /> Calibrar áudio
        </button>
      </div>
    </div>
  )
}
