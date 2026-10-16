import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { Material, Mesh, Object3D, SkinnedMesh } from 'three'
import { usePlayerStore } from '../../../state/playerStore'
import { patchSecondary } from './secondaryShader'
import { updateSecondary } from './secondaryMotion'

/**
 * Movimento secundario do cabelo e das saias (molas + shader apos o skinning). Montar uma vez dentro do Canvas
 * (o LifeDriver ja monta). Nao edita Character.tsx: a cada ~1 s varre a cena atras de SkinnedMesh novas e remenda
 * os materiais: cabelo = material com chave `doll-hair*`; roupa que e saia/vestido = geometria com vertices na linha
 * central entre as pernas (altura 0,3-0,75 m) -- calca nao tem; corpo (`doll-body*`) e o resto ficam intactos.
 */

const seen = new WeakSet<Material>()
const CENTER_MIN = 10

function keyOf(m: Material): string {
  try {
    return m.customProgramCacheKey?.() ?? ''
  } catch {
    return ''
  }
}

/** Saia/vestido: ha vertices (pose de repouso) no centro (|x| < 3,5 cm) entre 0,3 e 0,75 m de altura. */
function isSkirtLike(m: SkinnedMesh): boolean {
  const pos = m.geometry.getAttribute('position')
  let n = 0
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    if (y > 0.3 && y < 0.75 && Math.abs(pos.getX(i)) < 0.035) {
      if (++n >= CENTER_MIN) return true
    }
  }
  return false
}

function scan(root: Object3D) {
  const groups = new Map<Material, SkinnedMesh[]>()
  root.traverse((o) => {
    const m = o as SkinnedMesh
    if (!m.isSkinnedMesh) return
    const mat = m.material as Material
    if (!mat || Array.isArray(mat) || seen.has(mat)) return
    const l = groups.get(mat)
    if (l) l.push(m)
    else groups.set(mat, [m])
  })
  groups.forEach((meshes, mat) => {
    seen.add(mat)
    const key = keyOf(mat)
    if (key.includes('doll-body')) return
    if (key.includes('doll-hair')) {
      patchSecondary(mat, 'hair')
      return
    }
    if ((mat as Mesh['material'] & { isMeshPhysicalMaterial?: boolean }).isMeshPhysicalMaterial && meshes.some(isSkirtLike)) patchSecondary(mat, 'skirt')
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
