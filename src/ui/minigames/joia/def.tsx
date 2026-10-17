import { lazy } from 'react'
import { playEmote } from '../../../game/character/animation/emoteStore'
import { useJoiaStore } from '../../../game/minigames/joia/store'
import type { MinigameDef } from '../registry'

export const def: MinigameDef = {
  id: 'joia',
  label: 'Joia Sob Medida',
  poi: 'joalheria',
  order: 0,
  profession: 'Joalheira',
  category: 'trabalho', description: 'Crie a joia sob medida para o cliente.',
  component: lazy(() => import('./JoiaGame').then((m) => ({ default: m.JoiaGame }))),
  afterExit: () => {
    const stars = useJoiaStore.getState().results?.stars ?? 0
    if (stars >= 2) setTimeout(() => playEmote('thankful', { once: true, silent: true }), 500)
  },
}
