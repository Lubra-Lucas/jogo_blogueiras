import { lazy } from 'react'
import { playEmote } from '../../../game/character/animation/emoteStore'
import { useDjStore } from '../../../game/minigames/dj/controller'
import type { MinigameDef } from '../registry'

export const def: MinigameDef = {
  id: 'dj',
  label: 'DJ da Noite',
  poi: 'palco-neon',
  order: 0,
  profession: 'DJ',
  component: lazy(() => import('./DjGame').then((m) => ({ default: m.DjGame }))),
  afterExit: () => {
    // saiu com 2+ estrelas: a personagem dança no mundo
    const stars = useDjStore.getState().result?.stars ?? 0
    if (stars >= 2) setTimeout(() => playEmote('dance', { once: true, silent: true }), 500)
  },
}
