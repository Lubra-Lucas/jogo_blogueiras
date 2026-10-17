/**
 * Fisica do carro "arcade" (SEM React/three): usada pelo jogo (DrivenCar.tsx) e pelos testes headless
 * (tools/vehicle-tests/run.mjs), com o MESMO codigo. So TypeScript apagavel (Node roda direto com type stripping).
 *
 * Modelo: corpo rigido dinamico do Rapier + suspensao por 4 raios (mola/amortecedor/barra estabilizadora em impulsos) +
 * controle planar no plano do chao (aceleracao, freio, aderencia lateral, derrapagem, esterco, nitro) aplicado na
 * velocidade. A gravidade do corpo e aplicada aqui (gravityScale = 0) para podermos "dilatar o tempo" em engasgos:
 * o passo do mundo pode ter dt de ate 0,5 s (Physics timeStep="vary"), mas o carro so simula ate H_MAX por passo
 * (velocidades sao escaladas antes do passo e restauradas depois), o que evita tunelamento e explosao de forcas.
 *
 * Protecoes: raios ignoram o proprio carro/dinamicos/cinematicos/sensores e superficies que nao sao chao (normal.y baixo
 * ou origem dentro de colisor); clamp de forca por roda; velocidade vertical limitada; deteccao de carro enterrado,
 * dentro de geometria, virado, preso no ar, NaN; reposicao no ultimo ponto seguro.
 */

export interface V3 {
  x: number
  y: number
  z: number
}
export interface Q4 {
  x: number
  y: number
  z: number
  w: number
}

/** Pedacos minimos da API do Rapier que usamos (para tipar sem importar o pacote). */
export interface RbLike {
  translation(): V3
  rotation(): Q4
  linvel(): V3
  angvel(): V3
  setLinvel(v: V3, wake: boolean): void
  setAngvel(v: V3, wake: boolean): void
  setTranslation(v: V3, wake: boolean): void
  setRotation(q: Q4, wake: boolean): void
  applyImpulseAtPoint(i: V3, p: V3, wake: boolean): void
  worldCom(): V3
  mass(): number
  setGravityScale(s: number, wake: boolean): void
  wakeUp(): void
}
export interface RayHit {
  timeOfImpact: number
  normal: V3
}
export interface WorldLike {
  castRayAndGetNormal(ray: unknown, maxToi: number, solid: boolean, flags?: number, groups?: number, excludeCollider?: unknown, excludeRb?: unknown): RayHit | null
}
export interface RapierLike {
  Ray: new (o: V3, d: V3) => unknown
  QueryFilterFlags: { EXCLUDE_SENSORS: number; EXCLUDE_DYNAMIC: number; EXCLUDE_KINEMATIC: number }
}

export interface CarPhysics {
  mass: number
  vTop: number
  accel: number
  vReverse: number
  steerLow: number
  steerHigh: number
  driftYaw: number
  gripHigh: number
  gripLow: number
}

export interface WheelCfg {
  /** hub no espaco do modelo (origem no chao, +Z frente, +X esquerda) */
  x: number
  z: number
  radius: number
  front: boolean
}

export interface DriveInput {
  throttle: number
  brake: number
  steer: number
  handbrake: boolean
  boost: boolean
}

/** Constantes de ajuste (arcade). */
export const TUNE = {
  GRAVITY: 9.81,
  /** curso da suspensao (m) e compressao estatica */
  REST_LEN: 0.3,
  STATIC_COMP: 0.1,
  /** altura da origem do corpo acima do chao (m) */
  COM_Y: 0.5,
  /** maior passo simulado pelo carro (s); passos maiores do mundo sao "dilatados" */
  H_MAX: 1 / 20,
  /** amortecimento (fracao do critico) */
  ZETA: 0.6,
  /** forca maxima por roda (x peso do carro) */
  F_MAX: 1.25,
  /** barra estabilizadora (x rigidez da mola) */
  ANTI_ROLL: 0.55,
  /** velocidade vertical maxima (m/s) e em piso plano (anti "mola") */
  VY_MAX: 11,
  VN_FLAT_MAX: 3.2,
  /** velocidade angular maxima (rad/s) */
  W_MAX: 9,
  /** nitro */
  BOOST_SPEED: 1.38,
  BOOST_ACCEL: 2.1,
  BOOST_USE: 0.38,
  BOOST_REGEN: 0.12,
} as const

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth01 = (x: number) => {
  const t = clamp(x, 0, 1)
  return t * t * (3 - 2 * t)
}
const finite3 = (v: V3) => Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z)

/** Rotaciona (x,y,z) pelo quaternion q, escrevendo em out. */
function rot(q: Q4, x: number, y: number, z: number, out: V3): V3 {
  const tx = 2 * (q.y * z - q.z * y)
  const ty = 2 * (q.z * x - q.x * z)
  const tz = 2 * (q.x * y - q.y * x)
  out.x = x + q.w * tx + (q.y * tz - q.z * ty)
  out.y = y + q.w * ty + (q.z * tx - q.x * tz)
  out.z = z + q.w * tz + (q.x * ty - q.y * tx)
  return out
}

const dot = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z
const v3 = (): V3 => ({ x: 0, y: 0, z: 0 })

export interface BoxCol {
  c: [number, number, number]
  h: [number, number, number]
}

/** Colisores do chassi (meia-extensao + centro, espaco do modelo) a partir da caixa do modelo. */
export function chassisBoxes(slug: string, size: V3, cz: number): BoxCol[] {
  const w = size.x
  const h = size.y
  const l = size.z
  const slabBottom = 0.2
  const slabTop = Math.min(Math.max(h * 0.55, 0.7), 1.0)
  const slab: BoxCol = { c: [0, (slabBottom + slabTop) / 2, cz], h: [w / 2 - 0.04, (slabTop - slabBottom) / 2, l / 2 - 0.04] }
  const open = slug === 'conversivel'
  const cabTop = h * 0.97
  const cabLen = l * (slug === 'van' ? 0.9 : open ? 0.22 : 0.5)
  const cabW = w * 0.82
  const cab: BoxCol = {
    c: [0, (slabTop + cabTop) / 2, cz + (slug === 'van' ? 0 : -l * 0.05)],
    h: [cabW / 2, (cabTop - slabTop) / 2, cabLen / 2],
  }
  return [slab, cab]
}

interface WheelState {
  /** ponto de fixacao no espaco do corpo */
  ax: number
  ay: number
  az: number
  radius: number
  front: boolean
  contact: boolean
  /** compressao (m) */
  comp: number
  spin: number
  /** normal do chao sob a roda e forca da mola (so no passo) */
  nrm: V3
  fSpring: number
}

export type RecoverReason = 'underground' | 'inside' | 'nan' | 'fell' | 'airstuck' | 'flipped' | 'manual' | 'stuck' | 'spawn'

export interface SimOptions {
  /** inicial: ultimo ponto seguro */
  safe: V3
  safeYaw: number
}

export class VehicleSim {
  readonly wheels: WheelState[]
  readonly wheelBase: number
  // estado de controle
  steer = 0
  driftV = 0
  boostCool = 0
  boostIdle = 0
  boost = 1
  boosting = false
  braking = false
  reversing = false
  wetGrip = 1
  yawRate = 0
  // telemetria
  grounded = 0
  airT = 0
  /** tempo desde o ultimo contato com o chao (coyote) */
  sinceGround = 0
  vf = 0
  vs = 0
  speed = 0
  longAccel = 0
  latAccel = 0
  impact = 0
  gn: V3 = { x: 0, y: 1, z: 0 }
  // seguranca
  time = 0
  flipT = 0
  stuckT = 0
  safeT = 0
  lastSafe: V3
  lastSafeYaw: number
  respawns = 0
  uprights = 0
  lastReason: RecoverReason | null = null
  hitches = 0
  private scale = 1
  private spawned = false
  private prevVel: V3 = v3()
  private prevSpeed = 0

  // temporarios
  private q: Q4 = { x: 0, y: 0, z: 0, w: 1 }
  private up = v3()
  private fwd = v3()
  private side = v3()
  private pf = v3()
  private ps = v3()
  private p = v3()
  private tmp = v3()
  private tmp2 = v3()
  private org = v3()
  private dir = v3()
  private com = v3()
  private flags: number

  private rapier: RapierLike
  private world: WorldLike
  private rb: RbLike
  private P: CarPhysics

  constructor(rapier: RapierLike, world: WorldLike, rb: RbLike, P: CarPhysics, wheels: WheelCfg[], opts: SimOptions) {
    this.rapier = rapier
    this.world = world
    this.rb = rb
    this.P = P
    const T = TUNE
    this.wheels = wheels.map((w) => ({
      ax: w.x,
      ay: w.radius - T.COM_Y + T.REST_LEN - T.STATIC_COMP,
      az: w.z,
      radius: w.radius,
      front: w.front,
      contact: false,
      comp: T.STATIC_COMP,
      spin: 0,
      nrm: { x: 0, y: 1, z: 0 },
      fSpring: 0,
    }))
    let zf = 0
    let zr = 0
    let nf = 0
    let nr = 0
    for (const w of wheels) {
      if (w.front) (zf += w.z), nf++
      else (zr += w.z), nr++
    }
    this.wheelBase = nf && nr ? Math.abs(zf / nf - zr / nr) : 2.4
    this.lastSafe = { ...opts.safe }
    this.lastSafeYaw = opts.safeYaw
    this.flags = rapier.QueryFilterFlags.EXCLUDE_SENSORS | rapier.QueryFilterFlags.EXCLUDE_DYNAMIC | rapier.QueryFilterFlags.EXCLUDE_KINEMATIC
    rb.setGravityScale(0, false) // a gravidade e aplicada em prestep (para dilatar o tempo)
  }

  // ------------------------------------------------------------------------------------------------ consultas
  /** Lanca um raio para baixo (ou direcao dada); ignora o proprio corpo e tudo que nao for estatico. */
  private cast(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, maxToi: number): RayHit | null {
    this.org.x = ox
    this.org.y = oy
    this.org.z = oz
    this.dir.x = dx
    this.dir.y = dy
    this.dir.z = dz
    const ray = new this.rapier.Ray(this.org, this.dir)
    return this.world.castRayAndGetNormal(ray, maxToi, true, this.flags, undefined, undefined, this.rb)
  }

  /** Altura do chao logo abaixo de (x, z) a partir de `fromY` (ignora superficies a mais de `maxDown`), ou null. */
  groundBelow(x: number, z: number, fromY: number, maxDown = 6): number | null {
    const h = this.cast(x, fromY, z, 0, -1, 0, maxDown)
    if (!h || h.timeOfImpact <= 1e-3) return null
    return fromY - h.timeOfImpact
  }

  // ------------------------------------------------------------------------------------------------ passo
  /**
   * Chamar ANTES de cada `world.step`. `dtWorld` = world.timestep do passo que vai acontecer.
   * `wet` 0..1 (chuva), `exitWanted` = freia ate parar.
   */
  prestep(dtWorld: number, inp: DriveInput, wet = 0, exitWanted = false): void {
    const T = TUNE
    const rb = this.rb
    const P = this.P
    const dtW = clamp(Number.isFinite(dtWorld) ? dtWorld : 1 / 60, 1 / 480, 0.5)
    const h = Math.min(dtW, T.H_MAX)
    this.scale = h / dtW
    if (dtW > T.H_MAX * 1.5) this.hitches++
    this.time += h

    let tr = rb.translation()
    let lv = rb.linvel()
    let av = rb.angvel()
    const rt = rb.rotation()
    if (!finite3(tr) || !finite3(lv) || !finite3(av) || !Number.isFinite(rt.w)) {
      this.recoverToSafe('nan')
      return
    }
    this.q.x = rt.x
    this.q.y = rt.y
    this.q.z = rt.z
    this.q.w = rt.w
    const q = this.q
    const up = rot(q, 0, 1, 0, this.up)
    const fwd = rot(q, 0, 0, 1, this.fwd)
    const side = rot(q, 1, 0, 0, this.side)
    const mass = rb.mass()
    const wc = rb.worldCom()
    this.com.x = wc.x
    this.com.y = wc.y
    this.com.z = wc.z

    // ---- primeira vez: nao nascer dentro do chao ----
    if (!this.spawned) {
      this.spawned = true
      const g = this.groundBelow(tr.x, tr.z, tr.y + 2.2, 4)
      if (g !== null && tr.y < g + T.COM_Y + 0.05) {
        rb.setTranslation({ x: tr.x, y: g + T.COM_Y + 0.08, z: tr.z }, true)
        rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
        tr = rb.translation()
        lv = rb.linvel()
      }
    }

    // ---- suspensao ----
    const kS = (mass * T.GRAVITY * 0.25) / T.STATIC_COMP
    const mEff = mass * 0.25
    const cS = Math.min(2 * T.ZETA * Math.sqrt(kS * mEff), (0.9 * mEff) / h)
    const fMax = mass * T.GRAVITY * T.F_MAX
    const kBump = kS * 3
    let grounded = 0
    let nx = 0
    let ny = 0
    let nz = 0
    for (const w of this.wheels) {
      const p = rot(q, w.ax, w.ay, w.az, this.p)
      p.x += tr.x
      p.y += tr.y
      p.z += tr.z
      const maxToi = T.REST_LEN + w.radius
      const hit = this.cast(p.x, p.y, p.z, -up.x, -up.y, -up.z, maxToi)
      // origem dentro de colisor (toi ~ 0) ou superficie que nao e chao (parede, lateral de meio-fio): nao conta como apoio
      if (hit && hit.timeOfImpact > 1e-3 && hit.normal.y > 0.5) {
        const comp = clamp(maxToi - hit.timeOfImpact, 0, T.REST_LEN + 0.06)
        // velocidade do ponto ao longo da normal
        const rx = p.x - this.com.x
        const ry = p.y - this.com.y
        const rz = p.z - this.com.z
        const px = lv.x + (av.y * rz - av.z * ry)
        const py = lv.y + (av.z * rx - av.x * rz)
        const pz = lv.z + (av.x * ry - av.y * rx)
        const nrm = hit.normal
        const vN = px * nrm.x + py * nrm.y + pz * nrm.z
        w.comp = comp
        w.contact = true
        w.nrm = nrm
        // mola (com batente progressivo) - amortecedor
        const spring = kS * comp + (comp > T.STATIC_COMP + 0.12 ? kBump * (comp - T.STATIC_COMP - 0.12) : 0)
        w.fSpring = spring - cS * vN
        nx += nrm.x
        ny += nrm.y
        nz += nrm.z
        grounded++
      } else {
        w.contact = false
        w.comp = Math.max(0, w.comp - 3 * h)
        w.fSpring = 0
      }
    }
    // barra estabilizadora (eixo dianteiro e traseiro)
    const aw = this.wheels
    for (let i = 0; i + 1 < aw.length; i += 2) {
      const a = aw[i]
      const b = aw[i + 1]
      if (a.contact && b.contact) {
        const d = (a.comp - b.comp) * kS * T.ANTI_ROLL
        a.fSpring += d
        b.fSpring -= d
      }
    }
    for (const w of aw) {
      if (!w.contact) continue
      const f = clamp(w.fSpring, 0, fMax)
      const p = rot(q, w.ax, w.ay, w.az, this.p)
      p.x += tr.x
      p.y += tr.y
      p.z += tr.z
      this.tmp.x = w.nrm.x * f * h
      this.tmp.y = w.nrm.y * f * h
      this.tmp.z = w.nrm.z * f * h
      rb.applyImpulseAtPoint(this.tmp, p, true)
    }
    this.grounded = grounded
    if (grounded > 0) {
      this.airT = 0
      this.sinceGround = 0
    } else {
      this.airT += h
      this.sinceGround += h
    }
    // normal media do chao (suavizada); no ar volta para cima
    const gnT = grounded > 0 ? Math.hypot(nx, ny, nz) || 1 : 1
    const tx = grounded > 0 ? nx / gnT : 0
    const ty = grounded > 0 ? ny / gnT : 1
    const tz = grounded > 0 ? nz / gnT : 0
    const gk = 1 - Math.exp(-(grounded > 0 ? 14 : 3) * h)
    this.gn.x += (tx - this.gn.x) * gk
    this.gn.y += (ty - this.gn.y) * gk
    this.gn.z += (tz - this.gn.z) * gk
    const gl = Math.hypot(this.gn.x, this.gn.y, this.gn.z) || 1
    this.gn.x /= gl
    this.gn.y /= gl
    this.gn.z /= gl
    const n = this.gn

    // gravidade (gravityScale = 0)
    this.tmp.x = 0
    this.tmp.y = -mass * T.GRAVITY * h
    this.tmp.z = 0
    rb.applyImpulseAtPoint(this.tmp, this.com, true)

    // ---- velocidades no referencial do plano do chao ----
    lv = rb.linvel()
    av = rb.angvel()
    // frente projetada no plano do chao
    const fdn = dot(fwd, n)
    const pf = this.pf
    pf.x = fwd.x - n.x * fdn
    pf.y = fwd.y - n.y * fdn
    pf.z = fwd.z - n.z * fdn
    let pl = Math.hypot(pf.x, pf.y, pf.z)
    if (pl < 0.2) {
      // carro quase vertical: usa a lateral para achar a direcao
      const sdn = dot(side, n)
      pf.x = n.y * (side.z - n.z * sdn) - n.z * (side.y - n.y * sdn)
      pf.y = n.z * (side.x - n.x * sdn) - n.x * (side.z - n.z * sdn)
      pf.z = n.x * (side.y - n.y * sdn) - n.y * (side.x - n.x * sdn)
      pl = Math.hypot(pf.x, pf.y, pf.z) || 1
    }
    pf.x /= pl
    pf.y /= pl
    pf.z /= pl
    const ps = this.ps
    ps.x = n.y * pf.z - n.z * pf.y
    ps.y = n.z * pf.x - n.x * pf.z
    ps.z = n.x * pf.y - n.y * pf.x
    const vf0 = lv.x * pf.x + lv.y * pf.y + lv.z * pf.z
    const vs0 = lv.x * ps.x + lv.y * ps.y + lv.z * ps.z
    const speed = Math.hypot(vf0, vs0)
    // controle: cai no ar, com um pouco de "coyote" (0,12 s) para nao perder o motor em lombadas
    const coy = grounded === 0 && this.sinceGround < 0.12 ? 0.85 : 0
    const gf = grounded >= 2 ? 1 : grounded === 1 ? 0.6 : coy

    // ---- entradas ----
    let throttle = clamp(inp.throttle, 0, 1)
    let brake = clamp(inp.brake, 0, 1)
    let steerIn = clamp(inp.steer, -1, 1)
    let handbrake = inp.handbrake
    let boostKey = inp.boost
    if (!Number.isFinite(throttle + brake + steerIn)) throttle = brake = steerIn = 0
    if (exitWanted) {
      throttle = 0
      brake = 1
      handbrake = false
      steerIn = 0
      boostKey = false
    }
    this.wetGrip += (1 - 0.18 * clamp(wet, 0, 1) - this.wetGrip) * Math.min(1, 2 * h)

    // ---- nitro ----
    let boosting = false
    if (boostKey && this.boost > 0.03 && throttle > 0.1 && vf0 > -1 && this.boostCool <= 0) {
      boosting = true
      this.boost = Math.max(0, this.boost - T.BOOST_USE * h)
      this.boostIdle = 0
      if (this.boost <= 0.001) this.boostCool = 1.2
    } else {
      this.boostIdle += h
      this.boostCool = Math.max(0, this.boostCool - h)
      if (this.boostIdle > 1.2) this.boost = Math.min(1, this.boost + T.BOOST_REGEN * h)
    }
    this.boosting = boosting

    // ---- aceleracao longitudinal ----
    const top = P.vTop * (boosting ? T.BOOST_SPEED : 1)
    let a = 0
    if (throttle > 0.01) {
      if (vf0 > -0.6) {
        const k = clamp(vf0 / top, 0, 1.2)
        // arrancada forte em baixa (sensacao de jogo), cai ate a velocidade maxima
        a = throttle * P.accel * (boosting ? T.BOOST_ACCEL : 1) * Math.max(0, 1 - k * k) * (0.85 + 0.15 * this.wetGrip)
      } else a = 18 * throttle // freia a re antes de ir para frente
    }
    let braking = false
    let reversing = false
    if (exitWanted) {
      a -= Math.sign(vf0) * 22 * Math.min(1, Math.abs(vf0) / 0.8)
      braking = Math.abs(vf0) > 0.5
    } else if (brake > 0.01) {
      if (vf0 > 0.8) {
        a -= 22 * brake * (0.7 + 0.3 * this.wetGrip)
        braking = true
      } else if (throttle < 0.05) {
        const k = clamp(-vf0 / P.vReverse, 0, 1)
        a -= P.accel * 0.55 * brake * (1 - k * k)
        reversing = true
      } else {
        a -= 18 * brake
        braking = true
      }
    }
    // resistencia: arrasto e freio-motor
    const sgn = Math.sign(vf0)
    // (com o acelerador o motor compensa o arrasto: assim a velocidade maxima do catalogo continua alcancavel mesmo com
    // aceleracao baixa; sem isso o carro estabilizava ~25% abaixo da vTop)
    a -= (vf0 * 0.045 + sgn * 0.0007 * vf0 * vf0) * (1 - (vf0 > 0 ? throttle : 0))
    if (throttle < 0.01 && brake < 0.01) a -= sgn * (vf0 > 2 ? 1.2 : 2.5) * Math.min(1, Math.abs(vf0) / 0.6)
    if (handbrake) a -= sgn * 9 * Math.min(1, Math.abs(vf0) / 1.5)
    let vf1 = vf0 + a * h
    // cruzar o zero so zera quando a desaceleracao (freio/arrasto) o causou. Com o pedal pressionado NUNCA zera: era o bug
    // "o carro nao acelera" (vf0 = -0.0002 por ruido + acelerador => vf1 era zerado a cada passo).
    if ((exitWanted && vf0 * vf1 < 0) || (vf0 > 0 && vf1 < 0 && !reversing && throttle < 0.01) || (vf0 < 0 && vf1 > 0 && throttle < 0.01 && brake < 0.01)) vf1 = 0
    if (vf1 > top * 1.02) vf1 -= (vf1 - top) * Math.min(1, 1.2 * h) // acima do limite (fim do nitro): volta suave
    this.braking = braking || (handbrake && Math.abs(vf0) > 1)
    this.reversing = reversing && vf0 < -0.2

    // ---- derrapagem ----
    const slip = speed > 3 ? Math.atan2(vs0, Math.max(Math.abs(vf0), 0.5)) : 0
    let driftT = 0
    if (handbrake && speed > 5 && gf > 0.5) driftT = 1
    else if (speed > P.vTop * 0.55 && Math.abs(steerIn) > 0.8 && throttle > 0.5) driftT = Math.max(driftT, 0.35)
    if (!handbrake) driftT = Math.max(driftT, clamp((Math.abs(slip) - 0.42) / 0.3, 0, 1) * 0.9)
    this.driftV += (driftT - this.driftV) * (1 - Math.exp(-(driftT > this.driftV ? 9 : 2.6) * h))
    const drift = this.driftV

    // ---- aderencia lateral ----
    const grip = lerp(P.gripHigh, P.gripLow, drift) * this.wetGrip
    const vs1 = vs0 * Math.exp(-grip * h)
    const lost = Math.abs(vs0) - Math.abs(vs1)
    if (lost > 0 && Math.abs(vf1) > 0.5) {
      // parte da lateral perdida vira velocidade para a frente (curva sem perder ritmo), mas SO ate a velocidade maxima:
      // sem o limite, curvar com nitro a fundo ganhava velocidade sem parar (86 m/s num carro de vTop 43).
      const sg = Math.sign(vf0 || 1)
      const room = Math.max(0, (sg > 0 ? top : P.vReverse) - Math.abs(vf1))
      vf1 += sg * Math.min(lost * 0.55 * (1 - drift), room)
    }

    // ---- freio de estacionamento: parado e sem comando, nao desliza em rampa ----
    const idle = throttle < 0.01 && brake < 0.01 && !handbrake
    let park = false
    if (idle && grounded >= 3 && Math.abs(vf0) < 0.45 && Math.abs(vs0) < 0.45) {
      vf1 = 0
      park = true
    }

    // ---- direcao ----
    const sp01 = smooth01(Math.abs(vf0) / P.vTop)
    const maxSteer = lerp(P.steerLow, P.steerHigh, sp01) * (handbrake ? 1.25 : 1)
    const wantSteer = steerIn * maxSteer
    const sRate = Math.abs(wantSteer) > Math.abs(this.steer) || Math.sign(wantSteer) !== Math.sign(this.steer) ? 9 : 14
    this.steer += (wantSteer - this.steer) * (1 - Math.exp(-sRate * h))
    const intent = throttle > 0.1 || brake > 0.1
    const vEff = intent && Math.abs(vf0) < 2.2 ? (vf0 < -0.3 || (reversing && throttle < 0.05) ? -2.2 : 2.2) : vf0
    let wT = (vEff / this.wheelBase) * Math.tan(this.steer) * (1 + P.driftYaw * drift * 1.6)
    if (drift > 0.1 && Math.abs(steerIn) < 0.25) wT += slip * 2.4 * drift // contra-esterco automatico
    wT = clamp(wT, -2.7, 2.7)
    const wNow = av.x * n.x + av.y * n.y + av.z * n.z
    const resp = lerp(11, 4.2, drift)
    const wNew = park ? 0 : wNow + (wT - wNow) * (1 - Math.exp(-resp * h)) * gf
    this.yawRate = wNew

    // ---- aplica na velocidade (so componentes do plano; a vertical fica por conta da suspensao/gravidade) ----
    const dvf = (vf1 - vf0) * Math.max(gf, 0.15)
    const dvs = (vs1 - vs0) * gf
    let nvx = lv.x + pf.x * dvf + ps.x * dvs
    let nvy = lv.y + pf.y * dvf + ps.y * dvs
    let nvz = lv.z + pf.z * dvf + ps.z * dvs
    // downforce (aderencia em velocidade) e anti-"mola": limita a velocidade ao longo da normal em piso plano
    if (grounded >= 2) {
      const vn = nvx * n.x + nvy * n.y + nvz * n.z
      const flat = n.y > 0.97
      if (flat && vn > T.VN_FLAT_MAX) {
        const cut = vn - T.VN_FLAT_MAX
        nvx -= n.x * cut
        nvy -= n.y * cut
        nvz -= n.z * cut
      }
    }
    if (nvy > T.VY_MAX) nvy = T.VY_MAX
    // limite geral de velocidade (nitro + folga)
    const hs = Math.hypot(nvx, nvz)
    const hMax = P.vTop * T.BOOST_SPEED * 1.45
    if (hs > hMax) {
      nvx *= hMax / hs
      nvz *= hMax / hs
    }
    rb.setLinvel({ x: nvx, y: nvy, z: nvz }, true)
    const dw = wNew - wNow
    let avx = av.x + n.x * dw
    let avy = av.y + n.y * dw
    let avz = av.z + n.z * dw

    // ---- no ar: auto-endireitar (tambem de ponta-cabeca) ----
    if (grounded === 0 && this.airT > 0.2) {
      let ax = -up.z // up x (0,1,0) = (-up.z, 0, up.x)
      let az = up.x
      if (Math.hypot(ax, az) < 0.05) {
        // de ponta-cabeca: gira em torno da frente
        ax = fwd.x
        az = fwd.z
      }
      avx = avx * 0.97 + ax * 2.2 * h
      avz = avz * 0.97 + az * 2.2 * h
    }
    // limite de velocidade angular
    const aw2 = Math.hypot(avx, avy, avz)
    if (aw2 > T.W_MAX) {
      const s = T.W_MAX / aw2
      avx *= s
      avy *= s
      avz *= s
    }
    rb.setAngvel({ x: avx, y: avy, z: avz }, true)

    // ---- downforce: cola no chao em velocidade ----
    const down = 1.5 * speed * speed * (mass / 1000) * h
    if (down > 0 && grounded >= 2) {
      this.tmp.x = -n.x * down
      this.tmp.y = -n.y * down
      this.tmp.z = -n.z * down
      rb.applyImpulseAtPoint(this.tmp, this.com, true)
    }

    // ---- telemetria ----
    this.vf = vf1
    this.vs = vs1
    this.speed = speed
    this.longAccel = (vf1 - vf0) / h
    this.latAccel = wNew * vf0
    this.prevSpeed = speed
    this.prevVel.x = nvx
    this.prevVel.y = nvy
    this.prevVel.z = nvz

    // ---- seguranca (usa a pose atual) ----
    this.safety(h, up.y, speed, throttle, brake, exitWanted)

    // ---- dilatacao do tempo: o mundo vai integrar dtW, mas simulamos so h ----
    if (this.scale < 0.9999) {
      const l2 = rb.linvel()
      const a2 = rb.angvel()
      rb.setLinvel({ x: l2.x * this.scale, y: l2.y * this.scale, z: l2.z * this.scale }, false)
      rb.setAngvel({ x: a2.x * this.scale, y: a2.y * this.scale, z: a2.z * this.scale }, false)
    }
  }

  /** Chamar DEPOIS de cada `world.step`. Restaura as velocidades e mede impactos. */
  poststep(): void {
    const rb = this.rb
    if (this.scale < 0.9999) {
      const k = 1 / this.scale
      const l = rb.linvel()
      const a = rb.angvel()
      rb.setLinvel({ x: l.x * k, y: l.y * k, z: l.z * k }, false)
      rb.setAngvel({ x: a.x * k, y: a.y * k, z: a.z * k }, false)
      this.scale = 1
    }
    const lv = rb.linvel()
    if (!finite3(lv)) return
    // o controle muda pouco a velocidade; colisao muda muito mais
    const d = Math.hypot(lv.x - this.prevVel.x, lv.z - this.prevVel.z)
    if (d > 4.5 && this.prevSpeed > 5) this.impact = Math.max(this.impact, d)
  }

  // ------------------------------------------------------------------------------------------------ seguranca
  private safety(h: number, upY: number, speed: number, throttle: number, brake: number, exitWanted: boolean): void {
    const rb = this.rb
    const tr = rb.translation()

    // ultimo ponto seguro
    this.safeT += h
    if (this.safeT > 0.5 && this.grounded >= 3 && upY > 0.85 && tr.y > -0.5) {
      this.safeT = 0
      this.lastSafe.x = tr.x
      this.lastSafe.y = tr.y + 0.2
      this.lastSafe.z = tr.z
      const f = rot(this.q, 0, 0, 1, this.tmp2)
      this.lastSafeYaw = Math.atan2(f.x, f.z)
    }

    // virado (de lado/de cabeca para baixo) e parado: desvira no lugar
    if (upY < 0.3 && speed < 4) this.flipT += h
    else this.flipT = Math.max(0, this.flipT - h)
    if (this.flipT > 1.6) {
      this.uprightInPlace('flipped')
      return
    }

    // caiu do mapa
    if (tr.y < -1.2) {
      this.recoverToSafe('fell')
      return
    }

    // enterrado / dentro de geometria (so vale quando nenhuma roda toca)
    if (this.grounded === 0 && this.airT > 0.12) {
      const oy = tr.y + 1.4
      const hit = this.cast(tr.x, oy, tr.z, 0, -1, 0, 3.2)
      if (hit) {
        if (hit.timeOfImpact <= 1e-3) {
          // origem dentro de um solido: preso numa geometria
          this.recoverToSafe('inside')
          return
        }
        const surf = oy - hit.timeOfImpact
        if (surf > tr.y - 0.1 && hit.normal.y > 0.5) {
          // centro do carro abaixo da superficie do chao: sobe
          rb.setTranslation({ x: tr.x, y: surf + TUNE.COM_Y + 0.1, z: tr.z }, true)
          const l = rb.linvel()
          rb.setLinvel({ x: l.x, y: Math.max(0, l.y), z: l.z }, true)
          this.respawns++
          this.lastReason = 'underground'
        }
      }
    }

    // preso no ar (parado, sem tocar o chao, perto de uma superficie)
    if (this.airT > 1.4) {
      const l = rb.linvel()
      if (Math.abs(l.y) < 1.3) {
        const g = this.groundBelow(tr.x, tr.z, tr.y, 4)
        if (g !== null && tr.y - g < 2.5) {
          this.uprightInPlace('airstuck')
          return
        }
      }
    }

    // acelerando e nao anda ha muito tempo, sem tocar o chao ou virado
    const wants = (throttle > 0.5 || brake > 0.5) && !exitWanted
    if (wants && speed < 0.35 && this.grounded <= 1) this.stuckT += h
    else this.stuckT = Math.max(0, this.stuckT - h * 2)
    if (this.stuckT > 3) {
      this.stuckT = 0
      this.uprightInPlace('stuck')
    }
  }

  /** Endireita o carro onde esta (mantem o rumo), levantando-o um pouco. */
  uprightInPlace(reason: RecoverReason = 'manual'): void {
    const rb = this.rb
    const tr = rb.translation()
    const rt = rb.rotation()
    this.q.x = rt.x
    this.q.y = rt.y
    this.q.z = rt.z
    this.q.w = rt.w
    const f = rot(this.q, 0, 0, 1, this.tmp2)
    let yaw: number
    if (Math.hypot(f.x, f.z) > 0.3) yaw = Math.atan2(f.x, f.z)
    else {
      const s = rot(this.q, 1, 0, 0, this.tmp2)
      yaw = Math.atan2(s.z, -s.x)
    }
    const g = this.groundBelow(tr.x, tr.z, tr.y + 1.5, 6)
    const y = g !== null ? g + TUNE.COM_Y + 0.25 : tr.y + 0.6
    rb.setTranslation({ x: tr.x, y, z: tr.z }, true)
    rb.setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) }, true)
    const l = rb.linvel()
    rb.setLinvel({ x: l.x * 0.3, y: 0, z: l.z * 0.3 }, true)
    rb.setAngvel({ x: 0, y: 0, z: 0 }, true)
    this.flipT = 0
    this.stuckT = 0
    this.airT = 0
    this.uprights++
    this.lastReason = reason
    this.steer = 0
  }

  /** Coloca o carro em (x, z) virado para `yaw`, parado, sobre o chao (usa raio para baixo). Para testes/reposicao. */
  teleport(x: number, z: number, yaw: number): void {
    const rb = this.rb
    const g = this.groundBelow(x, z, 4, 8)
    rb.setTranslation({ x, y: (g ?? 0) + TUNE.COM_Y + 0.1, z }, true)
    rb.setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) }, true)
    rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
    rb.setAngvel({ x: 0, y: 0, z: 0 }, true)
    this.lastSafe.x = x
    this.lastSafe.y = (g ?? 0) + TUNE.COM_Y + 0.1
    this.lastSafe.z = z
    this.lastSafeYaw = yaw
    this.steer = 0
    this.driftV = 0
    this.flipT = 0
    this.stuckT = 0
    this.airT = 0
    this.scale = 1
  }

  /** Volta ao ultimo ponto seguro, parado. */
  recoverToSafe(reason: RecoverReason): void {
    const rb = this.rb
    const p = this.lastSafe
    const h = this.lastSafeYaw
    rb.setTranslation({ x: p.x, y: p.y + 0.3, z: p.z }, true)
    rb.setRotation({ x: 0, y: Math.sin(h / 2), z: 0, w: Math.cos(h / 2) }, true)
    rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
    rb.setAngvel({ x: 0, y: 0, z: 0 }, true)
    this.flipT = 0
    this.stuckT = 0
    this.airT = 0
    this.steer = 0
    this.scale = 1
    this.respawns++
    this.lastReason = reason
  }
}
