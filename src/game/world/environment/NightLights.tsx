import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, Color, InstancedBufferAttribute, Matrix4, PlaneGeometry, ShaderMaterial, type Group, type InstancedMesh, type PointLight } from 'three'
import { usePlayerStore } from '../../../state/playerStore'
import { getQuality, QUALITY_SETTINGS } from '../../systems/quality'
import { env } from './envState'
import { lampSpots } from './lamps'

/**
 * Luzes dos postes a noite:
 *  - halos (billboards aditivos) nos globos e "pocas de luz" (quads aditivos no chao): baratos, instanciados, em TODOS os postes;
 *  - PointLights reais so nos N postes mais proximos do jogador (N por nivel de qualidade), com troca suave.
 */

const POOL_VERT = /* glsl */ `
  attribute vec3 aColor;
  uniform float uI;
  uniform float uFadeA;
  uniform float uFadeB;
  varying vec2 vP;
  varying vec3 vC;
  varying float vF;
  void main() {
    vP = position.xy * 2.0;
    vC = aColor;
    vec4 wp = modelMatrix * instanceMatrix * vec4(position.x * 2.0, 0.0, -position.y * 2.0, 1.0);
    vF = uI * (1.0 - smoothstep(uFadeA, uFadeB, distance(wp.xyz, cameraPosition)));
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`
const POOL_FRAG = /* glsl */ `
  varying vec2 vP;
  varying vec3 vC;
  varying float vF;
  void main() {
    float l = length(vP);
    float a = pow(max(1.0 - l, 0.0), 1.8) * vF * 0.55;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vC * a, a);
  }
`
const HALO_VERT = /* glsl */ `
  attribute vec3 aColor;
  uniform float uI;
  uniform float uSize;
  uniform float uFadeA;
  uniform float uFadeB;
  varying vec2 vP;
  varying vec3 vC;
  varying float vF;
  void main() {
    vP = position.xy * 2.0;
    vC = aColor;
    vec4 c = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vec4 mv = viewMatrix * c;
    vF = uI * (1.0 - smoothstep(uFadeA, uFadeB, -mv.z));
    mv.xy += position.xy * uSize;
    gl_Position = projectionMatrix * mv;
  }
`
const HALO_FRAG = /* glsl */ `
  varying vec2 vP;
  varying vec3 vC;
  varying float vF;
  void main() {
    float l = length(vP);
    float a = (pow(max(1.0 - l, 0.0), 3.0) * 0.9 + pow(max(1.0 - l, 0.0), 1.4) * 0.25) * vF;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vC * a, a);
  }
`

const LIGHT_I = 38
const LIGHT_DIST = 17

export function NightLights() {
  const tier = useMemo(() => QUALITY_SETTINGS[getQuality()], [])
  const spots = useMemo(() => lampSpots(), [])
  const N = Math.min(tier.lampLights, spots.length)
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)

  const poolRef = useRef<InstancedMesh>(null)
  const haloRef = useRef<InstancedMesh>(null)
  const lightsRef = useRef<Group>(null)
  const lights = useRef<(PointLight | null)[]>([])

  const mats = useMemo(() => {
    const fadeA = tier.propDist * 0.6
    const fadeB = tier.propDist * 1.05
    const base = { transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false } as const
    const pool = new ShaderMaterial({
      ...base,
      vertexShader: POOL_VERT,
      fragmentShader: POOL_FRAG,
      polygonOffset: true,
      polygonOffsetFactor: -14,
      polygonOffsetUnits: -14,
      uniforms: { uI: { value: 0 }, uFadeA: { value: fadeA }, uFadeB: { value: fadeB } },
    })
    const halo = new ShaderMaterial({
      ...base,
      vertexShader: HALO_VERT,
      fragmentShader: HALO_FRAG,
      uniforms: { uI: { value: 0 }, uSize: { value: 2.6 }, uFadeA: { value: fadeA * 1.1 }, uFadeB: { value: fadeB * 1.15 } },
    })
    return { pool, halo }
  }, [tier.propDist])
  const geo = useMemo(() => {
    const g = new PlaneGeometry(1, 1)
    g.setAttribute('aColor', new InstancedBufferAttribute(new Float32Array(Math.max(1, spots.length) * 3), 3))
    return g
  }, [spots])

  useLayoutEffect(() => {
    const m = new Matrix4()
    const c = new Color()
    spots.forEach((s, i) => {
      c.set(s.color)
      m.makeScale(s.y2k ? 6.2 : 5.4, 1, s.y2k ? 6.2 : 5.4).setPosition(s.x, 0.075, s.z)
      poolRef.current?.setMatrixAt(i, m)
      geo.getAttribute('aColor').setXYZ(i, c.r, c.g, c.b)
      m.makeTranslation(s.x, s.y, s.z)
      haloRef.current?.setMatrixAt(i, m)
    })
    for (const r of [poolRef.current, haloRef.current]) {
      if (!r) continue
      r.instanceMatrix.needsUpdate = true
    }
    geo.getAttribute('aColor').needsUpdate = true
  }, [spots, geo])

  // estado das luzes reais
  const st = useMemo(
    () => ({
      cur: new Int32Array(N).fill(-1),
      pend: new Int32Array(N).fill(-1),
      keep: new Uint8Array(N),
      k: new Float32Array(N),
      best: new Int32Array(N),
      bd: new Float32Array(N),
      acc: 1,
    }),
    [N],
  )

  // pre-compila os shaders COM as luzes (evita o engasgo na primeira vez que anoitece)
  useEffect(() => {
    if (!N) return
    const id = window.setTimeout(() => {
      const g = lightsRef.current
      if (!g || env.lights > 0.02) return
      try {
        g.visible = true
        gl.compile(scene, camera)
      } catch {
        /* sem pre-compilacao */
      }
      g.visible = env.lights > 0.02
    }, 7000)
    return () => window.clearTimeout(id)
  }, [N, gl, scene, camera])

  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 0.1)
    const L = env.lights
    const on = L > 0.01
    if (poolRef.current) poolRef.current.visible = on
    if (haloRef.current) haloRef.current.visible = on
    mats.pool.uniforms.uI.value = L * (1 + env.wet * 0.5)
    mats.halo.uniforms.uI.value = L * (0.85 + env.wet * 0.45)
    const g = lightsRef.current
    if (!g || !N) return
    g.visible = L > 0.02
    if (!g.visible) return

    st.acc += dt
    if (st.acc > 0.25) {
      st.acc = 0
      const p = usePlayerStore.getState().position
      let nb = 0
      for (let i = 0; i < spots.length; i++) {
        const dx = spots[i].x - p.x
        const dz = spots[i].z - p.z
        const d = dx * dx + dz * dz
        if (d > 30 * 30) continue
        let j: number
        if (nb < N) j = nb++
        else if (d < st.bd[N - 1]) j = N - 1
        else continue
        while (j > 0 && st.bd[j - 1] > d) {
          st.bd[j] = st.bd[j - 1]
          st.best[j] = st.best[j - 1]
          j--
        }
        st.bd[j] = d
        st.best[j] = i
      }
      for (let j = 0; j < N; j++) {
        st.keep[j] = 0
        st.pend[j] = -1
        for (let b = 0; b < nb; b++) if (st.best[b] === st.cur[j]) st.keep[j] = 1
      }
      for (let b = 0; b < nb; b++) {
        const idx = st.best[b]
        let held = false
        for (let j = 0; j < N; j++) if (st.keep[j] && st.cur[j] === idx) held = true
        if (held) continue
        let pick = -1
        for (let j = 0; j < N; j++) if (!st.keep[j] && st.pend[j] < 0 && (pick < 0 || st.k[j] < st.k[pick])) pick = j
        if (pick >= 0) st.pend[pick] = idx
      }
    }
    for (let j = 0; j < N; j++) {
      const l = lights.current[j]
      if (!l) continue
      if (!st.keep[j] && st.pend[j] >= 0 && st.k[j] < 0.03) {
        const s = spots[st.pend[j]]
        st.cur[j] = st.pend[j]
        st.pend[j] = -1
        st.keep[j] = 1
        l.position.set(s.x, s.y - 0.3, s.z)
        l.color.set(s.color)
      }
      const target = st.keep[j] && st.cur[j] >= 0 ? 1 : 0
      const diff = target - st.k[j]
      st.k[j] += Math.sign(diff) * Math.min(Math.abs(diff), dt * 3.5)
      l.intensity = LIGHT_I * st.k[j] * L * (1 + env.wet * 0.3)
    }
  })

  return (
    <>
      <instancedMesh ref={poolRef} args={[geo, mats.pool, spots.length]} frustumCulled={false} renderOrder={7} />
      <instancedMesh ref={haloRef} args={[geo, mats.halo, spots.length]} frustumCulled={false} renderOrder={25} />
      {N > 0 && (
        <group ref={lightsRef} visible={false}>
          {Array.from({ length: N }, (_, i) => (
            <pointLight
              key={i}
              ref={(l) => {
                lights.current[i] = l
              }}
              intensity={0}
              distance={LIGHT_DIST}
              decay={2}
              color="#ffd9a0"
              position={[0, -50, 0]}
            />
          ))}
        </group>
      )}
    </>
  )
}
