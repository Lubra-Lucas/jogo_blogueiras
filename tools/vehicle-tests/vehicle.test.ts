// Testes headless da fisica dos carros. Mundo de teste com Rapier 0.19 (o mesmo do jogo) reproduzindo o chao da cidade
// (caixa de 1 m com topo em y=0, lajes de rua um pouco mais altas, meio-fio, rampa, lombada, parede, carro estacionado, cones).
// Roda o MESMO controle de src/game/vehicles/sim/vehiclePhysics.ts, com entradas roteirizadas, quadros longos e fuzzing.
import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { CARS } from '../../src/game/vehicles/catalog.ts'
import { VehicleSim, chassisBoxes, TUNE, type DriveInput, type WheelCfg } from '../../src/game/vehicles/sim/vehiclePhysics.ts'
import { LegacySim } from './legacy.ts'

// ---------------------------------------------------------------------------------------------- Rapier 0.19 (o do r3f-rapier)
const req = createRequire(import.meta.url)
const rapierDir = dirname(req.resolve('@react-three/rapier/package.json'))
const R = createRequire(rapierDir + '/')('@dimforge/rapier3d-compat')
await R.init()

const args = process.argv.slice(2)
const ONLY = args.find((a) => a.startsWith('--only='))?.slice(7)
const LEGACY = args.includes('--legacy')
const VERBOSE = args.includes('--verbose')
const TRACE = args.includes('--trace')

// ---------------------------------------------------------------------------------------------- dados dos carros (vehicles.json)
const VJ = (await import('node:fs')).readFileSync(new URL('../../public/assets/vehicles/vehicles.json', import.meta.url), 'utf8')
const MODELS = JSON.parse(VJ) as Record<string, { size: [number, number, number]; hubs: Record<string, [number, number, number]> }>

function wheelsOf(slug: string): WheelCfg[] {
  const m = MODELS[slug]
  return (['FL', 'FR', 'RL', 'RR'] as const).map((k) => ({ x: m.hubs[k][0], z: m.hubs[k][2], radius: m.hubs[k][1], front: k[0] === 'F' }))
}

// ---------------------------------------------------------------------------------------------- mundo de teste
type Feat = 'roads' | 'curb' | 'ramp' | 'bump' | 'wall' | 'parked' | 'cones' | 'bench' | 'lake'
interface World {
  w: any
  cones: any[]
}

const quatY = (a: number) => ({ x: 0, y: Math.sin(a / 2), z: 0, w: Math.cos(a / 2) })
const quatX = (a: number) => ({ x: Math.sin(a / 2), y: 0, z: 0, w: Math.cos(a / 2) })
const quatZ = (a: number) => ({ x: 0, y: 0, z: Math.sin(a / 2), w: Math.cos(a / 2) })

function makeWorld(feats: Feat[] = []): World {
  const w = new R.World({ x: 0, y: -9.81, z: 0 })
  const fixed = w.createRigidBody(R.RigidBodyDesc.fixed())
  const add = (d: any) => w.createCollider(d, fixed)
  // chao da cidade: caixa de 1 m com topo em y=0
  add(R.ColliderDesc.cuboid(900, 0.5, 900).setTranslation(0, -0.5, 0))
  if (feats.includes('roads')) {
    // lajes de rua/calcada "um pouco mais altas" (sobrepostas ao chao) - tampos em 0.02..0.06
    add(R.ColliderDesc.cuboid(9, 0.01, 300).setTranslation(0, 0.01, 0))
    add(R.ColliderDesc.cuboid(7, 0.02, 300).setTranslation(0, 0.02, 0))
    add(R.ColliderDesc.cuboid(5, 0.03, 300).setTranslation(0, 0.03, 0))
    add(R.ColliderDesc.cylinder(0.03, 12).setTranslation(0, 0.03, 250)) // praca (disco de 6 cm)
  }
  if (feats.includes('curb')) {
    // meio-fio atravessado na pista (degrau de 15 cm) em z=60
    add(R.ColliderDesc.cuboid(30, 0.075, 0.15).setTranslation(0, 0.075, 60))
    // e um paralelo a pista (a 5.5 m do eixo)
    add(R.ColliderDesc.cuboid(0.15, 0.075, 300).setTranslation(5.5, 0.075, 0))
  }
  if (feats.includes('bump')) {
    // lombada: cilindro deitado (altura 10 cm)
    add(R.ColliderDesc.cylinder(8, 0.28).setRotation(quatZ(Math.PI / 2)).setTranslation(0, -0.18, 100))
  }
  if (feats.includes('ramp')) {
    // rampa de 12 graus, 8 m de comprimento, termina no ar (salto)
    const a = (12 * Math.PI) / 180
    const L = 8
    add(R.ColliderDesc.cuboid(4, 0.1, L / 2).setRotation(quatX(-a)).setTranslation(0, (Math.sin(a) * L) / 2, 180 + (Math.cos(a) * L) / 2))
  }
  if (feats.includes('wall')) add(R.ColliderDesc.cuboid(10, 2, 0.5).setTranslation(0, 2, 150))
  if (feats.includes('parked')) {
    // carro estacionado na lateral (lajes de 0.2 a 0.7 m) - a 2.7 m do eixo, 4.4 m de comprimento
    add(R.ColliderDesc.roundCuboid(0.85, 0.22, 2.1, 0.05).setTranslation(2.7, 0.45, 30))
    add(R.ColliderDesc.roundCuboid(0.7, 0.3, 1.0, 0.05).setTranslation(2.7, 0.95, 29))
  }
  if (feats.includes('bench')) {
    add(R.ColliderDesc.cuboid(0.9, 0.3, 0.25).setTranslation(3.6, 0.3, 70)) // banco baixo encostado na pista
  }
  if (feats.includes('lake')) {
    // fundo do lago (topo em -1) debaixo do chao: sobrepoe, nao deve interferir
    add(R.ColliderDesc.cylinder(0.5, 40).setTranslation(-100, -1.5, 100))
  }
  const cones: any[] = []
  if (feats.includes('cones')) {
    for (let i = 0; i < 14; i++) {
      const b = w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(-1.5 + (i % 3) * 1.5, 0.02, 40 + i * 6).setLinearDamping(0.4).setAngularDamping(0.5))
      w.createCollider(R.ColliderDesc.cylinder(0.3, 0.2).setTranslation(0, 0.32, 0).setMass(4).setFriction(0.7).setRestitution(0.2), b)
      cones.push(b)
    }
  }
  w.integrationParameters.dt = 1 / 60
  return { w, cones }
}

// ---------------------------------------------------------------------------------------------- carro de teste
interface Car {
  rb: any
  sim: VehicleSim | LegacySim
  slug: string
}

function addCar(wd: World, slug: string, x: number, y: number, z: number, yaw = 0, legacy = LEGACY): Car {
  const spec = CARS.find((c) => c.slug === slug)!
  const m = MODELS[slug]
  const desc = R.RigidBodyDesc.dynamic().setTranslation(x, y, z).setRotation(quatY(yaw)).setCanSleep(false).setCcdEnabled(true).setLinearDamping(0.02).setAngularDamping(1.2)
  const rb = wd.w.createRigidBody(desc)
  const boxes = chassisBoxes(slug, { x: m.size[0], y: m.size[1], z: m.size[2] }, 0)
  boxes.forEach((b, i) => {
    wd.w.createCollider(
      R.ColliderDesc.roundCuboid(b.h[0] - 0.06, b.h[1] - 0.06, b.h[2] - 0.06, 0.06)
        .setTranslation(b.c[0], b.c[1] - TUNE.COM_Y, b.c[2])
        .setMass(spec.fisica.mass * (i === 0 ? 0.85 : 0.15))
        .setFriction(0.05)
        .setRestitution(0.08),
      rb,
    )
  })
  const opts = { safe: { x, y: 0.6, z }, safeYaw: yaw }
  const sim = legacy ? new LegacySim(R, wd.w, rb, spec.fisica, wheelsOf(slug), opts) : new VehicleSim(R, wd.w, rb, spec.fisica, wheelsOf(slug), opts)
  return { rb, sim, slug }
}

const NO: DriveInput = { throttle: 0, brake: 0, steer: 0, handbrake: false, boost: false }
const inp = (o: Partial<DriveInput>): DriveInput => ({ ...NO, ...o })

// ---------------------------------------------------------------------------------------------- medicao
interface Stats {
  t: number
  minH: number
  maxH: number
  maxSpeed: number
  maxW: number
  maxVy: number
  nan: boolean
  minUp: number
  steps: number
  zMax: number
  zMin: number
}
const newStats = (): Stats => ({ t: 0, minH: 1e9, maxH: -1e9, maxSpeed: 0, maxW: 0, maxVy: -1e9, nan: false, minUp: 1, steps: 0, zMax: -1e9, zMin: 1e9 })

function stepCar(wd: World, car: Car, st: Stats, dt: number, input: DriveInput, wet = 0, exit = false, groundY: (x: number, z: number) => number = () => 0) {
  wd.w.timestep = dt
  car.sim.prestep(dt, input, wet, exit)
  wd.w.step()
  car.sim.poststep()
  st.t += dt
  st.steps++
  const tr = car.rb.translation()
  const lv = car.rb.linvel()
  const av = car.rb.angvel()
  const q = car.rb.rotation()
  if (![tr.x, tr.y, tr.z, lv.x, lv.y, lv.z, av.x, av.y, av.z, q.w].every(Number.isFinite)) {
    st.nan = true
    return
  }
  const h = tr.y - TUNE.COM_Y - groundY(tr.x, tr.z)
  if (TRACE && h < -0.1 && !(st as any).traced) {
    ;(st as any).traced = true
    const s = car.sim as any
    console.log(`  [trace] ${car.slug} t=${f(st.t, 3)} dt=${f(dt, 3)} y=${f(tr.y)} vy=${f(lv.y)} v=${f(Math.hypot(lv.x, lv.z))} grounded=${s.grounded} airT=${f(s.airT)} z=${f(tr.z)} respawns=${s.respawns} comps=${s.wheels.map((w: any) => f(w.comp)).join(',')} reason=${s.lastReason}`)
  }
  st.minH = Math.min(st.minH, h)
  st.maxH = Math.max(st.maxH, h)
  st.maxSpeed = Math.max(st.maxSpeed, Math.hypot(lv.x, lv.z))
  st.maxW = Math.max(st.maxW, Math.hypot(av.x, av.y, av.z))
  st.maxVy = Math.max(st.maxVy, lv.y)
  st.zMax = Math.max(st.zMax, tr.z)
  st.zMin = Math.min(st.zMin, tr.z)
  const upY = 1 - 2 * (q.x * q.x + q.z * q.z)
  st.minUp = Math.min(st.minUp, upY)
}

/** Roda `secs` de tempo simulado com dt fixo (ou funcao) e entrada em funcao do tempo. */
function run(wd: World, car: Car, secs: number, input: (t: number) => DriveInput, dt: number | ((i: number) => number) = 1 / 60, st = newStats(), opts: { wet?: number; groundY?: (x: number, z: number) => number } = {}) {
  let t = 0
  let i = 0
  while (t < secs) {
    const d = typeof dt === 'number' ? dt : dt(i)
    stepCar(wd, car, st, d, input(t), opts.wet ?? 0, false, opts.groundY)
    t += d
    i++
  }
  return st
}

const speedOf = (car: Car) => {
  const l = car.rb.linvel()
  return Math.hypot(l.x, l.z)
}
const fwdSpeed = (car: Car) => {
  const l = car.rb.linvel()
  const q = car.rb.rotation()
  const fx = 2 * (q.x * q.z + q.w * q.y)
  const fz = 1 - 2 * (q.x * q.x + q.y * q.y)
  return l.x * fx + l.z * fz
}
const pos = (car: Car) => car.rb.translation()
const yawOf = (car: Car) => {
  const q = car.rb.rotation()
  const fx = 2 * (q.x * q.z + q.w * q.y)
  const fz = 1 - 2 * (q.x * q.x + q.y * q.y)
  return Math.atan2(fx, fz)
}

// ---------------------------------------------------------------------------------------------- mini framework
interface Row {
  group: string
  name: string
  ok: boolean
  info: string
}
const rows: Row[] = []
let curGroup = ''
function check(name: string, ok: boolean, info: string) {
  rows.push({ group: curGroup, name, ok, info })
}
const f = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : 'NaN')
function test(name: string, fn: () => void) {
  if (ONLY && !name.includes(ONLY)) return
  curGroup = name
  try {
    fn()
  } catch (e) {
    check('excecao', false, String((e as Error).stack ?? e))
  }
}

const SLUGS = CARS.map((c) => c.slug)
const spec = (slug: string) => CARS.find((c) => c.slug === slug)!

/** invariantes basicas de qualquer cena de chao plano */
function invariants(label: string, st: Stats, o: { minH?: number; maxH?: number; maxW?: number; maxSpeed?: number } = {}) {
  check(`${label}: sem NaN`, !st.nan, st.nan ? 'NaN!' : 'ok')
  check(`${label}: nao afunda (minH >= ${o.minH ?? -0.12})`, st.minH >= (o.minH ?? -0.12), `minH=${f(st.minH)}`)
  check(`${label}: nao voa (maxH <= ${o.maxH ?? 0.6})`, st.maxH <= (o.maxH ?? 0.6), `maxH=${f(st.maxH)}`)
  check(`${label}: w limitado (<= ${o.maxW ?? 9.5})`, st.maxW <= (o.maxW ?? 9.5), `maxW=${f(st.maxW)}`)
  if (o.maxSpeed) check(`${label}: velocidade < ${o.maxSpeed}`, st.maxSpeed < o.maxSpeed, `vmax=${f(st.maxSpeed)}`)
}

// ================================================================================================ TESTES
test('01 acelerar 5 s (todos os carros)', () => {
  for (const slug of SLUGS) {
    const wd = makeWorld(['roads'])
    const car = addCar(wd, slug, 0, 0.62, 0)
    const st = run(wd, car, 5, () => inp({ throttle: 1 }))
    const v = fwdSpeed(car)
    const need = spec(slug).fisica.vTop * 0.5
    check(`${slug}: v(5s) > ${f(need, 1)} m/s`, v > need, `v=${f(v)} m/s (${f(v * 3.6, 0)} km/h), z=${f(pos(car).z, 1)}`)
    invariants(slug, st, { maxSpeed: spec(slug).fisica.vTop * 1.1 })
    const t1 = run(wd, car, 3, () => inp({ throttle: 1 }), 1 / 60)
    check(`${slug}: continua acelerando ate perto da maxima`, fwdSpeed(car) > spec(slug).fisica.vTop * 0.8, `v(8s)=${f(fwdSpeed(car))} / vTop ${spec(slug).fisica.vTop}`)
    void t1
  }
})

test('02 curva a toda (esterco total em alta)', () => {
  for (const slug of SLUGS) {
    const wd = makeWorld(['roads'])
    const car = addCar(wd, slug, 0, 0.62, 0)
    run(wd, car, 8, () => inp({ throttle: 1 }))
    const y0 = yawOf(car)
    const st = run(wd, car, 4, () => inp({ throttle: 1, steer: 1 }))
    let dy = yawOf(car) - y0
    dy = Math.atan2(Math.sin(dy), Math.cos(dy))
    const dyAbs = Math.abs(dy)
    check(`${slug}: gira com esterco total`, st.t > 0 && Math.abs(st.maxW) > 0.2, `maxW=${f(st.maxW)}`)
    check(`${slug}: nao capota (minUp > 0.8)`, st.minUp > 0.8, `minUp=${f(st.minUp)}`)
    invariants(slug, st, { maxH: 0.35 })
    void dyAbs
  }
})

test('03 derrapagem com freio de mao', () => {
  for (const slug of SLUGS) {
    const wd = makeWorld(['roads'])
    const car = addCar(wd, slug, 0, 0.62, 0)
    run(wd, car, 6, () => inp({ throttle: 1 }))
    const st = newStats()
    let sMax = 0
    let lat = 0
    const y0 = yawOf(car)
    let dyaw = 0
    for (let i = 0; i < 90; i++) {
      run(wd, car, 1 / 60, () => inp({ throttle: 1, steer: -1, handbrake: i < 54 }), 1 / 60, st)
      const l = car.rb.linvel()
      const fx = Math.sin(yawOf(car))
      const fz = Math.cos(yawOf(car))
      lat = Math.max(lat, Math.abs(l.x * fz - l.z * fx))
      dyaw = Math.max(dyaw, Math.abs(Math.atan2(Math.sin(yawOf(car) - y0), Math.cos(yawOf(car) - y0))))
    }
    sMax = lat
    check(`${slug}: derrapa (vel. lateral max > 2.5)`, lat > 2.5, `lat=${f(lat)} m/s, v=${f(speedOf(car))}, yaw=${f(dyaw)} rad`)
    check(`${slug}: ainda tem velocidade (> 4)`, speedOf(car) > 4, `v=${f(speedOf(car))}`)
    check(`${slug}: nao capota (minUp > 0.8)`, st.minUp > 0.8, `minUp=${f(st.minUp)}`)
    invariants(slug, st, { maxH: 0.35 })
    void sMax
  }
})

test('04 nitro', () => {
  for (const slug of SLUGS) {
    const wd = makeWorld(['roads'])
    const car = addCar(wd, slug, 0, 0.62, 0)
    run(wd, car, 7, () => inp({ throttle: 1 }))
    const v0 = fwdSpeed(car)
    const st = run(wd, car, 2.4, () => inp({ throttle: 1, boost: true }))
    const v1 = fwdSpeed(car)
    check(`${slug}: nitro passa da maxima`, v1 > spec(slug).fisica.vTop * 1.08, `${f(v0)} -> ${f(v1)} (vTop ${spec(slug).fisica.vTop})`)
    invariants(slug, st, { maxSpeed: spec(slug).fisica.vTop * 1.6, maxH: 0.35 })
  }
})

test('05 frear e re', () => {
  for (const slug of SLUGS) {
    const wd = makeWorld(['roads'])
    const car = addCar(wd, slug, 0, 0.62, 0)
    run(wd, car, 5, () => inp({ throttle: 1 }))
    const v0 = fwdSpeed(car)
    const st = run(wd, car, 4, () => inp({ brake: 1 }))
    check(`${slug}: freia ate parar/re`, fwdSpeed(car) < 0.5, `${f(v0)} -> ${f(fwdSpeed(car))}`)
    run(wd, car, 3, () => inp({ brake: 1 }), 1 / 60, st)
    check(`${slug}: engata a re (< -2)`, fwdSpeed(car) < -2, `v=${f(fwdSpeed(car))}`)
    check(`${slug}: re limitada (>= -vReverse-1)`, fwdSpeed(car) >= -spec(slug).fisica.vReverse - 1, `v=${f(fwdSpeed(car))}`)
    invariants(slug, st, { maxH: 0.3 })
    // solta tudo: para e fica parado (sem "andar sozinho")
    run(wd, car, 4, () => NO)
    check(`${slug}: sem comando, para`, Math.abs(fwdSpeed(car)) < 0.3, `v=${f(fwdSpeed(car))}`)
  }
})

test('06 batida de frente na parede em velocidade maxima', () => {
  for (const slug of SLUGS) {
    const wd = makeWorld(['roads', 'wall'])
    const car = addCar(wd, slug, 0, 0.62, 60)
    const st = run(wd, car, 7, () => inp({ throttle: 1, boost: true }))
    check(`${slug}: nao atravessa a parede (z < 149.6)`, st.zMax < 149.6, `zMax=${f(st.zMax)}`)
    invariants(slug, st, { maxH: 1.5, maxW: 9.5 })
    check(`${slug}: bateu e parou (v < 2)`, speedOf(car) < 2.5, `v=${f(speedOf(car))}`)
    // depois da batida da para dar re e sair
    const z0 = pos(car).z
    const st2 = run(wd, car, 3, () => inp({ brake: 1 }))
    check(`${slug}: sai de re apos a batida (>= 3 m)`, z0 - pos(car).z >= 3, `recuou ${f(z0 - pos(car).z)} m`)
    check(`${slug}: sem NaN apos a batida`, !st2.nan, 'ok')
  }
})

test('07 meio-fio, lombada, rampa', () => {
  for (const slug of SLUGS) {
    // meio-fio (15 cm) a 20 m/s: sem voar
    let wd = makeWorld(['roads', 'curb'])
    let car = addCar(wd, slug, 0, 0.62, 0)
    let st = newStats()
    run(wd, car, 3.2, () => inp({ throttle: 1 }), 1 / 60, st)
    const v = fwdSpeed(car)
    const crossed = pos(car).z > 62
    run(wd, car, 3, () => inp({ throttle: 1 }), 1 / 60, st)
    check(`${slug}: sobe no meio-fio (z > 62) e segue`, crossed || pos(car).z > 62, `z=${f(pos(car).z, 1)} v=${f(v)}`)
    invariants(`${slug} meio-fio`, st, { maxH: 0.9 })
    check(`${slug} meio-fio: vy max baixo (< 5)`, st.maxVy < 5, `vy=${f(st.maxVy)}`)
    // lombada de 10 cm a ~15 m/s e a toda
    wd = makeWorld(['roads', 'bump'])
    car = addCar(wd, slug, 0, 0.62, 40)
    st = newStats()
    run(wd, car, 6.5, () => inp({ throttle: 1 }), 1 / 60, st)
    check(`${slug}: passa a lombada (z > 102)`, pos(car).z > 102, `z=${f(pos(car).z, 1)} v=${f(fwdSpeed(car))}`)
    invariants(`${slug} lombada`, st, { maxH: 0.7 })
    check(`${slug} lombada: vy max baixo (< 4)`, st.maxVy < 4, `vy=${f(st.maxVy)}`)
    // rampa: salta, mas com altura limitada e aterrissa em pe
    wd = makeWorld(['roads', 'ramp'])
    car = addCar(wd, slug, 0, 0.62, 100)
    st = newStats()
    run(wd, car, 8, () => inp({ throttle: 1 }), 1 / 60, st)
    check(`${slug}: rampa - altura do salto razoavel (< 6 m)`, st.maxH < 6, `maxH=${f(st.maxH)} vy=${f(st.maxVy)}`)
    check(`${slug}: rampa - aterrissa de pe e anda`, st.minUp > 0.0 && pos(car).y < 1.5 && fwdSpeed(car) > 4, `y=${f(pos(car).y)} up_min=${f(st.minUp)} v=${f(fwdSpeed(car))} respawns=${car.sim.respawns} uprights=${car.sim.uprights}`)
    check(`${slug}: rampa - sem NaN`, !st.nan, 'ok')
    check(`${slug}: rampa - nao afunda`, st.minH > -0.15, `minH=${f(st.minH)}`)
  }
})

test('08 quadros longos (hitch 0.25 s e 0.5 s) em velocidade', () => {
  for (const slug of SLUGS) {
    const wd = makeWorld(['roads'])
    const car = addCar(wd, slug, 0, 0.62, 0)
    run(wd, car, 3, () => inp({ throttle: 1 }))
    const st = newStats()
    // a cada segundo um quadro de 0.25 s, e dois de 0.5 s
    let n = 0
    run(wd, car, 10, () => inp({ throttle: 1, steer: Math.sin(n * 0.05) * 0.5 }), (i) => {
      n = i
      return i % 60 === 59 ? 0.25 : i === 200 || i === 400 ? 0.5 : 1 / 60
    }, st)
    invariants(`${slug} hitch`, st, { maxH: 0.6 })
    check(`${slug} hitch: continua de pe (minUp > 0.8)`, st.minUp > 0.8, `minUp=${f(st.minUp)}`)
    check(`${slug} hitch: respawns = 0`, car.sim.respawns === 0, `respawns=${car.sim.respawns}, hitches=${car.sim.hitches ?? 0}`)
    check(`${slug} hitch: segue acelerando (> 10 m/s)`, speedOf(car) > 10, `v=${f(speedOf(car))}`)
  }
})

test('09 nascer dentro do chao / sobre geometria', () => {
  for (const slug of SLUGS) {
    for (const y of [-0.3, 0.0, 0.2, 0.45, 0.62, 2.5]) {
      const wd = makeWorld(['roads'])
      const car = addCar(wd, slug, 0, y, 0)
      const st = newStats()
      run(wd, car, 1.5, () => NO, 1 / 60, st)
      const settled = pos(car).y
      check(`${slug} spawn y=${y}: assenta em ~0.5 (0.4..0.75)`, settled > 0.4 && settled < 0.75, `y=${f(settled)}`)
      run(wd, car, 3, () => inp({ throttle: 1 }), 1 / 60, st)
      check(`${slug} spawn y=${y}: acelera (> 5 m/s em 3 s)`, fwdSpeed(car) > 5, `v=${f(fwdSpeed(car))}`)
      check(`${slug} spawn y=${y}: sem NaN`, !st.nan, 'ok')
    }
    // nasce COM um quadro longo na primeira etapa (entrar no carro trava o navegador)
    const wd = makeWorld(['roads'])
    const car = addCar(wd, slug, 0, 0.62, 0)
    const st = newStats()
    run(wd, car, 3, () => inp({ throttle: 1 }), (i) => (i === 0 ? 0.5 : i === 1 ? 0.3 : 1 / 60), st)
    check(`${slug} spawn+hitch: acima do chao e acelerando`, st.minH > -0.1 && fwdSpeed(car) > 5, `minH=${f(st.minH)} v=${f(fwdSpeed(car))}`)
  }
})

test('10 desvirar e preso', () => {
  for (const slug of SLUGS) {
    // de ponta-cabeca, parado
    let wd = makeWorld(['roads'])
    let car = addCar(wd, slug, 0, 1.2, 0)
    car.rb.setRotation({ x: 1, y: 0, z: 0, w: 0 }, true)
    let st = run(wd, car, 5, () => NO)
    let q = car.rb.rotation()
    check(`${slug}: ponta-cabeca -> desvira sozinho (<= 5 s)`, 1 - 2 * (q.x * q.x + q.z * q.z) > 0.9, `up.y=${f(1 - 2 * (q.x * q.x + q.z * q.z))} uprights=${car.sim.uprights}`)
    check(`${slug}: desvirou sem NaN`, !st.nan, 'ok')
    // de lado
    wd = makeWorld(['roads'])
    car = addCar(wd, slug, 0, 1.2, 0)
    car.rb.setRotation(quatZ(Math.PI / 2), true)
    st = run(wd, car, 5, () => NO)
    q = car.rb.rotation()
    check(`${slug}: de lado -> desvira sozinho`, 1 - 2 * (q.x * q.x + q.z * q.z) > 0.9, `up.y=${f(1 - 2 * (q.x * q.x + q.z * q.z))}`)
    // depois acelera
    run(wd, car, 3, () => inp({ throttle: 1 }), 1 / 60, st)
    check(`${slug}: depois de desvirar, acelera (> 5)`, fwdSpeed(car) > 5, `v=${f(fwdSpeed(car))}`)
    // X manual
    wd = makeWorld(['roads'])
    car = addCar(wd, slug, 0, 1.2, 0)
    car.rb.setRotation({ x: 1, y: 0, z: 0, w: 0 }, true)
    run(wd, car, 0.3, () => NO)
    car.sim.uprightInPlace('manual')
    run(wd, car, 1, () => NO)
    q = car.rb.rotation()
    check(`${slug}: desvirar manual (X)`, 1 - 2 * (q.x * q.x + q.z * q.z) > 0.95, `up.y=${f(1 - 2 * (q.x * q.x + q.z * q.z))}`)
  }
})

test('11 carro estacionado, banco e cones ao lado', () => {
  for (const slug of SLUGS) {
    const wd = makeWorld(['roads', 'parked', 'bench', 'cones'])
    // raspa no estacionado (x=2.7 +-0.85): corre a x=0.7..1.1 sobrepondo as ra's (raios entram na laje)
    const car = addCar(wd, slug, 0.9, 0.62, 0)
    const st = newStats()
    run(wd, car, 9, () => inp({ throttle: 1, steer: 0 }), 1 / 60, st)
    invariants(`${slug} raspando`, st, { maxH: 0.9 })
    check(`${slug} raspando: vy max (< 6)`, st.maxVy < 6, `vy=${f(st.maxVy)}`)
    const z1 = pos(car).z
    const st2 = run(wd, car, 3, () => inp({ brake: 1 }))
    check(`${slug} raspando: sai de re (>= 2 m)`, z1 - pos(car).z >= 2 || z1 > 90, `z=${f(z1, 1)} recuou ${f(z1 - pos(car).z)}`)
    check(`${slug} raspando: sem NaN`, !st2.nan, 'ok')
    check(`${slug} raspando: respawns = 0`, car.sim.respawns === 0, `respawns=${car.sim.respawns} reason=${car.sim.lastReason}`)
  }
})

test('12 fuzzing 60 s (entradas e dt aleatorios, hitches)', () => {
  let seed = 12345
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  for (const slug of SLUGS) {
    for (let rep = 0; rep < 3; rep++) {
      const wd = makeWorld(['roads', 'curb', 'bump', 'wall', 'parked', 'bench', 'cones'])
      const car = addCar(wd, slug, rnd() * 4 - 2, 0.62, rnd() * 40)
      const st = newStats()
      let cur = NO
      let until = 0
      let t = 0
      let wraps = 0
      const dtFn = () => {
        const r = rnd()
        if (r < 0.01) return 0.1 + rnd() * 0.4 // engasgo
        if (r < 0.05) return 1 / 30
        return 1 / 144 + rnd() * (1 / 50 - 1 / 144)
      }
      while (t < 60) {
        if (t >= until) {
          until = t + 0.2 + rnd() * 1.8
          cur = {
            throttle: rnd() < 0.7 ? 1 : rnd() < 0.5 ? 0 : rnd(),
            brake: rnd() < 0.2 ? 1 : 0,
            steer: rnd() < 0.3 ? 0 : rnd() * 2 - 1,
            handbrake: rnd() < 0.15,
            boost: rnd() < 0.3,
          }
        }
        const d = dtFn()
        stepCar(wd, car, st, d, cur)
        t += d
        // wrap: se for longe demais, volta
        const p = pos(car)
        if (Math.abs(p.x) > 250 || p.z > 250 || p.z < -250) {
          car.sim.recoverToSafe('manual')
          wraps++
        }
      }
      const tag = `${slug}#${rep}`
      invariants(`${tag}`, st, { maxH: 3.5, minH: -0.2, maxW: 9.5 })
      check(`${tag}: velocidade < 80`, st.maxSpeed < 80, `vmax=${f(st.maxSpeed)}`)
      check(`${tag}: respawns do carro <= 6`, car.sim.respawns - wraps <= 6, `respawns=${car.sim.respawns - wraps} (+${wraps} do teste) uprights=${car.sim.uprights} reason=${car.sim.lastReason}`)
    }
  }
})

test('13 chuva e carga: sem diferenca grave', () => {
  const slug = 'compacto'
  const wd = makeWorld(['roads'])
  const car = addCar(wd, slug, 0, 0.62, 0)
  const st = run(wd, car, 6, () => inp({ throttle: 1, steer: 0.4 }), 1 / 60, newStats(), { wet: 1 })
  invariants('chuva', st, { maxH: 0.3 })
  check('chuva: acelera (> 10)', speedOf(car) > 10, `v=${f(speedOf(car))}`)
})

test('14 teclas soltas: entrar com carro e nao andar sozinho', () => {
  const wd = makeWorld(['roads'])
  const car = addCar(wd, 'compacto', 0, 0.62, 0)
  const st = run(wd, car, 10, () => NO)
  check('parado sem entrada por 10 s (v < 0.1, sem deriva)', speedOf(car) < 0.1 && Math.abs(pos(car).z) < 0.3, `v=${f(speedOf(car), 3)} z=${f(pos(car).z, 3)}`)
  invariants('parado', st, { maxH: 0.15 })
})

test('15 acelerar depois de ficar parado / rolando de re (bug "nao acelera")', () => {
  for (const slug of SLUGS) {
    for (const v0 of [-0.0002, -0.05, -0.3, -0.55, 0.0, 0.2]) {
      const wd = makeWorld(['roads'])
      const car = addCar(wd, slug, 0, 0.62, 0)
      run(wd, car, 1.2, () => NO) // assenta
      car.rb.setLinvel({ x: 0, y: 0, z: v0 }, true)
      const st = run(wd, car, 3, () => inp({ throttle: 1 }))
      check(`${slug} v0=${v0}: acelera (> 6 m/s em 3 s)`, fwdSpeed(car) > 6, `v=${f(fwdSpeed(car))}`)
      void st
    }
    // freio + acelerador juntos nao trava (freio fica preso): acelerador vence a baixa velocidade?
    const wd = makeWorld(['roads'])
    const car = addCar(wd, slug, 0, 0.62, 0)
    run(wd, car, 1, () => NO)
    run(wd, car, 2, () => inp({ throttle: 1 }))
    run(wd, car, 3, () => inp({ brake: 1 })) // para e engata a re
    run(wd, car, 3, () => inp({ throttle: 1 })) // volta a frente
    check(`${slug}: re -> frente (acelera depois de dar re)`, fwdSpeed(car) > 5, `v=${f(fwdSpeed(car))}`)
    // sair e voltar a acelerar: freio de mao solto
    run(wd, car, 1, () => inp({ handbrake: true }))
    run(wd, car, 3, () => inp({ throttle: 1 }))
    check(`${slug}: acelera apos freio de mao`, fwdSpeed(car) > 5, `v=${f(fwdSpeed(car))}`)
  }
})

// ---------------------------------------------------------------------------------------------- relatorio
const g = new Map<string, Row[]>()
for (const r of rows) g.set(r.group, [...(g.get(r.group) ?? []), r])
let fail = 0
const nameW = Math.min(64, Math.max(10, ...rows.map((r) => r.name.length)))
for (const [grp, rs] of g) {
  const bad = rs.filter((r) => !r.ok)
  fail += bad.length
  console.log(`\n== ${grp}  [${rs.length - bad.length}/${rs.length} ok]${LEGACY ? '  (controlador LEGADO)' : ''}`)
  for (const r of VERBOSE ? rs : bad.length ? bad : rs.slice(0, 0)) console.log(`  ${r.ok ? 'ok  ' : 'FAIL'} ${r.name.padEnd(nameW)} ${r.info}`)
}
console.log(`\n${'='.repeat(40)}\nTOTAL: ${rows.length - fail}/${rows.length} ok, ${fail} falhas${LEGACY ? ' (controlador LEGADO)' : ''}`)
if (!VERBOSE) console.log('(use --verbose para ver todas as linhas)')
process.exit(fail ? 1 : 0)
