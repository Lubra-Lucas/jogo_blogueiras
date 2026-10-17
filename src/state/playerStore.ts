import { create } from 'zustand'
import { Vector3 } from 'three'
import type { RapierRigidBody } from '@react-three/rapier'
import { DEFAULT_FIT, type BodyFit } from '../game/character/proportions'

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
  /** corpo rigido do jogador (para excluir da colisao da camera); null ate montar */
  body: RapierRigidBody | null
  /** medidas do corpo da jogadora (altura, passo, quadril): capsula, camera e assento acompanham */
  fit: BodyFit
}

export const usePlayerStore = create<PlayerState>()(() => ({
  position: new Vector3(),
  velocity: new Vector3(),
  speed: 0,
  yaw: 0,
  grounded: true,
  hasMoved: false,
  body: null,
  fit: DEFAULT_FIT,
}))
