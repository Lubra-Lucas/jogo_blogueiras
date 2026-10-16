import { Color, MeshPhysicalMaterial, type IUniform, type Texture, type WebGLProgramParametersWithUniforms } from 'three'
import type { SuitFinish } from '../../shared/appearance'

/**
 * Materiais da boneca (MeshPhysicalMaterial + `onBeforeCompile`, sem node materials).
 *
 * Corpo: a textura baked do Meshy (pele + macacao rosa + feicoes pintadas) e recolorida no shader usando a
 * mascara de regiao (`doll_mask.png`, mesmo UV): R = pele, G = macacao, B = feicoes que nao tingem (olhos,
 * cilios, sobrancelhas, labios). A cor nova mantem o DETALHE de luminancia da textura (razao lum/lum_ref) e a
 * variacao de croma (blush/vermelhidao relativa a pele de referencia), entao tons escuros ficam ricos.
 * Rugosidade/clearcoat/sheen tambem variam por regiao (pele = vinil/porcelana, macacao = acabamento escolhido,
 * feicoes = olhos brilhantes). Os uniforms vivem em `uniforms` e sao atualizados sem recompilar.
 */

// referencias da textura original (linear): media da pele, do macacao, dos labios e do cabelo
const REF_SKIN = [0.844, 0.527, 0.456]
const REF_SUIT = [0.866, 0.337, 0.405]
const REF_LIPS = [0.705, 0.163, 0.18]
const REF_HAIR_LUM = 0.412

export const FINISHES: Record<SuitFinish, { rough: number; cc: number; ccRough: number; sheen: number }> = {
  latex: { rough: 0.12, cc: 1, ccRough: 0.04, sheen: 0 },
  satin: { rough: 0.35, cc: 0, ccRough: 0.3, sheen: 0.6 },
  matte: { rough: 0.7, cc: 0, ccRough: 0.5, sheen: 0 },
}

type U = Record<string, IUniform>

function u<T>(value: T): IUniform<T> {
  return { value }
}

export interface DollBodyMaterial {
  material: MeshPhysicalMaterial
  uniforms: U
}

/** Corpo da boneca. `map`/`normalMap` vem do GLB; `mask`/`mask2` sao texturas lineares (flipY=false). */
export function createBodyMaterial(map: Texture | null, normalMap: Texture | null, mask: Texture, mask2: Texture): DollBodyMaterial {
  const uniforms: U = {
    uMask: u(mask),
    uMask2: u(mask2),
    uSkin: u(new Color('#efcdbd')),
    uSuit: u(new Color('#f39ab3')),
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
    uLipGloss: u(0.8),
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
    shader.fragmentShader = shader.fragmentShader
      .replace(
        'void main() {',
        /* glsl */ `
uniform sampler2D uMask; uniform sampler2D uMask2;
uniform vec3 uHairBody; uniform vec3 uSkin; uniform vec3 uSuit; uniform vec3 uLips; uniform float uUseLips;
uniform float uRoughSkin; uniform float uRoughSuit; uniform float uCcSkin; uniform float uCcrSkin;
uniform float uCcSuit; uniform float uCcrSuit; uniform vec3 uShSkin; uniform vec3 uShSuit; uniform float uLipGloss;
float dLum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
void main() {
  float wSkin = 0.0; float wSuit = 0.0; float wFeat = 0.0; float wLips = 0.0; float wHl = 0.0;`,
      )
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D( map, vMapUv );
  vec3 mk = texture2D( uMask, vMapUv ).rgb;
  vec3 mk2 = texture2D( uMask2, vMapUv ).rgb;
  wLips = mk2.r * uUseLips; wHl = mk2.g;
  float msum = max(mk.r + mk.g + mk.b, 1e-3);
  wSkin = mk.r / msum; wSuit = mk.g / msum; wFeat = mk.b / msum;
  vec3 tex = sampledDiffuseColor.rgb;
  float tl = max(dLum(tex), 1e-3);
  // pele: luminancia/croma da textura sobre o tom escolhido (detalhe preservado: blush, sombras, vermelhidao)
  vec3 refSkin = vec3(${REF_SKIN.join(',')});
  vec3 chroma = clamp((tex / tl) / (refSkin / dLum(refSkin)), 0.6, 1.5);
  float rs = clamp(tl / dLum(refSkin), 0.6, 1.15);
  vec3 skinCol = uSkin * pow(rs, 1.15) * mix(vec3(1.0), chroma, 0.7);
  // macacao
  vec3 refSuit = vec3(${REF_SUIT.join(',')});
  vec3 suitCol = uSuit * clamp(tl / dLum(refSuit), 0.6, 1.3);
  // feicoes: textura original; labios opcionalmente tingidos pelo batom
  vec3 refLips = vec3(${REF_LIPS.join(',')});
  vec3 lipCol = tex * clamp(uLips / refLips, 0.0, 3.0); // multiplica a textura: igual ao original quando uLips = ref; mantem todo o sombreado
  vec3 featCol = mix(tex, lipCol, clamp(wLips, 0.0, 1.0));
  vec3 base = skinCol * wSkin + suitCol * wSuit + featCol * wFeat;
  base = mix(base, uHairBody * clamp(tl / ${REF_HAIR_LUM}, 0.4, 1.0), wHl);
  diffuseColor.rgb *= base;
#endif`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        /* glsl */ `
#include <roughnessmap_fragment>
roughnessFactor = mix(uRoughSkin, uRoughSuit, wSuit);
roughnessFactor = mix(roughnessFactor, 0.18, wFeat * 0.8);
roughnessFactor = mix(roughnessFactor, 0.12, wLips * uLipGloss);`,
      )
      .replace(
        '#include <lights_physical_fragment>',
        /* glsl */ `
#include <lights_physical_fragment>
#ifdef USE_CLEARCOAT
  material.clearcoat = mix(mix(uCcSkin, uCcSuit, wSuit), 1.0, wFeat * 0.8);
  material.clearcoatRoughness = mix(mix(uCcrSkin, uCcrSuit, wSuit), 0.04, wFeat * 0.8);
#endif
#ifdef USE_SHEEN
  material.sheenColor = mix(uShSkin, uShSuit, wSuit) * (1.0 - wFeat);
#endif`,
      )
  }
  material.customProgramCacheKey = () => 'doll-body-v1'
  return { material, uniforms }
}

export interface BodyLook {
  skin: string
  suit: string
  finish: SuitFinish
  lips?: { color: string; gloss: number }
  hair?: string
}

export function applyBodyLook(m: DollBodyMaterial, look: BodyLook) {
  const U = m.uniforms
  ;(U.uSkin.value as Color).set(look.skin)
  ;(U.uSuit.value as Color).set(look.suit)
  const f = FINISHES[look.finish]
  U.uRoughSuit.value = f.rough
  U.uCcSuit.value = f.cc
  U.uCcrSuit.value = f.ccRough
  ;(U.uShSuit.value as Color).setScalar(f.sheen).multiply(new Color(look.suit).lerp(new Color('#ffffff'), 0.5))
  ;(U.uShSkin.value as Color).set(look.skin).lerp(new Color('#ffffff'), 0.5).multiplyScalar(0.55)
  if (look.hair) (U.uHairBody.value as Color).set(look.hair)
  if (look.lips) {
    ;(U.uLips.value as Color).set(look.lips.color)
    U.uUseLips.value = 1
    U.uLipGloss.value = look.lips.gloss
  } else {
    U.uUseLips.value = 0
    U.uLipGloss.value = 0
  }
}

/** Cabelo: recolore mantendo o detalhe de luminancia (mechas/brilho); brilho suave de cabelo. */
export function createHairMaterial(map: Texture | null, normalMap: Texture | null, refLum = REF_HAIR_LUM): { material: MeshPhysicalMaterial; uniforms: U } {
  const uniforms: U = { uHair: u(new Color('#d8b46e')), uRefLum: u(refLum) }
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
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform vec3 uHair; uniform float uRefLum;\nvoid main() {')
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D( map, vMapUv );
  float hl = dot(sampledDiffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  float hr = clamp(hl / uRefLum, 0.4, 1.3);
  diffuseColor.rgb *= uHair * mix(1.0, hr, 0.85);
#else
  diffuseColor.rgb *= uHair;
#endif`,
      )
  }
  material.customProgramCacheKey = () => 'doll-hair-v3'
  return { material, uniforms }
}
