import { useLayoutEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { Group } from 'three'
import { useAppearanceStore } from '../../state/appearanceStore'
import { Character } from './Character'

export type ViewMode = 'character' | 'face'

const FRAMING = {
  // alvo do orbit + posicao inicial da camera
  character: { target: [0, 0.85, 0] as const, cam: [0, 1.05, 3.6] as const },
  face: { target: [0, 1.46, 0] as const, cam: [0, 1.47, 0.85] as const },
}

/** Le `?view=character|face` da URL; null = jogo normal. */
export function getViewMode(): ViewMode | null {
  const v = new URLSearchParams(window.location.search).get('view')
  return v === 'character' || v === 'face' ? v : null
}

/**
 * Modo de revisao da arte: personagem na origem sobre uma plataforma giratoria, com orbit controls.
 * `?still=1` para a plataforma.
 */
export function CharacterViewer({ mode, shadows }: { mode: ViewMode; shadows: boolean }) {
  const appearance = useAppearanceStore((s) => s.appearance)
  const turntable = useRef<Group>(null)
  const camera = useThree((s) => s.camera)
  const three = useThree()
  const still = new URLSearchParams(window.location.search).get('still') === '1'
  const base = FRAMING[mode]
  // ?cam=x,y,z&at=x,y,z sobrescreve o enquadramento (revisao da arte)
  const q = new URLSearchParams(window.location.search)
  const num = (k: string): [number, number, number] | null => {
    const v = q.get(k)?.split(',').map(Number)
    return v && v.length === 3 && v.every(Number.isFinite) ? [v[0], v[1], v[2]] : null
  }
  const f = { cam: num('cam') ?? base.cam, target: num('at') ?? base.target }

  useLayoutEffect(() => {
    camera.position.set(f.cam[0], f.cam[1], f.cam[2])
    camera.lookAt(f.target[0], f.target[1], f.target[2])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera])

  // dev: expone cena/renderer para inspecao (renderer.info, malhas) no console
  useLayoutEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __three: unknown }).__three = three
  })

  useFrame((state) => {
    const g = turntable.current
    if (import.meta.env.DEV && g && state.clock.elapsedTime > 4 && !(window as unknown as { __logged?: boolean }).__logged) {
      ;(window as unknown as { __logged?: boolean }).__logged = true
      let m = 0
      let t = 0
      g.traverse((o) => {
        const me = o as import('three').InstancedMesh
        if (!me.isMesh) return
        m++
        const geo = me.geometry
        t += ((geo.index ? geo.index.count : geo.attributes.position.count) / 3) * (me.isInstancedMesh ? me.count : 1)
      })
      const r = three.gl.info.render
      console.info(`CHARSTATS meshes=${m} tris=${t} | frame: calls=${r.calls} triangles=${r.triangles}`)
    }
    if (!g || still) return
    const t = state.clock.elapsedTime
    // rosto: balanca +-40 graus (ve de frente e de 3/4); corpo: giro continuo
    g.rotation.y = mode === 'face' ? Math.sin(t * 0.5) * 0.7 : t * 0.4
  })

  return (
    <>
      <group ref={turntable} position={[0, 0.03, 0]}>
        <Character appearance={appearance} shadows={shadows} />
      </group>
      <OrbitControls
        makeDefault
        target={f.target as unknown as [number, number, number]}
        enablePan={false}
        minDistance={0.4}
        maxDistance={12}
        maxPolarAngle={Math.PI * 0.52}
      />
    </>
  )
}
