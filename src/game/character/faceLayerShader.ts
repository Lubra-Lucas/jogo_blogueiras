import { Color, Vector2, Vector4, type IUniform } from 'three'
import { BLANK_LAYER, CLASSIC_CANVAS, DETAIL_CANVAS, KIT_CANVAS, kitFor, type FaceLayers, type FaceRef } from './maleFace'

/**
 * Camadas do rosto em tempo real: uniforms + GLSL compartilhados pelos materiais da BONECA (dollMaterial.ts) e do MASCULINO (maleMaterial.ts).
 * Todos os uniforms levam o prefixo `uFl` (e as variaveis GLSL `fl*`) para NUNCA colidir com os do shader da boneca (`uLashOn`, `uBrowMode`...).
 * Cada material tem os seus uniforms (nada global); so as texturas do kit sao compartilhadas (cache em maleFace.ts).
 */
type U = Record<string, IUniform>
const u = <T,>(value: T): IUniform<T> => ({ value })

export function createFaceLayerUniforms(ref: FaceRef, faceY: [number, number]): U {
  const blank = BLANK_LAYER
  return {
    uFlFaceOn: u(1),
    uFlFaceY: u(new Vector2(faceY[0], faceY[1])),
    uFlEyeFull: u(0), uFlBrowFull: u(0), uFlLipFull: u(0), uFlBlushMode: u(0),
    uFlEyeP: u(new Vector4(ref.eyeX, ref.eyeY, 1, 0)),
    uFlEyeSize: u(new Vector2(...KIT_CANVAS.eye)),
    uFlSclera: u(blank), uFlIrisTex: u(blank), uFlFx: u(blank),
    uFlIrisCol: u(new Color('#6b4a32')), uFlLinerCol: u(new Color('#2a201e')), uFlLashCol: u(new Color('#1c1514')),
    uFlLinerAmt: u(1),
    uFlBrowP: u(new Vector4(ref.browX, ref.browY, 1, 0)),
    uFlBrowSize: u(new Vector2(...KIT_CANVAS.brow)),
    uFlBrowTex: u(blank), uFlBrowCol: u(new Color('#4a3326')), uFlBrowOp: u(0.92),
    uFlMouthP: u(new Vector4(0, ref.mouthY, 1, 0)),
    uFlMouthSize: u(new Vector2(...KIT_CANVAS.mouth)),
    uFlMouthTex: u(blank), uFlLipCol: u(new Color('#b87068')), uFlGlossAmt: u(0.2), uFlLipOp: u(0.9),
    uFlBlushP: u(new Vector4(ref.blushX, ref.blushY, 1, 0)),
    uFlBlushSize: u(new Vector2(...KIT_CANVAS.blush)),
    uFlBlush: u(blank), uFlBlushCol: u(new Color('#e0707c')), uFlBlushAmt: u(0),
    uFlDetail: u(blank), uFlBeardCol: u(new Color('#2c211b')), uFlBeardAmt: u(0), uFlBagsAmt: u(0), uFlLinesAmt: u(0),
  }
}

/** Grava o estado do rosto (`FaceLayers`) nos uniforms DESTE material. Idempotente (chamado de novo quando uma textura do kit termina de carregar). */
export function applyFaceLayers(uniforms: U, f: FaceLayers, ref: FaceRef): void {
  const k = kitFor(f)
  const v = (n: string) => uniforms[n].value
  uniforms.uFlSclera.value = k.sclera
  uniforms.uFlIrisTex.value = k.iris
  uniforms.uFlFx.value = k.fx
  uniforms.uFlBrowTex.value = k.brow
  uniforms.uFlMouthTex.value = k.mouth
  uniforms.uFlBlush.value = k.blush
  uniforms.uFlDetail.value = k.detail
  uniforms.uFlEyeFull.value = f.eye.style === 'classic' ? 1 : 0
  uniforms.uFlBrowFull.value = f.brow.style === 'classic' ? 1 : 0
  uniforms.uFlLipFull.value = f.mouth.style === 'classic' ? 1 : 0
  uniforms.uFlBlushMode.value = f.blush.shade ? 1 : 0
  const e = f.eye
  ;(v('uFlEyeP') as Vector4).set(ref.eyeX + e.gap, ref.eyeY + e.y, e.scale, (e.tilt * Math.PI) / 180)
  ;(v('uFlIrisCol') as Color).set(e.iris)
  ;(v('uFlLinerCol') as Color).set(e.liner)
  ;(v('uFlLashCol') as Color).set(e.lashColor)
  uniforms.uFlLinerAmt.value = e.linerAmt
  const b = f.brow
  ;(v('uFlBrowP') as Vector4).set(ref.browX + b.gap, ref.browY + b.y, b.scale, (b.tilt * Math.PI) / 180)
  ;(v('uFlBrowCol') as Color).set(b.color)
  uniforms.uFlBrowOp.value = b.opacity
  const m = f.mouth
  ;(v('uFlMouthP') as Vector4).set(0, ref.mouthY + m.y, m.scale, 0)
  ;(v('uFlLipCol') as Color).set(m.color)
  uniforms.uFlGlossAmt.value = m.gloss
  uniforms.uFlLipOp.value = m.opacity
  const bl = f.blush
  ;(v('uFlBlushP') as Vector4).set(ref.blushX + bl.gap, ref.blushY + bl.y, bl.scale, 0)
  ;(v('uFlBlushCol') as Color).set(bl.color)
  uniforms.uFlBlushAmt.value = bl.amount
  ;(v('uFlBeardCol') as Color).set(f.beard.color)
  uniforms.uFlBeardAmt.value = f.beard.style === 'none' ? 0 : f.beard.amount
  uniforms.uFlBagsAmt.value = f.detail.bags
  uniforms.uFlLinesAmt.value = f.detail.lines
}

/** Declaracoes GLSL (uniforms + funcoes + globais `flEye`/`flGloss`), antes de `void main`. `#define FL_DETAIL` liga barba/olheira/linhas (masculino). */
export const FL_DECL = /* glsl */ `
uniform float uFlFaceOn; uniform vec2 uFlFaceY; uniform float uFlEyeFull; uniform float uFlBrowFull; uniform float uFlLipFull; uniform float uFlBlushMode;
uniform vec4 uFlEyeP; uniform vec2 uFlEyeSize; uniform sampler2D uFlSclera; uniform sampler2D uFlIrisTex; uniform sampler2D uFlFx;
uniform vec3 uFlIrisCol; uniform vec3 uFlLinerCol; uniform vec3 uFlLashCol; uniform float uFlLinerAmt;
uniform vec4 uFlBrowP; uniform vec2 uFlBrowSize; uniform sampler2D uFlBrowTex; uniform vec3 uFlBrowCol; uniform float uFlBrowOp;
uniform vec4 uFlMouthP; uniform vec2 uFlMouthSize; uniform sampler2D uFlMouthTex; uniform vec3 uFlLipCol; uniform float uFlGlossAmt; uniform float uFlLipOp;
uniform vec4 uFlBlushP; uniform vec2 uFlBlushSize; uniform sampler2D uFlBlush; uniform vec3 uFlBlushCol; uniform float uFlBlushAmt;
#ifdef FL_DETAIL
uniform sampler2D uFlDetail; uniform vec3 uFlBeardCol; uniform float uFlBeardAmt; uniform float uFlBagsAmt; uniform float uFlLinesAmt;
#endif
float flEye = 0.0; float flGloss = 0.0;
// amostra uma camada do kit: p = posicao no rosto (m), c = centro, rot (rad), sx = lado (+1/-1: espelha x)
vec4 flLayer(sampler2D t, vec2 p, vec2 c, vec2 size, float sc, float rot, float sx) {
  vec2 d = p - c; d.x *= sx;
  float cs = cos(rot); float sn = sin(rot);
  d = vec2(cs * d.x + sn * d.y, -sn * d.x + cs * d.y);
  vec2 uv = d / (size * sc) + 0.5;
  vec2 inb = step(vec2(0.0), uv) * step(uv, vec2(1.0));
  return texture2D(t, uv) * (inb.x * inb.y);
}
vec4 flFull(sampler2D t, vec2 p) {
  vec2 uv = (p - vec2(${CLASSIC_CANVAS.center[0]}, ${CLASSIC_CANVAS.center[1]})) / ${CLASSIC_CANVAS.size} + 0.5;
  vec2 inb = step(vec2(0.0), uv) * step(uv, vec2(1.0));
  return texture2D(t, uv) * (inb.x * inb.y);
}
`

/** Bloco GLSL: precisa de `vec3 base`, `float wSkin`, `vRest`, `vRestN`. Envolvido em { } (variaveis locais nao colidem). */
export const FL_BODY = /* glsl */ `
{
  vec2 fp = vRest.xy;
  float side = vRest.x >= 0.0 ? 1.0 : -1.0;
  float flW = smoothstep(0.08, 0.35, vRestN.z) * step(uFlFaceY.x, vRest.y) * step(vRest.y, uFlFaceY.y) * step(abs(vRest.x), 0.13) * wSkin * uFlFaceOn;
  float bl = flLayer(uFlBlush, fp, vec2(side * uFlBlushP.x, uFlBlushP.y), uFlBlushSize, uFlBlushP.z, 0.0, side).a * uFlBlushAmt * flW * (1.0 - uFlBlushMode);
  base = mix(base, uFlBlushCol, clamp(bl, 0.0, 1.0) * 0.75);
  vec4 shT = flFull(uFlBlush, fp);
  base *= mix(vec3(1.0), shT.rgb * 2.0, clamp(uFlBlushAmt, 0.0, 1.0) * flW * uFlBlushMode * shT.a);
  vec2 ec = vec2(side * uFlEyeP.x, uFlEyeP.y);
#ifdef FL_DETAIL
  vec2 duv = (fp - vec2(${DETAIL_CANVAS.center[0]}, ${DETAIL_CANVAS.center[1]})) / vec2(${DETAIL_CANVAS.size[0]}, ${DETAIL_CANVAS.size[1]}) + 0.5;
  vec2 dib = step(vec2(0.0), duv) * step(duv, vec2(1.0));
  vec3 dt = texture2D(uFlDetail, duv).rgb * (dib.x * dib.y);
  base *= mix(vec3(1.0), vec3(0.80, 0.64, 0.70), clamp(dt.b * uFlBagsAmt * flW, 0.0, 1.0));
  base *= mix(vec3(1.0), vec3(0.62, 0.48, 0.44), clamp(dt.g * uFlLinesAmt * flW, 0.0, 1.0));
  float wBeard = smoothstep(-0.25, 0.2, vRestN.z) * step(1.425, vRest.y) * step(vRest.y, 1.585) * step(abs(vRest.x), 0.10) * wSkin * uFlFaceOn;
  base = mix(base, uFlBeardCol, clamp(dt.r * uFlBeardAmt * wBeard, 0.0, 1.0));
#endif
  vec4 sc = mix(flLayer(uFlSclera, fp, ec, uFlEyeSize, uFlEyeP.z, uFlEyeP.w, side), flFull(uFlSclera, fp), uFlEyeFull);
  base = mix(base, sc.rgb, sc.a * flW);
  flEye = sc.a * flW;
  vec4 ir = mix(flLayer(uFlIrisTex, fp, ec, uFlEyeSize, uFlEyeP.z, uFlEyeP.w, side), flFull(uFlIrisTex, fp), uFlEyeFull);
  base = mix(base, uFlIrisCol * ir.rgb * 1.35, ir.a * flW);
  vec4 fx = mix(flLayer(uFlFx, fp, ec, uFlEyeSize, uFlEyeP.z, uFlEyeP.w, side), flFull(uFlFx, fp), uFlEyeFull);
  float nf = 1.0 - uFlEyeFull;
  base = mix(base, vec3(1.0), fx.r * nf * flW);
  base = mix(base, uFlLinerCol, fx.g * nf * uFlLinerAmt * flW);
  base = mix(base, uFlLashCol, fx.b * nf * uFlLinerAmt * flW);
  base = mix(base, fx.rgb, fx.a * uFlEyeFull * flW);
  vec4 br = mix(flLayer(uFlBrowTex, fp, vec2(side * uFlBrowP.x, uFlBrowP.y), uFlBrowSize, uFlBrowP.z, uFlBrowP.w, side), flFull(uFlBrowTex, fp), uFlBrowFull);
  base = mix(base, mix(uFlBrowCol * (0.55 + 0.45 * br.r), uFlBrowCol * br.rgb * 1.35, uFlBrowFull), br.a * uFlBrowOp * flW);
  vec4 mp = mix(flLayer(uFlMouthTex, fp, vec2(uFlMouthP.x, uFlMouthP.y), uFlMouthSize, uFlMouthP.z, 0.0, 1.0), flFull(uFlMouthTex, fp), uFlLipFull);
  float lipA = mix(mp.g, mp.a, uFlLipFull);
  vec3 lipRgb = mix(vec3(mp.r), mp.rgb, uFlLipFull);
  base = mix(base, uFlLipCol * lipRgb * mix(1.25, 1.35, uFlLipFull), lipA * uFlLipOp * flW);
  float glA = mp.b * (1.0 - uFlLipFull);
  base = mix(base, vec3(1.0), clamp(glA * uFlGlossAmt * flW, 0.0, 1.0) * 0.85);
  flGloss = max(glA * uFlGlossAmt * flW, lipA * uFlLipFull * uFlGlossAmt * flW);
}
`

/** Linhas de rugosidade/clearcoat das camadas (olho e brilho dos labios). */
export const FL_ROUGH = /* glsl */ `
roughnessFactor = mix(roughnessFactor, 0.1, clamp(flEye, 0.0, 1.0));
roughnessFactor = mix(roughnessFactor, 0.12, clamp(flGloss * 1.4, 0.0, 1.0));`
export const FL_COAT = /* glsl */ `
#ifdef USE_CLEARCOAT
  material.clearcoat = max(material.clearcoat, max(flEye, clamp(flGloss * 1.4, 0.0, 1.0)));
  material.clearcoatRoughness = mix(material.clearcoatRoughness, 0.05, max(flEye, clamp(flGloss, 0.0, 1.0)));
#endif`
