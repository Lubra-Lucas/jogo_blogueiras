import { Color, MeshPhysicalMaterial, type IUniform, type Texture, type WebGLProgramParametersWithUniforms } from 'three'
import { MALE_REF, onKitLoad, type FaceLayers } from './maleFace'
import { FL_COAT, FL_DECL, FL_BODY, FL_ROUGH, applyFaceLayers, createFaceLayerUniforms } from './faceLayerShader'

/**
 * Material do corpo MASCULINO (male_base.glb): pele limpa + boxer por mascara (mesma convencao do dollMaterial.ts:
 * male_mask.png R = pele, G = base/boxer) e o ROSTO por camadas em tempo real (faceLayerShader.ts, compartilhado com a boneca).
 * Cada instancia tem os proprios uniforms; as camadas usam o prefixo `uFl` (nunca colidem com nada).
 */

// referencias do dollMaterial.ts (o PNG do corpo masculino e pintado com elas: tingimento exato)
const REF_SKIN = [0.844, 0.527, 0.456]
const REF_SUIT = [0.866, 0.337, 0.405]

type U = Record<string, IUniform>
const u = <T,>(value: T): IUniform<T> => ({ value })

export interface MaleBodyMaterial {
  material: MeshPhysicalMaterial
  uniforms: U
  setFace: (f: FaceLayers) => void
  setLook: (skin: string, suit: string, hair?: string) => void
  dispose: () => void
}

export function createMaleMaterial(map: Texture | null, mask: Texture, initial: FaceLayers): MaleBodyMaterial {
  const uniforms: U = {
    ...createFaceLayerUniforms(MALE_REF, [1.4, 1.72]),
    uMask: u(mask),
    uSkin: u(new Color('#efcdbd')),
    uHairBody: u(new Color('#d8b46e')),
    uSuit: u(new Color('#2a4fa8')),
    uRoughSkin: u(0.5),
    uRoughSuit: u(0.55),
  }
  const material = new MeshPhysicalMaterial({
    map, roughness: 0.5, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.4, sheen: 0.6, sheenRoughness: 0.5, sheenColor: new Color('#ffe6dc'),
  })
  material.defines = { ...(material.defines ?? {}), FL_DETAIL: '' }
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
uniform sampler2D uMask; uniform vec3 uHairBody; uniform vec3 uSkin; uniform vec3 uSuit; uniform float uRoughSkin; uniform float uRoughSuit;
float mSuit = 0.0;
${FL_DECL}
void main() {`,
      )
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
#ifdef USE_MAP
  vec4 mfTex = texture2D( map, vMapUv );
  vec3 mk = texture2D( uMask, vMapUv ).rgb;
  float msum = max(mk.r + mk.g, 1e-3);
  float wSkin = mk.r / msum; float wSuit = mk.g / msum;
  mSuit = wSuit;
  float tl = max(dot(mfTex.rgb, vec3(0.2126, 0.7152, 0.0722)), 1e-3);
  vec3 refSkin = vec3(${REF_SKIN.join(',')}); vec3 refSuit = vec3(${REF_SUIT.join(',')});
  vec3 skinCol = uSkin * clamp(tl / dot(refSkin, vec3(0.2126, 0.7152, 0.0722)), 0.9, 1.08);
  vec3 suitCol = uSuit * clamp(tl / dot(refSuit, vec3(0.2126, 0.7152, 0.0722)), 0.6, 1.3);
  vec3 base = skinCol * wSkin + suitCol * wSuit;
  base = mix(base, uHairBody * clamp(tl / 0.412, 0.4, 1.0), clamp(mk.b, 0.0, 1.0));
  ${FL_BODY}
  diffuseColor.rgb *= base;
#endif`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        /* glsl */ `
#include <roughnessmap_fragment>
roughnessFactor = mix(uRoughSkin, uRoughSuit, mSuit);${FL_ROUGH}`,
      )
      .replace(
        '#include <lights_physical_fragment>',
        /* glsl */ `
#include <lights_physical_fragment>
#ifdef USE_CLEARCOAT
  material.clearcoat = mix(0.2, 0.55, mSuit);
  material.clearcoatRoughness = 0.4;
#endif
${FL_COAT}`,
      )
  }
  material.customProgramCacheKey = () => 'male-body-v4'

  let current = initial
  const setFace = (f: FaceLayers) => {
    current = f
    applyFaceLayers(uniforms, f, MALE_REF)
  }
  const setLook = (skin: string, suit: string, hair?: string) => {
    ;(uniforms.uSkin.value as Color).set(skin)
    ;(uniforms.uSuit.value as Color).set(suit)
    if (hair) (uniforms.uHairBody.value as Color).set(hair)
  }
  setFace(initial)
  // quando uma textura do kit termina de carregar, reaplica o rosto (sempre com o estado ATUAL deste material)
  const off = onKitLoad(() => setFace(current))
  return { material, uniforms, setFace, setLook, dispose: () => { off(); material.dispose() } }
}
