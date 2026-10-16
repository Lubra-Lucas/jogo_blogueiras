import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, RoundCuboidCollider, useAfterPhysicsStep, useBeforePhysicsStep, useRapier, type RapierRigidBody } from '@react-three/rapier'
import { MathUtils, Quaternion, Vector3, type Group } from 'three'
import { env } from '../world/environment/envState'
import { carBySlug } from './catalog'
import { createCarVisual, type CarAsset } from './carModel'
import { colliderBoxes } from './useCarAsset'
import { drive, driveBridge, paintOf, useVehicleStore, type CarInst } from './driveStore'
import { resolveInput, vin } from './vehicleInput'
import { skid } from './effects'
import { vehicleAudio } from './vehicleAudio'
import { requestExit } from './enterExit'

/** Suspensao: curso (m) e compressao estatica (m). */
const REST_LEN = 0.3
const STATIC_COMP = 0.1
const GRAVITY = 9.81
/** altura da origem do corpo rigido acima do chao (m), no modelo */
const COM_Y = 0.5

const _q = new Quaternion()
const _up = new Vector3()
const _fwd = new Vector3()
const _side = new Vector3()
const _p = new Vector3()
const _com = new Vector3()
const _t = new Vector3()
const _vp = new Vector3()
const _imp = new Vector3()
const _dir = { x: 0, y: -1, z: 0 }
const _org = { x: 0, y: 0, z: 0 }
const WORLD_UP = new Vector3(0, 1, 0)
const smooth01 = (x: number) => MathUtils.smoothstep(x, 0, 1)

interface Wheel {
  /** ponto de fixacao no espaco do corpo */
  a: Vector3
  radius: number
  front: boolean
  contact: boolean
  /** compressao suavizada (m) */
  comp: number
  spin: number
}

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
  const wheelBase = useMemo(() => Math.abs(asset.wheels.FL.hub.z - asset.wheels.RL.hub.z), [asset])

  const sim = useMemo(() => {
    const wheels: Wheel[] = (['FL', 'FR', 'RL', 'RR'] as const).map((k) => {
      const w = asset.wheels[k]
      return {
        a: new Vector3(w.hub.x, w.radius - COM_Y + REST_LEN - STATIC_COMP, w.hub.z),
        radius: w.radius,
        front: k[0] === 'F',
        contact: false,
        comp: STATIC_COMP,
        spin: 0,
      }
    })
    return {
      wheels,
      steer: 0,
      driftV: 0,
      boostCool: 0,
      boostIdle: 0,
      airT: 0,
      flipT: 0,
      safeT: 0,
      lastSafe: new Vector3(inst.x, 0.9, inst.z),
      lastSafeYaw: inst.yaw,
      prevSpeed: 0,
      prevVel: new Vector3(),
      latAccel: 0,
      longAccel: 0,
      tiltRoll: 0,
      tiltPitch: 0,
      rpm: 0,
      gear: 1,
      shiftT: 0,
      wetGrip: 1,
      dt: 1 / 60,
      exitWanted: false,
      startedAt: performance.now(),
      grounded: 0,
      lastYawRate: 0,
    }
  }, [asset, inst.x, inst.z, inst.yaw])

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
      vehicleAudio.stop()
      drive.speed = 0
      drive.kmh = 0
      drive.throttle = drive.brake = 0
      drive.drift = 0
      drive.boosting = false
      drive.lights = false
    }
  }, [asset, inst.x, inst.z, inst.yaw])

  // ----------------------------------------------------------------- fisica (antes de cada passo)
  const rayFlags = useMemo(
    () => rapier.QueryFilterFlags.EXCLUDE_SENSORS | rapier.QueryFilterFlags.EXCLUDE_DYNAMIC | rapier.QueryFilterFlags.EXCLUDE_KINEMATIC,
    [rapier],
  )
  const ray = useMemo(() => new rapier.Ray(_org, _dir), [rapier])

  useBeforePhysicsStep(() => {
    const rb = body.current
    if (!rb) return
    resolveInput()
    const dt = MathUtils.clamp(world.timestep, 1 / 240, 0.05)
    sim.dt = dt
    const tr = rb.translation()
    const rot = rb.rotation()
    const lv0 = rb.linvel()
    const av0 = rb.angvel()
    _q.set(rot.x, rot.y, rot.z, rot.w)
    _t.set(tr.x, tr.y, tr.z)
    _up.set(0, 1, 0).applyQuaternion(_q)
    _fwd.set(0, 0, 1).applyQuaternion(_q)
    _side.set(1, 0, 0).applyQuaternion(_q)
    const wc = rb.worldCom()
    _com.set(wc.x, wc.y, wc.z)
    const mass = rb.mass()

    // ---- suspensao ----
    const kS = (mass * GRAVITY * 0.25) / STATIC_COMP
    const cS = 2 * 0.55 * Math.sqrt(kS * mass * 0.25)
    let grounded = 0
    _dir.x = -_up.x
    _dir.y = -_up.y
    _dir.z = -_up.z
    ray.dir = _dir
    for (const w of sim.wheels) {
      _p.copy(w.a).applyQuaternion(_q).add(_t)
      _org.x = _p.x
      _org.y = _p.y
      _org.z = _p.z
      ray.origin = _org
      const maxToi = REST_LEN + w.radius
      const hit = world.castRay(ray, maxToi, true, rayFlags, undefined, undefined, rb)
      if (hit) {
        const comp = maxToi - hit.timeOfImpact
        // velocidade do ponto ao longo de "up"
        _vp.set(av0.x, av0.y, av0.z).cross(_imp.copy(_p).sub(_com)).add(_imp.set(lv0.x, lv0.y, lv0.z))
        const vUp = _vp.dot(_up)
        const f = Math.max(0, Math.min(kS * comp - cS * vUp, mass * GRAVITY * 1.8))
        _imp.copy(_up).multiplyScalar(f * dt)
        rb.applyImpulseAtPoint(_imp, _p, true)
        w.contact = true
        w.comp = comp
        grounded++
      } else {
        w.contact = false
        w.comp = Math.max(0, w.comp - 3 * dt)
      }
    }
    sim.grounded = grounded
    drive.grounded = grounded > 0
    sim.airT = grounded === 0 ? sim.airT + dt : 0

    // as impulsos da suspensao ja mudaram a velocidade: le de novo antes do controle planar
    const lv = rb.linvel()
    const av = rb.angvel()
    // ---- velocidades no referencial do carro ----
    _vp.set(lv.x, lv.y, lv.z)
    const vf0 = _vp.dot(_fwd)
    const vs0 = _vp.dot(_side)
    const speed = Math.hypot(vf0, vs0)
    const gf = MathUtils.clamp(grounded / 2, 0, 1) // controle cai no ar

    // ---- entradas ----
    let throttle = vin.throttle
    let brake = vin.brake
    let steerIn = vin.steer
    let handbrake = vin.handbrake
    let boostKey = vin.boost
    if (sim.exitWanted) {
      throttle = 0
      brake = 1
      handbrake = false
      steerIn = 0
      boostKey = false
    }
    // 'ESC/menu abertos' congelam o carro com freio
    const wet = MathUtils.clamp(env.wet, 0, 1)
    sim.wetGrip += (1 - 0.18 * wet - sim.wetGrip) * Math.min(1, 2 * dt)

    // ---- nitro ----
    let boosting = false
    if (boostKey && drive.boost > 0.03 && throttle > 0.1 && vf0 > -1 && sim.boostCool <= 0) {
      boosting = true
      drive.boost = Math.max(0, drive.boost - 0.38 * dt)
      sim.boostIdle = 0
      if (drive.boost <= 0.001) sim.boostCool = 1.2
    } else {
      sim.boostIdle += dt
      sim.boostCool = Math.max(0, sim.boostCool - dt)
      if (sim.boostIdle > 1.2) drive.boost = Math.min(1, drive.boost + 0.12 * dt)
    }
    if (boosting && !drive.boosting) vehicleAudio.whoosh()
    drive.boosting = boosting

    // ---- aceleracao longitudinal ----
    const top = P.vTop * (boosting ? 1.38 : 1)
    let a = 0
    if (throttle > 0.01) {
      if (vf0 > -0.6) {
        const k = MathUtils.clamp(vf0 / top, 0, 1.2)
        a = throttle * P.accel * (boosting ? 2.1 : 1) * Math.max(0, 1 - k * k) * (0.85 + 0.15 * sim.wetGrip)
      } else a = 18 * throttle // freia a re antes de ir para frente
    }
    let braking = false
    let reversing = false
    if (sim.exitWanted) {
      a -= Math.sign(vf0) * 22 * Math.min(1, Math.abs(vf0) / 0.8)
      braking = Math.abs(vf0) > 0.5
    } else if (brake > 0.01) {
      if (vf0 > 0.8) {
        a -= 22 * brake * (0.7 + 0.3 * sim.wetGrip)
        braking = true
      } else if (throttle < 0.05) {
        const k = MathUtils.clamp(-vf0 / P.vReverse, 0, 1)
        a -= P.accel * 0.55 * brake * (1 - k * k)
        reversing = true
      } else {
        a -= 18 * brake
        braking = true
      }
    }
    // resistencia: arrasto e freio-motor
    const sgn = Math.sign(vf0)
    a -= vf0 * 0.045 + sgn * 0.0007 * vf0 * vf0
    if (throttle < 0.01 && brake < 0.01) a -= sgn * (vf0 > 2 ? 1.2 : 2.5) * Math.min(1, Math.abs(vf0) / 0.6)
    if (handbrake) a -= sgn * 9 * Math.min(1, Math.abs(vf0) / 1.5)
    let vf1 = vf0 + a * dt
    if ((sim.exitWanted && vf0 * vf1 < 0) || (vf0 > 0 && vf1 < 0 && !reversing && throttle < 0.01) || (vf0 < 0 && vf1 > 0 && brake < 0.01)) vf1 = 0
    if (vf1 > top * 1.02) vf1 -= (vf1 - top) * Math.min(1, 1.2 * dt) // acima do limite (fim do nitro): volta suave
    drive.braking = braking || (handbrake && Math.abs(vf0) > 1)
    drive.reversing = reversing && vf0 < -0.2

    // ---- derrapagem ----
    const slip = speed > 3 ? Math.atan2(vs0, Math.max(Math.abs(vf0), 0.5)) : 0
    let driftT = 0
    if (handbrake && speed > 5 && gf > 0.5) driftT = 1
    else if (speed > P.vTop * 0.55 && Math.abs(steerIn) > 0.8 && throttle > 0.5) driftT = Math.max(driftT, 0.35)
    if (!handbrake) driftT = Math.max(driftT, MathUtils.clamp((Math.abs(slip) - 0.42) / 0.3, 0, 1) * 0.9)
    sim.driftV += (driftT - sim.driftV) * (1 - Math.exp(-(driftT > sim.driftV ? 9 : 2.6) * dt))
    const drift = sim.driftV
    drive.drift = drift * gf

    // ---- aderencia lateral ----
    const grip = MathUtils.lerp(P.gripHigh, P.gripLow, drift) * sim.wetGrip
    const vs1 = vs0 * Math.exp(-grip * dt)
    const lost = Math.abs(vs0) - Math.abs(vs1)
    if (lost > 0 && Math.abs(vf1) > 0.5) vf1 += Math.sign(vf0 || 1) * lost * 0.55 * (1 - drift)

    // ---- direcao ----
    const sp01 = smooth01(Math.abs(vf0) / P.vTop)
    const maxSteer = MathUtils.lerp(P.steerLow, P.steerHigh, sp01) * (handbrake ? 1.25 : 1)
    const wantSteer = steerIn * maxSteer
    const sRate = Math.abs(wantSteer) > Math.abs(sim.steer) || Math.sign(wantSteer) !== Math.sign(sim.steer) ? 9 : 14
    sim.steer += (wantSteer - sim.steer) * (1 - Math.exp(-sRate * dt))
    drive.steer = sim.steer
    const intent = throttle > 0.1 || brake > 0.1
    const vEff = intent && Math.abs(vf0) < 2.2 ? (vf0 < -0.3 || (reversing && throttle < 0.05) ? -2.2 : 2.2) : vf0
    let wT = (vEff / wheelBase) * Math.tan(sim.steer) * (1 + P.driftYaw * drift * 1.6)
    if (drift > 0.1 && Math.abs(steerIn) < 0.25) wT += slip * 2.4 * drift // contra-esterco automatico
    wT = MathUtils.clamp(wT, -2.7, 2.7)
    const wNow = av.x * _up.x + av.y * _up.y + av.z * _up.z
    const resp = MathUtils.lerp(11, 4.2, drift)
    const wNew = wNow + (wT - wNow) * (1 - Math.exp(-resp * dt)) * gf
    sim.lastYawRate = wNew

    // ---- aplica na velocidade ----
    const dvf = (vf1 - vf0) * Math.max(gf, 0.15) // no ar so uma fracao (nitro continua empurrando)
    const dvs = (vs1 - vs0) * gf
    rb.setLinvel({ x: lv.x + _fwd.x * dvf + _side.x * dvs, y: lv.y + _fwd.y * dvf + _side.y * dvs, z: lv.z + _fwd.z * dvf + _side.z * dvs }, true)
    const dw = wNew - wNow
    rb.setAngvel({ x: av.x + _up.x * dw, y: av.y + _up.y * dw, z: av.z + _up.z * dw }, true)

    // ---- downforce + auto-endireitar no ar ----
    const down = 1.5 * speed * speed * (mass / 1000) * dt
    if (down > 0) rb.applyImpulse({ x: -_up.x * down, y: -_up.y * down, z: -_up.z * down }, true)
    if (grounded === 0 && sim.airT > 0.2) {
      // eixo de correcao: up x worldUp
      _imp.copy(_up).cross(WORLD_UP)
      const a2 = rb.angvel()
      rb.setAngvel({ x: a2.x * 0.97 + _imp.x * 2.2 * dt, y: a2.y, z: a2.z * 0.97 + _imp.z * 2.2 * dt }, true)
    }

    // ---- acelerações para inclinação visual ----
    sim.longAccel = (vf1 - vf0) / dt
    sim.latAccel = wNew * vf0 // v * omega
    sim.prevSpeed = speed
    sim.prevVel.set(lv.x, lv.y, lv.z)
  })

  // ----------------------------------------------------------------- depois do passo: impactos
  useAfterPhysicsStep(() => {
    const rb = body.current
    if (!rb) return
    const lv = rb.linvel()
    const dx = lv.x - sim.prevVel.x
    const dz = lv.z - sim.prevVel.z
    const d = Math.hypot(dx, dz)
    // a mudanca "esperada" pelo controle e pequena; colisao muda muito mais que isso
    if (d > 4.5 && sim.prevSpeed > 5) drive.impact = Math.max(drive.impact, d)

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
      g.position.set(tr.x, tr.y - COM_Y, tr.z)
      g.quaternion.copy(_q)
      const seat = asset.seat
      _p.set(seat.x, seat.y, seat.z).applyQuaternion(_q)
      driveBridge.seatPos.set(g.position.x + _p.x, g.position.y + _p.y, g.position.z + _p.z)
    }
    driveBridge.yaw = yaw
  })

  // ----------------------------------------------------------------- visual + telemetria (apos o passo)
  useFrame((_, rawDt) => {
    const rb = body.current
    const g = root.current
    if (!rb || !g) return
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

    const yaw = drive.yaw
    drive.speed = vf
    drive.kmh = Math.abs(vf) * 3.6
    drive.throttle = vin.throttle
    drive.brake = vin.brake

    // marchas / rpm (cinco marchas que dividem a faixa de velocidade)
    const absV = Math.abs(vf)
    const top = P.vTop * 1.05
    const gearW = top / 5
    const gearIdx = Math.min(4, Math.floor(absV / gearW))
    const nextGear = gearIdx + 1
    if (nextGear !== sim.gear && vf > 0.5) {
      if (nextGear > sim.gear) sim.shiftT = 0.18
      sim.gear = nextGear
    } else if (vf <= 0.5) sim.gear = 1
    sim.shiftT = Math.max(0, sim.shiftT - dt)
    const inGear = MathUtils.clamp((absV - gearIdx * gearW) / gearW, 0, 1)
    const targetRpm = 0.18 + 0.82 * inGear * (vf > -0.5 ? 1 : 0.8) + vin.throttle * 0.08
    const rpm = sim.shiftT > 0 ? targetRpm * 0.7 : targetRpm
    sim.rpm += (rpm - sim.rpm) * (1 - Math.exp(-14 * dt))
    drive.rpm = sim.rpm
    drive.gear = vf < -0.5 ? -1 : sim.gear

    // luzes: farois a noite / chuva / sempre ligados no escuro
    const night = Math.max(env.night, env.gloom * 0.75)
    const headOn = night > 0.35
    drive.lights = headOn
    vis.setLights(headOn ? 1 : 0, vin.brake > 0.1 || sim.exitWanted || drive.braking ? 1 : 0)

    // ---- visual: inclinacao (rolagem/arfagem) ----
    const tg = tilt.current
    if (tg) {
      const roll = MathUtils.clamp(-sim.latAccel * 0.012, -0.07, 0.07)
      const pitch = MathUtils.clamp(-sim.longAccel * 0.006, -0.05, 0.05)
      sim.tiltRoll += (roll - sim.tiltRoll) * (1 - Math.exp(-7 * dt))
      sim.tiltPitch += (pitch - sim.tiltPitch) * (1 - Math.exp(-7 * dt))
      tg.rotation.set(sim.tiltPitch, 0, sim.tiltRoll)
    }

    // ---- rodas ----
    let rearSkid = false
    for (let i = 0; i < 4; i++) {
      const w = sim.wheels[i]
      const v = vis.wheels[i]
      // mais compressao que a estatica => a roda sobe no modelo
      v.steer.position.set(v.hub.x, w.radius + (w.comp - STATIC_COMP), v.hub.z)
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

    // ---- impacto: tremor + som ----
    if (drive.impact > 0) {
      vehicleAudio.thump(Math.min(1, drive.impact / 14))
    }

    // ---- ultimo ponto seguro / reposicao ----
    sim.safeT += dt
    if (sim.safeT > 0.5 && sim.grounded >= 3 && _up.y > 0.85) {
      sim.safeT = 0
      sim.lastSafe.set(tr.x, tr.y + 0.2, tr.z)
      sim.lastSafeYaw = yaw
    }
    if (_up.y < 0.25 && sim.grounded >= 1) sim.flipT += dt
    else sim.flipT = 0
    if (sim.flipT > 2.2 || tr.y < -4 || reset.pending) recover(rb)
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyX' && !e.repeat) reset.pending = true
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [reset])

  function recover(rb: RapierRigidBody) {
    reset.pending = false
    sim.flipT = 0
    const p = sim.lastSafe
    const h = sim.lastSafeYaw
    rb.setTranslation({ x: p.x, y: p.y + 0.3, z: p.z }, true)
    const half = h / 2
    rb.setRotation({ x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) }, true)
    rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
    rb.setAngvel({ x: 0, y: 0, z: 0 }, true)
    sim.steer = 0
  }

  // ---- pedido de saida (F): freia e sai ----
  useEffect(() => {
    const unsub = requestExit.subscribe(() => {
      sim.exitWanted = true
    })
    return unsub
  }, [sim])
  useFrame(() => {
    const rb = body.current
    if (!rb || !sim.exitWanted) return
    if (Math.abs(drive.speed) < 1.6) {
      sim.exitWanted = false
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
