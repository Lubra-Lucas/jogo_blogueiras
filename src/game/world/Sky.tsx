import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BackSide, Color, ShaderMaterial, Vector2, Vector3, type Mesh } from 'three'
import { getQuality, QUALITY_SETTINGS } from '../systems/quality'
import { env } from './environment/envState'
import { EnvironmentDriver } from './environment/EnvironmentDriver'
import { Rain } from './environment/Rain'

const vertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragment = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uHor;
  uniform vec3 uSunDir;
  uniform vec3 uSunTint;
  uniform float uSunDisc;
  uniform vec3 uMoonDir;
  uniform vec3 uMoonX;
  uniform vec3 uMoonY;
  uniform float uMoon;
  uniform float uStars;
  uniform float uCover;
  uniform float uTime;
  uniform vec2 uWind;
  uniform vec2 uLightUv;
  uniform vec3 uCloudLit;
  uniform vec3 uCloudShade;
  uniform float uRainbow;
  uniform vec2 uRbDir;
  varying vec3 vDir;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float hash31(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.x + p.y) * p.z);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float a = 0.5;
    float s = 0.0;
    for (int i = 0; i < OCT; i++) {
      s += a * vnoise(p);
      p = p * 2.03 + vec2(17.1, 9.2);
      a *= 0.5;
    }
    return s / (1.0 - pow(0.5, float(OCT)));
  }

  void main() {
    vec3 d = normalize(vDir);
    float h = max(d.y, 0.0);
    vec3 col = mix(uHor, uMid, smoothstep(0.0, 0.28, h));
    col = mix(col, uTop, smoothstep(0.22, 0.95, h));

    // brilho e disco do sol
    float sd = max(dot(d, uSunDir), 0.0);
    col += uSunTint * (pow(sd, 5.0) * 0.32 + pow(sd, 40.0) * 0.55);
    col = mix(col, vec3(1.0, 0.97, 0.88), smoothstep(0.9992, 0.9997, sd) * uSunDisc * step(0.0, uSunDir.y + 0.04));

    // estrelas que piscam
    if (uStars > 0.01 && d.y > 0.0) {
      vec3 sp = d * 80.0;
      vec3 c = floor(sp);
      vec3 f = fract(sp) - 0.5;
      float r = hash31(c);
      vec3 off = (vec3(hash31(c + 1.7), hash31(c + 3.1), hash31(c + 5.3)) - 0.5) * 0.6;
      float on = step(0.935, r);
      float tw = 0.55 + 0.45 * sin(uTime * (1.4 + r * 4.0) + r * 60.0);
      float st = on * smoothstep(0.2, 0.0, length(f - off)) * tw * (0.45 + 0.9 * hash31(c + 9.0));
      vec3 tint = mix(vec3(1.0, 0.96, 0.92), vec3(0.8, 0.88, 1.0), hash31(c + 11.0));
      col += tint * st * uStars * smoothstep(0.0, 0.2, d.y) * 1.7;
    }

    // lua minguante fofinha
    float md = dot(d, uMoonDir);
    if (md > 0.96 && uMoon > 0.01) {
      vec2 q = vec2(dot(d, uMoonX), dot(d, uMoonY)) / 0.085;
      float disc = 1.0 - smoothstep(0.9, 1.0, length(q));
      float cut = 1.0 - smoothstep(0.9, 1.0, length(q - vec2(0.42, 0.14)));
      float cres = clamp(disc - cut, 0.0, 1.0);
      col += vec3(0.5, 0.56, 1.0) * pow(max(md, 0.0), 90.0) * 0.45 * uMoon;
      col = mix(col, vec3(0.3, 0.34, 0.6), (disc - cres) * 0.28 * uMoon);
      col = mix(col, vec3(1.0, 0.95, 0.8), cres * uMoon);
    }

    // arco-iris (depois da chuva): arco largo e suave, centrado no lado oposto ao sol
    if (uRainbow > 0.01) {
      vec3 rc = normalize(vec3(uRbDir.x, -0.3, uRbDir.y));
      float ang = acos(clamp(dot(d, rc), -1.0, 1.0));
      float rr = (ang - 0.74) / 0.05;
      float t = clamp(rr * 0.5 + 0.5, 0.0, 1.0);
      vec3 hue = clamp(abs(mod((1.0 - t) * 0.78 * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
      hue = mix(hue, vec3(1.0), 0.28);
      float a = (1.0 - smoothstep(0.55, 1.0, abs(rr))) * uRainbow * 0.62 * smoothstep(0.0, 0.1, d.y);
      col = mix(col, col * 0.5 + hue * 0.85, a);
    }

    // nuvens fofas (plano projetado, fbm); a cobertura vem do clima
    if (d.y > 0.004) {
      vec2 uv = d.xz / (d.y + 0.17) * 0.85 + uWind * uTime;
      float n = fbm(uv);
      float th = mix(0.86, -0.12, pow(uCover, 1.15));
      float wd = mix(0.1, 0.34, uCover);
      float dens = smoothstep(th, th + wd, n);
      if (dens > 0.001) {
        #ifdef SHADE
        float n2 = fbm(uv + uLightUv * 0.07);
        float lit = smoothstep(0.1, 0.85, clamp((n - n2) * 8.0 + 0.55, 0.0, 1.0));
        #else
        float lit = smoothstep(0.3, 0.8, n);
        #endif
        vec3 cc = mix(uCloudShade, uCloudLit, lit);
        cc = mix(cc, uCloudShade, smoothstep(0.7, 1.0, dens) * 0.3 * (1.0 - lit));
        cc += uCloudLit * 0.22 * (1.0 - dens) * lit;
        float a = dens * smoothstep(0.0, 0.16, d.y);
        col = mix(col, cc, a * 0.96);
      }
    }

    // dither leve contra faixas no gradiente
    col += (hash21(gl_FragCoord.xy) - 0.5) / 255.0;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

/**
 * Ceu procedural do ciclo dia/noite: gradiente por fase (amanhecer, dia azul, entardecer rosado, noite anil),
 * sol, estrelas, lua, nuvens fofas que dependem do clima e arco-iris. Tudo por uniforme (sem recompilar).
 * Segue a camera. Tambem monta o motor do ambiente (EnvironmentDriver) e a chuva.
 */
export function Sky() {
  const q = useMemo(() => QUALITY_SETTINGS[getQuality()], [])
  const material = useMemo(() => {
    const defines: Record<string, number | string> = { OCT: q.cloudOctaves }
    if (q.cloudOctaves >= 3) defines.SHADE = 1
    return new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      fog: false,
      defines,
      uniforms: {
        uTop: { value: new Color() },
        uMid: { value: new Color() },
        uHor: { value: new Color() },
        uSunDir: { value: new Vector3() },
        uSunTint: { value: new Color() },
        uSunDisc: { value: 0 },
        uMoonDir: { value: new Vector3() },
        uMoonX: { value: new Vector3() },
        uMoonY: { value: new Vector3() },
        uMoon: { value: 0 },
        uStars: { value: 0 },
        uCover: { value: 0.3 },
        uTime: { value: 0 },
        uWind: { value: new Vector2(0.004, 0.0015) },
        uLightUv: { value: new Vector2(1, 0) },
        uCloudLit: { value: new Color() },
        uCloudShade: { value: new Color() },
        uRainbow: { value: 0 },
        uRbDir: { value: new Vector2(1, 0) },
      },
      vertexShader: vertex,
      fragmentShader: fragment,
    })
  }, [q.cloudOctaves])

  const mesh = useRef<Mesh>(null)
  const time = useRef(0)
  useFrame(({ camera }, dt) => {
    mesh.current?.position.copy(camera.position)
    time.current += Math.min(dt, 0.1)
    const u = material.uniforms
    u.uTop.value.copy(env.skyTop)
    u.uMid.value.copy(env.skyMid)
    u.uHor.value.copy(env.skyHor)
    u.uSunDir.value.copy(env.sunDir)
    u.uSunTint.value.copy(env.lightColor).multiplyScalar(env.sunGlow)
    u.uSunDisc.value = env.day * (1 - env.gloom)
    const md = env.moonDir
    u.uMoonDir.value.copy(md)
    // base tangente da lua (X = horizontal, Y = para cima no ceu)
    u.uMoonX.value.set(-md.z, 0, md.x).normalize()
    u.uMoonY.value.crossVectors(md, u.uMoonX.value).normalize()
    u.uMoon.value = env.moonAmt
    u.uStars.value = env.stars
    u.uCover.value = env.cover
    u.uTime.value = time.current
    u.uWind.value.set(0.004 + 0.004 * env.rain, 0.0015)
    const l = env.lightDir
    const ln = Math.hypot(l.x, l.z) || 1
    u.uLightUv.value.set(l.x / ln, l.z / ln)
    u.uCloudLit.value.copy(env.cloudLit)
    u.uCloudShade.value.copy(env.cloudShade)
    u.uRainbow.value = env.rainbow
    const sx = env.sunDir.x
    const sz = env.sunDir.z
    const sn = Math.hypot(sx, sz) || 1
    u.uRbDir.value.set(-sx / sn, -sz / sn)
  })

  return (
    <>
      <EnvironmentDriver />
      <mesh ref={mesh} material={material} renderOrder={-1} frustumCulled={false}>
        <sphereGeometry args={[300, 32, 16]} />
      </mesh>
      <Rain />
    </>
  )
}
