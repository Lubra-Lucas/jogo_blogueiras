import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { usePhotoStore } from '../state/photoStore'
import { usePlayerStore } from '../state/playerStore'
import { locate } from '../game/world/city/layout'
import { useProfileStore } from '../state/profileStore'
import { useUiStore } from '../state/uiStore'
import { useSelfieStore } from './selfie/selfieStore'

const W = 360

/** Dentro do Canvas: atende `photoStore.shoot()` renderizando 1 quadro e copiando o canvas para uma miniatura JPEG. */
export function PhotoCapture() {
  const handled = useRef(usePhotoStore.getState().request)
  useFrame(({ gl, scene, camera }) => {
    const req = usePhotoStore.getState().request
    if (req === handled.current) return
    handled.current = req
    gl.render(scene, camera) // garante o buffer atual (o canvas nao preserva o desenho)
    const src = gl.domElement
    const h = Math.round((W * src.height) / src.width)
    const c = document.createElement('canvas')
    c.width = W
    c.height = h
    c.getContext('2d')?.drawImage(src, 0, 0, W, h)
    const p = usePlayerStore.getState().position
    const where = locate(p.x, p.z)
    const selfie = useUiStore.getState().cameraMode && useSelfieStore.getState().front
    usePhotoStore.getState().add(c.toDataURL('image/jpeg', 0.72), selfie ? `Selfie · ${where.name}` : where.name)
    if (where.id === 'praca') useProfileStore.getState().completeQuest('photo-spot')
  })
  return null
}
