import { useEffect } from 'react'
import { useSitStore } from '../game/sit/sitStore'
import { usePlayerStore } from '../state/playerStore'
import { useProfileStore } from '../state/profileStore'
import { locate } from '../game/world/city/layout'

/** Sem render: conclui missoes por eventos do jogo (sentar no parque). Minijogos concluem a propria missao ao fim da rodada. Fotos: ver PhotoCapture. */
export function QuestWatcher() {
  useEffect(() => {
    const un2 = useSitStore.subscribe((s, prev) => {
      if (s.seat && !prev.seat) {
        const p = usePlayerStore.getState().position
        if (locate(p.x, p.z).id === 'parque') useProfileStore.getState().completeQuest('sit-park')
      }
    })
    return () => {
      un2()
    }
  }, [])
  return null
}
