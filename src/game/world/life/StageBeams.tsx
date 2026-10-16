import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, CylinderGeometry, DoubleSide, Mesh, ShaderMaterial, Vector3 } from 'three'
import { env } from '../environment/envState'
import { LIFE } from './lifeQuality'
import { life } from './lifeState'

/**
 * Palco Neon: feixes de luz (cones aditivos) que varrem o ceu e a praca a noite, em magenta, ciano, violeta e branco.
 * Ficam na fachada do palco (x ~ 178), apontando para o oeste/cima; so existem quando e noite/luzes ligadas e perto.
 */

const STAGE = { x: 178.5, y: 12.6, z: 0, plazaX: 150 }
const COLORS = ['#ff3fb4', '#35e8ff', '#a64bff', '#ffffff', '#35e8ff', '#ff3fb4']

const VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying float vT;
void main() {
  vT = position.y + 0.5;  // 0 = ponta (luz), 1 = fim do feixe
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`
const FRAG = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying float vT;
uniform vec3 uCol;
uniform float uI;
void main() {
  float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
  float along = pow(1.0 - vT, 1.3) * smoothstep(0.0, 0.05, vT);
  float a = edge * along * uI;
  gl_FragColor = vec4(uCol * a, a);
}
`

export function StageBeams() {
  const n = LIFE.beams
  const refs = useRef<(Mesh | null)[]>([])
  const mats = useMemo(
    () =>
      Array.from({ length: n }, (_, i) =>
        new ShaderMaterial({
          vertexShader: VERT,
          fragmentShader: FRAG,
          transparent: true,
          depthWrite: false,
          blending: AdditiveBlending,
          side: DoubleSide,
          fog: false,
          uniforms: { uCol: { value: new Color(COLORS[i % COLORS.length]) }, uI: { value: 0 } },
        }),
      ),
    [n],
  )
  // cone aberto: ponta em y=-0.5 (luz), base larga em y=+0.5; escalado para o comprimento do feixe
  const geo = useMemo(() => new CylinderGeometry(1, 0.03, 1, 20, 1, true), [])

  useFrame(() => {
    const near = Math.hypot(life.cam.x - 160, life.cam.z) < 130
    const I = env.lights * (1 - 0.35 * env.rain) * 0.5
    const t = life.t
    for (let i = 0; i < n; i++) {
      const m = refs.current[i]
      if (!m) continue
      m.visible = near && I > 0.02
      if (!m.visible) continue
      const f = i / Math.max(1, n - 1)
      const sx = STAGE.x
      const sz = (f - 0.5) * 24
      const sweep = Math.sin(t * (0.35 + 0.07 * i) + i * 1.9) * 0.75
      const el = 0.55 + 0.35 * Math.sin(t * (0.23 + 0.05 * i) + i * 2.3) // elevacao (rad)
      // direcao: oeste (-x) com varredura em z e elevacao
      const dx = -Math.cos(el) * Math.cos(sweep)
      const dy = Math.sin(el)
      const dz = Math.cos(el) * Math.sin(sweep)
      const len = 55
      m.position.set(sx + dx * len * 0.5, STAGE.y + dy * len * 0.5, sz + dz * len * 0.5)
      m.scale.set(2.4 + (i % 3) * 0.6, len, 2.4 + (i % 3) * 0.6)
      // alinha +Y do cone com a direcao da luz (base larga na ponta oposta a fonte)
      m.quaternion.setFromUnitVectors(UP, DIR.set(dx, dy, dz))
      mats[i].uniforms.uI.value = I * (0.8 + 0.2 * Math.sin(t * 2.1 + i * 3))
    }
  })

  return (
    <group>
      {mats.map((m, i) => (
        <mesh key={i} ref={(r) => (refs.current[i] = r)} geometry={geo} material={m} frustumCulled={false} visible={false} renderOrder={8} />
      ))}
    </group>
  )
}

const UP = new Vector3(0, 1, 0)
const DIR = new Vector3()
