import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { PointLight } from 'three'
import { usePlayerStore } from '../../state/playerStore'
import { env } from '../world/environment/envState'
import { PLAYER } from './config'

/** Preenchimento noturno perto do rosto, do lado da camera, sem sombras extras. */
export function PlayerNightLight() {
  const light = useRef<PointLight>(null)
  useFrame(({ camera }) => {
    const l = light.current
    if (!l) return
    const p = usePlayerStore.getState()
    const dx = camera.position.x - p.position.x
    const dz = camera.position.z - p.position.z
    const distance = Math.hypot(dx, dz) || 1
    const feetY = p.position.y - PLAYER.halfHeight - PLAYER.radius
    l.position.set(p.position.x + dx / distance * 1.15, feetY + p.fit.eyeY + 0.15, p.position.z + dz / distance * 1.15)
    l.intensity = env.night * 2.2
    l.visible = l.intensity > 0.001
  })
  return <pointLight ref={light} name="player-night-light" color="#fff4e8" intensity={0} distance={4} decay={2} castShadow={false} />
}
