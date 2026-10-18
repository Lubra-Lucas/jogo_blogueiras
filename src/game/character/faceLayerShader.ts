import { Color, Vector2, Vector3, Vector4, type IUniform } from 'three'
import { BLANK_LAYER, CLASSIC_CANVAS, FACE_ATLAS, KIT_CANVAS, MALE_REF, BEARD_CANVAS, kitFor, type FaceLayers, type FaceRef } from './maleFace'
import { KIT_LAYOUT } from '../../shared/faceKit.generated'

/**
 * Camadas do rosto em tempo real: uniforms + GLSL compartilhados pelos materiais da BONECA (dollMaterial.ts) e do MASCULINO (maleMaterial.ts).
 * Todos os uniforms levam o prefixo `uFl` (e as variaveis GLSL `fl*`) para NUNCA colidir com os do shader da boneca.
 * Cada material tem os seus uniforms (nada global); so as texturas do kit sao compartilhadas (cache em maleFace.ts).
 *
 * Samplers de rosto (3, mais barba no masculino) -- o limite da GPU e 16 unidades de textura e o three.js ja usa 4-7 (morph, osso, envMap, DFG, sombras):
 *  - uFlEyeTex: esclera (sRGB codificado a mao, metade de cima) + olho (brilho/delineado/iris, metade de baixo) do estilo escolhido;
 *  - uFlParts: atlas de partes (sobrancelha + boca + cilios, estilo = indice de celula) ou classic_parts;
 *  - uFlFaceTex: atlas do rosto (extras RGB: nariz, sardas/pintas, contorno/idade | pintura R | blush R | sombreado classico RGB);
 *  - so no masculino, barba (uFlBeard).
 * `FL_LITE` (GPU com poucas unidades de textura): tira o atlas do rosto (blush, nariz, sardas, contorno, pintura de festa) para economizar um sampler.
 */
type U = Record<string, IUniform>
/** Modo economico: GPU com menos de 14 unidades de textura (o corpo da boneca usa 11 + ate 3 sombras) perde o atlas do rosto (blush, nariz, sardas, contorno, pintura de festa) em vez de quebrar. */
let lite = false
export function configureFaceLayers(maxTextures: number) {
  lite = maxTextures < 14
}
export const faceLayerDefines = (): Record<string, string> => (lite ? { FL_LITE: '' } : {})
const u = <T,>(value: T): IUniform<T> => ({ value })

export function createFaceLayerUniforms(ref: FaceRef, faceY: [number, number]): U {
  const blank = BLANK_LAYER
  return {
    uFlFaceOn: u(1),
    uFlFaceY: u(new Vector2(faceY[0], faceY[1])),
    uFlEyeFull: u(0), uFlBlushMode: u(0), uFlBrowRgb: u(0),
    uFlEyeP: u(new Vector4(ref.eyeX, ref.eyeY, 1, 0)),
    uFlEyeSize: u(new Vector2(...KIT_CANVAS.eye)),
    uFlEyeTex: u(blank), uFlParts: u(blank),
    uFlIrisCol: u(new Color('#6b4a32')), uFlLinerCol: u(new Color('#2a201e')), uFlLashCol: u(new Color('#1c1514')),
    uFlLinerAmt: u(1),
    uFlLashCell: u(-1), uFlLashG: u(new Vector3(1, 1, 0)),
    uFlBrowCell: u(0),
    uFlBrowP: u(new Vector4(ref.browX, ref.browY, 1, 0)),
    uFlBrowSize: u(new Vector2(...KIT_CANVAS.brow)),
    uFlBrowCol: u(new Color('#4a3326')), uFlBrowOp: u(0.92),
    uFlMouthCell: u(0),
    uFlMouthP: u(new Vector4(0, ref.mouthY, 1, 0)),
    uFlMouthSize: u(new Vector2(...KIT_CANVAS.mouth)),
    uFlLipCol: u(new Color('#b87068')), uFlLipCol2: u(new Color('#e8607f')), uFlGlossAmt: u(0.2), uFlLipOp: u(0.9),
    uFlBlushP: u(new Vector4(ref.blushX, ref.blushY, 1, 0)),
    uFlBlushSize: u(new Vector2(...KIT_CANVAS.blush)),
    uFlBlushCol: u(new Color('#e0707c')), uFlBlushAmt: u(0),
    uFlFaceTex: u(blank),
    uFlXIdx: u(new Vector4(-1, -1, -1, -1)), uFlXAmt: u(new Vector4(0, 0, 0, 0)),
    uFlNoseCol: u(new Color('#9a6454')), uFlFrCol: u(new Color('#a8704f')), uFlCtCol: u(new Color('#8a5a48')), uFlPtCol: u(new Color('#ffd45a')),
    // mapa do rosto deste modelo para as coordenadas do masculino (o atlas de extras e desenhado nelas): (olhoY, escala x, escala y)
    uFlXMap: u(new Vector3(ref.eyeY, ref.eyeX / MALE_REF.eyeX, Math.abs(ref.eyeY - ref.mouthY) / Math.abs(MALE_REF.eyeY - MALE_REF.mouthY))),
    uFlBeard: u(blank), uFlBeardCol: u(new Color('#2c211b')), uFlBeardAmt: u(0),
  }
}

/** Grava o estado do rosto (`FaceLayers`) nos uniforms DESTE material. Idempotente (chamado de novo quando uma textura do kit termina de carregar). */
export function applyFaceLayers(uniforms: U, f: FaceLayers, ref: FaceRef): void {
  const k = kitFor(f)
  const v = (n: string) => uniforms[n].value
  uniforms.uFlEyeTex.value = k.eye
  uniforms.uFlParts.value = k.parts
  uniforms.uFlFaceTex.value = k.face
  uniforms.uFlBeard.value = k.beard
  uniforms.uFlEyeFull.value = k.classic ? 1 : 0
  uniforms.uFlBlushMode.value = f.blush.shade ? 1 : 0
  uniforms.uFlBrowCell.value = k.browCell
  uniforms.uFlMouthCell.value = k.mouthCell
  uniforms.uFlLashCell.value = k.lashCell
  uniforms.uFlBrowRgb.value = k.browRgb
  ;(v('uFlLashG') as Vector3).set(...k.lashG)
  ;(v('uFlXIdx') as Vector4).set(...k.xIdx)
  ;(v('uFlXAmt') as Vector4).set(...k.xAmt)
  ;(v('uFlNoseCol') as Color).set(k.xCol[0])
  ;(v('uFlFrCol') as Color).set(k.xCol[1])
  ;(v('uFlCtCol') as Color).set(k.xCol[2])
  ;(v('uFlPtCol') as Color).set(k.xCol[3])
  const e = f.eye
  ;(v('uFlEyeP') as Vector4).set(ref.eyeX + e.gap, ref.eyeY + e.y, e.scale, (e.tilt * Math.PI) / 180)
  ;(v('uFlIrisCol') as Color).set(e.iris)
  ;(v('uFlLinerCol') as Color).set(e.liner)
  ;(v('uFlLashCol') as Color).set(e.lashColor)
  uniforms.uFlLinerAmt.value = e.linerAmt
  const b = f.brow
  ;(v('uFlBrowP') as Vector4).set(ref.browX + b.gap + k.browDx, ref.browY + b.y, b.scale, (b.tilt * Math.PI) / 180)
  ;(v('uFlBrowCol') as Color).set(b.color)
  uniforms.uFlBrowOp.value = b.opacity
  const m = f.mouth
  ;(v('uFlMouthP') as Vector4).set(0, ref.mouthY + m.y, m.scale, 0)
  ;(v('uFlLipCol') as Color).set(m.color)
  ;(v('uFlLipCol2') as Color).set(m.color2 ?? '#e8607f')
  uniforms.uFlGlossAmt.value = m.gloss
  uniforms.uFlLipOp.value = m.opacity
  const bl = f.blush
  ;(v('uFlBlushP') as Vector4).set(ref.blushX + bl.gap, ref.blushY + bl.y, bl.scale, 0)
  ;(v('uFlBlushCol') as Color).set(bl.color)
  uniforms.uFlBlushAmt.value = bl.amount
  ;(v('uFlBeardCol') as Color).set(f.beard.color)
  uniforms.uFlBeardAmt.value = f.beard.style === 'none' ? 0 : f.beard.amount
}

const P = KIT_LAYOUT.parts
const SH = P.sheets
const FC = KIT_LAYOUT.face
const FA = FACE_ATLAS

/** Declaracoes GLSL (uniforms + funcoes + globais `flEye`/`flGloss`), antes de `void main`. `#define FL_BEARD` liga a barba (masculino). */
export const FL_DECL = /* glsl */ `
uniform float uFlFaceOn; uniform vec2 uFlFaceY; uniform float uFlEyeFull; uniform float uFlBlushMode; uniform float uFlBrowRgb;
uniform vec4 uFlEyeP; uniform vec2 uFlEyeSize; uniform sampler2D uFlEyeTex; uniform sampler2D uFlParts;
uniform vec3 uFlIrisCol; uniform vec3 uFlLinerCol; uniform vec3 uFlLashCol; uniform float uFlLinerAmt; uniform float uFlLashCell; uniform vec3 uFlLashG;
uniform float uFlBrowCell; uniform vec4 uFlBrowP; uniform vec2 uFlBrowSize; uniform vec3 uFlBrowCol; uniform float uFlBrowOp;
uniform float uFlMouthCell; uniform vec4 uFlMouthP; uniform vec2 uFlMouthSize; uniform vec3 uFlLipCol; uniform vec3 uFlLipCol2; uniform float uFlGlossAmt; uniform float uFlLipOp;
uniform vec4 uFlBlushP; uniform vec2 uFlBlushSize; uniform vec3 uFlBlushCol; uniform float uFlBlushAmt;
#ifndef FL_LITE
uniform sampler2D uFlFaceTex;
#endif
uniform vec4 uFlXIdx; uniform vec4 uFlXAmt; uniform vec3 uFlNoseCol; uniform vec3 uFlFrCol; uniform vec3 uFlCtCol; uniform vec3 uFlPtCol; uniform vec3 uFlXMap;
#ifdef FL_BEARD
uniform sampler2D uFlBeard; uniform vec3 uFlBeardCol; uniform float uFlBeardAmt;
#endif
float flEye = 0.0; float flGloss = 0.0;
// posicao local (0..1, v para cima, z = dentro do canvas) de uma camada: p = posicao no rosto (m), c = centro, rot (rad), sx = lado (+1/-1: espelha x)
vec3 flLoc(vec2 p, vec2 c, vec2 size, float sc, float rot, float sx) {
  vec2 d = p - c; d.x *= sx;
  float cs = cos(rot); float sn = sin(rot);
  d = vec2(cs * d.x + sn * d.y, -sn * d.x + cs * d.y);
  vec2 uv = d / (size * sc) + 0.5;
  vec2 inb = step(vec2(0.0), uv) * step(uv, vec2(1.0));
  return vec3(uv, inb.x * inb.y);
}
// textura de olho com duas metades empilhadas: slot 1 = esclera (cima), 0 = olho (baixo)
vec4 flLayerS(sampler2D t, vec2 p, vec2 c, vec2 size, float sc, float rot, float sx, float slot) {
  vec3 l = flLoc(p, c, size, sc, rot, sx);
  return texture2D(t, vec2(l.x, (slot + l.y) * 0.5)) * l.z;
}
vec3 flSrgb(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c)); }
// celula de uma folha (y0 px desde o topo, cols, cw x ch px) do atlas de partes
vec4 flCellTex(sampler2D t, vec3 l, float y0, float cols, float cw, float ch, float idx) {
  float col = mod(idx, cols); float row = floor(idx / cols);
  float x = (col + clamp(l.x, 0.002, 0.998)) * cw; float yt = y0 + (row + 1.0 - clamp(l.y, 0.002, 0.998)) * ch;
  return texture2D(t, vec2(x / ${P.w}.0, 1.0 - yt / ${P.h}.0)) * l.z * step(0.0, idx);
}
vec4 flFull(sampler2D t, vec2 p, float slot) {
  vec2 uv = (p - vec2(${CLASSIC_CANVAS.center[0]}, ${CLASSIC_CANVAS.center[1]})) / ${CLASSIC_CANVAS.size} + 0.5;
  vec2 inb = step(vec2(0.0), uv) * step(uv, vec2(1.0));
  return texture2D(t, vec2(uv.x, (slot + uv.y) * 0.5)) * (inb.x * inb.y);
}
// Classica: tres imagens 1024 empilhadas (cilios, sobrancelha, boca)
vec4 flFullSlot(sampler2D t, vec2 p, float slot) {
  vec2 uv = (p - vec2(${CLASSIC_CANVAS.center[0]}, ${CLASSIC_CANVAS.center[1]})) / ${CLASSIC_CANVAS.size} + 0.5;
  vec2 inb = step(vec2(0.0), uv) * step(uv, vec2(1.0));
  return texture2D(t, vec2(uv.x, (slot + uv.y) / 3.0)) * (inb.x * inb.y);
}
#ifndef FL_LITE
// folhas de rosto inteiro (desenhadas nas coordenadas do masculino) no atlas do rosto: celula idx da faixa y0 (px, desde o topo) de altura hh; p = rosto deste modelo
vec4 flFaceCell(sampler2D t, vec2 p, float idx, float y0, float hh) {
  vec2 m = vec2(p.x / uFlXMap.y, ${MALE_REF.eyeY} + (p.y - uFlXMap.x) / uFlXMap.z);
  vec2 l = vec2((m.x - (${FC.can.x0})) / 0.2, (m.y - ${FC.can.y0}) / 0.28);
  vec2 inb = step(vec2(0.0), l) * step(l, vec2(1.0));
  float col = mod(idx, ${FC.cols}.0); float row = floor(idx / ${FC.cols}.0);
  vec2 uv = vec2((col + clamp(l.x, 0.004, 0.996)) / ${FC.cols}.0, 1.0 - (y0 + (row + 1.0 - clamp(l.y, 0.004, 0.996)) / ${FC.rows}.0 * hh) / ${FA.h}.0);
  return texture2D(t, uv) * (inb.x * inb.y) * step(0.0, idx);
}
#endif
`

/** Bloco GLSL: precisa de `vec3 base`, `float wSkin`, `vRest`, `vRestN`. Envolvido em { } (variaveis locais nao colidem). */
export const FL_BODY = /* glsl */ `
{
  vec2 fp = vRest.xy;
  float side = vRest.x >= 0.0 ? 1.0 : -1.0;
  float flW = smoothstep(0.08, 0.35, vRestN.z) * step(uFlFaceY.x, vRest.y) * step(vRest.y, uFlFaceY.y) * step(abs(vRest.x), 0.13) * wSkin * uFlFaceOn;
#ifndef FL_LITE
  vec3 bll = flLoc(fp, vec2(side * uFlBlushP.x, uFlBlushP.y), uFlBlushSize, uFlBlushP.z, 0.0, side);
  float bl = texture2D(uFlFaceTex, vec2(bll.x * ${FA.blush.w / FA.w}, 1.0 - (${FA.blush.y0}.0 + (1.0 - bll.y) * ${FA.blush.h}.0) / ${FA.h}.0)).r * bll.z * uFlBlushAmt * flW * (1.0 - uFlBlushMode);
  base = mix(base, uFlBlushCol, clamp(bl, 0.0, 1.0) * 0.75);
  {
    vec2 suv = (fp - vec2(${CLASSIC_CANVAS.center[0]}, ${CLASSIC_CANVAS.center[1]})) / ${CLASSIC_CANVAS.size} + 0.5;
    vec2 sib = step(vec2(0.0), suv) * step(suv, vec2(1.0));
    vec4 shT = texture2D(uFlFaceTex, vec2(suv.x, 1.0 - (${FA.shade.y0}.0 + (1.0 - suv.y) * ${FA.shade.h}.0) / ${FA.h}.0));
    // alfa = 1 so onde o atlas ja carregou (a textura vazia e transparente): sem isso o rosto ficava PRETO enquanto o kit baixava
    base *= mix(vec3(1.0), shT.rgb * 2.0, clamp(uFlBlushAmt, 0.0, 1.0) * flW * uFlBlushMode * sib.x * sib.y * shT.a);
  }
#endif
  vec2 ec = vec2(side * uFlEyeP.x, uFlEyeP.y);
  // nariz, sardas/pintas, contorno/idade (folhas RGB do atlas de extras)
#ifndef FL_LITE
  float xo = uFlXAmt.x + uFlXAmt.y + uFlXAmt.z;
  if (xo > 0.001) {
    float nz = flFaceCell(uFlFaceTex, fp, uFlXIdx.x, ${FA.extras.y0}.0, ${FA.extras.h}.0).r * uFlXAmt.x;
    float fr = flFaceCell(uFlFaceTex, fp, uFlXIdx.y, ${FA.extras.y0}.0, ${FA.extras.h}.0).g * uFlXAmt.y;
    float ct = flFaceCell(uFlFaceTex, fp, uFlXIdx.z, ${FA.extras.y0}.0, ${FA.extras.h}.0).b * uFlXAmt.z;
    base = mix(base, uFlCtCol * mix(vec3(1.0), base, 0.55), clamp(ct, 0.0, 1.0) * 0.8 * flW);
    base = mix(base, uFlNoseCol * mix(vec3(1.0), base, 0.55), clamp(nz, 0.0, 1.0) * 0.8 * flW);
    base = mix(base, uFlFrCol * mix(vec3(1.0), base, 0.35), clamp(fr, 0.0, 1.0) * 0.9 * flW);
  }
#endif
#ifdef FL_BEARD
  vec2 buv = (fp - vec2(${BEARD_CANVAS.center[0]}, ${BEARD_CANVAS.center[1]})) / vec2(${BEARD_CANVAS.size[0]}, ${BEARD_CANVAS.size[1]}) + 0.5;
  vec2 bib = step(vec2(0.0), buv) * step(buv, vec2(1.0));
  float wBeard = smoothstep(-0.25, 0.2, vRestN.z) * step(1.425, vRest.y) * step(vRest.y, 1.585) * step(abs(vRest.x), 0.10) * wSkin * uFlFaceOn;
  base = mix(base, uFlBeardCol, clamp(texture2D(uFlBeard, buv).r * (bib.x * bib.y) * uFlBeardAmt * wBeard, 0.0, 1.0));
#endif
  vec4 sc = mix(flLayerS(uFlEyeTex, fp, ec, uFlEyeSize, uFlEyeP.z, uFlEyeP.w, side, 1.0), flFull(uFlEyeTex, fp, 1.0), uFlEyeFull);
  sc.rgb = flSrgb(sc.rgb);
  base = mix(base, sc.rgb, sc.a * flW);
  flEye = sc.a * flW;
  vec4 ir = mix(flLayerS(uFlEyeTex, fp, ec, uFlEyeSize, uFlEyeP.z, uFlEyeP.w, side, 0.0), flFull(uFlEyeTex, fp, 0.0), uFlEyeFull);
  float irA = mix(smoothstep(0.012, 0.10, ir.b), ir.a, uFlEyeFull);
  vec3 irC = mix(vec3(clamp((ir.b - 0.1) / 0.9, 0.0, 1.0)), ir.rgb, uFlEyeFull);
  base = mix(base, uFlIrisCol * irC * 1.35, irA * flW);
  float nf = 1.0 - uFlEyeFull;
  base = mix(base, vec3(1.0), ir.r * nf * flW);
  base = mix(base, uFlLinerCol, ir.g * nf * uFlLinerAmt * flW);
  // cilios: celula do atlas, na geometria do olho (escala/altura da palpebra do estilo escolhido)
  {
    vec2 d = vec2(fp.x - ec.x, fp.y - ec.y); d.x *= side;
    float cs = cos(uFlEyeP.w); float sn = sin(uFlEyeP.w);
    d = vec2(cs * d.x + sn * d.y, -sn * d.x + cs * d.y) / uFlEyeP.z;
    d.x /= uFlLashG.x; d.y = (d.y - uFlLashG.z) / uFlLashG.y;
    vec2 uv = d / vec2(${KIT_CANVAS.eye[0]}, ${KIT_CANVAS.eye[1]}) + 0.5;
    vec2 inb = step(vec2(0.0), uv) * step(uv, vec2(1.0));
    vec4 ls = flCellTex(uFlParts, vec3(uv, inb.x * inb.y), ${SH.lash.y0}.0, ${SH.lash.cols}.0, ${SH.lash.cw}.0, ${SH.lash.ch}.0, uFlLashCell) * nf;
    base = mix(base, uFlLashCol * ls.rgb, ls.a * uFlLinerAmt * flW);
    vec4 lc = flFullSlot(uFlParts, fp, 0.0) * uFlEyeFull;
    base = mix(base, pow(lc.rgb, vec3(2.2)), lc.a * flW);
  }
  vec3 bl3 = flLoc(fp, vec2(side * uFlBrowP.x, uFlBrowP.y), uFlBrowSize, uFlBrowP.z, uFlBrowP.w, side);
  vec4 br = flCellTex(uFlParts, bl3, ${SH.brow.y0}.0, ${SH.brow.cols}.0, ${SH.brow.cw}.0, ${SH.brow.ch}.0, uFlBrowCell) * nf + flFullSlot(uFlParts, fp, 1.0) * uFlEyeFull;
  vec3 browTint = mix(uFlBrowCol * mix(0.55 + 0.45 * br.r, 1.0, uFlBrowRgb) * mix(vec3(1.0), br.rgb, uFlBrowRgb), uFlBrowCol * br.rgb * 1.35, uFlEyeFull);
  base = mix(base, browTint, br.a * uFlBrowOp * flW);
  vec3 ml = flLoc(fp, vec2(uFlMouthP.x, uFlMouthP.y), uFlMouthSize, uFlMouthP.z, 0.0, 1.0);
  vec4 mp = flCellTex(uFlParts, ml, ${SH.mouth.y0}.0, ${SH.mouth.cols}.0, ${SH.mouth.cw}.0, ${SH.mouth.ch}.0, uFlMouthCell);
  float teeth = (1.0 - smoothstep(0.55, 0.62, mp.a)) * step(0.01, mp.a);
  float sec = smoothstep(0.55, 0.62, mp.a) * (1.0 - smoothstep(0.87, 0.93, mp.a));
  float lipA = mp.g;
  vec3 lipRgb = vec3(mp.r);
  vec3 lipTint = mix(mix(uFlLipCol, uFlLipCol2, sec), vec3(1.0), teeth);
  base = mix(base, lipTint * lipRgb * 1.25, lipA * mix(uFlLipOp, 1.0, teeth) * flW);
  float glA = mp.b * (1.0 - teeth);
  base = mix(base, vec3(1.0), clamp(glA * uFlGlossAmt * flW, 0.0, 1.0) * 0.85);
  flGloss = glA * uFlGlossAmt * flW;
  // pintura de festa (por cima de tudo)
#ifndef FL_LITE
  float pa = flFaceCell(uFlFaceTex, fp, uFlXIdx.w, ${FA.paint.y0}.0, ${FA.paint.h}.0).r * uFlXAmt.w;
  base = mix(base, uFlPtCol, clamp(pa, 0.0, 1.0) * flW);
#endif
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
