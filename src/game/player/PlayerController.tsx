import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, useRapier, type RapierRigidBody } from '@react-three/rapier'
import { MathUtils, Vector3, type Group } from 'three'
import { clearMoveTarget, intent } from '../input/intent'
import { usePlayerStore } from '../../state/playerStore'
import { useCameraStore } from '../../state/cameraStore'
import { CAMERA } from '../camera/config'
import { PLAYER as C } from './config'
import { useAppearanceStore } from '../../state/appearanceStore'
import { Character } from '../character/Character'

type Rapier = ReturnType<typeof useRapier>
type CharacterController = ReturnType<Rapier['world']['createCharacterController']>

const SPAWN_Y = 0.03 + C.halfHeight + C.radius + 0.05

/**
 * Jogador local: capsula com character controller cinematico do Rapier.
 * Sem pulo. Sem pathfinding: o click-to-move anda em linha reta
 * (TODO futuro: navmesh para contornar obstaculos).
 */
export function PlayerController({ shadows }: { shadows: boolean }) {
  const { world } = useRapier()

  const body = useRef<RapierRigidBody>(null)
  const visual = useRef<Group>(null)
  const appearance = useAppearanceStore((st) => st.appearance)
  const controller = useRef<CharacterController | null>(null)

  // Estado de simulacao + temporarios reutilizados (sem alocacao por frame).
  const sim = useMemo(
    () => ({
      pos: new Vector3(C.spawn[0], SPAWN_Y, C.spawn[1]),
      hv: new Vector3(), // velocidade horizontal suavizada (x, z)
      vy: 0,
      yaw: Math.PI, // spawn olhando para -Z (de costas para a camera inicial)
      lastStamp: -1,
      bestDist: Infinity,
      stuck: 0,
      desired: { x: 0, y: 0, z: 0 },
      moved: false,
    }),
    [],
  )

  useEffect(() => {
    const cc = world.createCharacterController(C.controllerOffset)
    cc.setUp({ x: 0, y: 1, z: 0 })
    cc.enableAutostep(C.autostepHeight, C.autostepMinWidth, true)
    cc.enableSnapToGround(C.snapToGround)
    cc.setMaxSlopeClimbAngle(MathUtils.degToRad(C.maxClimbAngleDeg))
    cc.setMinSlopeSlideAngle(MathUtils.degToRad(C.minSlideAngleDeg))
    cc.setSlideEnabled(true)
    cc.setApplyImpulsesToDynamicBodies(true)
    controller.current = cc
    return () => {
      world.removeCharacterController(cc)
      controller.current = null
    }
  }, [world])

  useEffect(() => {
    const st = usePlayerStore.getState()
    st.position.copy(sim.pos)
    st.yaw = sim.yaw
    st.body = body.current
    return () => {
      if (usePlayerStore.getState().body === body.current) usePlayerStore.setState({ body: null })
    }
  }, [sim])

  useFrame((_, rawDelta) => {
    const cc = controller.current
    const rb = body.current
    const collider = rb?.collider(0)
    if (!cc || !rb || !collider) return
    const dt = Math.min(rawDelta, 0.05)
    if (dt <= 0) return

    // ---- direcao desejada, relativa a camera ----
    const camYaw = useCameraStore.getState().yaw
    const fx = -Math.sin(camYaw)
    const fz = -Math.cos(camYaw)
    const rx = -fz
    const rz = fx

    const mx = intent.move.x
    const my = intent.move.y
    const hasInput = mx * mx + my * my > 1e-4
    let tvx = 0
    let tvz = 0
    let wantsMove = false

    if (hasInput) {
      if (intent.target) clearMoveTarget() // WASD/joystick cancela o click-to-move
      const maxSpeed = intent.run ? C.runSpeed : C.walkSpeed
      tvx = (rx * mx + fx * my) * maxSpeed
      tvz = (rz * mx + fz * my) * maxSpeed
      wantsMove = true
    } else if (intent.target) {
      const t = intent.target
      if (intent.targetSetAt !== sim.lastStamp) {
        sim.lastStamp = intent.targetSetAt
        sim.bestDist = Infinity
        sim.stuck = 0
      }
      const dx = t.x - sim.pos.x
      const dz = t.z - sim.pos.z
      const dist = Math.hypot(dx, dz)
      if (dist < C.arriveDistance) {
        clearMoveTarget()
      } else {
        if (dist < sim.bestDist - C.stuckProgress) {
          sim.bestDist = dist
          sim.stuck = 0
        } else {
          sim.stuck += dt
        }
        if (sim.stuck > C.stuckSeconds) {
          clearMoveTarget() // preso numa parede
        } else {
          const maxSpeed = intent.targetRun ? C.runSpeed : C.walkSpeed
          const sp = Math.min(maxSpeed, dist * C.arriveGain)
          tvx = (dx / dist) * sp
          tvz = (dz / dist) * sp
          wantsMove = true
        }
      }
    }

    // ---- aceleracao / desaceleracao (independente de frame rate) ----
    const k = wantsMove ? C.accel : C.decel
    const a = 1 - Math.exp(-k * dt)
    sim.hv.x += (tvx - sim.hv.x) * a
    sim.hv.z += (tvz - sim.hv.z) * a
    if (!wantsMove && sim.hv.x * sim.hv.x + sim.hv.z * sim.hv.z < 1e-4) {
      sim.hv.x = 0
      sim.hv.z = 0
    }

    // ---- gravidade (sem pulo) ----
    sim.vy = cc.computedGrounded() ? -1 : Math.max(sim.vy - C.gravity * dt, -C.maxFallSpeed)

    // ---- movimento com colisao ----
    sim.desired.x = sim.hv.x * dt
    sim.desired.y = sim.vy * dt
    sim.desired.z = sim.hv.z * dt
    cc.computeColliderMovement(collider, sim.desired)
    const mv = cc.computedMovement()
    sim.pos.x += mv.x
    sim.pos.y += mv.y
    sim.pos.z += mv.z
    const grounded = cc.computedGrounded()
    if (grounded && sim.vy < 0) sim.vy = 0

    if (sim.pos.y < C.respawnBelowY) {
      sim.pos.set(C.spawn[0], SPAWN_Y, C.spawn[1])
      sim.hv.set(0, 0, 0)
      sim.vy = 0
    }
    rb.setTranslation(sim.pos, true)

    // ---- rotacao suave para a direcao do movimento ----
    if (wantsMove && sim.hv.x * sim.hv.x + sim.hv.z * sim.hv.z > 0.25) {
      const diff = Math.atan2(sim.hv.x, sim.hv.z) - sim.yaw
      const wrapped = Math.atan2(Math.sin(diff), Math.cos(diff))
      sim.yaw += wrapped * (1 - Math.exp(-C.turnRate * dt))
    }

    // ---- visual ----
    const v = visual.current
    if (v) {
      v.position.copy(sim.pos)
      v.rotation.y = sim.yaw
    }

    // ---- some o personagem quando a camera chega muito perto ----
    if (v) v.visible = useCameraStore.getState().distance > (CAMERA.fadeStart + CAMERA.fadeEnd) / 2

    // ---- estado compartilhado (mutado no lugar) ----
    const st = usePlayerStore.getState()
    st.position.copy(sim.pos)
    st.velocity.set(mv.x / dt, mv.y / dt, mv.z / dt)
    st.speed = Math.hypot(st.velocity.x, st.velocity.z)
    st.yaw = sim.yaw
    st.grounded = grounded
    if (!sim.moved && st.speed > 0.5) {
      sim.moved = true
      usePlayerStore.setState({ hasMoved: true })
    }
  })

  return (
    <>
      <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[sim.pos.x, sim.pos.y, sim.pos.z]}>
        <CapsuleCollider args={[C.halfHeight, C.radius]} />
      </RigidBody>

      <group ref={visual} position={[sim.pos.x, sim.pos.y, sim.pos.z]}>
        {/* a posicao do controle e o centro da capsula: os pes ficam meia-altura + raio abaixo */}
        <group position={[0, -(C.halfHeight + C.radius), 0]}>
          <Character appearance={appearance} shadows={shadows} />
        </group>
      </group>
    </>
  )
}
