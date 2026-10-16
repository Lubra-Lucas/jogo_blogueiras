import { type IUniform, type MeshPhysicalMaterial, type Scene, type WebGLProgramParametersWithUniforms } from 'three'
import { getQuality, type QualityTier } from '../systems/quality'

/**
 * Brilho das joias (metal, gema, perola, lente): reflexo de ambiente reforcado + facetas e cintilacao em shader leve.
 *
 * - Sem `transmission` (forcaria um passe extra de render da cena inteira, caro no celular): a gema parece vidro
 *   com ior alto, clearcoat, iridescencia (medium/high), emissivo suave e normais "facetadas" por celula.
 * - `envMapIntensity` so vale com `material.envMap`: `syncJewelEnv` copia `scene.environment` e multiplica por
 *   `scene.environmentIntensity` (cidade 0.4, interiores 0.5), entao funciona em qualquer cena sem mexer nela.
 * - Cintilacao: um brilho branco por celula (hash da posicao no objeto) que acende quando a faceta mira a camera;
 *   como depende da normal em espaco de vista, pisca ao mover a camera ou o personagem. Sem tempo, sem texturas.
 */

export type ShineKind = 'metal' | 'gem' | 'pearl' | 'glass'

interface ShineCfg {
  env: number
  glint: number
  cell: number
  facet: number
}

const CFG: Record<QualityTier, Record<ShineKind, ShineCfg>> = {
  low: {
    metal: { env: 2.4, glint: 0, cell: 220, facet: 0 },
    gem: { env: 3, glint: 1.1, cell: 600, facet: 0.25 },
    pearl: { env: 1.6, glint: 0, cell: 1, facet: 0 },
    glass: { env: 1.8, glint: 0, cell: 1, facet: 0 },
  },
  medium: {
    metal: { env: 3.2, glint: 0.35, cell: 240, facet: 0 },
    gem: { env: 4, glint: 1.5, cell: 650, facet: 0.4 },
    pearl: { env: 2.2, glint: 0, cell: 1, facet: 0 },
    glass: { env: 2.4, glint: 0, cell: 1, facet: 0 },
  },
  high: {
    metal: { env: 3.6, glint: 0.5, cell: 260, facet: 0 },
    gem: { env: 4.6, glint: 1.9, cell: 750, facet: 0.5 },
    pearl: { env: 2.6, glint: 0, cell: 1, facet: 0 },
    glass: { env: 2.8, glint: 0, cell: 1, facet: 0 },
  },
}

interface ShineData {
  kind: ShineKind
  env: number
  uniforms: Record<string, IUniform>
  patched: boolean
}

type WithShine = MeshPhysicalMaterial & { userData: { shine?: ShineData } }

/** Aplica as constantes de brilho do `kind` ao material e (uma vez) liga o shader de facetas/cintilacao. */
export function applyShine(m: MeshPhysicalMaterial, kind: ShineKind, tier: QualityTier = getQuality()): void {
  const cfg = CFG[tier][kind]
  const mat = m as WithShine
  let d = mat.userData.shine
  if (!d) {
    d = mat.userData.shine = { kind, env: cfg.env, patched: false, uniforms: { uGlint: { value: 0 }, uCell: { value: 300 }, uFacet: { value: 0 } } }
  }
  d.kind = kind
  d.env = cfg.env
  d.uniforms.uGlint.value = cfg.glint
  d.uniforms.uCell.value = cfg.cell
  d.uniforms.uFacet.value = cfg.facet
  m.envMapIntensity = cfg.env
  const rich = tier !== 'low'
  if (kind === 'metal') {
    m.metalness = 1
    m.roughness = 0.11
    m.clearcoat = 0.35
    m.clearcoatRoughness = 0.06
    m.specularIntensity = 1
    m.iridescence = 0
  } else if (kind === 'gem') {
    m.metalness = 0
    m.roughness = 0.02
    m.ior = 1.9
    m.specularIntensity = 1
    m.specularColor.set('#ffffff')
    m.clearcoat = 1
    m.clearcoatRoughness = 0.02
    m.iridescence = rich ? 0.55 : 0
    m.iridescenceIOR = 1.7
    m.iridescenceThicknessRange = [180, 520]
    m.emissiveIntensity = 0.22
    m.sheen = 0
  } else if (kind === 'pearl') {
    m.metalness = 0.05
    m.roughness = 0.17
    m.clearcoat = 1
    m.clearcoatRoughness = 0.05
    m.sheen = 1
    m.sheenRoughness = 0.35
    m.sheenColor.set('#ffe9f4')
    m.iridescence = rich ? 0.4 : 0
    m.iridescenceIOR = 1.35
    m.iridescenceThicknessRange = [120, 420]
  } else {
    m.envMapIntensity = cfg.env
  }
  if (!d.patched && (cfg.glint > 0 || cfg.facet > 0)) {
    d.patched = true
    const data = d
    m.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
      Object.assign(shader.uniforms, data.uniforms)
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vJp;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvJp = position;')
      shader.fragmentShader = shader.fragmentShader
        .replace(
          'void main() {',
          /* glsl */ `
varying vec3 vJp; uniform float uGlint; uniform float uCell; uniform float uFacet;
vec3 jHash3(vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
void main() {`,
        )
        .replace(
          '#include <normal_fragment_maps>',
          /* glsl */ `
#include <normal_fragment_maps>
vec3 jCell = jHash3(floor(vJp * uCell));
normal = normalize(normal + (jCell - 0.5) * uFacet);`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          /* glsl */ `
#include <emissivemap_fragment>
if (uGlint > 0.0) {
  float jOn = step(0.55, jCell.z);
  float jAim = max(dot(normal, normalize(vViewPosition)), 0.0);
  float jSp = pow(jAim, 36.0) * jOn;
  totalEmissiveRadiance += vec3(1.0, 0.97, 0.92) * jSp * uGlint;
}`,
        )
    }
    m.customProgramCacheKey = () => 'jewel-shine-v1'
    m.needsUpdate = true
  }
}

/** Copia o ambiente da cena para o material (envMapIntensity so vale com envMap proprio) e escala pela intensidade da cena. */
export function syncJewelEnv(m: MeshPhysicalMaterial, scene: Scene): void {
  const d = (m as WithShine).userData.shine
  if (!d) return
  const env = scene.environment
  if (!env) return
  if (m.envMap !== env) {
    m.envMap = env
    m.needsUpdate = true
  }
  m.envMapIntensity = d.env * (scene.environmentIntensity ?? 1)
}


/** Peca declarada fosca: tira iridescencia/cintilacao e reduz o reflexo de ambiente. */
export function dullShine(m: MeshPhysicalMaterial): void {
  const d = (m as WithShine).userData.shine
  if (d) {
    d.env *= 0.3
    d.uniforms.uGlint.value = 0
    d.uniforms.uFacet.value = 0
  }
  m.iridescence = 0
  m.envMapIntensity = d?.env ?? 1
}
