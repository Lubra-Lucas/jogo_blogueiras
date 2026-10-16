import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import { MathUtils, PerspectiveCamera, Vector3 } from 'three'
import { cameraIntent } from '../input/intent'
import { useCameraStore } from '../../state/cameraStore'
import { usePlayerStore } from '../../state/playerStore'
import { drive, driveBridge, useVehicleStore } from './driveStore'
import { vin } from './vehicleInput'

const BASE_FOV = 52

/**
 * Camera de perseguicao do carro (estilo GTA): distancia e FOV crescem com a velocidade, balanca de leve nos impactos,
 * olhar para tras, olhar livre arrastando (volta sozinha), colisao com predios. So age enquanto dirige.
 */
export function VehicleCamera() {
  const camera = useThree((s) => s.camera)
  const { world, rapier } = useRapier()

  const rig = useMemo(
    () => ({
      yaw: 0, // yaw "atras" suavizado (rad), 0 = camera em +Z
      look: 0,
      lookPitch: 0,
      idle: 0,
      zoom: 1,
      dist: 6.5,
      fov: BASE_FOV,
      pivot: new Vector3(),
      inited: false,
      shake: 0,
      back: 0,
      wasDriving: false,
      origin: { x: 0, y: 0, z: 0 },
      dir: { x: 0, y: 0, z: 0 },
      rot: { x: 0, y: 0, z: 0, w: 1 },
      shape: new rapier.Ball(0.35),
      flags: rapier.QueryFilterFlags.EXCLUDE_SENSORS | rapier.QueryFilterFlags.EXCLUDE_DYNAMIC | rapier.QueryFilterFlags.EXCLUDE_KINEMATIC,
    }),
    [rapier],
  )

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    if (!driveBridge.active) {
      if (rig.wasDriving) {
        rig.wasDriving = false
        rig.inited = false
        const cam = camera as PerspectiveCamera
        if (cam.fov !== 50) {
          cam.fov = 50
          cam.updateProjectionMatrix()
        }
      }
      return
    }
    rig.wasDriving = true
    const mode = useVehicleStore.getState().camMode

    const carYaw = drive.yaw
    const speed = Math.abs(drive.speed)
    // heading de movimento: quando derrapa, a camera acompanha um pouco a direcao real do deslocamento
    let heading = carYaw
    if (speed > 4 && drive.speed > 0) {
      const mv = Math.atan2(drive.vel.x, drive.vel.z)
      const diff = Math.atan2(Math.sin(mv - carYaw), Math.cos(mv - carYaw))
      heading = carYaw + diff * 0.35 * Math.min(1, drive.drift + 0.3)
    }
    const target = heading + Math.PI // posicao da camera: atras do carro
    if (!rig.inited) {
      rig.yaw = target
      rig.pivot.copy(drive.pos)
      rig.inited = true
    }
    const diff = Math.atan2(Math.sin(target - rig.yaw), Math.cos(target - rig.yaw))
    rig.yaw += diff * (1 - Math.exp(-(drive.speed < -1 ? 2.5 : 4.2) * dt))

    // olhar livre
    const dragging = cameraIntent.yawDelta !== 0 || cameraIntent.pitchDelta !== 0
    rig.look += cameraIntent.yawDelta + cameraIntent.keyYaw * 2 * dt
    rig.lookPitch = MathUtils.clamp(rig.lookPitch + cameraIntent.pitchDelta, -0.2, 0.7)
    rig.zoom = MathUtils.clamp(rig.zoom * Math.exp(cameraIntent.zoomDelta), 0.65, 1.8)
    cameraIntent.yawDelta = 0
    cameraIntent.pitchDelta = 0
    cameraIntent.zoomDelta = 0
    if (dragging || cameraIntent.keyYaw !== 0) rig.idle = 0
    else rig.idle += dt
    if (rig.idle > 1.4) {
      const k = 1 - Math.exp(-2.2 * dt)
      rig.look -= rig.look * k
      rig.lookPitch -= rig.lookPitch * k
    }
    // olhar para tras
    rig.back += ((vin.lookBack ? Math.PI : 0) - rig.back) * (1 - Math.exp(-9 * dt))

    // impacto
    if (drive.impact > 0) {
      rig.shake = Math.min(1, rig.shake + drive.impact / 16)
      drive.impact = 0
    }
    rig.shake *= Math.exp(-6 * dt)

    // pivo: segue o carro (xz firme, y amortecido)
    const lead = Math.min(2.2, speed * 0.06)
    const px = drive.pos.x + Math.sin(carYaw) * lead
    const pz = drive.pos.z + Math.cos(carYaw) * lead
    const kxz = 1 - Math.exp(-16 * dt)
    rig.pivot.x += (px - rig.pivot.x) * kxz
    rig.pivot.z += (pz - rig.pivot.z) * kxz
    rig.pivot.y += (drive.pos.y + 0.9 - rig.pivot.y) * (1 - Math.exp(-7 * dt))

    const sp = MathUtils.clamp(speed / 36, 0, 1)
    const boost = drive.boosting ? 1 : 0
    let dist = (6.4 + sp * 2.4 + boost * 0.9) * rig.zoom * (mode === 1 ? 1.55 : 1)
    const pitch = MathUtils.degToRad(mode === 1 ? 24 : 13) + rig.lookPitch - sp * 0.04
    let yaw = rig.yaw + rig.look + rig.back
    let fov = BASE_FOV + sp * 14 + boost * 7

    if (mode === 2) {
      // capo: camera na altura dos olhos, a frente do banco
      const fx = Math.sin(carYaw)
      const fz = Math.cos(carYaw)
      camera.position.set(driveBridge.seatPos.x + fx * 0.25, driveBridge.seatPos.y + 0.65, driveBridge.seatPos.z + fz * 0.25)
      yaw = carYaw + rig.look * 0.8 + rig.back
      camera.lookAt(camera.position.x + Math.sin(yaw) * 10, camera.position.y - 0.6 + rig.lookPitch * -3, camera.position.z + Math.cos(yaw) * 10)
      fov = 66 + sp * 12 + boost * 6
      dist = 0
    } else {
      const cp = Math.cos(pitch)
      rig.dir.x = Math.sin(yaw) * cp
      rig.dir.y = Math.sin(pitch)
      rig.dir.z = Math.cos(yaw) * cp
      let allowed = dist
      rig.origin.x = rig.pivot.x
      rig.origin.y = rig.pivot.y
      rig.origin.z = rig.pivot.z
      const hit = world.castShape(rig.origin, rig.rot, rig.dir, rig.shape, 0, dist, false, rig.flags, undefined, undefined, usePlayerStore.getState().body ?? undefined)
      if (hit) allowed = Math.max(0.8, Math.min(allowed, hit.time_of_impact - 0.1))
      if (allowed < rig.dist) rig.dist = allowed
      else rig.dist += (allowed - rig.dist) * (1 - Math.exp(-3 * dt))
      const sh = rig.shake * 0.35
      camera.position.set(
        rig.pivot.x + rig.dir.x * rig.dist + (Math.random() - 0.5) * sh,
        Math.max(rig.pivot.y + rig.dir.y * rig.dist + (Math.random() - 0.5) * sh, 0.35),
        rig.pivot.z + rig.dir.z * rig.dist + (Math.random() - 0.5) * sh,
      )
      camera.lookAt(rig.pivot.x, rig.pivot.y + 0.25, rig.pivot.z)
    }

    const cam = camera as PerspectiveCamera
    rig.fov += (fov - rig.fov) * (1 - Math.exp(-5 * dt))
    if (Math.abs(cam.fov - rig.fov) > 0.02) {
      cam.fov = rig.fov
      cam.updateProjectionMatrix()
    }

    const cs = useCameraStore.getState()
    cs.yaw = yaw
    cs.pitch = pitch
    cs.distance = rig.dist || dist
  })

  return null
}
