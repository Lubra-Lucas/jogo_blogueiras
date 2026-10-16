import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import type { GLTF } from 'three-stdlib'
import { usePlayerStore } from '../../../state/playerStore'
import type { CharacterHandle } from '../Character'
import { applyRestPose } from '../pose'
import { ANIMS_URL, CharacterAnimator, type AnimInput, type ClipName } from './animator'
import { useEmoteStore } from './emoteStore'
import { useSitStore } from '../../sit/sitStore'

/**
 * Como o personagem e animado:
 *  - 'player': maquina de estados guiada por playerStore (velocidade) + emoteStore;
 *  - { clip, t }: visualizador/captura; com `t` congela o clipe nesse instante (s).
 */
export type AnimDriver = 'player' | { clip: ClipName; t?: number }

const input: AnimInput = { speed: 0, emote: null, desfile: false, seated: false }

/** Componente sem render: cria o mixer do personagem e o atualiza uma vez por frame. */
export function CharacterAnimation({ rig, driver }: { rig: CharacterHandle; driver: AnimDriver }) {
  const gltf = useGLTF(ANIMS_URL) as unknown as GLTF
  const animator = useMemo(() => {
    applyRestPose(rig.bones, rig.root) // base do idle procedural (bracos relaxados)
    return new CharacterAnimator(rig.root, rig.bones, gltf.animations)
  }, [rig, gltf])
  useEffect(() => {
    // altura do quadril no clipe de sentar: o SitController usa para posicionar a personagem no assento
    const t = gltf.animations.find((c) => c.name === 'sit')?.tracks.find((k) => k.name === 'mixamorigHips.position')
    if (t) useSitStore.setState({ sitHipsY: t.values[1] })
    // fim do pulo (one-shot): solta o emote
    const onFinished = (e: { action: { getClip: () => { name: string } } }) => {
      if (e.action.getClip().name === 'jump') useEmoteStore.getState().stop()
    }
    animator.mixer.addEventListener('finished', onFinished as never)
    return () => animator.mixer.removeEventListener('finished', onFinished as never)
  }, [animator, gltf])
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
      input.seated = useSitStore.getState().seat !== null
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
