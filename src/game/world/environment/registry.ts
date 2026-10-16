import { MathUtils, type Material, type MeshBasicMaterial, type MeshPhysicalMaterial, type MeshStandardMaterial } from 'three'
import { env } from './envState'
import { lifeU } from '../life/lifeState'

/**
 * Registro de materiais que reagem ao ambiente. Os materiais da cidade se registram na criacao
 * e o EnvironmentDriver chama `applyRegistries()` uma vez por quadro: so mexe em valores de uniforme
 * (color, emissiveIntensity, roughness...), nunca recompila shader.
 */

type Glow =
  | { k: 'color'; mat: MeshBasicMaterial; day: number; night: number }
  | { k: 'emissive'; mat: MeshStandardMaterial; day: number; night: number }
interface Wet {
  mat: MeshStandardMaterial
  rough: number
  roughWet: number
  cc: number
  ccWet: number
  dark: number
}

const glows: Glow[] = []
const wets: Wet[] = []
const seen = new WeakSet<Material>()

/** MeshBasicMaterial: multiplica a cor (vertex color * color), >1 estoura para branco. */
export function registerGlowColor(mat: MeshBasicMaterial, day: number, night: number) {
  if (seen.has(mat)) return
  seen.add(mat)
  glows.push({ k: 'color', mat, day, night })
}
/** Material PBR com emissive: intensidade de dia -> noite. */
export function registerGlowEmissive(mat: MeshStandardMaterial, day: number, night: number) {
  if (seen.has(mat)) return
  seen.add(mat)
  glows.push({ k: 'emissive', mat, day, night })
}
/** Superficie que fica molhada na chuva (mais lisa, mais escura, com mais verniz). */
export function registerWet(mat: MeshStandardMaterial, o: { roughWet: number; ccWet: number; dark: number }) {
  if (wets.some((w) => w.mat === mat)) return
  wets.push({ mat, rough: mat.roughness, roughWet: o.roughWet, cc: (mat as MeshPhysicalMaterial).clearcoat ?? 0, ccWet: o.ccWet, dark: o.dark })
}

export const nightUniform = { value: 0 }
export const hourUniform = { value: 12 }

/** Janelas acesas a noite: emissivo quente por "celula" de janela (hash da posicao no mundo), sem textura extra. */
export function nightGlass(mat: MeshPhysicalMaterial, strength = 1.9) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = nightUniform
    sh.uniforms.uHour = hourUniform
    sh.uniforms.uLifeT = lifeU.uLifeT
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWp;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWp;\nuniform float uNight;\nuniform float uHour;\nuniform float uLifeT;\nfloat wHash(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        {
          vec3 wc = floor(vec3(vWp.x * 0.45, vWp.y / 2.1, vWp.z * 0.45));
          // noite: cada janela acende num horario proprio (17h30-20h30) e ~45% apagam de madrugada; de dia nublado todas as "acesas" ficam acesas
          float tn = uHour >= 12.0 ? uHour - 17.5 : uHour + 6.5;
          float onT = wHash(wc + 11.0) * 3.0;
          float offT = 5.0 + wHash(wc + 23.0) * 8.0;
          float sleeper = step(0.55, wHash(wc + 5.0));
          float sched = step(onT, tn) * (1.0 - sleeper * step(offT, tn));
          float isNight = step(17.0, uHour) + step(uHour, 6.5);
          float lit = step(0.4, wHash(wc)) * uNight * mix(1.0, sched, min(isNight, 1.0));
          vec3 warm = mix(vec3(1.0, 0.72, 0.38), vec3(1.0, 0.8, 0.55), step(0.8, wHash(wc + 7.0)));
          warm = mix(warm, vec3(0.6, 0.86, 1.0), step(0.92, wHash(wc + 3.0)));
          // televisao: ~8% das acesas pulsam azuladas
          float tv = step(0.92, wHash(wc + 41.0));
          warm = mix(warm, vec3(0.55, 0.72, 1.0), tv * (0.5 + 0.5 * sin(uLifeT * 3.1 + wHash(wc) * 40.0)));
          lit *= 1.0 - tv * 0.25 * (0.5 + 0.5 * sin(uLifeT * 7.0 + wHash(wc + 1.0) * 30.0));
          totalEmissiveRadiance += warm * lit * ${strength.toFixed(2)};
          diffuseColor.a = mix(diffuseColor.a, 0.96, lit * 0.85);
        }`,
      )
  }
}

export function applyRegistries() {
  const L = env.lights
  for (const g of glows) {
    const v = MathUtils.lerp(g.day, g.night, L)
    if (g.k === 'color') g.mat.color.setScalar(v)
    else g.mat.emissiveIntensity = v
  }
  const w = env.wet
  for (const m of wets) {
    m.mat.roughness = MathUtils.lerp(m.rough, m.roughWet, w)
    const pm = m.mat as MeshPhysicalMaterial
    if (pm.isMeshPhysicalMaterial) pm.clearcoat = MathUtils.lerp(m.cc, m.ccWet, w)
    m.mat.color.setScalar(1 - m.dark * w)
  }
  nightUniform.value = L
  hourUniform.value = env.hour
}
