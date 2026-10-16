import { createContext, useContext, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'

/** Distancias de corte (m) por nivel de qualidade: props pequenos somem antes, a nevoa esconde o corte. */
export interface CullDist {
  props: number
  buildings: number
}
export const CullCtx = createContext<CullDist>({ props: 110, buildings: 250 })
export const useCullDist = () => useContext(CullCtx)

/** Tamanho (m) das celulas espaciais: cada celula vira uma malha propria (frustum culling funciona). */
export const CHUNK = 70
export const chunkKey = (x: number, z: number) => Math.floor((x + 1000) / CHUNK) * 10000 + Math.floor((z + 1000) / CHUNK)

/** Esconde o grupo quando a camera esta a mais de `max` m do circulo (cx, cz, r). */
export function Cull({ cx, cz, r, max, children }: { cx: number; cz: number; r: number; max: number; children: ReactNode }) {
  const ref = useRef<Group>(null)
  useFrame(({ camera }) => {
    const g = ref.current
    if (!g) return
    const v = Math.hypot(camera.position.x - cx, camera.position.z - cz) - r < max
    if (g.visible !== v) g.visible = v
  })
  return <group ref={ref}>{children}</group>
}
