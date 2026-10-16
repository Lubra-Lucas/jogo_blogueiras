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

/**
 * Cull com LOD: `children` = versao detalhada, `lo` = versao decimada (alem de `lod` m do centro da celula, com folga
 * proporcional ao raio e histerese de 3 m). Some inteiro a mais de `max` m.
 */
export function LodCull({ cx, cz, r, max, lod, lo, children }: { cx: number; cz: number; r: number; max: number; lod: number; lo: ReactNode; children: ReactNode }) {
  const hi = useRef<Group>(null)
  const far = useRef<Group>(null)
  const near = useRef(true)
  useFrame(({ camera }) => {
    const h = hi.current
    const f = far.current
    if (!h || !f) return
    const d = Math.hypot(camera.position.x - cx, camera.position.z - cz)
    const vis = d - r < max
    const lim = lod + r * 0.3
    near.current = near.current ? d < lim + 3 : d < lim - 3
    const vh = vis && near.current
    const vf = vis && !near.current
    if (h.visible !== vh) h.visible = vh
    if (f.visible !== vf) f.visible = vf
  })
  return (
    <group>
      <group ref={hi}>{children}</group>
      <group ref={far}>{lo}</group>
    </group>
  )
}
