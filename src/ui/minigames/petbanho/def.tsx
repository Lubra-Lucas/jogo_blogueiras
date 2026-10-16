import { playEmote } from '../../../game/character/animation/emoteStore'
import type { MinigameDef } from '../registry'
import { BanhoGame } from './BanhoGame'

export const def: MinigameDef = {
  id: 'petbanho',
  label: 'Banho e Tosa',
  poi: 'petshop',
  order: 1,
  profession: 'Tosadora',
  component: BanhoGame,
  afterExit: () => {
    setTimeout(() => playEmote('thankful', { once: true, silent: true }), 500)
  },
}
