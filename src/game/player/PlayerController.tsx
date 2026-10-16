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
import { useEmoteStore } from '../character/animation/emoteStore'
import { turnState } from '../character/animation/turnState'
import { SEAT_HIPS_GAP, useSitStore } from '../sit/sitStore'
import { navBridge } from '../navigation/navStore'
import { driveBridge, drive, useVehicleStore } from '../vehicles/driveStore'

type Rapier = ReturnType<typeof useRapier>
type CharacterController = ReturnType<Rapier['world']['createCharacterController']>

/** duracao do clipe run_turn (s) */
const TURN_DUR = 0.67

const SPAWN_Y = 0.03 + C.halfHeight + C.radius + 0.05

/**
 * Jogador local: capsula com character controller cinematico do Rapier.
 * Sem pulo. O click-to-move anda em linha reta; o desvio de obstaculos (A*) e o fast travel
 * ficam em game/navigation (que so define alvos sequenciais e pede teletransporte via navBridge).
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
      seated: false,
      driving: false,
      turn: -1, // tempo da curva de 180 graus (s); -1 = fora dela
      turnYaw: 0,
      sitT: 0,
      groundY: 0,
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

    // ---- teletransporte (fast travel, game/navigation) ----
    const tp = navBridge.teleport
    if (tp) {
      navBridge.teleport = null
      if (useSitStore.getState().seat) {
        useSitStore.getState().release()
        sim.seated = false
      }
      sim.pos.set(tp.x, SPAWN_Y + 0.35, tp.z)
      sim.hv.set(0, 0, 0)
      sim.vy = 0
      sim.turn = -1
      turnState.active = false
      if (tp.yaw !== null) sim.yaw = tp.yaw
      navBridge.cameraSnap = sim.yaw + Math.PI // camera atras da jogadora
      navBridge.faceYaw = null
      clearMoveTarget()
      rb.setTranslation(sim.pos, true)
    }

    // ---- dentro de um carro (game/vehicles): a boneca vai sentada no banco do motorista, sem fisica propria ----
    if (driveBridge.active) {
      if (!sim.driving) {
        sim.driving = true
        sim.hv.set(0, 0, 0)
        sim.vy = 0
        sim.turn = -1
        turnState.active = false
        clearMoveTarget()
        useEmoteStore.getState().stop()
        rb.setEnabled(false)
      }
      const ci = useSitStore.getState().clip
      const sn = Math.sin(driveBridge.yaw)
      const cs = Math.cos(driveBridge.yaw)
      const sp = driveBridge.seatPos
      sim.pos.x = sp.x - (ci.offX * cs + ci.offZ * sn)
      sim.pos.z = sp.z - (-ci.offX * sn + ci.offZ * cs)
      sim.pos.y = sp.y + SEAT_HIPS_GAP - ci.endY + C.halfHeight + C.radius
      sim.yaw = driveBridge.yaw
      rb.setTranslation(sim.pos, true)
      const vd = visual.current
      if (vd) {
        vd.position.copy(sim.pos)
        vd.rotation.y = sim.yaw
        vd.visible = useVehicleStore.getState().camMode !== 2
      }
      const sd = usePlayerStore.getState()
      sd.position.copy(sim.pos)
      sd.velocity.copy(drive.vel)
      sd.speed = Math.hypot(drive.vel.x, drive.vel.z)
      sd.yaw = sim.yaw
      return
    }
    if (sim.driving) {
      // saiu do carro: aparece ao lado dele
      sim.driving = false
      const ex = driveBridge.exitAt
      driveBridge.exitAt = null
      rb.setEnabled(true)
      if (ex) {
        sim.pos.set(ex.x, SPAWN_Y + 0.05, ex.z)
        sim.yaw = ex.yaw
      }
      sim.hv.set(0, 0, 0)
      sim.vy = 0
      clearMoveTarget()
      rb.setTranslation(sim.pos, true)
      const sx = usePlayerStore.getState()
      sx.position.copy(sim.pos)
      sx.velocity.set(0, 0, 0)
      sx.speed = 0
    }

    // ---- sentada: gruda no assento (sem fisica); os clipes stand_to_sit / sit_to_stand fazem o movimento do quadril ----
    const sitS = useSitStore.getState()
    const seat = sitS.seat
    if (seat) {
      const ci = sitS.clip
      if (!sim.seated) {
        sim.seated = true
        sim.sitT = 0
        sim.groundY = sim.pos.y
        sim.hv.set(0, 0, 0)
        sim.vy = 0
        clearMoveTarget()
        useEmoteStore.getState().stop()
      }
      sim.sitT += dt
      const standing = sitS.phase === 'standing'
      if (!standing && sim.sitT > 0.5 && (intent.move.x * intent.move.x + intent.move.y * intent.move.y > 1e-4 || intent.target)) {
        useSitStore.getState().standUp()
        sim.sitT = 0
        // o clipe de levantar comeca com o quadril sobre o assento: a raiz vai para o assento (o quadril nao se mexe no mundo)
        sim.pos.x = seat.x
        sim.pos.z = seat.z
      }
      const dur = standing ? ci.outDur : ci.inDur
      if (standing && sim.sitT >= dur * 0.82) {
        // terminou de levantar: segue o movimento (o alvo do clique, se houver, continua valendo)
        useSitStore.getState().release()
        sim.seated = false
        sim.pos.y = sim.groundY
        // o quadril terminou a frente do assento; a raiz acompanha (senao o idle "puxaria" a personagem de volta)
        const sn2 = Math.sin(seat.yaw)
        const cs2 = Math.cos(seat.yaw)
        sim.pos.x += ci.outX * cs2 + ci.outZ * sn2
        sim.pos.z += -ci.outX * sn2 + ci.outZ * cs2
      } else {
        // raiz = assento menos o deslocamento do quadril do clipe (assim o quadril termina sobre o assento)
        const sn = Math.sin(seat.yaw)
        const cs = Math.cos(seat.yaw)
        const tx = standing ? seat.x : seat.x - (ci.offX * cs + ci.offZ * sn)
        const tz = standing ? seat.z : seat.z - (-ci.offX * sn + ci.offZ * cs)
        const k = 1 - Math.exp(-8 * dt)
        sim.pos.x += (tx - sim.pos.x) * k
        sim.pos.z += (tz - sim.pos.z) * k
        const u = MathUtils.clamp(sim.sitT / dur, 0, 1)
        const w = standing ? 1 - MathUtils.smoothstep(u, 0.05, 0.75) : MathUtils.smoothstep(u, 0.3, 0.95)
        sim.pos.y = sim.groundY + (seat.y + SEAT_HIPS_GAP - ci.endY) * w
        const diff = seat.yaw - sim.yaw
        sim.yaw += Math.atan2(Math.sin(diff), Math.cos(diff)) * k
        rb.setTranslation(sim.pos, true)
        const vs = visual.current
        if (vs) {
          vs.position.copy(sim.pos)
          vs.rotation.y = sim.yaw
        }
        const ss = usePlayerStore.getState()
        ss.position.copy(sim.pos)
        ss.velocity.set(0, 0, 0)
        ss.speed = 0
        ss.yaw = sim.yaw
        return
      }
    }

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

    if (wantsMove) useEmoteStore.getState().stop() // andar cancela aplaudir/dancar

    // ---- curva de 180 graus correndo: o clipe run_turn gira o quadril; a raiz segura o yaw e troca no fim ----
    if (sim.turn < 0 && wantsMove) {
      const hs = Math.hypot(sim.hv.x, sim.hv.z)
      const ts = Math.hypot(tvx, tvz)
      if (hs > C.runSpeed * 0.6 && ts > C.runSpeed * 0.6 && (sim.hv.x * tvx + sim.hv.z * tvz) / (hs * ts) < -0.866) {
        sim.turn = 0
        sim.turnYaw = Math.atan2(tvx, tvz)
        turnState.active = true
      }
    }
    if (sim.turn >= 0) {
      sim.turn += dt
      const u = sim.turn / TURN_DUR
      const sc = MathUtils.smoothstep(u, 0.45, 1) // freia na 1a metade, acelera para o lado novo na 2a
      tvx *= sc
      tvz *= sc
      if (u >= 1) {
        sim.yaw = sim.turnYaw
        sim.turn = -1
        turnState.active = false
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
    if (sim.turn < 0 && wantsMove && sim.hv.x * sim.hv.x + sim.hv.z * sim.hv.z > 0.25) {
      const diff = Math.atan2(sim.hv.x, sim.hv.z) - sim.yaw
      const wrapped = Math.atan2(Math.sin(diff), Math.cos(diff))
      sim.yaw += wrapped * (1 - Math.exp(-C.turnRate * dt))
    }

    // ---- vira para a porta ao chegar de uma navegacao (game/navigation) ----
    if (navBridge.faceYaw !== null) {
      if (wantsMove || sim.turn >= 0) {
        navBridge.faceYaw = null
      } else {
        const diff = Math.atan2(Math.sin(navBridge.faceYaw - sim.yaw), Math.cos(navBridge.faceYaw - sim.yaw))
        sim.yaw += diff * (1 - Math.exp(-6 * dt))
        if (Math.abs(diff) < 0.03) navBridge.faceYaw = null
      }
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
          <Character appearance={appearance} shadows={shadows} anim="player" />
        </group>
      </group>
    </>
  )
}
