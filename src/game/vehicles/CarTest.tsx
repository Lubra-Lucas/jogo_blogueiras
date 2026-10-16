import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { colliderCount, hasLineOfSight, hasWorld, isFree } from '../navigation/probe'
import { drive, useVehicleStore } from './driveStore'
import { enterCar } from './enterExit'
import { touch } from './vehicleInput'
import { carTestHook } from './sim/testHook'
import { TUNE } from './sim/vehiclePhysics'

/**
 * Teste em jogo (`?cartest=1`): um carro entra sozinho e anda por uma rota nas avenidas
 * Centro -> Moda -> Neon -> Centro -> Jardim, medindo altura do chao, tempo parado, reposicoes, picos.
 * Parametros: `&car=esportivo` (padrao compacto), `&hitch=1` (trava a thread 250 ms a cada ~7 s, como um engasgo real),
 * `&laps=1`. Relatorio: console (`[CARTEST]`), `window.__cartest` e um painel na tela.
 */
const Q = new URLSearchParams(window.location.search)
export const CARTEST = Q.has('cartest')

type Wp = { name: string; x: number; z: number; ev?: 'nitro' | 'drift' | 'brake'; tp?: boolean }

/** Rota (m). Segue as pistas; entre o Centro e o Jardim cruza a grama (o lago fica no meio). */
const ROUTE: Wp[] = [
  { name: 'Centro', x: -1.5, z: -50 },
  { name: 'Moda', x: -1.5, z: -100, ev: 'nitro' },
  { name: 'Moda', x: -1.5, z: -146, ev: 'drift' },
  { name: 'Moda', x: 30, z: -150, tp: true },
  { name: 'Moda', x: 34, z: -100 },
  { name: 'Moda', x: 34, z: -80 },
  { name: 'Neon', x: 40, z: -1.5, tp: true },
  { name: 'Neon', x: 100, z: -1.5, ev: 'nitro' },
  { name: 'Neon', x: 145, z: -1.5, ev: 'drift' },
  { name: 'Neon', x: 120, z: 3 },
  { name: 'Neon', x: 60, z: 3, ev: 'brake' },
  { name: 'Jardim', x: -50, z: 70, tp: true },
  { name: 'Jardim', x: -46, z: 128 },
  { name: 'Jardim', x: -36, z: 158, ev: 'drift' },
  { name: 'Jardim', x: 0, z: 154 },
  { name: 'Jardim', x: 36, z: 150 },
]

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

interface Leg {
  name: string
  t: number
  dist: number
  vmax: number
  stuck: number
  minH: number
  maxH: number
  respawns: number
  reached: boolean
}

export function CarTest() {
  const st = useRef({
    phase: 'wait' as 'wait' | 'run' | 'done',
    t0: 0,
    wp: 0,
    clock: 0,
    startedAt: 0,
    legStart: 0,
    legDist: 0,
    last: { x: 0, z: 0 },
    stuckWp: 0,
    stuckTot: 0,
    airTot: 0,
    airRun: 0,
    airMax: 0,
    minH: 1e9,
    maxH: -1e9,
    maxV: 0,
    dist: 0,
    dtMax: 0,
    hitches: 0,
    hitchAt: 0,
    evUntil: 0,
    evKind: '' as string,
    backUntil: 0,
    legs: [] as Leg[],
    legMin: 1e9,
    legMax: -1e9,
    legVmax: 0,
    legStuck: 0,
    legRespawns0: 0,
    events: [] as string[],
    skipped: [] as string[],
    ui: null as HTMLDivElement | null,
    uiAt: 0,
    avoidD: 0,
    avoidUntil: 0,
    respawns0: 0,
    uprights0: 0,
    slug: Q.get('car') || 'compacto',
    hitchOn: Q.get('hitch') === '1',
    laps: Number(Q.get('laps')) || 1,
    lap: 0,
    spawnFix: false,
  }).current

  useEffect(() => {
    const el = document.createElement('div')
    el.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99999;background:rgba(10,10,20,.82);color:#bff;font:12px/1.35 monospace;padding:8px 10px;border-radius:8px;max-width:440px;white-space:pre;pointer-events:none'
    el.textContent = '[cartest] aguardando o mundo...'
    document.body.appendChild(el)
    st.ui = el
    return () => {
      el.remove()
      touch.throttle = touch.brake = touch.steer = 0
      touch.handbrake = touch.boost = false
    }
  }, [st])

  useFrame((_, rawDt) => {
    const now = performance.now() / 1000
    st.clock += rawDt
    if (st.phase === 'wait') {
      if (!hasWorld() || colliderCount() < 300 || st.clock < 4) return
      // coloca o carro de teste numa pista livre e entra
      const sx = -1.5
      const sz = -40
      const free = isFree(sx, sz, 1.2)
      const uid = 'cartest1'
      const inst = { uid, slug: st.slug, body: '#e9dfc8', rim: '#d9dde6', x: sx, z: sz, yaw: Math.PI, kind: 'street' as const }
      useVehicleStore.setState({ cars: [...useVehicleStore.getState().cars.filter((c) => c.uid !== uid), inst] })
      st.events.push(`spawn livre=${free}`)
      window.setTimeout(() => {
        enterCar(uid)
        // engasgo logo ao entrar (compilacao de shaders): 400 ms parados
        const t = performance.now()
        while (performance.now() - t < 400) {
          /* trava a thread */
        }
      }, 300)
      st.phase = 'run'
      st.startedAt = now
      st.last = { x: sx, z: sz }
      st.clock = 0
      st.legStart = now
      return
    }
    if (st.phase !== 'run') return
    const sim = carTestHook.current
    if (!sim || !useVehicleStore.getState().drivingUid) return
    if (!st.spawnFix) {
      st.spawnFix = true
      st.respawns0 = sim.respawns
      st.uprights0 = sim.uprights
      st.legRespawns0 = sim.respawns + sim.uprights
    }
    const dt = rawDt
    st.dtMax = Math.max(st.dtMax, dt)
    if (dt > 0.1) st.hitches++

    // ---- medidas ----
    const px = drive.pos.x
    const pz = drive.pos.z
    const h = drive.pos.y - TUNE.COM_Y
    const v = Math.abs(drive.speed)
    st.minH = Math.min(st.minH, h)
    st.maxH = Math.max(st.maxH, h)
    st.legMin = Math.min(st.legMin, h)
    st.legMax = Math.max(st.legMax, h)
    st.maxV = Math.max(st.maxV, v)
    st.legVmax = Math.max(st.legVmax, v)
    const step = Math.hypot(px - st.last.x, pz - st.last.z)
    if (step < 20) {
      st.dist += step
      st.legDist += step
    }
    st.last = { x: px, z: pz }
    if (sim.grounded === 0) {
      st.airRun += dt
      st.airTot += dt
      st.airMax = Math.max(st.airMax, st.airRun)
    } else st.airRun = 0
    if (h > 1.2 && st.events.length < 25) st.events.push(`ALTO h=${h.toFixed(2)} em (${px.toFixed(0)},${pz.toFixed(0)}) t=${st.clock.toFixed(1)}`)
    if (h < -0.12 && st.events.length < 25) st.events.push(`AFUNDADO h=${h.toFixed(2)} em (${px.toFixed(0)},${pz.toFixed(0)}) t=${st.clock.toFixed(1)}`)

    // ---- engasgo artificial ----
    if (st.hitchOn && st.clock - st.hitchAt > 7 && v > 8) {
      st.hitchAt = st.clock
      const t = performance.now()
      while (performance.now() - t < 250) {
        /* trava a thread */
      }
    }

    // ---- piloto automatico ----
    const wp = ROUTE[st.wp]
    const dx = wp.x - px
    const dz = wp.z - pz
    const dist = Math.hypot(dx, dz)
    const want = Math.atan2(dx, dz)
    const err = wrap(want - drive.yaw)
    const nxt = ROUTE[(st.wp + 1) % ROUTE.length]
    const turn = Math.abs(wrap(Math.atan2(nxt.x - wp.x, nxt.z - wp.z) - want))
    const vmax = st.slug === 'esportivo' ? 24 : st.slug === 'van' ? 16 : 19
    let vt = vmax * (1 - Math.min(0.75, Math.abs(err) / 1.1))
    if (dist < 34) vt = Math.min(vt, Math.max(6, 18 - turn * 9 - (34 - dist) * 0.25))
    // "olhos": escolhe o rumo livre mais proximo do desejado (o teste mede a fisica, nao a pontaria)
    let steer = Math.max(-1, Math.min(1, err * 2.4))
    const look = 4.5 + v * 0.35
    const sn = Math.sin(drive.yaw)
    const cs = Math.cos(drive.yaw)
    const lineFree = (hd: number) => {
      const ax = px + sn * 1.6
      const az = pz + cs * 1.6
      return hasLineOfSight(ax, az, ax + Math.sin(hd) * look, az + Math.cos(hd) * look, 0.95)
    }
    let anyFree = true
    let bestD = 0
    if (st.avoidUntil > st.clock) {
      bestD = st.avoidD
    } else if (!lineFree(drive.yaw + Math.max(-0.3, Math.min(0.3, err)))) {
      anyFree = false
      let bestScore = 1e9
      for (const d of [0.3, -0.3, 0.6, -0.6, 0.9, -0.9]) {
        if (!lineFree(drive.yaw + d)) continue
        anyFree = true
        const sc = Math.abs(wrap(drive.yaw + d - want))
        if (sc < bestScore) {
          bestScore = sc
          bestD = d
        }
      }
      st.avoidD = bestD
      st.avoidUntil = st.clock + 0.5
    }
    if (anyFree && bestD !== 0) steer = Math.max(-1, Math.min(1, bestD * 3))
    if (!anyFree) vt = Math.min(vt, 4)
    else if (bestD !== 0) vt = Math.min(vt, 14)
    let throttle = Math.max(0, Math.min(1, (vt - drive.speed) * 0.45))
    let brake = drive.speed - vt > 4 && drive.speed > 3 ? 1 : 0
    let handbrake = false
    let boost = false
    // eventos
    if (st.evUntil > st.clock) {
      if (st.evKind === 'nitro') boost = true
      if (st.evKind === 'drift') {
        handbrake = true
        throttle = 1
      }
      if (st.evKind === 'brake') {
        throttle = 0
        brake = 1
      }
    }
    // preso: re por 1,2 s com contra-esterco
    if (v < 0.5 && throttle > 0.4 && st.clock > 6) {
      st.legStuck += dt
      st.stuckTot += dt
      st.stuckWp += dt
    } else if (v > 1.5) st.stuckWp = 0
    if (st.stuckWp > 2.5 && st.backUntil < st.clock) {
      st.backUntil = st.clock + 1.2
      st.stuckWp = 0.5
    }
    if (st.backUntil > st.clock) {
      throttle = 0
      brake = 1
      steer = -steer
    }
    // preso demais no mesmo waypoint: registra e pula
    if (st.legStuck > 12 || now - st.legStart > 40) {
      st.skipped.push(`${wp.name}#${st.wp} (${wp.x},${wp.z}) ${st.legStuck > 12 ? 'preso' : 'tempo'} perto de (${px.toFixed(0)},${pz.toFixed(0)})`)
      st.legStuck = 0
      advance(true)
    }
    touch.throttle = throttle
    touch.brake = brake
    touch.steer = steer
    touch.handbrake = handbrake
    touch.boost = boost

    if (dist < 14) advance(false)

    function advance(skipped: boolean) {
      st.legs.push({
        name: `${st.wp}:${wp.name}`,
        t: now - st.legStart,
        dist: st.legDist,
        vmax: st.legVmax,
        stuck: st.legStuck,
        minH: st.legMin,
        maxH: st.legMax,
        respawns: sim!.respawns + sim!.uprights - st.legRespawns0,
        reached: !skipped,
      })
      st.legStart = now
      st.legDist = 0
      st.legMin = 1e9
      st.legMax = -1e9
      st.legVmax = 0
      st.legStuck = 0
      st.legRespawns0 = sim!.respawns + sim!.uprights
      st.stuckWp = 0
      const next = (st.wp + 1) % ROUTE.length
      const ev = ROUTE[next].ev
      if (ev) {
        st.evKind = ev
        st.evUntil = st.clock + (ev === 'nitro' ? 2.2 : ev === 'drift' ? 0.5 : 1.0)
      }
      st.wp = next
      if (ROUTE[next].tp) {
        // trecho novo (as ligacoes entre bairros nao sao dirigiveis em linha reta): coloca o carro no inicio do trecho
        const after = ROUTE[(next + 1) % ROUTE.length]
        sim!.teleport(ROUTE[next].x, ROUTE[next].z, Math.atan2(after.x - ROUTE[next].x, after.z - ROUTE[next].z))
        st.wp = (next + 1) % ROUTE.length
      }
      if (next === 0) {
        st.lap++
        if (st.lap >= st.laps) finish()
      }
    }

    function finish() {
      st.phase = 'done'
      touch.throttle = touch.brake = touch.steer = 0
      touch.handbrake = touch.boost = false
      const rep = report()
      ;(window as unknown as Record<string, unknown>).__cartest = rep
      console.log('[CARTEST] REPORT ' + JSON.stringify(rep))
    }

    function report() {
      const s = sim!
      return {
        car: st.slug,
        hitchTest: st.hitchOn,
        seconds: Number((now - st.startedAt).toFixed(1)),
        distanceM: Math.round(st.dist),
        waypoints: ROUTE.length,
        maxSpeedKmh: Math.round(st.maxV * 3.6),
        minHeight: Number(st.minH.toFixed(3)),
        maxHeight: Number(st.maxH.toFixed(3)),
        stuckSeconds: Number(st.stuckTot.toFixed(1)),
        airSeconds: Number(st.airTot.toFixed(1)),
        longestAirSeconds: Number(st.airMax.toFixed(2)),
        respawns: s.respawns - st.respawns0,
        uprights: s.uprights - st.uprights0,
        lastReason: s.lastReason,
        hitchFrames: st.hitches,
        maxFrameMs: Math.round(st.dtMax * 1000),
        skipped: st.skipped,
        events: st.events,
        legs: st.legs.map((l) => ({ ...l, t: Number(l.t.toFixed(1)), dist: Math.round(l.dist), vmax: Number((l.vmax * 3.6).toFixed(0)), stuck: Number(l.stuck.toFixed(1)), minH: Number(l.minH.toFixed(2)), maxH: Number(l.maxH.toFixed(2)) })),
      }
    }

    // ---- painel ----
    if (st.ui && now - st.uiAt > 0.25) {
      st.uiAt = now
      st.ui.textContent =
        `[cartest] ${st.slug}  wp ${st.wp}/${ROUTE.length} ${wp.name}  lap ${st.lap + 1}/${st.laps}\n` +
        `v ${(v * 3.6).toFixed(0)} km/h  h ${h.toFixed(2)}  grounded ${sim.grounded}  dist ${st.dist.toFixed(0)} m\n` +
        `minH ${st.minH.toFixed(2)}  maxH ${st.maxH.toFixed(2)}  parado ${st.stuckTot.toFixed(1)}s  reposicoes ${sim.respawns - st.respawns0}/${sim.uprights - st.uprights0}\n` +
        `engasgos ${st.hitches} (max ${(st.dtMax * 1000).toFixed(0)} ms)` +
        (st.events.length ? `\n${st.events.slice(-3).join('\n')}` : '')
    }
  })

  // painel final
  useEffect(() => {
    const id = window.setInterval(() => {
      if (st.phase !== 'done' || !st.ui) return
      const rep = (window as unknown as Record<string, unknown>).__cartest as Record<string, unknown> | undefined
      if (!rep) return
      const ok = Number(rep.minHeight) > -0.12 && Number(rep.maxHeight) < 2.5 && Number(rep.stuckSeconds) < 15 && Number(rep.respawns) === 0 && (rep.skipped as unknown[]).length === 0
      st.ui.style.color = ok ? '#9f9' : '#fa9'
      st.ui.textContent =
        `[cartest] FIM ${ok ? 'OK' : 'ATENCAO'}  ${rep.car}  ${rep.seconds}s  ${rep.distanceM} m  vmax ${rep.maxSpeedKmh} km/h\n` +
        `altura min/max ${rep.minHeight}/${rep.maxHeight}  parado ${rep.stuckSeconds}s  ar ${rep.airSeconds}s (max ${rep.longestAirSeconds}s)\n` +
        `reposicoes ${rep.respawns}  desvirou ${rep.uprights}  engasgos ${rep.hitchFrames}  puladas ${(rep.skipped as unknown[]).length}\n` +
        ((rep.events as string[]).slice(0, 4).join('\n') || 'sem eventos')
      window.clearInterval(id)
    }, 500)
    return () => window.clearInterval(id)
  }, [st])

  return null
}
