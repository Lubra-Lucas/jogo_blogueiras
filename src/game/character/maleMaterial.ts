import { Color, MeshPhysicalMaterial, Vector2, Vector4, type IUniform, type Texture, type WebGLProgramParametersWithUniforms } from 'three'
import { BEARD_CANVAS, BLANK_LAYER, FACE_REF, KIT_CANVAS, LINES_CANVAS, kitFor, onKitLoad, type MaleFace } from './maleFace'

/**
 * Material do corpo MASCULINO (male_base.glb): pele limpa + boxer por mascara (mesma convencao do dollMaterial.ts:
 * male_mask.png R = pele, G = base/boxer) e o ROSTO MONTADO POR CAMADAS em tempo real (maleFace.ts).
 *
 * Camadas do rosto: PNGs com alfa (sclera, iris, brilho, delineado, cilios, sobrancelha, labios, brilho dos labios, blush) projetados de
 * frente no espaco de repouso da malha (`vRest.xy`, antes de morphs e skinning => acompanham os dois). Olho, cilios, sobrancelha e blush
 * usam UM conjunto de parametros para os dois lados: o lado e o sinal de x e o x e espelhado, entao "distancia entre os olhos" e a
 * mesma conta. Trocar o estilo/cor so troca uniforms (nenhuma recompilacao, nenhuma textura reassada).
 */

// referencias do dollMaterial.ts (o PNG do corpo masculino e pintado com elas: tingimento exato)
const REF_SKIN = [0.844, 0.527, 0.456]
const REF_SUIT = [0.866, 0.337, 0.405]

type U = Record<string, IUniform>
const u = <T,>(value: T): IUniform<T> => ({ value })

export interface MaleBodyMaterial {
  material: MeshPhysicalMaterial
  uniforms: U
  setFace: (f: MaleFace) => void
  setLook: (skin: string, suit: string) => void
  dispose: () => void
}

export function createMaleMaterial(map: Texture | null, mask: Texture, initial: MaleFace): MaleBodyMaterial {
  const blank = BLANK_LAYER
  const uniforms: U = {
    uMask: u(mask),
    uSkin: u(new Color('#efcdbd')),
    uSuit: u(new Color('#2a4fa8')),
    uFaceOn: u(1),
    uRoughSkin: u(0.5),
    uRoughSuit: u(0.55),
    // olho
    uEyeP: u(new Vector4(FACE_REF.eyeX, FACE_REF.eyeY, 1, 0)),
    uEyeSize: u(new Vector2(...KIT_CANVAS.eye)),
    uSclera: u(blank), uIris: u(blank), uHi: u(blank), uLine: u(blank), uLash: u(blank),
    uIrisCol: u(new Color('#6b4a32')), uLinerCol: u(new Color('#2a201e')), uLashCol: u(new Color('#1c1514')),
    uLinerAmt: u(1), uLashOn: u(1),
    // sobrancelha
    uBrowP: u(new Vector4(FACE_REF.browX, FACE_REF.browY, 1, 0)),
    uBrowSize: u(new Vector2(...KIT_CANVAS.brow)),
    uBrowTex: u(blank), uBrowCol: u(new Color('#4a3326')), uBrowOp: u(0.92),
    // boca
    uMouthP: u(new Vector4(0, FACE_REF.mouthY, 1, 0)),
    uMouthSize: u(new Vector2(...KIT_CANVAS.mouth)),
    uLips: u(blank), uGloss: u(blank), uLipCol: u(new Color('#b87068')), uGlossAmt: u(0.2), uLipOp: u(0.9),
    // blush
    uBlushP: u(new Vector4(0.058, FACE_REF.eyeY - 0.03, 1, 0)),
    uBlushSize: u(new Vector2(...KIT_CANVAS.blush)),
    uBlush: u(blank), uBlushCol: u(new Color('#e0707c')), uBlushAmt: u(0),
    // barba, olheira, linhas
    uBeard: u(blank), uBeardCol: u(new Color('#2c211b')), uBeardAmt: u(0),
    uBags: u(blank), uBagsAmt: u(0), uLines: u(blank), uLinesAmt: u(0),
  }
  const material = new MeshPhysicalMaterial({
    map, roughness: 0.5, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.4, sheen: 0.6, sheenRoughness: 0.5, sheenColor: new Color('#ffe6dc'),
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
uniform sampler2D uMask;
uniform float uFaceOn; uniform vec3 uSkin; uniform vec3 uSuit; uniform float uRoughSkin; uniform float uRoughSuit;
uniform vec4 uEyeP; uniform vec2 uEyeSize; uniform sampler2D uSclera; uniform sampler2D uIris; uniform sampler2D uHi; uniform sampler2D uLine; uniform sampler2D uLash;
uniform vec3 uIrisCol; uniform vec3 uLinerCol; uniform vec3 uLashCol; uniform float uLinerAmt; uniform float uLashOn;
uniform vec4 uBrowP; uniform vec2 uBrowSize; uniform sampler2D uBrowTex; uniform vec3 uBrowCol; uniform float uBrowOp;
uniform vec4 uMouthP; uniform vec2 uMouthSize; uniform sampler2D uLips; uniform sampler2D uGloss; uniform vec3 uLipCol; uniform float uGlossAmt; uniform float uLipOp;
uniform vec4 uBlushP; uniform vec2 uBlushSize; uniform sampler2D uBlush; uniform vec3 uBlushCol; uniform float uBlushAmt;
uniform sampler2D uBeard; uniform vec3 uBeardCol; uniform float uBeardAmt; uniform sampler2D uBags; uniform float uBagsAmt; uniform sampler2D uLines; uniform float uLinesAmt;
float mfEye = 0.0; float mfGloss = 0.0; float mfSuit = 0.0;
// amostra uma camada do kit: p = posicao no rosto (m), c = centro, rot (rad), sx = lado (+1/-1: espelha x)
vec4 mfLayer(sampler2D t, vec2 p, vec2 c, vec2 size, float sc, float rot, float sx) {
  vec2 d = p - c; d.x *= sx;
  float cs = cos(rot); float sn = sin(rot);
  d = vec2(cs * d.x + sn * d.y, -sn * d.x + cs * d.y);
  vec2 uv = d / (size * sc) + 0.5;
  vec2 inb = step(vec2(0.0), uv) * step(uv, vec2(1.0));
  return texture2D(t, uv) * (inb.x * inb.y);
}
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
  mfSuit = wSuit;
  float tl = max(dot(mfTex.rgb, vec3(0.2126, 0.7152, 0.0722)), 1e-3);
  vec3 refSkin = vec3(${REF_SKIN.join(',')}); vec3 refSuit = vec3(${REF_SUIT.join(',')});
  vec3 skinCol = uSkin * clamp(tl / dot(refSkin, vec3(0.2126, 0.7152, 0.0722)), 0.9, 1.08);
  vec3 suitCol = uSuit * clamp(tl / dot(refSuit, vec3(0.2126, 0.7152, 0.0722)), 0.6, 1.3);
  vec3 base = skinCol * wSkin + suitCol * wSuit;
  // ---------- rosto por camadas (so na frente da cabeca)
  vec2 fp = vRest.xy;
  float side = vRest.x >= 0.0 ? 1.0 : -1.0;
  float wFace = smoothstep(0.08, 0.35, vRestN.z) * step(1.40, vRest.y) * step(vRest.y, 1.72) * step(abs(vRest.x), 0.12) * wSkin * uFaceOn;
  // blush (sob tudo)
  float bl = mfLayer(uBlush, fp, vec2(side * uBlushP.x, uBlushP.y), uBlushSize, uBlushP.z, 0.0, side).a * uBlushAmt * wFace;
  base = mix(base, uBlushCol, clamp(bl, 0.0, 1.0) * 0.75);
  vec2 ec = vec2(side * uEyeP.x, uEyeP.y);
  // olheira (multiplica a pele), linhas de expressao e barba (por baixo dos olhos/labios)
  float bg = mfLayer(uBags, fp, ec, uEyeSize, uEyeP.z, uEyeP.w, side).a * uBagsAmt * wFace;
  base *= mix(vec3(1.0), vec3(0.80, 0.64, 0.70), clamp(bg, 0.0, 1.0));
  float lgA = mfLayer(uLines, fp, vec2(${LINES_CANVAS.center[0]}, ${LINES_CANVAS.center[1]}), vec2(${LINES_CANVAS.size[0]}, ${LINES_CANVAS.size[1]}), 1.0, 0.0, 1.0).a * uLinesAmt * wFace;
  base *= mix(vec3(1.0), vec3(0.62, 0.48, 0.44), clamp(lgA, 0.0, 1.0));
  float wBeard = smoothstep(-0.25, 0.2, vRestN.z) * step(1.425, vRest.y) * step(vRest.y, 1.585) * step(abs(vRest.x), 0.10) * wSkin * uFaceOn;
  float bdA = mfLayer(uBeard, fp, vec2(${BEARD_CANVAS.center[0]}, ${BEARD_CANVAS.center[1]}), vec2(${BEARD_CANVAS.size[0]}, ${BEARD_CANVAS.size[1]}), 1.0, 0.0, 1.0).a * uBeardAmt * wBeard;
  base = mix(base, uBeardCol, clamp(bdA, 0.0, 1.0));
  vec4 sc = mfLayer(uSclera, fp, ec, uEyeSize, uEyeP.z, uEyeP.w, side);
  base = mix(base, sc.rgb, sc.a * wFace);
  mfEye = sc.a * wFace;
  vec4 ir = mfLayer(uIris, fp, ec, uEyeSize, uEyeP.z, uEyeP.w, side);
  base = mix(base, uIrisCol * ir.rgb * 1.35, ir.a * wFace);
  vec4 hi = mfLayer(uHi, fp, ec, uEyeSize, uEyeP.z, uEyeP.w, side);
  base = mix(base, hi.rgb, hi.a * wFace);
  vec4 ln = mfLayer(uLine, fp, ec, uEyeSize, uEyeP.z, uEyeP.w, side);
  base = mix(base, uLinerCol, ln.a * uLinerAmt * wFace);
  vec4 ls = mfLayer(uLash, fp, ec, uEyeSize, uEyeP.z, uEyeP.w, side);
  base = mix(base, uLashCol, ls.a * uLashOn * uLinerAmt * wFace);
  vec4 br = mfLayer(uBrowTex, fp, vec2(side * uBrowP.x, uBrowP.y), uBrowSize, uBrowP.z, uBrowP.w, side);
  base = mix(base, uBrowCol * (0.55 + 0.45 * br.r), br.a * uBrowOp * wFace);
  vec4 lp = mfLayer(uLips, fp, vec2(uMouthP.x, uMouthP.y), uMouthSize, uMouthP.z, 0.0, 1.0);
  base = mix(base, uLipCol * lp.rgb * 1.25, lp.a * uLipOp * wFace);
  vec4 gl = mfLayer(uGloss, fp, vec2(uMouthP.x, uMouthP.y), uMouthSize, uMouthP.z, 0.0, 1.0);
  base = mix(base, vec3(1.0), clamp(gl.a * uGlossAmt * wFace, 0.0, 1.0) * 0.85);
  mfGloss = gl.a * uGlossAmt * wFace;
  diffuseColor.rgb *= base;
#endif`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        /* glsl */ `
#include <roughnessmap_fragment>
roughnessFactor = mix(uRoughSkin, uRoughSuit, mfSuit);
roughnessFactor = mix(roughnessFactor, 0.1, clamp(mfEye, 0.0, 1.0));
roughnessFactor = mix(roughnessFactor, 0.12, clamp(mfGloss * 1.4, 0.0, 1.0));`,
      )
      .replace(
        '#include <lights_physical_fragment>',
        /* glsl */ `
#include <lights_physical_fragment>
#ifdef USE_CLEARCOAT
  material.clearcoat = max(mix(0.2, 0.55, mfSuit), max(mfEye, clamp(mfGloss * 1.4, 0.0, 1.0)));
  material.clearcoatRoughness = mix(0.4, 0.05, max(mfEye, clamp(mfGloss, 0.0, 1.0)));
#endif`,
      )
  }
  material.customProgramCacheKey = () => 'male-body-v2'

  let current = initial
  const setFace = (f: MaleFace) => {
    current = f
    const k = kitFor(f)
    uniforms.uSclera.value = k.sclera; uniforms.uIris.value = k.iris; uniforms.uHi.value = k.hi; uniforms.uLine.value = k.line
    uniforms.uLash.value = k.lash ?? k.line
    uniforms.uLashOn.value = k.lash ? 1 : 0
    uniforms.uBrowTex.value = k.brow; uniforms.uLips.value = k.lips; uniforms.uGloss.value = k.gloss; uniforms.uBlush.value = k.blush
    const e = f.eye
    ;(uniforms.uEyeP.value as Vector4).set(FACE_REF.eyeX + e.gap, FACE_REF.eyeY + e.y, e.scale, (e.tilt * Math.PI) / 180)
    ;(uniforms.uIrisCol.value as Color).set(e.iris); (uniforms.uLinerCol.value as Color).set(e.liner); (uniforms.uLashCol.value as Color).set(e.lashColor)
    uniforms.uLinerAmt.value = e.linerAmt
    const b = f.brow
    ;(uniforms.uBrowP.value as Vector4).set(FACE_REF.browX + b.gap, FACE_REF.browY + b.y, b.scale, (b.tilt * Math.PI) / 180)
    ;(uniforms.uBrowCol.value as Color).set(b.color); uniforms.uBrowOp.value = b.opacity
    const m = f.mouth
    ;(uniforms.uMouthP.value as Vector4).set(0, FACE_REF.mouthY + m.y, m.scale, 0)
    ;(uniforms.uLipCol.value as Color).set(m.color); uniforms.uGlossAmt.value = m.gloss; uniforms.uLipOp.value = m.opacity
    const bl = f.blush
    ;(uniforms.uBlushP.value as Vector4).set(0.058 + bl.gap, FACE_REF.eyeY - 0.03 + bl.y, bl.scale, 0)
    ;(uniforms.uBlushCol.value as Color).set(bl.color); uniforms.uBlushAmt.value = bl.amount
    uniforms.uBeard.value = k.beard ?? blank
    ;(uniforms.uBeardCol.value as Color).set(f.beard.color); uniforms.uBeardAmt.value = k.beard ? f.beard.amount : 0
    uniforms.uBags.value = k.bags; uniforms.uBagsAmt.value = f.detail.bags
    uniforms.uLines.value = k.lines; uniforms.uLinesAmt.value = f.detail.lines
  }
  const setLook = (skin: string, suit: string) => {
    ;(uniforms.uSkin.value as Color).set(skin); (uniforms.uSuit.value as Color).set(suit)
  }
  setFace(initial)
  const off = onKitLoad(() => setFace(current))
  return { material, uniforms, setFace, setLook, dispose: () => { off(); material.dispose() } }
}
