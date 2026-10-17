import { playEmote } from '../../../game/character/animation/emoteStore'
import type { MinigameDef } from '../registry'
import { AdestraGame } from './AdestraGame'

export const def: MinigameDef = {
  id: 'petadestra',
  label: 'Adestramento',
  poi: 'petshop',
  order: 2,
  profession: 'Tosadora',
  category: 'pets', needsPet: true, description: 'Ensine comandos ao seu pet.',
  component: AdestraGame,
  afterExit: () => {
    setTimeout(() => playEmote('clap', { once: true, silent: true }), 500)
  },
}
