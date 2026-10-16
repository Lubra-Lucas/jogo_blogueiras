import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, DynamicDrawUsage, InstancedMesh, Matrix4, MeshBasicMaterial, PlaneGeometry, Quaternion, SpriteMaterial, Vector3, Euler, type Group, type Sprite } from 'three'

/** Marcas de pneu (instanciadas, somem aos poucos) e fumaca de derrapagem. */
const MAX_SEG = 260
const LIFE = 28 // s
const MIN_STEP = 0.35

interface Seg {
  x: number
  z: number
  len: number
  yaw: number
  born: number
  alive: boolean
}
const segs: Seg[] = Array.from({ length: MAX_SEG }, () => ({ x: 0, z: 0, len: 0, yaw: 0, born: 0, alive: false }))
let head = 0
let dirty = true
const last: Array<{ x: number; z: number } | null> = [null, null]
let clockNow = 0

interface Puff {
  x: number
  y: number
  z: number
  vx: number
  vz: number
  t: number
  life: number
  size: number
}
const MAX_PUFF = 26
const puffs: Puff[] = Array.from({ length: MAX_PUFF }, () => ({ x: 0, y: 0, z: 0, vx: 0, vz: 0, t: 99, life: 1, size: 1 }))
let puffHead = 0
let puffAcc = 0

export const skid = {
  mark(side: number, x: number, z: number) {
    const p = last[side]
    if (!p) {
      last[side] = { x, z }
      return
    }
    const dx = x - p.x
    const dz = z - p.z
    const d = Math.hypot(dx, dz)
    if (d > 4) {
      last[side] = { x, z }
      return
    }
    if (d < MIN_STEP) return
    const s = segs[head]
    head = (head + 1) % MAX_SEG
    s.x = (x + p.x) / 2
    s.z = (z + p.z) / 2
    s.len = d + 0.06
    s.yaw = Math.atan2(dx, dz)
    s.born = clockNow
    s.alive = true
    dirty = true
    p.x = x
    p.z = z
  },
  endMark(side: number) {
    last[side] = null
  },
  smoke(x: number, z: number, speed: number, dt: number) {
    puffAcc += dt * (10 + Math.min(speed, 20))
    while (puffAcc >= 1) {
      puffAcc -= 1
      const p = puffs[puffHead]
      puffHead = (puffHead + 1) % MAX_PUFF
      p.x = x + (Math.random() - 0.5) * 1.4
      p.z = z + (Math.random() - 0.5) * 1.4
      p.y = 0.2
      p.vx = (Math.random() - 0.5) * 1.2
      p.vz = (Math.random() - 0.5) * 1.2
      p.t = 0
      p.life = 0.7 + Math.random() * 0.6
      p.size = 0.7 + Math.random() * 0.5
    }
  },
  clear() {
    for (const s of segs) s.alive = false
    last[0] = last[1] = null
    for (const p of puffs) p.t = 99
    dirty = true
  },
}

function puffTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30)
  gr.addColorStop(0, 'rgba(255,255,255,0.9)')
  gr.addColorStop(0.55, 'rgba(255,255,255,0.35)')
  gr.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gr
  g.fillRect(0, 0, 64, 64)
  return new CanvasTexture(c)
}

const _m = new Matrix4()
const _q = new Quaternion()
const _e = new Euler()
const _pos = new Vector3()
const _sc = new Vector3()

export function VehicleEffects() {
  const mesh = useRef<InstancedMesh>(null)
  const group = useRef<Group>(null)
  const geo = useMemo(() => {
    const g = new PlaneGeometry(1, 1)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])
  const mat = useMemo(() => {
    const m = new MeshBasicMaterial({ color: '#15151b', transparent: true, opacity: 0.5, depthWrite: false })
    m.polygonOffset = true
    m.polygonOffsetFactor = -3
    m.polygonOffsetUnits = -3
    return m
  }, [])
  const tex = useMemo(puffTexture, [])
  const sprites = useMemo(() => {
    const out: SpriteMaterial[] = []
    for (let i = 0; i < MAX_PUFF; i++) out.push(new SpriteMaterial({ map: tex, color: '#ece8e2', transparent: true, depthWrite: false, opacity: 0 }))
    return out
  }, [tex])
  useEffect(
    () => () => {
      geo.dispose()
      mat.dispose()
      tex.dispose()
      sprites.forEach((m) => m.dispose())
    },
    [geo, mat, tex, sprites],
  )
  useEffect(() => {
    const m = mesh.current
    if (m) {
      m.instanceMatrix.setUsage(DynamicDrawUsage)
      m.count = MAX_SEG
      _m.makeScale(0, 0, 0)
      for (let i = 0; i < MAX_SEG; i++) m.setMatrixAt(i, _m)
      m.instanceMatrix.needsUpdate = true
    }
  }, [])

  let acc = 0
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    clockNow += dt
    acc += dt
    const m = mesh.current
    if (m && (dirty || acc > 0.25)) {
      acc = 0
      dirty = false
      for (let i = 0; i < MAX_SEG; i++) {
        const s = segs[i]
        if (!s.alive) continue
        const age = clockNow - s.born
        if (age > LIFE) {
          s.alive = false
          _m.makeScale(0, 0, 0)
          m.setMatrixAt(i, _m)
          continue
        }
        const w = 0.2 * Math.min(1, (LIFE - age) / 8)
        _q.setFromEuler(_e.set(0, s.yaw, 0))
        _pos.set(s.x, 0.075, s.z)
        _sc.set(w, 1, s.len)
        _m.compose(_pos, _q, _sc)
        m.setMatrixAt(i, _m)
      }
      m.instanceMatrix.needsUpdate = true
    }
    const grp = group.current
    if (grp) {
      for (let i = 0; i < MAX_PUFF; i++) {
        const p = puffs[i]
        const sp = grp.children[i] as Sprite
        if (p.t >= p.life) {
          if (sp.visible) sp.visible = false
          continue
        }
        p.t += dt
        p.x += p.vx * dt
        p.z += p.vz * dt
        p.y += 0.7 * dt
        const u = Math.min(1, p.t / p.life)
        sp.visible = true
        sp.position.set(p.x, p.y, p.z)
        const s = p.size * (1 + u * 2.4)
        sp.scale.set(s, s, s)
        sprites[i].opacity = 0.42 * (1 - u) * Math.min(1, p.t * 6)
      }
    }
  })

  return (
    <>
      <instancedMesh ref={mesh} args={[geo, mat, MAX_SEG]} frustumCulled={false} renderOrder={2} />
      <group ref={group}>
        {sprites.map((m, i) => (
          <sprite key={i} material={m} visible={false} renderOrder={3} />
        ))}
      </group>
    </>
  )
}
