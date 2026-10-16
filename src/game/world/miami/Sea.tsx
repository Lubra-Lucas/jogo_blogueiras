import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Mesh, PlaneGeometry, ShaderLib, ShaderMaterial, UniformsUtils, Vector3, UniformsLib } from 'three'
import { env } from '../environment/envState'
import { SEA } from './layout'

/**
 * Mar de Miami: um plano so, com shader leve (sem textura):
 *  - cor por profundidade analitica (a mesma curva do fundo): turquesa raso -> azul profundo, transparente na beira;
 *  - ondulacao por soma de senos (normais no fragment), brilho do sol (glints) e reflexo do ceu por Fresnel;
 *  - espuma: borda que vai e vem na areia (espraiamento) e linhas de arrebentacao que correm ate a praia;
 *  - neblina da cena (mistura com o horizonte) e escurecimento a noite.
 */
const vertex = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>
  varying vec3 vW;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`

const fragment = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>
  uniform float uTime;
  uniform float uShore;
  uniform float uSlope;
  uniform float uWaterY;
  uniform float uNight;
  uniform float uSunI;
  uniform vec3 uSunDir;
  uniform vec3 uSunCol;
  uniform vec3 uSky;
  uniform vec3 uShallow;
  uniform vec3 uDeep;
  uniform vec3 uCam;
  varying vec3 vW;

  float floorY(float x) {
    float d = x - uShore;
    if (d <= 0.0) return 0.0;
    return d < 17.0 ? -d * uSlope : -17.0 * uSlope - (d - 17.0) * 0.09;
  }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  vec3 waveN(vec2 p, float t) {
    // soma de ondas direcionais (mais calmas perto da praia)
    vec2 g = vec2(0.0);
    g += vec2(0.9, 0.2) * 0.22 * cos(dot(p, vec2(0.9, 0.2)) * 0.9 - t * 1.3);
    g += vec2(0.7, -0.6) * 0.16 * cos(dot(p, vec2(0.7, -0.6)) * 1.5 - t * 1.7);
    g += vec2(-0.4, 0.9) * 0.10 * cos(dot(p, vec2(-0.4, 0.9)) * 2.4 - t * 2.3);
    g += vec2(0.2, 1.0) * 0.06 * cos(dot(p, vec2(0.2, 1.0)) * 4.1 - t * 3.1);
    g += (vec2(vnoise(p * 1.7 + t * 0.3), vnoise(p * 1.7 - t * 0.27 + 9.0)) - 0.5) * 0.18;
    return normalize(vec3(-g.x, 1.0, -g.y));
  }

  void main() {
    vec2 p = vW.xz;
    float t = uTime;
    // linha de costa ondulada
    float wob = sin(p.y * 0.045 + t * 0.20) * 0.9 + sin(p.y * 0.17 - t * 0.35) * 0.35 + sin(p.y * 0.011 + 2.0) * 1.6;
    float xs = vW.x - wob;
    float depth = uWaterY - floorY(xs);           // > 0 sob a agua
    if (depth < -0.02) discard;
    vec3 V = normalize(uCam - vW);
    vec3 N = waveN(p, t);
    // suaviza as ondas na beirinha
    N = normalize(mix(vec3(0.0, 1.0, 0.0), N, smoothstep(0.0, 0.6, depth) * 0.85 + 0.15));
    vec3 L = normalize(uSunDir);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    float k = exp(-depth * 0.75);
    vec3 body = mix(uDeep, uShallow, k);
    vec3 col = mix(body, uSky * vec3(0.78, 0.9, 1.0), clamp(0.04 + fres * 0.42, 0.0, 0.55));
    // brilho do sol
    vec3 R = reflect(-L, N);
    float sp = pow(max(dot(R, V), 0.0), 220.0) * uSunI * 0.9 + pow(max(dot(R, V), 0.0), 24.0) * uSunI * 0.07;
    col += uSunCol * sp * (1.0 - uNight * 0.85);

    // espuma: espraiamento (a borda respira) + 2 linhas de arrebentacao
    float swash = 0.07 + 0.10 * (0.5 + 0.5 * sin(t * 0.8 + p.y * 0.07)) ;
    float fn = vnoise(p * vec2(1.3, 2.2) + t * 0.15);
    float foam = (1.0 - smoothstep(0.0, 0.22, abs(depth - swash))) * (0.55 + 0.45 * fn);
    foam += (1.0 - smoothstep(0.0, 0.10, abs(depth - swash * 2.6 - 0.05))) * 0.35 * fn;
    for (int n = 0; n < 3; n++) {
      float ph = fract(t * 0.075 + float(n) * 0.333 + sin(p.y * 0.021 + float(n) * 2.1) * 0.05);
      float wx = uShore + mix(15.5, 4.8, ph);   // posicao da crista, correndo ate a areia
      float dx = xs - wx;
      float band = (1.0 - smoothstep(0.0, 1.4 + 1.4 * ph, abs(dx))) * (1.0 - smoothstep(0.55, 0.98, ph)) * smoothstep(0.0, 0.12, ph);
      float cell = vnoise(vec2(p.y * 0.55 + float(n) * 7.0, xs * 1.7 - t * 0.5));
      band *= smoothstep(0.25, 0.7, cell + 0.2 * sin(p.y * 0.3 + t));
      foam += band * 0.9 * step(0.0, depth);
    }
    foam = clamp(foam, 0.0, 1.0);
    col = mix(col, vec3(0.97, 1.0, 1.0), foam * 0.92);
    col *= mix(1.0, 0.16, uNight);
    col += vec3(0.02, 0.05, 0.08) * uNight;

    float alpha = smoothstep(-0.02, 0.28, depth) * (0.62 + 0.3 * (1.0 - k));
    alpha = max(alpha, foam * 0.95);
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.97));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`

/** O mar: plano grande que acompanha a camera em z (a costa e reta e infinita para norte/sul). */
export function MiamiSea() {
  const mesh = useRef<Mesh>(null)
  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        fog: true,
        uniforms: UniformsUtils.merge([
          UniformsLib.fog,
          {
            uTime: { value: 0 },
            uShore: { value: SEA.shoreX },
            uSlope: { value: SEA.slope },
            uWaterY: { value: SEA.waterY },
            uNight: { value: 0 },
            uSunI: { value: 1 },
            uSunDir: { value: new Vector3(0.4, 0.7, 0.4) },
            uSunCol: { value: new Color('#fff4de') },
            uSky: { value: new Color('#bfe6f3') },
            uShallow: { value: new Color('#43d0c6') },
            uDeep: { value: new Color('#0b6fa8') },
            uCam: { value: new Vector3() },
          },
        ]),
        vertexShader: vertex,
        fragmentShader: fragment,
      }),
    [],
  )
  const geo = useMemo(() => new PlaneGeometry(1400, 1600, 1, 1).rotateX(-Math.PI / 2), [])
  void ShaderLib
  const t = useRef(0)
  useFrame(({ camera }, dt) => {
    t.current += Math.min(dt, 0.1)
    const u = material.uniforms
    u.uTime.value = t.current
    u.uNight.value = env.night
    u.uSunI.value = Math.min(1.4, env.lightI / 2.2) * (1 - 0.7 * env.gloom)
    u.uSunDir.value.copy(env.lightDir)
    u.uSunCol.value.copy(env.lightColor)
    // ceu refletido: mistura do horizonte e do topo do ceu do ambiente
    u.uSky.value.copy(env.skyHor).lerp(env.skyMid, 0.35)
    // cores da agua seguem o clima (cinza em dia fechado)
    u.uShallow.value.set('#43d0c6').lerp(env.fogColor, 0.35 * env.gloom)
    u.uDeep.value.set('#0b72ac').lerp(env.skyTop, 0.1).multiplyScalar(1 - 0.35 * env.gloom)
    u.uCam.value.copy(camera.position)
    const m = mesh.current
    if (m) m.position.set(SEA.shoreX + 690, SEA.waterY, camera.position.z)
  })
  return <mesh ref={mesh} geometry={geo} material={material} renderOrder={4} frustumCulled={false} />
}
