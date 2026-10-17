import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, RoundCuboidCollider, useAfterPhysicsStep, useBeforePhysicsStep, useRapier, type RapierRigidBody } from '@react-three/rapier'
import { MathUtils, Quaternion, Vector3, type Group } from 'three'
import { TUNE, VehicleSim, type RapierLike, type RbLike, type WheelCfg, type WorldLike } from './sim/vehiclePhysics'
import { env } from '../world/environment/envState'
import { carBySlug } from './catalog'
import { createCarVisual, type CarAsset } from './carModel'
import { colliderBoxes } from './useCarAsset'
import { drive, driveBridge, paintOf, useVehicleStore, type CarInst } from './driveStore'
import { resolveInput, vin } from './vehicleInput'
import { carTestHook } from './sim/testHook'
import { skid } from './effects'
import { vehicleAudio } from './vehicleAudio'
import { usePlayerStore } from '../../state/playerStore'
import { seatDy } from './seatFit'
import { requestExit } from './enterExit'

const COM_Y = TUNE.COM_Y
/** O chao visual (ruas/pracas) fica ate ~6 cm acima do colisor; levanta o modelo um pouco para as rodas nao afundarem. */
const VIS_LIFT = 0.03

const _q = new Quaternion()
const _qb = new Quaternion()
const _up = new Vector3()
const _fwd = new Vector3()
const _side = new Vector3()
const _p = new Vector3()

/**
 * Carro dirigivel: corpo rigido dinamico + suspensao por raios (4 rodas) + modelo "arcade": forcas verticais da suspensao
 * pela fisica do Rapier; controle planar (aceleracao, freio, aderencia lateral, giro, derrapagem) aplicado direto na
 * velocidade, o que da previsibilidade e "sensacao de jogo" sem a instabilidade de um pneu realista.
 */
export function DrivenCar({ inst, asset, shadows }: { inst: CarInst; asset: CarAsset; shadows: boolean }) {
  const { world, rapier } = useRapier()
  const spec = carBySlug(inst.slug)
  const P = spec.fisica
  const body = useRef<RapierRigidBody>(null)
  const root = useRef<Group>(null)
  const tilt = useRef<Group>(null)

  const vis = useMemo(() => {
    const paint = paintOf(inst.slug)
    return createCarVisual(asset, inst.kind === 'mine' ? paint.body : inst.body, inst.kind === 'mine' ? paint.rim : inst.rim, shadows)
  }, [asset, inst.slug, inst.kind, inst.body, inst.rim, shadows])
  useEffect(() => () => vis.dispose(), [vis])

  // pintura ao vivo (garagem aberta enquanto dirige nao ocorre, mas mantem coerente)
  const paintNow = useVehicleStore((s) => s.paint[inst.slug])
  useEffect(() => {
    if (inst.kind === 'mine') {
      const p = paintOf(inst.slug)
      vis.setColors(p.body, p.rim)
    }
  }, [paintNow, vis, inst.kind, inst.slug])

  const reset = useRef({ pending: false }).current
  const boxes = useMemo(() => colliderBoxes(asset, inst.slug), [asset, inst.slug])

  /** Estado so de apresentacao (marchas/rpm/inclinacao visual); a fisica fica em `vsim` (sim/vehiclePhysics.ts). */
  const tele = useMemo(
    () => ({ tiltRoll: 0, tiltPitch: 0, rpm: 0, gear: 1, shiftT: 0, exitWanted: false, frameDt: 1 / 60, wasBoosting: false }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [asset, inst.x, inst.z, inst.yaw],
  )
  const vsim = useRef<VehicleSim | null>(null)

  // ---- entrada: zera estado compartilhado ----
  useEffect(() => {
    drive.speed = 0
    drive.boost = 1
    drive.impact = 0
    drive.drift = 0
    drive.grounded = true
    drive.radius = Math.max(asset.size.x, asset.size.z) * 0.55
    drive.pos.set(inst.x, 0.9, inst.z)
    drive.yaw = inst.yaw
    vehicleAudio.start()
    return () => {
      vsim.current = null
      carTestHook.current = null
      vehicleAudio.stop()
      drive.speed = 0
      drive.kmh = 0
      drive.throttle = drive.brake = 0
      drive.drift = 0
      drive.boosting = false
      drive.lights = false
    }
  }, [asset, inst.x, inst.z, inst.yaw])

  /** Cria o controle quando o corpo rigido existe (primeiro passo). */
  const ensureSim = (rb: RapierRigidBody): VehicleSim => {
    let s = vsim.current
    if (!s) {
      const wheels: WheelCfg[] = (['FL', 'FR', 'RL', 'RR'] as const).map((k) => {
        const w = asset.wheels[k]
        return { x: w.hub.x, z: w.hub.z, radius: w.radius, front: k[0] === 'F' }
      })
      s = new VehicleSim(rapier as unknown as RapierLike, world as unknown as WorldLike, rb as unknown as RbLike, P, wheels, {
        safe: { x: inst.x, y: COM_Y + 0.1, z: inst.z },
        safeYaw: inst.yaw,
      })
      vsim.current = s
      carTestHook.current = s
    }
    return s
  }

  // ----------------------------------------------------------------- fisica (antes de cada passo)
  // O delta real do quadro (o Physics usa o MESMO delta, limitado a 0.5 s, em timeStep="vary"). Em `world.timestep`
  // dentro do callback ainda esta o valor do passo anterior. Prioridade negativa = roda antes do Physics.
  useFrame((_, dt) => {
    tele.frameDt = Math.min(Math.max(dt, 0), 0.5)
  }, -1000)

  useBeforePhysicsStep(() => {
    const rb = body.current
    if (!rb) return
    resolveInput()
    const s = ensureSim(rb)
    s.prestep(tele.frameDt, vin, MathUtils.clamp(env.wet, 0, 1), tele.exitWanted)
    if (s.boosting && !tele.wasBoosting) vehicleAudio.whoosh()
    tele.wasBoosting = s.boosting
  })

  // ----------------------------------------------------------------- depois do passo: impactos + pose
  useAfterPhysicsStep(() => {
    const rb = body.current
    const s = vsim.current
    if (!rb || !s) return
    s.poststep()
    if (s.impact > 0) {
      drive.impact = Math.max(drive.impact, s.impact)
      s.impact = 0
    }
    const lv = rb.linvel()
    // pose fresca: o grupo visual, a camera e a jogadora leem daqui (sem defasagem de um quadro)
    const g = root.current
    const tr = rb.translation()
    const rot = rb.rotation()
    _q.set(rot.x, rot.y, rot.z, rot.w)
    _fwd.set(0, 0, 1).applyQuaternion(_q)
    const yaw = Math.atan2(_fwd.x, _fwd.z)
    drive.pos.set(tr.x, tr.y, tr.z)
    drive.vel.set(lv.x, lv.y, lv.z)
    drive.yaw = yaw
    if (g) {
      g.position.set(tr.x, tr.y - COM_Y + VIS_LIFT, tr.z)
      g.quaternion.copy(_q)
      // o banco acompanha o carro INTEIRO: inclinacao fisica (rampa/lombada) + a leve rolagem/arfagem visual da carroceria
      _qb.copy(_q)
      if (tilt.current) _qb.multiply(tilt.current.quaternion)
      const seat = asset.seat
      _p.set(seat.x, seat.y + seatDy(spec, usePlayerStore.getState().fit), seat.z).applyQuaternion(_qb)
      driveBridge.seatPos.set(g.position.x + _p.x, g.position.y + _p.y, g.position.z + _p.z)
    }
    driveBridge.yaw = yaw
    driveBridge.quat.copy(_qb)
  })

  // ----------------------------------------------------------------- visual + telemetria (apos o passo)
  useFrame((_, rawDt) => {
    const rb = body.current
    const g = root.current
    const sim = vsim.current
    if (!rb || !g || !sim) return
    const dt = Math.min(rawDt, 0.05)
    const tr = rb.translation()
    const rot = rb.rotation()
    const lv = rb.linvel()
    _q.set(rot.x, rot.y, rot.z, rot.w)
    _fwd.set(0, 0, 1).applyQuaternion(_q)
    _side.set(1, 0, 0).applyQuaternion(_q)
    _up.set(0, 1, 0).applyQuaternion(_q)

    const vf = lv.x * _fwd.x + lv.y * _fwd.y + lv.z * _fwd.z
    const vs = lv.x * _side.x + lv.y * _side.y + lv.z * _side.z
    const speed = Math.hypot(lv.x, lv.z)

    drive.speed = vf
    drive.kmh = Math.abs(vf) * 3.6
    drive.throttle = vin.throttle
    drive.brake = vin.brake
    drive.boost = sim.boost
    drive.boosting = sim.boosting
    drive.braking = sim.braking
    drive.reversing = sim.reversing
    drive.steer = sim.steer
    drive.grounded = sim.grounded > 0
    drive.drift = sim.driftV * (sim.grounded >= 2 ? 1 : 0)

    // marchas / rpm (cinco marchas que dividem a faixa de velocidade)
    const absV = Math.abs(vf)
    const top = P.vTop * 1.05
    const gearW = top / 5
    const gearIdx = Math.min(4, Math.floor(absV / gearW))
    const nextGear = gearIdx + 1
    if (nextGear !== tele.gear && vf > 0.5) {
      if (nextGear > tele.gear) tele.shiftT = 0.18
      tele.gear = nextGear
    } else if (vf <= 0.5) tele.gear = 1
    tele.shiftT = Math.max(0, tele.shiftT - dt)
    const inGear = MathUtils.clamp((absV - gearIdx * gearW) / gearW, 0, 1)
    const targetRpm = 0.18 + 0.82 * inGear * (vf > -0.5 ? 1 : 0.8) + vin.throttle * 0.08
    const rpm = tele.shiftT > 0 ? targetRpm * 0.7 : targetRpm
    tele.rpm += (rpm - tele.rpm) * (1 - Math.exp(-14 * dt))
    drive.rpm = tele.rpm
    drive.gear = vf < -0.5 ? -1 : tele.gear

    // luzes: farois a noite / chuva / sempre ligados no escuro
    const night = Math.max(env.night, env.gloom * 0.75)
    const headOn = night > 0.35
    drive.lights = headOn
    vis.setLights(headOn ? 1 : 0, vin.brake > 0.1 || tele.exitWanted || drive.braking ? 1 : 0)

    // ---- visual: inclinacao (rolagem/arfagem) ----
    const tg = tilt.current
    if (tg) {
      const roll = MathUtils.clamp(-sim.latAccel * 0.012, -0.07, 0.07)
      const pitch = MathUtils.clamp(-sim.longAccel * 0.006, -0.05, 0.05)
      tele.tiltRoll += (roll - tele.tiltRoll) * (1 - Math.exp(-7 * dt))
      tele.tiltPitch += (pitch - tele.tiltPitch) * (1 - Math.exp(-7 * dt))
      tg.rotation.set(tele.tiltPitch, 0, tele.tiltRoll)
    }

    // ---- rodas ----
    let rearSkid = false
    for (let i = 0; i < 4; i++) {
      const w = sim.wheels[i]
      const v = vis.wheels[i]
      // mais compressao que a estatica => a roda sobe no modelo
      v.steer.position.set(v.hub.x, w.radius + (w.comp - TUNE.STATIC_COMP), v.hub.z)
      if (w.front) v.steer.rotation.y = sim.steer
      const locked = !w.front && vin.handbrake && absV > 1
      if (!locked) w.spin += (vf / w.radius) * dt
      v.spin.rotation.x = w.spin
      if (!w.front && w.contact && (drive.drift > 0.4 || (vin.handbrake && absV > 4) || (vin.throttle > 0.9 && absV < 6 && absV > 0.5 && vin.boost) || (vin.brake > 0.9 && vf > 6))) rearSkid = true
    }

    // ---- marcas de pneu + fumaca ----
    if (rearSkid && sim.grounded >= 2) {
      for (let i = 2; i < 4; i++) {
        const v = vis.wheels[i]
        _p.set(v.hub.x, 0, v.hub.z).applyQuaternion(_q)
        skid.mark(i - 2, tr.x + _p.x, tr.z + _p.z)
      }
      skid.smoke(tr.x - _fwd.x * 1.2, tr.z - _fwd.z * 1.2, speed, dt)
    } else {
      skid.endMark(0)
      skid.endMark(1)
    }
    vehicleAudio.screech(rearSkid ? Math.max(drive.drift, 0.5) * Math.min(1, speed / 12) : 0, Math.abs(vs))

    // ---- impacto: som ----
    if (drive.impact > 0) {
      vehicleAudio.thump(Math.min(1, drive.impact / 14))
    }

    // ---- reposicao manual (X): desvira no lugar ----
    if (reset.pending) {
      reset.pending = false
      sim.uprightInPlace('manual')
    }
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyX' && !e.repeat) reset.pending = true
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [reset])

  // ---- pedido de saida (F): freia e sai ----
  useEffect(() => {
    const unsub = requestExit.subscribe(() => {
      tele.exitWanted = true
    })
    return unsub
  }, [tele])
  useFrame(() => {
    const rb = body.current
    if (!rb || !tele.exitWanted) return
    if (Math.abs(drive.speed) < 1.6) {
      tele.exitWanted = false
      const t = rb.translation()
      const r = rb.rotation()
      _q.set(r.x, r.y, r.z, r.w)
      _fwd.set(0, 0, 1).applyQuaternion(_q)
      const yaw = Math.atan2(_fwd.x, _fwd.z)
      requestExit.finish({ x: t.x, z: t.z, yaw, halfW: asset.size.x / 2, halfL: asset.size.z / 2 })
    }
  })

  const startY = COM_Y + 0.12
  return (
    <>
      <RigidBody
        ref={body}
        type="dynamic"
        colliders={false}
        position={[inst.x, startY, inst.z]}
        rotation={[0, inst.yaw, 0]}
        canSleep={false}
        ccd
        gravityScale={0}
        linearDamping={0.02}
        angularDamping={1.2}
      >
        {boxes.map((b, i) => (
          <RoundCuboidCollider
            key={i}
            args={[b.h[0] - 0.06, b.h[1] - 0.06, b.h[2] - 0.06, 0.06]}
            position={[b.c[0], b.c[1] - COM_Y, b.c[2]]}
            mass={P.mass * (i === 0 ? 0.85 : 0.15)}
            friction={0.05}
            restitution={0.08}
          />
        ))}
      </RigidBody>
      <group ref={root}>
        <group ref={tilt}>
          <primitive object={vis.root} />
        </group>
      </group>
    </>
  )
}
