import { playEmote } from '../../../game/character/animation/emoteStore'
import { useCafeStore } from '../../../game/minigames/cafe/store'
import type { MinigameDef } from '../registry'
import { CafeGame } from './CafeGame'

export const def: MinigameDef = {
  id: 'cafe',
  label: 'Café Rosé',
  poi: 'cafe-rose',
  profession: 'Barista',
  category: 'trabalho', description: 'Atenda os pedidos do balcão no tempo certo.', bestKey: 'jdb.cafe.best',
  component: CafeGame,
  afterExit: () => {
    // saiu com 2+ estrelas: a personagem no mundo agradece
    const stars = useCafeStore.getState().results?.stars ?? 0
    if (stars >= 2) setTimeout(() => playEmote('thankful', { once: true, silent: true }), 500)
  },
}
