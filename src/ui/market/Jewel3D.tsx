import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bounds, Center, Environment, Lightformer, useGLTF } from '@react-three/drei'
import { ACESFilmicToneMapping, MeshPhysicalMaterial, SRGBColorSpace, type Group, type Material, type Mesh } from 'three'
import { useCatalogStore } from '../../game/character/catalog'
import { applyJewelMaterial } from '../../game/character/fabric'
import type { EditionDef } from '../../game/market/types'

const slotOf = (m: Material | Material[]): string => (Array.isArray(m) ? m[0] : m).name.replace(/\.\d+$/, '')

function Model({ def, glb }: { def: EditionDef; glb: string }) {
  const gltf = useGLTF(glb)
  const item = useCatalogStore((s) => s.items[def.itemId])
  const grp = useRef<Group>(null)
  const obj = useMemo(() => {
    const o = gltf.scene.clone(true)
    const mats = new Map<string, MeshPhysicalMaterial>()
    o.traverse((c) => {
      const m = c as Mesh
      if (!m.isMesh) return
      const slot = slotOf(m.material)
      let mat = mats.get(slot)
      if (!mat) {
        mat = new MeshPhysicalMaterial({ name: slot })
        const idx = item?.mats.findIndex((x) => x.id === slot) ?? -1
        const color = (idx >= 0 ? def.colorway?.colors[idx] : undefined) ?? item?.mats[idx]?.color ?? '#d9b45a'
        applyJewelMaterial(mat, slot, color)
        mats.set(slot, mat)
      }
      m.material = mat
    })
    return o
  }, [gltf, item, def])
  useFrame((_, dt) => {
    if (grp.current) grp.current.rotation.y += dt * 0.6
  })
  return (
    <group ref={grp}>
      <Center>
        <primitive object={obj} />
      </Center>
    </group>
  )
}

/** Visualizador 3D de joia (somente leitura): gira sozinho, com as cores exclusivas da edicao. */
export default function Jewel3D({ def, glb }: { def: EditionDef; glb: string }) {
  return (
    <Canvas dpr={[1, 1.6]} camera={{ position: [0, 0.2, 1.6], fov: 32 }} gl={{ antialias: true, alpha: true, toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace }} style={{ background: 'transparent' }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 3, 3]} intensity={2.2} />
      <directionalLight position={[-3, 1, -2]} intensity={1.1} color="#ffe9c8" />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={3} position={[0, 3, 3]} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[-4, 1, 1]} scale={[2, 4, 1]} color="#fff2dd" />
        <Lightformer form="rect" intensity={1.2} position={[4, 0, -2]} scale={[2, 4, 1]} color="#e9f0ff" />
      </Environment>
      <Suspense fallback={null}>
        <Bounds fit clip observe margin={1.5}>
          <Model def={def} glb={glb} />
        </Bounds>
      </Suspense>
    </Canvas>
  )
}
