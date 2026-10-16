import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, ShaderMaterial, Vector2, Vector3 } from 'three'
import { env } from '../environment/envState'
import { LIFE } from './lifeQuality'
import { life } from './lifeState'

/**
 * Raios de sol (god rays) baratos: um triangulo de tela cheia, aditivo e sem escrita de profundidade, com estrias radiais
 * a partir da posicao do sol na tela. Aparece na hora dourada (nascer e por do sol) e, bem fraquinho, de dia limpo.
 * Nao sabe de oclusao (e um brilho atmosferico), por isso e mantido sutil.
 */

const VERT = /* glsl */ `
varying vec2 vP;
void main() {
  vP = position.xy;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`
const FRAG = /* glsl */ `
varying vec2 vP;
uniform vec2 uSun;
uniform float uAspect;
uniform float uI;
uniform float uT;
uniform vec3 uCol;
float h(float n){ return fract(sin(n * 127.1) * 43758.5453); }
float n1(float x){ float i = floor(x); float f = fract(x); f = f*f*(3.0-2.0*f); return mix(h(i), h(i+1.0), f); }
void main() {
  vec2 d = vP - uSun;
  d.x *= uAspect;
  float r = length(d);
  float ang = atan(d.y, d.x);
  float s = n1(ang * 9.0 + uT * 0.05) * 0.55 + n1(ang * 23.0 - uT * 0.03) * 0.3 + n1(ang * 51.0) * 0.15;
  s = smoothstep(0.35, 0.95, s);
  float fall = exp(-r * 1.9);
  float glow = exp(-r * 5.0) * 0.5;
  float a = (s * fall * 0.75 + glow) * uI;
  gl_FragColor = vec4(uCol * a, a);
}
`

export function SunShafts() {
  const geo = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3))
    return g
  }, [])
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: AdditiveBlending,
        fog: false,
        toneMapped: false,
        uniforms: { uSun: { value: new Vector2() }, uAspect: { value: 1 }, uI: { value: 0 }, uT: { value: 0 }, uCol: { value: new Color('#ffcf9a') } },
      }),
    [],
  )
  const v = useMemo(() => new Vector3(), [])

  useFrame(({ camera, size }) => {
    const sunUp = env.sunDir.y
    // forca: hora dourada (sunGlow) com sol acima/perto do horizonte; fraco de dia limpo
    let I = env.sunGlow * (1 - env.gloom) * (sunUp > -0.05 ? 1 : 0) * (sunUp < 0.55 ? 1 : 0.25)
    I *= 0.5
    v.copy(camera.position).addScaledVector(env.sunDir, 1000).project(camera)
    const infront = v.z < 1 && Math.abs(v.x) < 2.2 && Math.abs(v.y) < 2.2
    mat.uniforms.uI.value = infront ? I * (1 - 0.3 * env.rain) : 0
    mat.uniforms.uSun.value.set(v.x, v.y)
    mat.uniforms.uAspect.value = size.width / size.height
    mat.uniforms.uT.value = life.t
    mat.uniforms.uCol.value.copy(env.lightColor).lerp(WARM, 0.35)
  })

  if (!LIFE.shafts) return null
  return <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={20} />
}

const WARM = new Color('#ffb870')
