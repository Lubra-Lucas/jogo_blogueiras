import type { MinigameDef } from '../registry'
import { DesfileGame } from './DesfileGame'

export const def: MinigameDef = {
  id: 'desfile',
  label: 'Passarela',
  // TODO: POI dedicado "Passarela" na Avenida da Moda (por ora, a porta da Boutique)
  poi: 'boutique',
  order: 0,
  profession: 'Modelo',
  category: 'trabalho', description: 'Monte o look e arrase na passarela.', bestKey: 'jdb.desfile.best',
  component: DesfileGame,
}
