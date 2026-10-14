import { useMemo } from 'react'
import { BackSide, Color, ShaderMaterial } from 'three'

const vertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragment = /* glsl */ `
  uniform vec3 uHorizon;
  uniform vec3 uMid;
  uniform vec3 uTop;
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y, 0.0, 1.0);
    vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.25, h));
    col = mix(col, uTop, smoothstep(0.2, 0.9, h));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

/** Ceu em gradiente: rosa suave no horizonte, lilas no meio, azul claro no topo. */
export function Sky() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uHorizon: { value: new Color('#ffc9dd') },
          uMid: { value: new Color('#d9bdf2') },
          uTop: { value: new Color('#a9d0f5') },
        },
        vertexShader: vertex,
        fragmentShader: fragment,
      }),
    [],
  )

  return (
    <mesh material={material} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[300, 32, 16]} />
    </mesh>
  )
}
