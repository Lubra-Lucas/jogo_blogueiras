import { create } from 'zustand'

/**
 * Estado da camera em terceira pessoa. Campos MUTADOS no lugar a cada frame pela
 * ThirdPersonCamera (sem re-render): leia com `useCameraStore.getState()` em useFrame.
 * yaw = 0 -> camera em +Z olhando para -Z; a frente horizontal da camera e (-sin yaw, -cos yaw).
 */
export interface CameraState {
  yaw: number
  /** elevacao da camera acima do pivo (rad) */
  pitch: number
  /** distancia real pivo -> camera, ja com colisao (m) */
  distance: number
}

export const useCameraStore = create<CameraState>()(() => ({
  yaw: 0,
  pitch: 0.31,
  distance: 6.5,
}))
