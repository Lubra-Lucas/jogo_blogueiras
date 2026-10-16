import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, InstancedBufferAttribute, InstancedBufferGeometry, PlaneGeometry, ShaderMaterial, Vector2, Vector3, type Mesh } from 'three'
import { getQuality, QUALITY_SETTINGS } from '../../systems/quality'
import { env } from './envState'

/**
 * Chuva estilizada: estrias finas (quads instanciados, billboard em torno do eixo da queda) e aneis de respingo no chao,
 * ambos animados 100% na GPU a partir de uma semente por gota (zero custo de CPU por quadro alem dos uniformes).
 * As gotas "dao a volta" numa caixa centrada na camera, entao so existem ao redor dela.
 */

const BOX = [38, 22, 38] as const
const WHITE = new Color('#ffffff')

const RAIN_VERT = /* glsl */ `
  attribute vec4 aSeed;
  uniform float uTime;
  uniform float uRain;
  uniform vec3 uBox;
  uniform float uSpeed;
  uniform float uLen;
  uniform float uWidth;
  uniform vec2 uSlant;
  varying float vA;
  varying float vU;
  void main() {
    vec3 fall = normalize(vec3(uSlant.x, -1.0, uSlant.y));
    vec3 p = aSeed.xyz * uBox + fall * uSpeed * uTime * (0.85 + 0.3 * fract(aSeed.w * 7.0));
    vec3 rel = mod(p - cameraPosition + uBox * 0.5, uBox) - uBox * 0.5;
    vec3 world = cameraPosition + rel;
    if (world.y < 0.0) world.y = 1e4;
    vec3 v = normalize(world - cameraPosition);
    vec3 right = normalize(cross(fall, v));
    float along = position.y + 0.5;
    vec3 wp = world + right * position.x * uWidth * (0.45 + 0.55 * along) - fall * (position.y) * uLen;
    float vis = step(aSeed.w, uRain);
    float dist = length(rel);
    vA = vis * smoothstep(1.2, 4.0, dist) * (1.0 - smoothstep(14.0, 19.0, dist)) * (0.35 + 0.65 * along) * (0.6 + 0.4 * fract(aSeed.w * 13.0));
    vU = position.x * 2.0;
    gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  }
`
const RAIN_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vA;
  varying float vU;
  void main() {
    float a = vA * uOpacity * (1.0 - smoothstep(0.4, 1.0, abs(vU)));
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a);
  }
`

const SPLASH_VERT = /* glsl */ `
  attribute vec4 aSeed;
  uniform float uTime;
  uniform float uRain;
  uniform vec3 uBox;
  varying float vPh;
  varying vec2 vP;
  varying float vVis;
  void main() {
    vec2 c = aSeed.xy * uBox.xz;
    vec2 rel = mod(c - cameraPosition.xz + uBox.xz * 0.5, uBox.xz) - uBox.xz * 0.5;
    vec2 w = cameraPosition.xz + rel;
    float rate = 1.1 + aSeed.z * 0.9;
    vPh = fract(uTime * rate + aSeed.w * 7.31);
    float r = 0.08 + vPh * 0.5;
    vP = position.xy * 2.0;
    vVis = step(fract(aSeed.w * 3.7), uRain * 0.9 + 0.05) * (1.0 - smoothstep(10.0, 18.0, length(rel)));
    vec3 wp = vec3(w.x + position.x * 2.0 * r, 0.085, w.y - position.y * 2.0 * r);
    gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  }
`
const SPLASH_FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying float vPh;
  varying vec2 vP;
  varying float vVis;
  void main() {
    float l = length(vP);
    float ring = smoothstep(0.62, 0.8, l) * (1.0 - smoothstep(0.86, 1.0, l));
    float a = ring * (1.0 - vPh) * (1.0 - vPh) * vVis * 0.75;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a);
  }
`

function seeds(n: number, w = 4): Float32Array {
  const a = new Float32Array(n * w)
  for (let i = 0; i < a.length; i++) a[i] = Math.random()
  return a
}

function instanced(count: number, rotateFlat: boolean): InstancedBufferGeometry {
  const base = new PlaneGeometry(1, 1)
  const g = new InstancedBufferGeometry()
  g.index = base.index
  g.setAttribute('position', base.getAttribute('position'))
  g.setAttribute('aSeed', new InstancedBufferAttribute(seeds(count), 4))
  g.instanceCount = count
  void rotateFlat
  return g
}

export function Rain() {
  const q = useMemo(() => QUALITY_SETTINGS[getQuality()], [])
  const rainMesh = useRef<Mesh>(null)
  const splashMesh = useRef<Mesh>(null)
  const time = useRef(0)

  const rain = useMemo(() => {
    const geometry = instanced(q.rainDrops, false)
    const material = new ShaderMaterial({
      vertexShader: RAIN_VERT,
      fragmentShader: RAIN_FRAG,
      transparent: true,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTime: { value: 0 },
        uRain: { value: 0 },
        uBox: { value: new Vector3(BOX[0], BOX[1], BOX[2]) },
        uSpeed: { value: 24 },
        uLen: { value: 1.25 },
        uWidth: { value: 0.035 },
        uSlant: { value: new Vector2(0.12, 0.05) },
        uColor: { value: new Color('#eef2ff') },
        uOpacity: { value: 0.55 },
      },
    })
    return { geometry, material }
  }, [q.rainDrops])

  const splash = useMemo(() => {
    if (!q.rainSplashes) return null
    const geometry = instanced(q.rainSplashes, true)
    const material = new ShaderMaterial({
      vertexShader: SPLASH_VERT,
      fragmentShader: SPLASH_FRAG,
      transparent: true,
      depthWrite: false,
      fog: false,
      polygonOffset: true,
      polygonOffsetFactor: -12,
      polygonOffsetUnits: -12,
      uniforms: {
        uTime: { value: 0 },
        uRain: { value: 0 },
        uBox: { value: new Vector3(36, 1, 36) },
        uColor: { value: new Color('#ffffff') },
      },
    })
    return { geometry, material }
  }, [q.rainSplashes])

  useFrame((_, dt) => {
    const on = env.rain > 0.01
    if (rainMesh.current) rainMesh.current.visible = on
    if (splashMesh.current) splashMesh.current.visible = on
    if (!on) return
    time.current += Math.min(dt, 0.1)
    const u = rain.material.uniforms
    u.uTime.value = time.current
    u.uRain.value = env.rain
    u.uColor.value.copy(env.skyHor).lerp(WHITE, 0.62)
    u.uOpacity.value = 0.5 + 0.2 * env.night
    if (splash) {
      const s = splash.material.uniforms
      s.uTime.value = time.current
      s.uRain.value = env.rain
      s.uColor.value.copy(env.skyHor).lerp(WHITE, 0.75)
    }
  })

  return (
    <>
      <mesh ref={rainMesh} geometry={rain.geometry} material={rain.material} frustumCulled={false} renderOrder={30} visible={false} />
      {splash && <mesh ref={splashMesh} geometry={splash.geometry} material={splash.material} frustumCulled={false} renderOrder={8} visible={false} />}
    </>
  )
}

