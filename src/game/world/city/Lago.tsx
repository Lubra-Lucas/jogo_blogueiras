import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import {
  CircleGeometry,
  Color,
  DoubleSide,
  LatheGeometry,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  UniformsLib,
  UniformsUtils,
  Vector2,
  Vector3,
  type BufferGeometry,
} from 'three'
import { merge, paint } from './geo'
import { BRIDGE, ISLET, LAGO } from './romantic'
import { PORCELAIN } from './Props'
import { bedsGeometry } from './ParqueDeco'
import { env } from '../environment/envState'

/**
 * Lago do Parque: agua estilizada (gradiente turquesa-menta, fresnel rosado, ondas suaves, brilhos), borda de perolas
 * com fio de ouro-joia, ilhota do coreto, lirios e colisores (margem, ilhota e ponte com rampa).
 */

const VERT = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
varying vec3 vW;
varying vec2 vL;
void main() {
  vL = position.xy;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`

const FRAG = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform float uTime;
uniform float uR;
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uShallow;
uniform vec3 uSky;
uniform vec3 uSunDir;
uniform vec3 uMoonDir;
uniform float uNight;
uniform float uRain;
uniform float uGloom;
uniform float uDay;
uniform float uMoonAmt;
varying vec3 vW;
varying vec2 vL;

float h11(float n) { return fract(sin(n * 127.1) * 43758.5453); }
vec2 h22(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

void main() {
  float r = length(vL) / uR;
  vec2 p = vW.xz;
  float t = uTime;
  // ondulacao suave: soma de 4 ondas direcionais (gradiente analitico)
  vec2 g = vec2(0.0);
  vec2 d1 = normalize(vec2(1.0, 0.6));
  vec2 d2 = normalize(vec2(-0.7, 1.0));
  vec2 d3 = normalize(vec2(0.3, -1.0));
  vec2 d4 = normalize(vec2(-1.0, -0.3));
  g += d1 * cos(dot(p, d1) * 0.9 + t * 0.8) * 0.9 * 0.05;
  g += d2 * cos(dot(p, d2) * 1.7 - t * 1.1) * 1.7 * 0.03;
  g += d3 * cos(dot(p, d3) * 3.1 + t * 1.6) * 3.1 * 0.014;
  g += d4 * cos(dot(p, d4) * 5.3 - t * 2.1) * 5.3 * 0.007;
  // chuva: aneis de ondulacao que se espalham (grade de celulas, 9 vizinhas)
  float rip = 0.0;
  if (uRain > 0.01) {
    vec2 rp = p * 1.5;
    vec2 ci = floor(rp);
    vec2 cf = fract(rp);
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 off = vec2(float(i), float(j));
        vec2 h = h22(ci + off);
        float live = step(h.y, uRain * 0.9 + 0.04);
        float ph = fract(t * (0.6 + h.y * 0.5) + h.x * 7.0);
        vec2 dd = cf - (off + 0.15 + 0.7 * h22(ci + off + 3.7));
        float dl = length(dd);
        float ring = exp(-pow((dl - ph * 0.85) * 13.0, 2.0)) * (1.0 - ph) * (1.0 - ph) * live;
        rip += ring;
        g += dd / max(dl, 0.001) * ring * 0.22;
      }
    }
  }
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
  vec3 V = normalize(cameraPosition - vW);
  float nv = max(dot(N, V), 0.0);
  float fres = pow(1.0 - nv, 3.0);

  // gradiente: centro turquesa -> borda menta clarinha
  vec3 col = mix(uDeep, uMid, smoothstep(0.0, 0.55, r));
  col = mix(col, uShallow, smoothstep(0.5, 1.0, r));
  // faixas de luz que dancam (causticas suaves)
  float caus = sin(p.x * 1.3 + t * 0.7 + sin(p.y * 0.9 - t * 0.5) * 2.0) * sin(p.y * 1.1 - t * 0.6 + sin(p.x * 0.8 + t * 0.4) * 2.0);
  col += uShallow * 0.12 * smoothstep(0.2, 1.0, caus);
  // aneis lentos a partir do centro
  // reflexo do ceu rosado nas bordas rasantes
  col = mix(col, uSky, fres * 0.5);
  // brilho do sol
  vec3 L = normalize(uSunDir);
  vec3 H = normalize(L + V);
  col += vec3(1.0, 0.96, 0.9) * pow(max(dot(N, H), 0.0), 90.0) * 0.9 * uDay * (1.0 - uGloom);
  // lua: reflexo prateado e azulado na agua
  vec3 Hm = normalize(normalize(uMoonDir) + V);
  col += vec3(0.75, 0.82, 1.0) * (pow(max(dot(N, Hm), 0.0), 120.0) * 1.2 + pow(max(dot(N, Hm), 0.0), 18.0) * 0.12) * uMoonAmt;
  col += vec3(0.9, 0.95, 1.0) * rip * 0.38;
  // noite / tempo fechado: agua mais escura e azulada, ainda legivel
  col *= mix(1.0, 0.42, uNight) * (1.0 - 0.22 * uGloom);
  col = mix(col, col * vec3(0.7, 0.88, 1.25), uNight);
  // espuma/brilho perto da borda
  col = mix(col, uShallow + 0.08, smoothstep(0.93, 1.0, r) * 0.7);
  // sparkles
  vec2 sp = p * 1.6;
  vec2 cell = floor(sp);
  vec2 f = fract(sp) - 0.5;
  vec2 o = (h22(cell) - 0.5) * 0.6;
  float rnd = h11(cell.x * 7.0 + cell.y * 13.0);
  float tw = pow(max(0.0, sin(t * (1.2 + rnd * 2.2) + rnd * 6.283)), 10.0);
  float dotm = 1.0 - smoothstep(0.0, 0.1, length(f - o));
  float cross = (1.0 - smoothstep(0.0, 0.015, min(abs(f.x - o.x), abs(f.y - o.y)))) * (1.0 - smoothstep(0.0, 0.22, length(f - o)));
  col += vec3(1.0, 0.98, 0.92) * (dotm + cross * 0.7) * tw * step(0.55, rnd) * (1.4 + uNight * 0.9) * (1.0 - 0.6 * uRain);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`

function useWaterMaterial(): ShaderMaterial {
  return useMemo(
    () =>
      new ShaderMaterial({
        uniforms: UniformsUtils.merge([
          UniformsLib.fog,
          {
            uTime: { value: 0 },
            uR: { value: LAGO.r },
            uDeep: { value: new Color('#1c7f93') },
            uMid: { value: new Color('#3aa3a8') },
            uShallow: { value: new Color('#8ccfbc') },
            uSky: { value: new Color('#e6f0f6') },
            uSunDir: { value: new Vector3(0.45, 0.75, 0.35) },
            uMoonDir: { value: new Vector3(-0.4, 0.5, -0.5) },
            uNight: { value: 0 },
            uRain: { value: 0 },
            uGloom: { value: 0 },
            uDay: { value: 1 },
            uMoonAmt: { value: 0 },
          },
        ]),
        vertexShader: VERT,
        fragmentShader: FRAG,
        fog: true,
        // a agua fica por cima do gramado/ladrilhos (que usam polygonOffset) mesmo em angulos rasantes
        polygonOffset: true,
        polygonOffsetFactor: -10,
        polygonOffsetUnits: -10,
      }),
    [],
  )
}

const GOLD = '#b38e4f'
const SKY_WHITE = new Color('#ffffff')

function buildLakeGeos() {
  const r = LAGO.r
  const gap = 0.3 // meio-vao (rad) da ponte, centrado ao norte (-Z)
  // borda de perola em seccao suave (lathe): sobe em quase vertical por dentro e desce em rampa por fora
  const pts = [
    new Vector2(r - 0.3, -0.1), new Vector2(r - 0.3, 0.38), new Vector2(r - 0.18, 0.52), new Vector2(r + 0.2, 0.58),
    new Vector2(r + 0.7, 0.5), new Vector2(r + 1.25, 0.28), new Vector2(r + 1.6, 0.0),
  ]
  const rim = new LatheGeometry(pts, 72, Math.PI + gap, Math.PI * 2 - gap * 2)
  paint(rim, '#cfc8b8')
  rim.translate(LAGO.cx, 0, LAGO.cz)
  // perolas e fio de ouro-joia
  const pearls: BufferGeometry[] = []
  const N = 44
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2
    if (Math.abs(Math.atan2(Math.sin(a - Math.PI * 1.5), Math.cos(a - Math.PI * 1.5))) < gap + 0.1) continue
    const s = new SphereGeometry(0.3, 10, 7)
    s.translate(LAGO.cx + Math.cos(a) * (r + 0.55), 0.74, LAGO.cz + Math.sin(a) * (r + 0.55))
    pearls.push(paint(s, i % 5 === 0 ? '#bfb8a6' : '#d9d3c4'))
  }
  // ilhota: base de grama-menta com friso de perola e ouro
  const R = ISLET.r
  const isl = new LatheGeometry(
    [new Vector2(0, 0.14), new Vector2(R - 0.5, 0.14), new Vector2(R - 0.2, 0.1), new Vector2(R + 0.05, 0.02), new Vector2(R, -0.2), new Vector2(0, -0.2)],
    40,
  )
  paint(isl, '#78ac5c')
  isl.translate(ISLET.x, 0, ISLET.z)
  const islRim = new TorusGeometry(R - 0.05, 0.16, 8, 48).rotateX(Math.PI / 2)
  paint(islRim, '#cfc8b8')
  islRim.translate(ISLET.x, 0.14, ISLET.z)
  // lirios: discos com um recorte e flores-bolha
  const lily: BufferGeometry[] = []
  const rnd = (n: number) => ((Math.sin(n * 91.7) * 43758.5453) % 1 + 1) % 1
  for (let i = 0; i < 16; i++) {
    const a = rnd(i + 1) * Math.PI * 2
    const rr = 3 + rnd(i + 40) * (r - 5)
    const x = LAGO.cx + Math.cos(a) * rr
    const z = LAGO.cz + Math.sin(a) * rr
    if (Math.hypot(x - ISLET.x, z - ISLET.z) < R + 1.2) continue
    if (Math.abs(x - BRIDGE.x) < 3 && z < ISLET.z) continue
    const pr = 0.5 + rnd(i + 9) * 0.45
    const pad = new CircleGeometry(pr, 12, rnd(i + 3) * 6, Math.PI * 1.88).rotateX(-Math.PI / 2)
    paint(pad, i % 3 === 0 ? '#4f9a58' : '#62ab62')
    pad.translate(x, 0.235, z)
    lily.push(pad)
    if (i % 3 === 1) {
      const f = new SphereGeometry(0.2, 8, 6)
      f.scale(1, 0.8, 1)
      f.translate(x, 0.36, z)
      lily.push(paint(f, ['#f2b8cf', '#f7e58a', '#fff4f0'][i % 3 === 1 ? i % 3 : 0]))
    }
  }
  // fio de ouro-joia da borda (em cor de vertice, junto com a pedra) + canteiros de flores: tudo numa malha so
  const gold = paint(new TorusGeometry(r + 0.4, 0.05, 6, 96).rotateX(Math.PI / 2), GOLD)
  gold.translate(LAGO.cx, 0.6, LAGO.cz)
  return { stone: merge([rim, ...pearls, isl, islRim, ...lily, gold, bedsGeometry()]) }
}

/** Colisores: muro invisivel na margem (vao da ponte), piso fundo, ilhota, piso do coreto e a ponte (rampas + grades). */
function LakeColliders() {
  const r = LAGO.r + 1.0
  const segs = useMemo(() => {
    const out: { x: number; z: number; rot: number; hl: number }[] = []
    const ring = (cx: number, cz: number, R: number, n: number, gapHalf: number) => {
      for (let i = 0; i < n; i++) {
        const a = ((i + 0.5) / n) * Math.PI * 2
        if (Math.abs(Math.atan2(Math.sin(a - Math.PI * 1.5), Math.cos(a - Math.PI * 1.5))) * R < gapHalf) continue
        out.push({ x: cx + Math.cos(a) * R, z: cz + Math.sin(a) * R, rot: -(a + Math.PI / 2), hl: (Math.PI * R) / n + 0.05 })
      }
    }
    ring(LAGO.cx, LAGO.cz, r, 40, 1.75)
    ring(ISLET.x, ISLET.z, ISLET.r + 0.5, 20, 1.75)
    return out
  }, [r])
  const bridge = useMemo(() => {
    const H = 0.9
    const L = BRIDGE.len / 2
    const n = 8
    const out: { z: number; y: number; a: number; hl: number }[] = []
    for (let i = 0; i < n; i++) {
      const t = -L + (L * 2 * (i + 0.5)) / n
      out.push({ z: BRIDGE.z0 + L + t, y: H * (1 - (t / L) ** 2), a: Math.atan((2 * H * t) / (L * L)), hl: (L / n) * 1.12 })
    }
    return out
  }, [])
  return (
    <RigidBody type="fixed" colliders={false}>
      {segs.map((s, i) => (
        <CuboidCollider key={i} args={[s.hl, 1, 0.45]} position={[s.x, 0.8, s.z]} rotation={[0, s.rot, 0]} />
      ))}
      {/* fundo do lago (quem cair fica abaixo da agua) e ilhota */}
      <CylinderCollider args={[0.5, LAGO.r + 1]} position={[LAGO.cx, -1.5, LAGO.cz]} />
      <CylinderCollider args={[0.5, ISLET.r]} position={[ISLET.x, -0.38, ISLET.z]} />
      <CylinderCollider args={[0.2, 3.4]} position={[ISLET.x, 0.2, ISLET.z]} />
      {bridge.map((b, i) => (
        <group key={i} position={[BRIDGE.x, b.y, b.z]} rotation={[b.a, 0, 0]}>
          <CuboidCollider args={[1.5, 0.15, b.hl]} position={[0, -0.15, 0]} />
          <CuboidCollider args={[0.1, 0.6, b.hl]} position={[-1.4, 0.55, 0]} />
          <CuboidCollider args={[0.1, 0.6, b.hl]} position={[1.4, 0.55, 0]} />
        </group>
      ))}
    </RigidBody>
  )
}

export function Lago({ shadows }: { shadows: boolean }) {
  const mat = useWaterMaterial()
  const geo = useMemo(buildLakeGeos, [])
  const water = useMemo(() => new CircleGeometry(LAGO.r + 0.4, 72), [])
  const t0 = useRef(0)
  useFrame((_, dt) => {
    t0.current += dt
    mat.uniforms.uTime.value = t0.current
    const u = mat.uniforms
    u.uSunDir.value.copy(env.sunDir)
    u.uMoonDir.value.copy(env.moonDir)
    u.uSky.value.copy(env.skyHor).lerp(SKY_WHITE, 0.35)
    u.uNight.value = env.night
    u.uRain.value = env.rain
    u.uGloom.value = env.gloom
    u.uDay.value = env.day
    u.uMoonAmt.value = env.moonAmt
  })
  return (
    <group>
      <mesh geometry={water} material={mat} position={[LAGO.cx, 0.2, LAGO.cz]} rotation-x={-Math.PI / 2} renderOrder={4} />
      <mesh geometry={geo.stone} receiveShadow={shadows} castShadow={shadows} userData={{ walkable: true }}>
        <meshPhysicalMaterial {...PORCELAIN} vertexColors side={DoubleSide} />
      </mesh>
      <LakeColliders />
    </group>
  )
}
