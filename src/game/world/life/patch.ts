import type { Material, WebGLProgramParametersWithUniforms } from 'three'
import { lifeU } from './lifeState'

type Shader = WebGLProgramParametersWithUniforms

/**
 * Encadeia um `onBeforeCompile` sem perder o que ja existe (ex.: janelas acesas do registry) e sem colidir
 * a chave do programa. Cada remendo e aplicado UMA vez por material (guardado em userData.__life).
 */
export function chainPatch(mat: Material, id: string, fn: (sh: Shader) => void) {
  const tags = (mat.userData.__life ??= {}) as Record<string, true>
  if (tags[id]) return false
  tags[id] = true
  const prev = mat.onBeforeCompile
  const prevKey = mat.customProgramCacheKey
  mat.onBeforeCompile = (sh, r) => {
    prev.call(mat, sh, r)
    fn(sh as Shader)
  }
  mat.customProgramCacheKey = () => prevKey.call(mat) + '|' + id
  mat.needsUpdate = true
  return true
}

export function addUniforms(sh: Shader, names: (keyof typeof lifeU)[]) {
  for (const n of names) sh.uniforms[n] = lifeU[n]
}

/** Declaracoes GLSL compartilhadas (vento, jogadora, baloes). */
export const GLSL_COMMON = /* glsl */ `
uniform vec4 uWind;
uniform float uLifeT;
uniform vec4 uPlayer;
uniform vec4 uBal0;
uniform vec4 uBal1;
uniform vec4 uBal2;
uniform vec4 uBal3;
uniform vec4 uCloud;
uniform float uFlick;
float lfHash(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float lfHash2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float lfNoise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(lfHash2(i), lfHash2(i+vec2(1,0)), f.x), mix(lfHash2(i+vec2(0,1)), lfHash2(i+vec2(1,1)), f.x), f.y);
}
// deslocamento (mundo) de uma folha/galho: onda que viaja com o vento + tremulo; w = peso (0..1), amp = metros por unidade de forca
vec3 lfSway(vec3 wp, float w, float amp){
  float s = uWind.z;
  float wave = sin(uLifeT * 1.7 + dot(wp.xz, uWind.xy) * 0.45 + wp.y * 0.6);
  float flut = sin(uLifeT * 6.3 + wp.x * 2.9 + wp.z * 2.3 + wp.y * 4.1);
  float a = w * amp * (0.06 + 0.9 * s);
  vec2 perp = vec2(-uWind.y, uWind.x);
  vec3 d;
  d.xz = uWind.xy * a * (0.55 + 0.45 * wave) + perp * a * 0.28 * flut;
  d.y = a * 0.22 * flut - a * 0.1 * s;
  return d;
}
// empurrao da jogadora: arbustos se afastam e balancam
vec3 lfPush(vec3 wp, float w){
  vec3 dp = wp - uPlayer.xyz;
  float l = length(dp);
  float m = (1.0 - smoothstep(0.25, 1.35, l)) * w * clamp(0.2 + uPlayer.w * 0.45, 0.0, 1.0);
  vec2 away = dp.xz / max(length(dp.xz), 0.05);
  float wig = sin(uLifeT * 15.0 + wp.x * 6.0 + wp.z * 5.0);
  return vec3(away * m * 0.26 + vec2(-away.y, away.x) * wig * m * 0.05, wig * m * 0.03);
}
// baloes: balancam, sobem e descem e inclinam para longe da jogadora (um por chamada; sem laco sobre array de uniformes)
vec3 lfBal(vec3 wp, vec4 b){
  vec3 d = vec3(0.0);
  vec2 q = wp.xz - b.xz;
  float r2 = dot(q, q);
  float rad = 0.62 * b.w;
  if (b.w > 0.0 && r2 < rad * rad) {
    float h = (wp.y - b.y) / (2.95 * b.w);
    if (h > 0.12) {
      vec2 pa = b.xz - uPlayer.xz;
      float pd = length(pa);
      float near = 1.0 - smoothstep(0.8, 4.5, pd);
      vec2 away = pa / max(pd, 0.05);
      float hh = h * h;
      float bob = sin(uLifeT * 1.5 + b.x * 1.7 + b.z);
      d.xz += away * near * hh * 0.55 * b.w + uWind.xy * hh * (0.05 + 0.2 * uWind.z) * b.w * (0.7 + 0.3 * bob);
      d.y += hh * bob * 0.07 * b.w - near * hh * 0.09 * b.w;
      d.xz += vec2(-uWind.y, uWind.x) * hh * 0.04 * bob * b.w;
    }
  }
  return d;
}
vec3 lfBalloon(vec3 wp){ return lfBal(wp, uBal0) + lfBal(wp, uBal1) + lfBal(wp, uBal2) + lfBal(wp, uBal3); }
float lfLeafScore(vec3 c){
  float g = max(c.g, 0.02);
  return smoothstep(0.2, 0.3, min(c.g - c.r, c.g - c.b) / g);
}
`

/**
 * Vento / empurrao / baloes nos materiais do kit (porcelana fundida): folhagem reconhecida pela COR DE VERTICE
 * (verde dominante), entao funciona com qualquer paleta de folhas. O vertice e movido no espaco de VISTA depois do
 * project_vertex (nao muda normais nem sombra).
 */
export function windKit(sh: Shader) {
  addUniforms(sh, ['uWind', 'uLifeT', 'uPlayer', 'uBal0', 'uBal1', 'uBal2', 'uBal3'])
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\n' + GLSL_COMMON)
    .replace(
      '#include <project_vertex>',
      /* glsl */ `#include <project_vertex>
      {
        vec4 lfp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          lfp = instanceMatrix * lfp;
        #endif
        vec3 lfw = (modelMatrix * lfp).xyz;
        vec3 lfd = lfBalloon(lfw);
        #ifdef USE_COLOR
          float lfs = lfLeafScore(color.rgb);
          if (lfs > 0.001) {
            // peso: copas e sebes balancam mais no alto; so a ponta mexe perto do chao
            float hw = 0.35 + 0.65 * smoothstep(0.1, 2.2, lfw.y);
            lfd += lfSway(lfw, lfs * hw, 0.16) + lfPush(lfw, lfs);
          }
        #endif
        mvPosition.xyz += (viewMatrix * vec4(lfd, 0.0)).xyz;
        gl_Position = projectionMatrix * mvPosition;
      }`,
    )
}

/**
 * Copas instanciadas (arvores): o peso vem da altura LOCAL do vertice dentro da caixa da geometria (base fixa, topo livre).
 * `ymin/ymax` = caixa local; `amp` = metros por unidade de forca.
 */
export function windCanopy(ymin: number, ymax: number, amp: number) {
  return (sh: Shader) => {
    addUniforms(sh, ['uWind', 'uLifeT', 'uPlayer'])
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + GLSL_COMMON)
      .replace(
        '#include <project_vertex>',
        /* glsl */ `#include <project_vertex>
        {
          vec4 lfp = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            lfp = instanceMatrix * lfp;
          #endif
          vec3 lfw = (modelMatrix * lfp).xyz;
          float lfh = clamp((transformed.y - (${ymin.toFixed(3)})) / ${Math.max(0.01, ymax - ymin).toFixed(3)}, 0.0, 1.0);
          vec3 lfo = (modelMatrix * (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0))).xyz;
          vec3 lfd = lfSway(vec3(lfo.x, lfw.y, lfo.z) + (lfw - lfo) * 0.5, 0.25 + 0.75 * lfh, ${amp.toFixed(3)}) + lfPush(lfw, 1.0) * 0.6;
          mvPosition.xyz += (viewMatrix * vec4(lfd, 0.0)).xyz;
          gl_Position = projectionMatrix * mvPosition;
        }`,
      )
  }
}

/** Sombras de nuvens que passam: escurece suavemente o resultado da iluminacao (chao e porcelana). */
export function cloudShadow(sh: Shader) {
  addUniforms(sh, ['uCloud'])
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vLfW;')
    .replace('#include <project_vertex>', '#include <project_vertex>\n{ vec4 lfq = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\nlfq = instanceMatrix * lfq;\n#endif\nvLfW = (modelMatrix * lfq).xyz; }')
  sh.fragmentShader = sh.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
      varying vec3 vLfW;
      uniform vec4 uCloud;
      float csH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float csN(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(csH(i), csH(i+vec2(1,0)), f.x), mix(csH(i+vec2(0,1)), csH(i+vec2(1,1)), f.x), f.y); }`,
    )
    .replace(
      '#include <opaque_fragment>',
      `{
        vec2 cp = (vLfW.xz - uCloud.xy) * uCloud.w;
        float cn = csN(cp) * 0.62 + csN(cp * 2.3 + 7.0) * 0.28 + csN(cp * 5.1) * 0.1;
        float cs = smoothstep(0.5, 0.7, cn) * uCloud.z;
        outgoingLight *= 1.0 - cs;
      }
      #include <opaque_fragment>`,
    )
}
