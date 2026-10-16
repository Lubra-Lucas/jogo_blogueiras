import { create } from 'zustand'

/**
 * Camera do celular: traseira (foto normal, a camera do jogo) ou frontal (selfie: camera a frente do rosto).
 * `selfieBridge` e mutavel (lido em useFrame, sem re-render): a ThirdPersonCamera nao mexe na camera enquanto `active`.
 */
export const selfieBridge = { active: false }

/** poses de selfie (ciclo do botao): sem emote (so o celular na mao) ou um emote curto durante a foto */
export const SELFIE_POSES = [
  { id: 'normal', label: 'Normal', emote: null },
  { id: 'beijo', label: 'Beijo', emote: 'kiss' },
  { id: 'risada', label: 'Risada', emote: 'laugh' },
  { id: 'aceno', label: 'Aceno', emote: 'wave' },
] as const

interface SelfieState {
  front: boolean
  /** 0 = rosto (fechado) .. 1 = ate o busto (aberto) */
  zoom: number
  pose: number
  setFront: (v: boolean) => void
  setZoom: (z: number) => void
  nextPose: () => void
}

export const useSelfieStore = create<SelfieState>()((set, get) => ({
  front: false,
  zoom: 0.35,
  pose: 0,
  setFront: (front) => set({ front }),
  setZoom: (zoom) => set({ zoom: Math.min(1, Math.max(0, zoom)) }),
  nextPose: () => set({ pose: (get().pose + 1) % SELFIE_POSES.length }),
}))
