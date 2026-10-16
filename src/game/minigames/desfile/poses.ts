import type { ClipName } from '../../character/animation/animator'
import { POSE_LABEL, type PoseId } from './bonePoses'

/**
 * Poses seguradas no fim da passarela, na ordem das 3 batidas: mãos na cintura e braços para o alto são por ossos
 * (bonePoses.ts); a 2ª é o clipe "Blow A Kiss" do Mixamo (`clip`). Depois da 3ª a modelo faz a reverência (Quick Formal Bow).
 */
export const POSE_FRAMES: { id: PoseId; name: string; clip?: ClipName }[] = [
  { id: 'cintura', name: POSE_LABEL.cintura },
  { id: 'cabelo', name: 'Beijinho para a plateia', clip: 'kiss' },
  { id: 'vitoria', name: POSE_LABEL.vitoria },
]
