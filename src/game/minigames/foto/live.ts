/** Estado "ao vivo" da cena (mutável, atualizado a cada frame pelo 3D e lido pela interface sem re-render). */
import type { PoseId } from './data'
import { DEFAULT_CAM, type CamState, type PoseSample } from './logic'

export const live = {
  /** câmera suavizada (a que realmente aparece no quadro) */
  cam: { ...DEFAULT_CAM } as CamState,
  /** velocidade da câmera em larguras de quadro por segundo */
  speed: 0,
  /** maior velocidade desde o último clique (para a nitidez) */
  peakSpeed: 0,
  /** velocidade recente (decai em ~0,25 s): o que o obturador "sente" antes do clique */
  recent: 0,
  /** tempo da modelo (s) desde o início do cliente */
  t: 0,
  /** só em dev (capturas): trava a modelo numa pose */
  force: null as PoseId | null,
  forceT: 0,
  sample: { index: 0, pose: 'neutra', prev: 'neutra', phase: 'blend', blendP: 0, peak: 0, blink: false, tIn: 0 } as PoseSample,
}
