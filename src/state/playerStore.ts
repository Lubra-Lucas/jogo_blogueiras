import { create } from 'zustand'
import { Vector3 } from 'three'

/**
 * Estado do jogador local. `position`, `velocity`, `speed`, `yaw` e `grounded` sao MUTADOS no
 * lugar a cada frame pelo PlayerController (sem re-render): leia com
 * `usePlayerStore.getState()` dentro de useFrame (camera, animacoes).
 * Campos reativos (para a UI) sao trocados com setState, ex.: `hasMoved`.
 */
export interface PlayerState {
  position: Vector3
  /** velocidade real (m/s), nao a desejada */
  velocity: Vector3
  /** velocidade horizontal (m/s) */
  speed: number
  /** rotacao em Y (rad); 0 = olhando para +Z */
  yaw: number
  grounded: boolean
  hasMoved: boolean
}

export const usePlayerStore = create<PlayerState>()(() => ({
  position: new Vector3(),
  velocity: new Vector3(),
  speed: 0,
  yaw: 0,
  grounded: true,
  hasMoved: false,
}))
