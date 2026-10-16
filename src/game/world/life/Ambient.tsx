import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferGeometry,
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
  ShaderMaterial,
  SphereGeometry,
  type Group,
} from 'three'
import { CITY } from '../city/layout'
import { BEDS } from '../city/romantic'
import { env } from '../environment/envState'
import { mergeGeo, paintGeo, xform } from './geoUtil'
import { LIFE } from './lifeQuality'
import { life, wind } from './lifeState'

/**
 * Vida ambiente: bandos de passaros no ceu (dia), borboletas no Jardim/Parque (dia), vaga-lumes no Parque (noite),
 * um dirigivel e um aviao distantes. Tudo barato: matrizes instanciadas atualizadas na CPU (dezenas de instancias) ou
 * pontos animados no vertex shader.
 */

// ------------------------------------------------------------------ passaros em voo

/** passaro: corpo pequeno + duas asas em triangulo; o bater de asa acontece no vertex shader (aSide = -1/+1 por asa) */
function flyerGeometry(): BufferGeometry {
  const g = new BufferGeometry()
  // x = lateral, y = cima, z = frente
  const pos = [
    0, 0, 0.5, -0.1, 0, -0.35, 0.1, 0, -0.35, // corpo
    0, 0, 0.12, -1.0, 0, -0.18, 0, 0, -0.32, // asa esquerda
    0, 0, 0.12, 0, 0, -0.32, 1.0, 0, -0.18, // asa direita
  ]
  const side = [0, 0, 0, -1, -1, 0, 0, 0, 1]
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('aSide', new Float32BufferAttribute(side, 1))
  return g
}

const FLY_VERT = /* glsl */ `
attribute float aSide;
uniform float uT;
uniform float uFlap;
varying float vF;
void main() {
  vec3 p = position;
  float id = float(gl_InstanceID);
  float ph = uT * uFlap + id * 1.7;
  p.y += abs(p.x) * sin(ph) * 0.55;
  p.z += abs(p.x) * 0.08 * cos(ph);
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(p, 1.0);
  vF = clamp(-mv.z / 300.0, 0.0, 1.0);
  gl_Position = projectionMatrix * mv;
}
`
const FLY_FRAG = /* glsl */ `
uniform vec3 uCol;
uniform vec3 uFog;
varying float vF;
void main() { gl_FragColor = vec4(mix(uCol, uFog, vF * 0.8), 1.0); }
`

interface Flock {
  cx: number
  cz: number
  dir: number
  speed: number
  alt: number
  n: number
  off: number
}

function Flocks() {
  const nFl = LIFE.flocks
  const per = 7
  const total = nFl * per
  const ref = useRef<InstancedMesh>(null)
  const geo = useMemo(flyerGeometry, [])
  const mat = useMemo(
    () => new ShaderMaterial({ vertexShader: FLY_VERT, fragmentShader: FLY_FRAG, side: DoubleSide, uniforms: { uT: { value: 0 }, uFlap: { value: 11 }, uCol: { value: new Color('#2a2e36') }, uFog: { value: new Color('#c3d6e6') } } }),
    [],
  )
  const flocks = useMemo<Flock[]>(() => Array.from({ length: nFl }, (_, i) => ({ cx: (i - 1) * 90, cz: i * 50 - 60, dir: 0.4 + i * 2.1, speed: 7 + i * 1.5, alt: 38 + i * 9, n: per, off: i * 99 })), [nFl])
  const o = useMemo(() => new Object3D(), [])
  useFrame(() => {
    const m = ref.current
    if (!m) return
    const show = env.day > 0.15 && env.rain < 0.4
    m.visible = show
    if (!show) return
    const t = life.t
    mat.uniforms.uT.value = t
    mat.uniforms.uFog.value.copy(env.fogColor)
    mat.uniforms.uCol.value.setRGB(0.16 * env.day + 0.05, 0.18 * env.day + 0.06, 0.21 * env.day + 0.08)
    let k = 0
    for (const f of flocks) {
      // percorre uma linha longa com retorno suave (-230..230) em torno do centro, bem acima da cidade
      const L = 460
      const u = (((t * f.speed + f.off) % (L * 2)) + L * 2) % (L * 2)
      const s = u < L ? u : L * 2 - u
      const fwd = u < L ? 1 : -1
      const ax = Math.cos(f.dir)
      const az = Math.sin(f.dir)
      const bx = f.cx + ax * (s - L / 2)
      const bz = f.cz + az * (s - L / 2) + Math.sin(t * 0.07 + f.off) * 18
      const heading = Math.atan2(ax * fwd, az * fwd)
      for (let i = 0; i < f.n; i++) {
        // formacao em V desfeita com um pouco de ruido
        const row = Math.ceil(i / 2)
        const sd = i % 2 ? 1 : -1
        const lx = sd * row * 2.4 + Math.sin(t * 0.6 + i * 2) * 0.6
        const lz = -row * 2.2 + Math.cos(t * 0.5 + i) * 0.5
        const c = Math.cos(heading)
        const sn = Math.sin(heading)
        o.position.set(bx + lx * c + lz * sn, f.alt + Math.sin(t * 0.8 + i * 1.3) * 0.8 + wind.strength * 0.5, bz - lx * sn + lz * c)
        o.rotation.set(0, heading, Math.sin(t * 0.7 + i) * 0.12)
        o.scale.setScalar(0.5)
        o.updateMatrix()
        m.setMatrixAt(k++, o.matrix)
      }
    }
    m.instanceMatrix.needsUpdate = true
  })
  if (!nFl) return null
  return <instancedMesh ref={ref} args={[geo, mat, total]} frustumCulled={false} />
}

// ------------------------------------------------------------------ borboletas

const BF_VERT = /* glsl */ `
attribute float aSide;
uniform float uT;
varying vec3 vC;
void main() {
  vec3 p = position;
  float id = float(gl_InstanceID);
  float ph = uT * (16.0 + mod(id, 5.0)) + id * 2.3;
  p.y += abs(p.x) * sin(ph) * 1.1;
  vC = instanceColor;
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
}
`
const BF_FRAG = /* glsl */ `
varying vec3 vC;
uniform float uLight;
void main() { gl_FragColor = vec4(vC * uLight, 1.0); }
`

function butterflyGeometry(): BufferGeometry {
  const g = new BufferGeometry()
  const pos = [
    // asa esquerda (2 triangulos) e direita
    0, 0, 0.04, -0.34, 0, 0.2, -0.3, 0, -0.18,
    0, 0, -0.02, -0.3, 0, -0.18, -0.12, 0, -0.3,
    0, 0, 0.04, 0.3, 0, -0.18, 0.34, 0, 0.2,
    0, 0, -0.02, 0.12, 0, -0.3, 0.3, 0, -0.18,
  ]
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('aSide', new Float32BufferAttribute(new Array(12).fill(0), 1))
  return g
}

const BF_COLORS = ['#f2a33a', '#f5d84b', '#ffffff', '#6fb4e8', '#f08a3c', '#e9e2d0', '#d96b8a']

function Butterflies() {
  const n = LIFE.butterflies
  const ref = useRef<InstancedMesh>(null)
  const geo = useMemo(butterflyGeometry, [])
  const mat = useMemo(() => new ShaderMaterial({ vertexShader: BF_VERT, fragmentShader: BF_FRAG, side: DoubleSide, uniforms: { uT: { value: 0 }, uLight: { value: 1 } } }), [])
  const anchors = useMemo(() => {
    const out: { x: number; z: number; r: number }[] = []
    for (const b of BEDS) out.push({ x: b.x, z: b.z, r: 5 })
    out.push({ x: 0, z: 158, r: 12 }, { x: -24, z: 170, r: 8 }, { x: 24, z: 172, r: 8 }, { x: -30, z: 145, r: 7 }, { x: 30, z: 146, r: 7 })
    return out
  }, [])
  const st = useMemo(
    () => Array.from({ length: n }, (_, i) => ({ a: anchors[(i * 5) % anchors.length], ph: Math.random() * 100, sp: 0.35 + Math.random() * 0.4, h: 0.5 + Math.random() * 1.1, yaw: 0, px: 0, pz: 0 })),
    [n, anchors],
  )
  const o = useMemo(() => new Object3D(), [])
  useLayoutColors(ref, n)
  useFrame(() => {
    const m = ref.current
    if (!m) return
    const show = env.day > 0.35 && env.rain < 0.2
    m.visible = show
    if (!show) return
    const t = life.t
    mat.uniforms.uT.value = t
    mat.uniforms.uLight.value = 0.55 + 0.45 * env.day
    for (let i = 0; i < n; i++) {
      const s = st[i]
      const tt = t * s.sp + s.ph
      const x = s.a.x + (Math.sin(tt * 1.3) * 0.7 + Math.sin(tt * 0.53 + 1) * 0.5) * s.a.r + wind.dx * wind.strength * 0.8
      const z = s.a.z + (Math.cos(tt * 1.1) * 0.7 + Math.cos(tt * 0.41) * 0.5) * s.a.r + wind.dz * wind.strength * 0.8
      const y = s.h + Math.sin(tt * 3.1) * 0.3 + Math.sin(tt * 7.0) * 0.08
      const vx = x - s.px
      const vz = z - s.pz
      if (vx * vx + vz * vz > 1e-7) s.yaw = Math.atan2(vx, vz)
      s.px = x
      s.pz = z
      o.position.set(x, y, z)
      o.rotation.set(0.25, s.yaw, 0)
      o.scale.setScalar(0.42)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  if (!n) return null
  return <instancedMesh ref={ref} args={[geo, mat, n]} frustumCulled={false} />
}

function useLayoutColors(ref: React.RefObject<InstancedMesh | null>, n: number) {
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const c = new Color()
    for (let i = 0; i < n; i++) m.setColorAt(i, c.set(BF_COLORS[i % BF_COLORS.length]))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [ref, n])
}

// ------------------------------------------------------------------ vaga-lumes

const FF_VERT = /* glsl */ `
attribute vec4 aSeed;
uniform float uT;
uniform float uI;
uniform float uPx;
varying float vA;
void main() {
  vec3 p = position;
  float t = uT * (0.25 + aSeed.w * 0.3) + aSeed.x * 40.0;
  p.x += sin(t * 1.3 + aSeed.y * 9.0) * 1.2 + sin(t * 0.37) * 1.8;
  p.z += cos(t * 1.1 + aSeed.z * 9.0) * 1.2 + cos(t * 0.41) * 1.8;
  p.y += sin(t * 1.9 + aSeed.x * 7.0) * 0.35;
  float blink = pow(max(0.0, sin(uT * (0.8 + aSeed.y * 0.9) + aSeed.z * 30.0)), 5.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float d = -mv.z;
  vA = blink * uI * (1.0 - smoothstep(35.0, 60.0, d));
  gl_PointSize = clamp(uPx * 0.26 / max(d, 0.5), 1.0, 22.0);
  gl_Position = projectionMatrix * mv;
}
`
const FF_FRAG = /* glsl */ `
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = pow(max(1.0 - d, 0.0), 2.0) * vA;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vec3(0.85, 1.0, 0.45) * a, a);
}
`

function Fireflies() {
  const n = LIFE.fireflies
  const { geo, mat } = useMemo(() => {
    const pos = new Float32Array(n * 3)
    const seed = new Float32Array(n * 4)
    const L = CITY.lake
    for (let i = 0; i < n; i++) {
      // em volta do lago e nos gramados do parque
      const a = Math.random() * Math.PI * 2
      const r = L.r + 2 + Math.random() * 20
      pos[i * 3] = L.cx + Math.cos(a) * r
      pos[i * 3 + 1] = 0.5 + Math.random() * 1.8
      pos[i * 3 + 2] = L.cz + Math.sin(a) * r
      for (let k = 0; k < 4; k++) seed[i * 4 + k] = Math.random()
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new Float32BufferAttribute(seed, 4))
    const m = new ShaderMaterial({
      vertexShader: FF_VERT,
      fragmentShader: FF_FRAG,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      fog: false,
      uniforms: { uT: { value: 0 }, uI: { value: 0 }, uPx: { value: 900 } },
    })
    return { geo: g, mat: m }
  }, [n])
  useFrame(({ size }) => {
    const near = Math.hypot(life.cam.x - CITY.lake.cx, life.cam.z - CITY.lake.cz) < 90
    mat.uniforms.uI.value = near ? Math.max(0, env.night - 0.35) * 1.6 * (1 - env.rain) : 0
    mat.uniforms.uT.value = life.t
    mat.uniforms.uPx.value = size.height * 2.4
  })
  if (!n) return null
  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={9} />
}

// ------------------------------------------------------------------ dirigivel e aviao

function SkyCraft() {
  const blimp = useRef<Group>(null)
  const plane = useRef<Group>(null)
  const light = useRef<Object3D>(null)
  const mats = useMemo(
    () => ({
      hull: new MeshStandardMaterial({ color: '#eef0f2', roughness: 0.5, metalness: 0.05 }),
      band: new MeshStandardMaterial({ color: '#2f5f9e', roughness: 0.5 }),
      plane: new MeshStandardMaterial({ color: '#f4f5f7', roughness: 0.4, metalness: 0.2 }),
    }),
    [],
  )
  const geos = useMemo(() => {
    const hull = new SphereGeometry(1, 20, 12)
    const gondola = new CapsuleGeometry(0.1, 0.5, 4, 8).rotateZ(Math.PI / 2)
    const fin = new CylinderGeometry(0.01, 0.4, 0.7, 4)
    const body = mergeGeo([
      paintGeo(xform(new CapsuleGeometry(0.35, 3.2, 6, 10), [0, 0, 0], [0, 0, Math.PI / 2]), '#f4f5f7'),
      paintGeo(xform(new SphereGeometry(1, 8, 4), [0.2, 0, 0], [0, 0, 0], [0.45, 0.04, 2.6]), '#d6dade'),
      paintGeo(xform(new SphereGeometry(1, 8, 4), [-1.5, 0.3, 0], [0, 0, 0], [0.4, 0.04, 0.9]), '#d6dade'),
      paintGeo(xform(new CylinderGeometry(0.02, 0.45, 0.7, 4), [-1.7, 0.35, 0], [0, 0, 0.1]), '#2f5f9e'),
    ])
    return { hull, gondola, fin, body }
  }, [])
  const pm = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.4 }), [])
  const m4 = useMemo(() => new Matrix4(), [])
  void m4
  useFrame(() => {
    const t = life.t
    const b = blimp.current
    if (b) {
      b.visible = env.day > 0.1 && env.rain < 0.5
      const a = t * 0.012 + 1
      b.position.set(Math.cos(a) * 150, 85 + Math.sin(t * 0.1) * 2, Math.sin(a) * 150)
      b.rotation.y = -a
      b.rotation.z = Math.sin(t * 0.15) * 0.03
    }
    const p = plane.current
    if (p) {
      // cruza o ceu a cada ~2 min
      const T = 130
      const u = (t % T) / T
      p.visible = u < 0.5 && env.rain < 0.7
      const x = -330 + u * 2 * 660
      p.position.set(x, 150, -140 + Math.sin(t * 0.02) * 20)
      p.rotation.y = 0.03
      if (light.current) light.current.visible = env.night > 0.4 && Math.sin(t * 6) > 0.6
    }
  })
  return (
    <>
      <group ref={blimp}>
        <mesh geometry={geos.hull} material={mats.hull} scale={[16, 5.2, 5.2]} />
        <mesh geometry={geos.hull} material={mats.band} scale={[16.05, 1.2, 5.25]} position={[0, 0.4, 0]} />
        <mesh geometry={geos.gondola} material={mats.band} scale={[5, 5, 5]} position={[0, -5.4, 0]} />
        <mesh geometry={geos.fin} material={mats.band} position={[-15, 2, 0]} scale={[3, 3, 3]} rotation={[0, 0, 0.6]} />
        <mesh geometry={geos.fin} material={mats.band} position={[-15, -2, 0]} scale={[3, 3, 3]} rotation={[0, 0, Math.PI - 0.6]} />
      </group>
      <group ref={plane}>
        <mesh geometry={geos.body} material={pm} scale={[3.2, 3.2, 3.2]} />
        <object3D ref={light} visible={false} />
      </group>
    </>
  )
}

export function Ambient() {
  return (
    <>
      <Flocks />
      <Butterflies />
      <Fireflies />
      <SkyCraft />
    </>
  )
}
