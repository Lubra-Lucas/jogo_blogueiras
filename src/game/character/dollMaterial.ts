import { Color, MeshPhysicalMaterial, Vector3, type IUniform, type Texture, type WebGLProgramParametersWithUniforms } from 'three'
import { NUDE_UNDER, type LipFinish, type SkinFinish, type SuitFinish } from '../../shared/appearance'
import { FACE_BOX } from './makeup/landmarks'

/**
 * Materiais da boneca (MeshPhysicalMaterial + `onBeforeCompile`, sem node materials).
 *
 * Corpo: a textura baked do Meshy (pele + macacao rosa + feicoes pintadas) e recolorida no shader usando as
 * mascaras de regiao (mesmo UV):
 *   doll_mask.png   R = pele, G = macacao, B = feicoes que nao tingem (olhos, cilios, sobrancelhas, labios)
 *   doll_mask2.png  R = labios (tingiveis), G = linha do cabelo no rosto
 *   doll_mask3.png  R = iris, G = sobrancelha pintada, B = cilios/delineado pintado          (face_landmarks.py)
 *   doll_mask4.png  R = unhas (pontas dos dedos), G = posicao ao longo da unha               (nail_mask.py)
 * A cor nova mantem o DETALHE de luminancia da textura (razao lum/lum_ref) e a variacao de croma.
 * Maquiagem: textura 1024 projetada de FRENTE no espaco da malha em repouso (varyings `vRest`/`vRestN`, antes dos
 * morphs/skinning, entao acompanha o rosto), somente no rosto (normal para frente, y/z na faixa da cabeca).
 * Rugosidade/clearcoat/sheen variam por regiao. Os uniforms vivem em `uniforms` e sao atualizados sem recompilar.
 */

// referencias da textura original (linear): media da pele, do macacao, dos labios e do cabelo
const REF_SKIN = [0.844, 0.527, 0.456]
const REF_SUIT = [0.866, 0.337, 0.405]
const REF_LIPS = [0.705, 0.163, 0.18]
const REF_HAIR_LUM = 0.412
const REF_IRIS_LUM = 0.155
const REF_BROW_LUM = 0.104

export const FINISHES: Record<SuitFinish, { rough: number; cc: number; ccRough: number; sheen: number }> = {
  latex: { rough: 0.12, cc: 1, ccRough: 0.04, sheen: 0 },
  satin: { rough: 0.35, cc: 0, ccRough: 0.3, sheen: 0.6 },
  matte: { rough: 0.7, cc: 0, ccRough: 0.5, sheen: 0 },
}

/** Acabamentos da pele: rugosidade, clearcoat (brilho molhado) e rugosidade do clearcoat. */
export const SKIN_FINISHES: Record<SkinFinish, { rough: number; cc: number; ccr: number; sheen: number }> = {
  matte: { rough: 0.66, cc: 0.0, ccr: 0.5, sheen: 0.35 },
  natural: { rough: 0.4, cc: 0.3, ccr: 0.35, sheen: 0.55 },
  dewy: { rough: 0.24, cc: 0.7, ccr: 0.14, sheen: 0.4 },
  porcelain: { rough: 0.3, cc: 0.55, ccr: 0.22, sheen: 0.8 },
}

type U = Record<string, IUniform>

function u<T>(value: T): IUniform<T> {
  return { value }
}

export interface DollBodyMaterial {
  material: MeshPhysicalMaterial
  uniforms: U
}

export interface BodyMasks {
  mask: Texture
  mask2: Texture
  mask3: Texture
  mask4: Texture
}

/** Corpo da boneca. `map`/`normalMap` vem do GLB; as mascaras sao texturas lineares (flipY=false). */
export function createBodyMaterial(map: Texture | null, normalMap: Texture | null, masks: BodyMasks, blank: Texture): DollBodyMaterial {
  const { x0, x1, y0, y1 } = FACE_BOX
  const uniforms: U = {
    uMask: u(masks.mask),
    uMask2: u(masks.mask2),
    uMask3: u(masks.mask3),
    uMask4: u(masks.mask4),
    uMk: u(blank),
    uMkFx: u(blank),
    uUseMk: u(0),
    uFaceBox: u([x0, y0, 1 / (x1 - x0), 1 / (y1 - y0)]),
    uSkin: u(new Color('#efcdbd')),
    uSuit: u(new Color('#f39ab3')),
    uSuitSkin: u(0),
    uUnder: u(new Color('#d9bba8')),
    uUnderOn: u(0),
    uCovUp: u(0),
    uCovLow: u(0),
    uLips: u(new Color('#da7076')),
    uHairBody: u(new Color('#d8b46e')),
    uUseLips: u(1),
    uRoughSkin: u(0.4),
    uRoughSuit: u(0.12),
    uCcSkin: u(0.3),
    uCcrSkin: u(0.35),
    uCcSuit: u(1),
    uCcrSuit: u(0.04),
    uShSkin: u(new Color('#ffe6dc')),
    uShSuit: u(new Color(0, 0, 0)),
    uLipRough: u(0.12),
    uLipMetal: u(0),
    uLipMatte: u(0),
    uIrisL: u(new Color('#5a9fd4')),
    uIrisR: u(new Color('#5a9fd4')),
    uIrisOn: u(0),
    uIrisRing: u(0.35),
    uBrow: u(new Color('#6d5240')),
    uBrowMode: u(0),
    uLash: u(new Color('#1a1214')),
    uLashOn: u(0),
    uNailStyle: u(0),
    uNail1: u(new Color('#e9a3b5')),
    uNail2: u(new Color('#ffffff')),
    uNailFin: u(0),
    uBodyFreck: u(0),
  }
  const material = new MeshPhysicalMaterial({
    map,
    normalMap,
    roughness: 0.4,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.3,
    sheen: 1,
    sheenRoughness: 0.5,
    sheenColor: new Color('#ffffff'),
  })
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRest; varying vec3 vRestN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = position; vRestN = normal;')
    shader.fragmentShader = shader.fragmentShader
      .replace(
        'void main() {',
        /* glsl */ `
varying vec3 vRest; varying vec3 vRestN;
uniform sampler2D uMask; uniform sampler2D uMask2; uniform sampler2D uMask3; uniform sampler2D uMask4;
uniform sampler2D uMk; uniform sampler2D uMkFx; uniform float uUseMk; uniform vec4 uFaceBox;
uniform vec3 uHairBody; uniform vec3 uSkin; uniform vec3 uSuit; uniform float uSuitSkin; uniform vec3 uUnder; uniform float uUnderOn; uniform float uCovUp; uniform float uCovLow; uniform vec3 uLips; uniform float uUseLips;
uniform float uRoughSkin; uniform float uRoughSuit; uniform float uCcSkin; uniform float uCcrSkin;
uniform float uCcSuit; uniform float uCcrSuit; uniform vec3 uShSkin; uniform vec3 uShSuit;
uniform float uLipRough; uniform float uLipMetal; uniform float uLipMatte;
uniform vec3 uIrisL; uniform vec3 uIrisR; uniform float uIrisOn; uniform float uIrisRing;
uniform vec3 uBrow; uniform float uBrowMode; uniform vec3 uLash; uniform float uLashOn;
uniform float uNailStyle; uniform vec3 uNail1; uniform vec3 uNail2; uniform float uNailFin; uniform float uBodyFreck;
float dLum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float dHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  float wSkin = 0.0; float wSuit = 0.0; float wFeat = 0.0; float wLips = 0.0; float wHl = 0.0; float wNail = 0.0; float wSuitFx = 0.0;
  float wFaceMk = 0.0; vec2 fuv = vec2(0.0); vec4 mkFx = vec4(0.0);`,
      )
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D( map, vMapUv );
  vec3 mk = texture2D( uMask, vMapUv ).rgb;
  vec3 mk2 = texture2D( uMask2, vMapUv ).rgb;
  vec3 mk3 = texture2D( uMask3, vMapUv ).rgb;
  vec3 mk4 = texture2D( uMask4, vMapUv ).rgb;
  wLips = mk2.r * uUseLips; wHl = mk2.g * (1.0 - uLashOn * clamp(mk3.b * 1.5, 0.0, 1.0)); wNail = mk4.r * step(0.5, uNailStyle);
  float msum = max(mk.r + mk.g + mk.b, 1e-3);
  wSkin = mk.r / msum; wSuit = mk.g / msum; wFeat = mk.b / msum;
  wSuitFx = wSuit * (1.0 - uSuitSkin);
  vec3 tex = sampledDiffuseColor.rgb;
  float tl = max(dLum(tex), 1e-3);
  // pele: luminancia/croma da textura sobre o tom escolhido (detalhe preservado: blush, sombras, vermelhidao)
  vec3 refSkin = vec3(${REF_SKIN.join(',')});
  vec3 chroma = clamp((tex / tl) / (refSkin / dLum(refSkin)), 0.6, 1.5);
  float rs = clamp(tl / dLum(refSkin), 0.6, 1.15);
  vec3 skinCol = uSkin * pow(rs, 1.15) * mix(vec3(1.0), chroma, 0.7);
  // macacao (cor propria) ou "base do corpo" na cor da pele (liso, sem o croma pintado)
  vec3 refSuit = vec3(${REF_SUIT.join(',')});
  vec3 suitCol = uSuit * clamp(tl / dLum(refSuit), 0.6, 1.3);
  vec3 suitSkinCol = uSkin * clamp(tl / dLum(refSuit), 0.9, 1.06);
  suitCol = mix(suitCol, suitSkinCol, uSuitSkin);
  // roupa intima seamless (strapless + calcinha) so no tronco: zona em coordenadas do modelo em repouso
  // collant/maio inteiro recatado: gola canoa (mais alta nas laterais), cavas e perna alta
  float yb = 0.725 + 0.075 * smoothstep(0.02, 0.17, abs(vRest.x));
  float yt = 1.215 - 0.062 * (1.0 - smoothstep(0.035, 0.1, abs(vRest.x)));
  float xlim = mix(0.2, 0.12, smoothstep(0.85, 1.12, vRest.y));
  float zone = smoothstep(yb, yb + 0.014, vRest.y) * (1.0 - smoothstep(yt - 0.012, yt + 0.004, vRest.y)) * (1.0 - smoothstep(xlim - 0.012, xlim + 0.004, abs(vRest.x)));
  float wUnder = zone * uUnderOn * wSuit;
  // onde ha roupa (tronco / quadril) a base vira pele: a borda da peca nao mostra o collant
  float cov = mix(uCovLow, uCovUp, smoothstep(0.9, 1.0, vRest.y));
  wSuitFx = max(wSuitFx, wUnder * (1.0 - cov));
  vec3 underCol = mix(uUnder * clamp(tl / dLum(refSuit), 0.9, 1.06), suitSkinCol, cov);
  suitCol = mix(suitCol, underCol, wUnder);
  // sardas no ombro/colo/bracos (pele e base do corpo), procedurais em coordenadas do modelo
  float bodyZone = smoothstep(0.88, 0.96, vRest.y) * (1.0 - smoothstep(1.27, 1.31, vRest.y));
  if (uBodyFreck > 0.001 && bodyZone > 0.0) {
    vec3 q = vRest * 230.0;
    vec3 cell = floor(q);
    float h = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
    float on = step(1.0 - uBodyFreck * 0.1, h);
    float dd = length(fract(q) - 0.5 + (vec3(fract(h * 7.3), fract(h * 3.1), fract(h * 5.7)) - 0.5) * 0.4);
    float fr = on * smoothstep(0.42, 0.2, dd) * bodyZone * 0.55;
    vec3 fc = uSkin * vec3(0.66, 0.5, 0.4);
    skinCol = mix(skinCol, fc * pow(rs, 1.15), fr * wSkin);
    suitCol = mix(suitCol, fc, fr * wSuit * uSuitSkin);
  }
  // feicoes: textura original; labios opcionalmente tingidos pelo batom
  vec3 refLips = vec3(${REF_LIPS.join(',')});
  vec3 lipCol = tex * clamp(uLips / refLips, 0.0, 3.0); // multiplica a textura: igual ao original quando uLips = ref; mantem todo o sombreado
  vec3 featCol = mix(tex, lipCol, clamp(wLips, 0.0, 1.0));
  // iris: recolore mantendo luminancia (pupila escura, brilho do reflexo) + anel limbal
  float irisW = mk3.r * uIrisOn;
  vec3 irisCol = mix(uIrisR, uIrisL, step(0.0, vRest.x));
  float irisSpec = smoothstep(0.55, 0.8, tl);
  vec3 ic = irisCol * clamp(tl / ${REF_IRIS_LUM}, 0.08, 1.9);
  ic *= 1.0 - uIrisRing * 0.6 * smoothstep(0.98, 0.45, mk3.r);
  featCol = mix(featCol, mix(ic, tex, irisSpec), clamp(irisW, 0.0, 1.0));
  // cilios pintados: cor propria
  featCol = mix(featCol, uLash * clamp(tl / 0.1, 0.5, 1.5), clamp(mk3.b * uLashOn, 0.0, 1.0) * 0.85);
  vec3 base = skinCol * wSkin + suitCol * wSuit + featCol * wFeat;
  // sobrancelha pintada: cor propria (1) ou apagada para dar lugar a sobrancelha da maquiagem (2)
  vec3 browCol = mix(uBrow * clamp(tl / ${REF_BROW_LUM}, 0.5, 1.5), uSkin * 0.98, step(1.5, uBrowMode));
  base = mix(base, browCol, clamp(mk3.g * 1.1, 0.0, 1.0) * step(0.5, uBrowMode));
  base = mix(base, uHairBody * clamp(tl / ${REF_HAIR_LUM}, 0.4, 1.0), wHl);
  // maquiagem projetada de frente (so rosto: normal para frente, na faixa da cabeca)
  fuv = (vRest.xy - uFaceBox.xy) * uFaceBox.zw;
  float inBox = step(0.0, fuv.x) * step(fuv.x, 1.0) * step(0.0, fuv.y) * step(fuv.y, 1.0);
  wFaceMk = uUseMk * inBox * smoothstep(0.15, 0.5, vRestN.z) * smoothstep(0.07, 0.092, vRest.z) * (1.0 - wSuit) * (1.0 - wHl);
  vec4 mkc = texture2D( uMk, fuv );
  mkFx = texture2D( uMkFx, fuv );
  base = mix(base, mkc.rgb, mkc.a * wFaceMk);
  // unhas
  if (wNail > 0.001) {
    float nt = mk4.g;
    vec3 nc = uNail1;
    if (uNailStyle > 1.5 && uNailStyle < 2.5) nc = mix(uNail1, uNail2, smoothstep(0.62, 0.7, nt));
    if (uNailStyle > 2.5 && uNailStyle < 3.5) nc = mix(uNail1, uNail2, nt);
    if (uNailStyle > 3.5) nc = mix(uNail1, uNail2, dHash(floor(vMapUv * 1400.0)) * 0.5);
    base = mix(base, nc * mix(1.0, 0.92, nt), clamp(wNail * 1.4, 0.0, 1.0) * 0.96);
  }
  diffuseColor.rgb *= base;
#endif`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        /* glsl */ `
#include <roughnessmap_fragment>
roughnessFactor = mix(uRoughSkin, uRoughSuit, wSuitFx);
roughnessFactor = mix(roughnessFactor, 0.18, wFeat * 0.8);
roughnessFactor = mix(roughnessFactor, uLipRough, wLips);
roughnessFactor = mix(roughnessFactor, uNailFin > 0.5 ? (uNailFin > 1.5 ? 0.08 : 0.55) : 0.1, clamp(wNail * 1.4, 0.0, 1.0));
roughnessFactor = mix(roughnessFactor, roughnessFactor * 0.45, clamp(mkFx.g * wFaceMk, 0.0, 1.0));`,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        /* glsl */ `
#include <metalnessmap_fragment>
metalnessFactor = max(metalnessFactor, wLips * uLipMetal);
metalnessFactor = max(metalnessFactor, clamp(mkFx.b * wFaceMk, 0.0, 1.0) * 0.85);
metalnessFactor = max(metalnessFactor, step(1.5, uNailFin) * clamp(wNail * 1.4, 0.0, 1.0) * 0.9);`,
      )
      .replace(
        '#include <lights_physical_fragment>',
        /* glsl */ `
#include <lights_physical_fragment>
#ifdef USE_CLEARCOAT
  material.clearcoat = mix(mix(uCcSkin, uCcSuit, wSuitFx), 1.0, wFeat * 0.8);
  material.clearcoatRoughness = mix(mix(uCcrSkin, uCcrSuit, wSuitFx), 0.04, wFeat * 0.8);
  material.clearcoat *= 1.0 - wLips * uLipMatte;
  material.clearcoat = mix(material.clearcoat, uNailFin > 0.5 ? 0.0 : 1.0, clamp(wNail * 1.4, 0.0, 1.0));
  material.clearcoat = max(material.clearcoat, clamp(mkFx.g * wFaceMk, 0.0, 1.0) * 0.6);
#endif
#ifdef USE_SHEEN
  material.sheenColor = mix(uShSkin, uShSuit, wSuitFx) * (1.0 - wFeat);
#endif`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `
#include <emissivemap_fragment>
{
  float sp = dHash(floor(fuv * 760.0));
  float ph = fract(sp * 17.0 + dot(normalize(normal), normalize(vViewPosition)) * 9.0);
  float spark = step(0.9, sp) * smoothstep(0.55, 0.9, ph) * clamp(mkFx.r * wFaceMk, 0.0, 1.0);
  totalEmissiveRadiance += vec3(1.0, 0.93, 0.82) * spark * 1.4;
  float nsp = dHash(floor(vMapUv * 1900.0));
  float nph = fract(nsp * 23.0 + dot(normalize(normal), normalize(vViewPosition)) * 11.0);
  totalEmissiveRadiance += vec3(1.0, 0.95, 0.9) * step(0.8, nsp) * smoothstep(0.6, 0.95, nph) * step(2.5, uNailStyle) * step(3.5, uNailStyle) * wNail * 0.8;
}`,
      )
  }
  material.customProgramCacheKey = () => 'doll-body-v2'
  return { material, uniforms }
}

export interface BodyLook {
  skin: string
  suit: string
  finish: SuitFinish
  /** base do corpo (ver BodyBase): tudo menos 'color' pinta o macacao com o tom da pele */
  suitBase?: 'auto' | 'under' | 'color'
  /** top/vestido e saia/calca/vestido equipados (base vira pele sob a roupa; so no modo 'auto') */
  covered?: { up: boolean; low: boolean }
  skinFinish?: SkinFinish
  bodyFreckles?: number
  lips?: { color: string; gloss: number }
  lipFinish?: LipFinish
  hair?: string
  /** iris: null = pintada original */
  eyes?: { l: string | null; r: string | null; ring: number }
  /** sobrancelha pintada: 'keep' | 'tint' (cor) | 'erase' (a maquiagem desenha outra) */
  brow?: { mode: 'keep' | 'tint' | 'erase'; color: string }
  lash?: { color: string | null }
  nails?: { style: number; c1: string; c2: string; fin: number }
}

export function applyBodyLook(m: DollBodyMaterial, look: BodyLook) {
  const U = m.uniforms
  ;(U.uSkin.value as Color).set(look.skin)
  ;(U.uSuit.value as Color).set(look.suit)
  const sb = look.suitBase ?? 'color'
  U.uSuitSkin.value = sb === 'color' ? 0 : 1
  U.uUnderOn.value = sb === 'auto' || sb === 'under' ? 1 : 0
  U.uCovUp.value = sb === 'auto' && look.covered?.up ? 1 : 0
  U.uCovLow.value = sb === 'auto' && look.covered?.low ? 1 : 0
  const nude = look.suit.toLowerCase() === NUDE_UNDER
  ;(U.uUnder.value as Color).set(nude ? look.skin : look.suit)
  if (nude) (U.uUnder.value as Color).multiplyScalar(0.9).lerp(new Color('#d9a98d'), 0.1)
  const f = FINISHES[sb === 'auto' || sb === 'under' ? 'satin' : look.finish]
  U.uRoughSuit.value = f.rough
  U.uCcSuit.value = f.cc
  U.uCcrSuit.value = f.ccRough
  ;(U.uShSuit.value as Color).setScalar(f.sheen).multiply(new Color(nude ? look.skin : look.suit).lerp(new Color('#ffffff'), 0.5))
  const sf = SKIN_FINISHES[look.skinFinish ?? 'natural']
  U.uRoughSkin.value = sf.rough
  U.uCcSkin.value = sf.cc
  U.uCcrSkin.value = sf.ccr
  ;(U.uShSkin.value as Color).set(look.skin).lerp(new Color('#ffffff'), 0.5).multiplyScalar(sf.sheen)
  U.uBodyFreck.value = look.bodyFreckles ?? 0
  if (look.hair) (U.uHairBody.value as Color).set(look.hair)
  if (look.lips) {
    ;(U.uLips.value as Color).set(look.lips.color)
    U.uUseLips.value = 1
    const g = look.lips.gloss
    const fin = look.lipFinish ?? 'satin'
    U.uLipRough.value = fin === 'matte' ? 0.72 : fin === 'gloss' ? 0.07 + (1 - g) * 0.1 : fin === 'metallic' ? 0.22 : 0.5 - g * 0.38
    U.uLipMatte.value = fin === 'matte' ? 1 : 0
    U.uLipMetal.value = fin === 'metallic' ? 0.8 : 0
  } else {
    U.uUseLips.value = 0
    U.uLipRough.value = 0.4
    U.uLipMatte.value = 0
    U.uLipMetal.value = 0
  }
  const e = look.eyes
  if (e && (e.l || e.r)) {
    U.uIrisOn.value = 1
    ;(U.uIrisL.value as Color).set(e.l ?? e.r ?? '#5a9fd4')
    ;(U.uIrisR.value as Color).set(e.r ?? e.l ?? '#5a9fd4')
    U.uIrisRing.value = e.ring
  } else {
    U.uIrisOn.value = 0
    U.uIrisRing.value = e?.ring ?? 0
  }
  const b = look.brow
  U.uBrowMode.value = !b || b.mode === 'keep' ? 0 : b.mode === 'tint' ? 1 : 2
  if (b) (U.uBrow.value as Color).set(b.color)
  U.uLashOn.value = look.lash?.color ? 1 : 0
  if (look.lash?.color) (U.uLash.value as Color).set(look.lash.color)
  const n = look.nails
  U.uNailStyle.value = n?.style ?? 0
  if (n) {
    ;(U.uNail1.value as Color).set(n.c1)
    ;(U.uNail2.value as Color).set(n.c2)
    U.uNailFin.value = n.fin
  }
}

/** Liga/desliga as texturas de maquiagem (null = sem maquiagem). */
export function setMakeupTextures(m: DollBodyMaterial, color: Texture | null, fx: Texture | null, blank: Texture) {
  m.uniforms.uMk.value = color ?? blank
  m.uniforms.uMkFx.value = fx ?? blank
  m.uniforms.uUseMk.value = color ? 1 : 0
}

/** Cabelo: recolore mantendo o detalhe de luminancia (mechas/brilho); ombre/mechas/bicolor; brilho ajustavel. */
export function createHairMaterial(map: Texture | null, normalMap: Texture | null, refLum = REF_HAIR_LUM): { material: MeshPhysicalMaterial; uniforms: U } {
  const uniforms: U = {
    uHair: u(new Color('#d8b46e')),
    uHair2: u(new Color('#d8b46e')),
    uHairMode: u(0),
    uHairAmt: u(0.5),
    uRefLum: u(refLum),
    uYMin: u(0),
    uYMax: u(2),
    uHairGloss: u(0.5),
    uClipOn: u(0),
    uClipC: u(new Vector3()),
    uClipR: u(new Vector3(1, 1, 1)),
    uClipMinY: u(0),
    uClipSoft: u(0.02),
  }
  const material = new MeshPhysicalMaterial({
    map,
    normalMap,
    roughness: 0.35,
    metalness: 0,
    sheen: 0.6,
    sheenRoughness: 0.4,
    sheenColor: new Color('#ffffff'),
    clearcoat: 0.15,
    clearcoatRoughness: 0.4,
    side: 2, // DoubleSide
  })
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vHairPos;\nuniform float uClipOn; uniform vec3 uClipC; uniform vec3 uClipR; uniform float uClipMinY; uniform float uClipSoft;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHairPos = position;\nif (uClipOn > 0.5) { vec3 cq = (position - uClipC) / uClipR; float cd = length(cq); if (cd > 1.0) { float cw = smoothstep(uClipMinY, uClipMinY + max(uClipSoft, 1e-3), position.y); transformed = mix(position, uClipC + cq / cd * uClipR, cw); } }')
    shader.fragmentShader = shader.fragmentShader
      .replace(
        'void main() {',
        /* glsl */ `
varying vec3 vHairPos;
uniform vec3 uHair; uniform vec3 uHair2; uniform float uHairMode; uniform float uHairAmt; uniform float uRefLum; uniform float uYMin; uniform float uYMax; uniform float uHairGloss;
uniform float uClipOn; uniform vec3 uClipC; uniform vec3 uClipR; uniform float uClipMinY; uniform float uClipSoft;
float hHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {`,
      )
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
float hairT = 0.0;
{
  float d = 1.0 - clamp((vHairPos.y - uYMin) / max(uYMax - uYMin, 1e-3), 0.0, 1.0); // 0 raiz .. 1 ponta
  float c = 0.8 - 0.55 * uHairAmt;
  if (uHairMode > 0.5 && uHairMode < 1.5) hairT = smoothstep(c - 0.28, c + 0.22, d);
  else if (uHairMode > 2.5) hairT = smoothstep(c - 0.025, c + 0.025, d);
  else if (uHairMode > 1.5) {
    float id = hHash(floor(vec2(vHairPos.x * 170.0 + vHairPos.z * 90.0, vHairPos.z * 170.0)));
    float band = hHash(vec2(floor(vHairPos.y * 9.0), id));
    hairT = step(1.0 - uHairAmt * 0.55, id) * (0.55 + 0.45 * band);
  }
}
vec3 hairCol = mix(uHair, uHair2, hairT);
#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D( map, vMapUv );
  float hl = dot(sampledDiffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  float hr = clamp(hl / uRefLum, 0.4, 1.3);
  diffuseColor.rgb *= hairCol * mix(1.0, hr, 0.85);
#else
  diffuseColor.rgb *= hairCol;
#endif`,
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.6, 0.12, uHairGloss);')
      .replace(
        '#include <lights_physical_fragment>',
        '#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\nmaterial.clearcoat = uHairGloss * 0.3;\nmaterial.clearcoatRoughness = mix(0.5, 0.25, uHairGloss);\n#endif',
      )
  }
  material.customProgramCacheKey = () => 'doll-hair-v4'
  return { material, uniforms }
}
