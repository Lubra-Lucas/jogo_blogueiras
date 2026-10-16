// Copia FIEL (so para comparacao nos testes: `--legacy`) do controle ANTIGO de src/game/vehicles/DrivenCar.tsx
// (antes da correcao): raio com origem dentro de colisor = compressao maxima, controle ao longo do "nariz" do carro,
// dt = world.timestep limitado a 0.05 (mas o mundo integra o dt real), sem protecao de enterrado/NaN. Nao e usado no jogo.
import { MathUtils, Quaternion, Vector3 } from 'three'
import type { CarPhysics, DriveInput, WheelCfg } from '../../src/game/vehicles/sim/vehiclePhysics.ts'

const REST_LEN = 0.3
const STATIC_COMP = 0.1
const GRAVITY = 9.81
const COM_Y = 0.5
const WORLD_UP = new Vector3(0, 1, 0)
const smooth01 = (x: number) => MathUtils.smoothstep(x, 0, 1)

export class LegacySim {
  respawns = 0
  uprights = 0
  hitches = 0
  lastReason: string | null = null
  private wheels: Array<{ a: Vector3; radius: number; comp: number; contact: boolean }>
  private steer = 0
  private driftV = 0
  private boostCool = 0
  private boostIdle = 0
  private boost = 1
  private wetGrip = 1
  private flipT = 0
  private safeT = 0
  private lastSafe: Vector3
  private lastSafeYaw: number
  private wheelBase: number
  private flags: number

  private R: any
  private world: any
  private rb: any
  private P: CarPhysics

  constructor(R: any, world: any, rb: any, P: CarPhysics, wheels: WheelCfg[], opts: { safe: { x: number; y: number; z: number }; safeYaw: number }) {
    this.R = R
    this.world = world
    this.rb = rb
    this.P = P
    this.wheels = wheels.map((w) => ({ a: new Vector3(w.x, w.radius - COM_Y + REST_LEN - STATIC_COMP, w.z), radius: w.radius, comp: STATIC_COMP, contact: false }))
    this.wheelBase = Math.abs(wheels[0].z - wheels[2].z)
    this.lastSafe = new Vector3(opts.safe.x, 0.9, opts.safe.z)
    this.lastSafeYaw = opts.safeYaw
    this.flags = R.QueryFilterFlags.EXCLUDE_SENSORS | R.QueryFilterFlags.EXCLUDE_DYNAMIC | R.QueryFilterFlags.EXCLUDE_KINEMATIC
  }

  poststep() {}

  uprightInPlace() {
    this.recoverToSafe('manual')
  }

  recoverToSafe(reason: string) {
    const rb = this.rb
    const p = this.lastSafe
    const h = this.lastSafeYaw
    rb.setTranslation({ x: p.x, y: p.y + 0.3, z: p.z }, true)
    rb.setRotation({ x: 0, y: Math.sin(h / 2), z: 0, w: Math.cos(h / 2) }, true)
    rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
    rb.setAngvel({ x: 0, y: 0, z: 0 }, true)
    this.steer = 0
    this.respawns++
    this.lastReason = reason
  }

  prestep(dtWorld: number, vin: DriveInput, wet = 0, exitWanted = false) {
    const rb = this.rb
    const world = this.world
    const P = this.P
    const dt = MathUtils.clamp(dtWorld, 1 / 240, 0.05)
    if (dtWorld > 0.05) this.hitches++
    const tr = rb.translation()
    const rot = rb.rotation()
    const lv0 = rb.linvel()
    const av0 = rb.angvel()
    const q = new Quaternion(rot.x, rot.y, rot.z, rot.w)
    const t = new Vector3(tr.x, tr.y, tr.z)
    const up = new Vector3(0, 1, 0).applyQuaternion(q)
    const fwd = new Vector3(0, 0, 1).applyQuaternion(q)
    const side = new Vector3(1, 0, 0).applyQuaternion(q)
    const wc = rb.worldCom()
    const com = new Vector3(wc.x, wc.y, wc.z)
    const mass = rb.mass()
    const kS = (mass * GRAVITY * 0.25) / STATIC_COMP
    const cS = 2 * 0.55 * Math.sqrt(kS * mass * 0.25)
    let grounded = 0
    const dir = { x: -up.x, y: -up.y, z: -up.z }
    const p = new Vector3()
    const imp = new Vector3()
    const vp = new Vector3()
    for (const w of this.wheels) {
      p.copy(w.a).applyQuaternion(q).add(t)
      const ray = new this.R.Ray({ x: p.x, y: p.y, z: p.z }, dir)
      const maxToi = REST_LEN + w.radius
      const hit = world.castRay(ray, maxToi, true, this.flags, undefined, undefined, rb)
      if (hit) {
        const comp = maxToi - hit.timeOfImpact
        vp.set(av0.x, av0.y, av0.z).cross(imp.copy(p).sub(com)).add(imp.set(lv0.x, lv0.y, lv0.z))
        const vUp = vp.dot(up)
        const f = Math.max(0, Math.min(kS * comp - cS * vUp, mass * GRAVITY * 1.8))
        imp.copy(up).multiplyScalar(f * dt)
        rb.applyImpulseAtPoint({ x: imp.x, y: imp.y, z: imp.z }, { x: p.x, y: p.y, z: p.z }, true)
        w.contact = true
        w.comp = comp
        grounded++
      } else {
        w.contact = false
        w.comp = Math.max(0, w.comp - 3 * dt)
      }
    }
    const lv = rb.linvel()
    const av = rb.angvel()
    vp.set(lv.x, lv.y, lv.z)
    const vf0 = vp.dot(fwd)
    const vs0 = vp.dot(side)
    const speed = Math.hypot(vf0, vs0)
    const gf = MathUtils.clamp(grounded / 2, 0, 1)
    let throttle = vin.throttle
    let brake = vin.brake
    let steerIn = vin.steer
    let handbrake = vin.handbrake
    let boostKey = vin.boost
    if (exitWanted) {
      throttle = 0
      brake = 1
      handbrake = false
      steerIn = 0
      boostKey = false
    }
    this.wetGrip += (1 - 0.18 * wet - this.wetGrip) * Math.min(1, 2 * dt)
    let boosting = false
    if (boostKey && this.boost > 0.03 && throttle > 0.1 && vf0 > -1 && this.boostCool <= 0) {
      boosting = true
      this.boost = Math.max(0, this.boost - 0.38 * dt)
      this.boostIdle = 0
      if (this.boost <= 0.001) this.boostCool = 1.2
    } else {
      this.boostIdle += dt
      this.boostCool = Math.max(0, this.boostCool - dt)
      if (this.boostIdle > 1.2) this.boost = Math.min(1, this.boost + 0.12 * dt)
    }
    const top = P.vTop * (boosting ? 1.38 : 1)
    let a = 0
    if (throttle > 0.01) {
      if (vf0 > -0.6) {
        const k = MathUtils.clamp(vf0 / top, 0, 1.2)
        a = throttle * P.accel * (boosting ? 2.1 : 1) * Math.max(0, 1 - k * k) * (0.85 + 0.15 * this.wetGrip)
      } else a = 18 * throttle
    }
    let reversing = false
    if (exitWanted) a -= Math.sign(vf0) * 22 * Math.min(1, Math.abs(vf0) / 0.8)
    else if (brake > 0.01) {
      if (vf0 > 0.8) a -= 22 * brake * (0.7 + 0.3 * this.wetGrip)
      else if (throttle < 0.05) {
        const k = MathUtils.clamp(-vf0 / P.vReverse, 0, 1)
        a -= P.accel * 0.55 * brake * (1 - k * k)
        reversing = true
      } else a -= 18 * brake
    }
    const sgn = Math.sign(vf0)
    a -= vf0 * 0.045 + sgn * 0.0007 * vf0 * vf0
    if (throttle < 0.01 && brake < 0.01) a -= sgn * (vf0 > 2 ? 1.2 : 2.5) * Math.min(1, Math.abs(vf0) / 0.6)
    if (handbrake) a -= sgn * 9 * Math.min(1, Math.abs(vf0) / 1.5)
    let vf1 = vf0 + a * dt
    if ((exitWanted && vf0 * vf1 < 0) || (vf0 > 0 && vf1 < 0 && !reversing && throttle < 0.01) || (vf0 < 0 && vf1 > 0 && brake < 0.01)) vf1 = 0
    if (vf1 > top * 1.02) vf1 -= (vf1 - top) * Math.min(1, 1.2 * dt)
    const slip = speed > 3 ? Math.atan2(vs0, Math.max(Math.abs(vf0), 0.5)) : 0
    let driftT = 0
    if (handbrake && speed > 5 && gf > 0.5) driftT = 1
    else if (speed > P.vTop * 0.55 && Math.abs(steerIn) > 0.8 && throttle > 0.5) driftT = Math.max(driftT, 0.35)
    if (!handbrake) driftT = Math.max(driftT, MathUtils.clamp((Math.abs(slip) - 0.42) / 0.3, 0, 1) * 0.9)
    this.driftV += (driftT - this.driftV) * (1 - Math.exp(-(driftT > this.driftV ? 9 : 2.6) * dt))
    const drift = this.driftV
    const grip = MathUtils.lerp(P.gripHigh, P.gripLow, drift) * this.wetGrip
    const vs1 = vs0 * Math.exp(-grip * dt)
    const lost = Math.abs(vs0) - Math.abs(vs1)
    if (lost > 0 && Math.abs(vf1) > 0.5) vf1 += Math.sign(vf0 || 1) * lost * 0.55 * (1 - drift)
    const sp01 = smooth01(Math.abs(vf0) / P.vTop)
    const maxSteer = MathUtils.lerp(P.steerLow, P.steerHigh, sp01) * (handbrake ? 1.25 : 1)
    const wantSteer = steerIn * maxSteer
    const sRate = Math.abs(wantSteer) > Math.abs(this.steer) || Math.sign(wantSteer) !== Math.sign(this.steer) ? 9 : 14
    this.steer += (wantSteer - this.steer) * (1 - Math.exp(-sRate * dt))
    const intent = throttle > 0.1 || brake > 0.1
    const vEff = intent && Math.abs(vf0) < 2.2 ? (vf0 < -0.3 || (reversing && throttle < 0.05) ? -2.2 : 2.2) : vf0
    let wT = (vEff / this.wheelBase) * Math.tan(this.steer) * (1 + P.driftYaw * drift * 1.6)
    if (drift > 0.1 && Math.abs(steerIn) < 0.25) wT += slip * 2.4 * drift
    wT = MathUtils.clamp(wT, -2.7, 2.7)
    const wNow = av.x * up.x + av.y * up.y + av.z * up.z
    const resp = MathUtils.lerp(11, 4.2, drift)
    const wNew = wNow + (wT - wNow) * (1 - Math.exp(-resp * dt)) * gf
    const dvf = (vf1 - vf0) * Math.max(gf, 0.15)
    const dvs = (vs1 - vs0) * gf
    rb.setLinvel({ x: lv.x + fwd.x * dvf + side.x * dvs, y: lv.y + fwd.y * dvf + side.y * dvs, z: lv.z + fwd.z * dvf + side.z * dvs }, true)
    const dw = wNew - wNow
    rb.setAngvel({ x: av.x + up.x * dw, y: av.y + up.y * dw, z: av.z + up.z * dw }, true)
    const down = 1.5 * speed * speed * (mass / 1000) * dt
    if (down > 0) rb.applyImpulse({ x: -up.x * down, y: -up.y * down, z: -up.z * down }, true)
    if (grounded === 0) {
      imp.copy(up).cross(WORLD_UP)
      const a2 = rb.angvel()
      rb.setAngvel({ x: a2.x * 0.97 + imp.x * 2.2 * dt, y: a2.y, z: a2.z * 0.97 + imp.z * 2.2 * dt }, true)
    }
    // reposicao (era no useFrame)
    this.safeT += dt
    if (this.safeT > 0.5 && grounded >= 3 && up.y > 0.85) {
      this.safeT = 0
      this.lastSafe.set(tr.x, tr.y + 0.2, tr.z)
      this.lastSafeYaw = Math.atan2(fwd.x, fwd.z)
    }
    if (up.y < 0.25 && grounded >= 1) this.flipT += dt
    else this.flipT = 0
    if (this.flipT > 2.2 || tr.y < -4) this.recoverToSafe('legacy')
  }
}
