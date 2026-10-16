import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, DynamicDrawUsage, InstancedBufferAttribute, InstancedBufferGeometry, PlaneGeometry, ShaderMaterial, type Mesh } from 'three'
import { env } from '../environment/envState'
import { pool, stepPool } from './fx'

const VERT = /* glsl */ `
attribute vec3 iPos;
attribute vec4 iData; // size, alpha, kind, rot
attribute vec3 iCol;
varying vec2 vUv;
varying vec3 vCol;
varying float vA;
varying float vK;
uniform float uFadeFar;
void main() {
  vUv = position.xy * 2.0;
  vCol = iCol;
  vK = iData.z;
  float d = distance(iPos, cameraPosition);
  vA = iData.y * (1.0 - smoothstep(uFadeFar * 0.6, uFadeFar, d));
  float s = iData.x;
  float c = cos(iData.w), sn = sin(iData.w);
  vec2 q = vec2(position.x * c - position.y * sn, position.x * sn + position.y * c);
  if (iData.z > 1.5 && iData.z < 2.5) {
    // anel: deitado no plano XZ
    vec4 wp = vec4(iPos + vec3(position.x * s * 2.0, 0.0, -position.y * s * 2.0), 1.0);
    gl_Position = projectionMatrix * viewMatrix * wp;
  } else {
    vec4 mv = viewMatrix * vec4(iPos, 1.0);
    vec2 sq = q;
    if (iData.z > 2.5 && iData.z < 3.5) sq.y *= 0.45 + 0.55 * abs(sin(iData.w * 1.7)); // folha: vira de lado
    mv.xy += sq * s * 2.0;
    gl_Position = projectionMatrix * mv;
  }
}
`
const FRAG = /* glsl */ `
varying vec2 vUv;
varying vec3 vCol;
varying float vA;
varying float vK;
uniform vec3 uTint;
void main() {
  float l = length(vUv);
  float a;
  vec3 col = vCol * uTint;
  if (vK < 0.5) {            // fumaca / poeira
    a = pow(max(1.0 - l, 0.0), 1.5) * 0.9;
  } else if (vK < 1.5) {     // gota
    a = 1.0 - smoothstep(0.55, 0.95, l);
    col = mix(col, vec3(1.0), (1.0 - smoothstep(0.0, 0.5, length(vUv - vec2(-0.3, 0.3)))) * 0.7);
  } else if (vK < 2.5) {     // anel
    float w = 0.16;
    a = (1.0 - smoothstep(0.0, w, abs(l - 0.82))) * 0.95;
  } else if (vK < 3.5) {     // folha: elipse pontuda
    vec2 q = vec2(vUv.x * 0.62, vUv.y * 1.1);
    a = 1.0 - smoothstep(0.55, 0.75, length(q) + abs(q.y) * 0.25);
    col *= 0.85 + 0.25 * vUv.y;
  } else {                   // bolha de neblina
    a = pow(max(1.0 - l, 0.0), 2.0) * 0.55;
  }
  a *= vA;
  if (a < 0.01) discard;
  gl_FragColor = vec4(col, a);
}
`

/** Desenha o pool de particulas (fx.ts) em uma malha instanciada; roda o passo de simulacao. */
export function FxLayer() {
  const mesh = useRef<Mesh>(null)
  const { geo, mat } = useMemo(() => {
    const base = new PlaneGeometry(1, 1)
    const g = new InstancedBufferGeometry()
    g.index = base.index
    g.setAttribute('position', base.getAttribute('position'))
    g.setAttribute('uv', base.getAttribute('uv'))
    const pos = new InstancedBufferAttribute(new Float32Array(pool.n * 3), 3)
    const data = new InstancedBufferAttribute(new Float32Array(pool.n * 4), 4)
    const col = new InstancedBufferAttribute(new Float32Array(pool.n * 3), 3)
    pos.setUsage(DynamicDrawUsage)
    data.setUsage(DynamicDrawUsage)
    col.setUsage(DynamicDrawUsage)
    g.setAttribute('iPos', pos)
    g.setAttribute('iData', data)
    g.setAttribute('iCol', col)
    g.instanceCount = 0
    const m = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      uniforms: { uTint: { value: new Color(1, 1, 1) }, uFadeFar: { value: 60 } },
    })
    return { geo: g, mat: m }
  }, [])
  const tint = useMemo(() => new Color(), [])

  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 0.05)
    stepPool(dt)
    const p = pool
    const pa = geo.getAttribute('iPos') as InstancedBufferAttribute
    const da = geo.getAttribute('iData') as InstancedBufferAttribute
    const ca = geo.getAttribute('iCol') as InstancedBufferAttribute
    let n = 0
    for (let i = 0; i < p.n; i++) {
      if (!p.alive[i]) continue
      const u = p.age[i] / p.life[i]
      const o3 = n * 3
      const o4 = n * 4
      pa.array[o3] = p.x[i]
      pa.array[o3 + 1] = p.y[i]
      pa.array[o3 + 2] = p.z[i]
      const s = p.s0[i] + (p.s1[i] - p.s0[i]) * u
      const fade = Math.min(1, u * 8) * (1 - u * u)
      da.array[o4] = s
      da.array[o4 + 1] = p.a[i] * fade
      da.array[o4 + 2] = p.kind[i]
      da.array[o4 + 3] = p.rot[i]
      ca.array[o3] = p.r[i]
      ca.array[o3 + 1] = p.g[i]
      ca.array[o3 + 2] = p.b[i]
      n++
    }
    geo.instanceCount = n
    pa.needsUpdate = da.needsUpdate = ca.needsUpdate = true
    // particulas ficam mais escuras a noite e acinzentadas com tempo fechado
    tint.setRGB(1 - 0.62 * env.night, 1 - 0.58 * env.night, 1 - 0.3 * env.night).multiplyScalar(1 - 0.12 * env.gloom)
    ;(mat.uniforms.uTint.value as Color).copy(tint)
    if (mesh.current) mesh.current.visible = n > 0
  })

  return <mesh ref={mesh} geometry={geo} material={mat} frustumCulled={false} renderOrder={12} />
}
