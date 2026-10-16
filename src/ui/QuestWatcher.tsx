import { useEffect } from 'react'
import { useMinigameStore } from '../game/minigames/minigameStore'
import { useSitStore } from '../game/sit/sitStore'
import { usePlayerStore } from '../state/playerStore'
import { useProfileStore } from '../state/profileStore'
import { locate } from '../game/world/city/layout'

/** Sem render: conclui missoes por eventos do jogo (fim de minijogo, sentar no parque). Fotos: ver PhotoCapture. */
export function QuestWatcher() {
  useEffect(() => {
    const un1 = useMinigameStore.subscribe((s, prev) => {
      if (prev.active && !s.active) {
        const done = useProfileStore.getState().completeQuest
        if (prev.active === 'cafe') done('work-cafe')
        else if (prev.active === 'desfile') done('runway')
      }
    })
    const un2 = useSitStore.subscribe((s, prev) => {
      if (s.seat && !prev.seat) {
        const p = usePlayerStore.getState().position
        if (locate(p.x, p.z).id === 'parque') useProfileStore.getState().completeQuest('sit-park')
      }
    })
    return () => {
      un1()
      un2()
    }
  }, [])
  return null
}
