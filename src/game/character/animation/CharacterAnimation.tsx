import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import type { GLTF } from 'three-stdlib'
import { usePlayerStore } from '../../../state/playerStore'
import type { CharacterHandle } from '../Character'
import { applyRestPose } from '../pose'
import { ANIMS_URL, CharacterAnimator, type AnimInput, type ClipName } from './animator'
import { useEmoteStore } from './emoteStore'

/**
 * Como o personagem e animado:
 *  - 'player': maquina de estados guiada por playerStore (velocidade) + emoteStore;
 *  - { clip, t }: visualizador/captura; com `t` congela o clipe nesse instante (s).
 */
export type AnimDriver = 'player' | { clip: ClipName; t?: number }

const input: AnimInput = { speed: 0, emote: null, desfile: false }

/** Componente sem render: cria o mixer do personagem e o atualiza uma vez por frame. */
export function CharacterAnimation({ rig, driver }: { rig: CharacterHandle; driver: AnimDriver }) {
  const gltf = useGLTF(ANIMS_URL) as unknown as GLTF
  const animator = useMemo(() => {
    applyRestPose(rig.bones, rig.root) // base do idle procedural (bracos relaxados)
    return new CharacterAnimator(rig.root, rig.bones, gltf.animations)
  }, [rig, gltf])
  useEffect(() => {
    if (import.meta.env.DEV && driver === 'player') (window as unknown as { __animator?: CharacterAnimator }).__animator = animator
    return () => animator.dispose()
  }, [animator, driver])

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05)
    if (driver === 'player') {
      input.speed = usePlayerStore.getState().speed
      const e = useEmoteStore.getState()
      input.emote = e.emote
      input.desfile = e.desfile
      animator.update(dt, input)
    } else if (driver.t !== undefined) {
      animator.seek(driver.clip, driver.t)
    } else {
      animator.play(driver.clip, 0)
      animator.mixer.update(dt)
    }
  })
  return null
}

useGLTF.preload(ANIMS_URL)
