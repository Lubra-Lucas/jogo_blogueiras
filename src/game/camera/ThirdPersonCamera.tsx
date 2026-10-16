import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import { MathUtils, Vector3 } from 'three'
import { cameraIntent } from '../input/intent'
import { PLAYER } from '../player/config'
import { useCameraStore } from '../../state/cameraStore'
import { usePlayerStore } from '../../state/playerStore'
import { CAMERA as C } from './config'
import { navBridge } from '../navigation/navStore'
import { driveBridge } from '../vehicles/driveStore'
import { interiorBridge } from '../interiors/interiorBridge'

const PITCH_MIN = MathUtils.degToRad(C.minPitchDeg)
const PITCH_MAX = MathUtils.degToRad(C.maxPitchDeg)
const FEET_OFFSET = PLAYER.halfHeight + PLAYER.radius // centro da capsula -> pes

/**
 * Camera em terceira pessoa (orbita em torno de um pivo na altura do ombro).
 *
 * Ordem: deve ser montada DEPOIS do PlayerController (mesma prioridade 0 => os useFrame rodam na
 * ordem de montagem), assim ela le a posicao ja atualizada do frame. Prioridade 0 mantem o
 * render automatico do r3f.
 *
 * Colisao: castShape de uma esfera do pivo ate a camera, so contra geometria fixa.
 */
export function ThirdPersonCamera() {
  const camera = useThree((s) => s.camera)
  const { world, rapier } = useRapier()

  const rig = useMemo(
    () => ({
      yaw: (Number(new URLSearchParams(window.location.search).get('yaw')) || 0) * (Math.PI / 180), // ?yaw=<graus> (so para capturas)
      pitch: MathUtils.degToRad(C.defaultPitchDeg),
      targetDist: C.defaultDistance as number,
      zoomDist: C.defaultDistance as number,
      dist: C.defaultDistance as number, // distancia final (com colisao)
      pivot: new Vector3(),
      inited: false,
      // temporarios reutilizados
      origin: { x: 0, y: 0, z: 0 },
      dir: { x: 0, y: 0, z: 0 },
      rot: { x: 0, y: 0, z: 0, w: 1 },
      shape: new rapier.Ball(C.collisionRadius),
      flags:
        rapier.QueryFilterFlags.EXCLUDE_SENSORS |
        rapier.QueryFilterFlags.EXCLUDE_DYNAMIC |
        rapier.QueryFilterFlags.EXCLUDE_KINEMATIC,
    }),
    [rapier],
  )

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05)
    if (dt <= 0) return
    if (driveBridge.active) return // dirigindo: a camera e a do carro (game/vehicles/VehicleCamera)
    const ps = usePlayerStore.getState()
    const cs = useCameraStore.getState()

    // ---- fast travel: camera atras da jogadora, sem varrer o mapa ----
    if (navBridge.cameraSnap !== null) {
      rig.yaw = navBridge.cameraSnap
      rig.inited = false
      navBridge.cameraSnap = null
    }

    // ---- interior (game/interiors): zoom curto e camera sob o teto ----
    const inside = interiorBridge.active
    if (interiorBridge.snapZoom !== null) {
      rig.targetDist = rig.zoomDist = interiorBridge.snapZoom
      rig.pitch = MathUtils.degToRad(24)
      interiorBridge.snapZoom = null
    }

    if (inside && interiorBridge.overview && interiorBridge.room) {
      const o = interiorBridge.overview
      const r = interiorBridge.room
      camera.position.set(r.ox + o[0], o[1], r.oz + o[2])
      camera.lookAt(r.ox + o[3], o[4], r.oz + o[5])
      return
    }

    // ---- consome a intencao ----
    const manualYaw = cameraIntent.yawDelta !== 0 || cameraIntent.keyYaw !== 0
    rig.yaw += cameraIntent.yawDelta + cameraIntent.keyYaw * C.keyRotateSpeed * dt
    rig.pitch = MathUtils.clamp(rig.pitch + cameraIntent.pitchDelta, PITCH_MIN, PITCH_MAX)
    rig.targetDist = MathUtils.clamp(rig.targetDist * Math.exp(cameraIntent.zoomDelta), C.minDistance, inside ? interiorBridge.maxDist : C.maxDistance)
    cameraIntent.yawDelta = 0
    cameraIntent.pitchDelta = 0
    cameraIntent.zoomDelta = 0

    if (C.autoRecenter && !manualYaw && ps.speed > 0.5) {
      const diff = ps.yaw + Math.PI - rig.yaw
      rig.yaw += Math.atan2(Math.sin(diff), Math.cos(diff)) * (1 - Math.exp(-C.recenterRate * dt))
    }
    if (rig.yaw > Math.PI) rig.yaw -= Math.PI * 2
    else if (rig.yaw < -Math.PI) rig.yaw += Math.PI * 2

    rig.zoomDist += (rig.targetDist - rig.zoomDist) * (1 - Math.exp(-C.zoomSmooth * dt))

    // ---- pivo seguindo o jogador (Y mais amortecido) ----
    const gx = ps.position.x
    const gy = ps.position.y - FEET_OFFSET + C.pivotHeight
    const gz = ps.position.z
    if (!rig.inited) {
      rig.pivot.set(gx, gy, gz)
      rig.inited = true
    } else {
      const kxz = 1 - Math.exp(-C.followRateXZ * dt)
      rig.pivot.x += (gx - rig.pivot.x) * kxz
      rig.pivot.z += (gz - rig.pivot.z) * kxz
      rig.pivot.y += (gy - rig.pivot.y) * (1 - Math.exp(-C.followRateY * dt))
    }

    // ---- direcao pivo -> camera ----
    const cp = Math.cos(rig.pitch)
    rig.dir.x = Math.sin(rig.yaw) * cp
    rig.dir.y = Math.sin(rig.pitch)
    rig.dir.z = Math.cos(rig.yaw) * cp

    // ---- colisao: esfera do pivo ate a camera desejada ----
    let allowed = rig.zoomDist
    rig.origin.x = rig.pivot.x
    rig.origin.y = rig.pivot.y
    rig.origin.z = rig.pivot.z
    const hit = world.castShape(
      rig.origin,
      rig.rot,
      rig.dir,
      rig.shape,
      0, // targetDistance: contato
      rig.zoomDist, // maxToi (dir unitaria => metros)
      false,
      rig.flags,
      undefined,
      undefined,
      ps.body ?? undefined,
    )
    if (hit) allowed = Math.max(0, Math.min(allowed, hit.time_of_impact - C.collisionMargin))

    // para dentro: instantaneo; para fora: suave
    if (allowed < rig.dist) rig.dist = allowed
    else rig.dist += (allowed - rig.dist) * (1 - Math.exp(-C.collisionOutRate * dt))

    // ---- posiciona a camera ----
    camera.position.set(
      rig.pivot.x + rig.dir.x * rig.dist,
      Math.min(Math.max(rig.pivot.y + rig.dir.y * rig.dist, C.minCameraY), inside ? interiorBridge.ceiling - 0.2 : Infinity),
      rig.pivot.z + rig.dir.z * rig.dist,
    )
    camera.lookAt(rig.pivot)

    cs.yaw = rig.yaw
    cs.pitch = rig.pitch
    cs.distance = rig.dist
  })

  return null
}
