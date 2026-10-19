import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { Material, Object3D, SkinnedMesh } from 'three'
import { usePlayerStore } from '../../../state/playerStore'
import { patchSecondary } from './secondaryShader'
import { updateSecondary } from './secondaryMotion'

/**
 * Movimento secundario do cabelo e das saias (molas + shader apos o skinning). Montar uma vez dentro do Canvas
 * (o LifeDriver ja monta). A cada ~1 s varre a cena atras de SkinnedMesh novas e remenda
 * os materiais: cabelo = material com chave `doll-hair*`; saias/vestidos sao marcados ao montar a roupa.
 * Calcas, corpo e demais pecas ficam intactos.
 */

const seen = new WeakSet<Material>()

function keyOf(m: Material): string {
  try {
    return m.customProgramCacheKey?.() ?? ''
  } catch {
    return ''
  }
}

function scan(root: Object3D) {
  root.traverse((o) => {
    const m = o as SkinnedMesh
    if (!m.isSkinnedMesh) return
    const mat = m.material as Material
    if (!mat || Array.isArray(mat) || seen.has(mat)) return
    seen.add(mat)
    const key = keyOf(mat)
    if (key.includes('doll-body')) return
    if (key.includes('doll-hair')) {
      patchSecondary(mat, 'hair')
      return
    }
    if (mat.userData.secondaryMotion === 'skirt') patchSecondary(mat, 'skirt')
  })
}

export function CharacterSecondary() {
  const scene = useThree((s) => s.scene)
  const t = useRef({ scan: 0.5, time: 0 })
  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 0.05)
    t.current.time += dt
    t.current.scan -= dt
    if (t.current.scan <= 0) {
      t.current.scan = 1
      scan(scene)
    }
    if (usePlayerStore.getState().position) updateSecondary(dt, t.current.time)
  })
  return null
}
