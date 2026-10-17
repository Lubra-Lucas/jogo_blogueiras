import { playEmote } from '../../../game/character/animation/emoteStore'
import { useManicureStore } from '../../../game/minigames/manicure/store'
import type { MinigameDef } from '../registry'
import { ManicureGame } from './ManicureGame'

export const def: MinigameDef = {
  id: 'manicure',
  label: 'Manicure Perfeita',
  poi: 'salao-spa',
  order: 1,
  profession: 'Cabeleireira',
  category: 'trabalho', description: 'Cuide das unhas e capriche na arte.',
  component: ManicureGame,
  afterExit: () => {
    const stars = useManicureStore.getState().results?.stars ?? 0
    if (stars >= 2) setTimeout(() => playEmote('thankful', { once: true, silent: true }), 500)
  },
}
