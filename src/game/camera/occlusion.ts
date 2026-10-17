import { Vector3, type Material } from 'three'

/**
 * Esmaecimento barato de obstaculos nao solidos (copa de arvore, folha de palmeira, vaso, poste, luminaria) entre a camera
 * e a personagem. Sem raycast e sem material transparente: os materiais "oclusores" ganham um trecho de shader que descarta
 * fragmentos (dither) dentro de um tubo entre a camera e a cabeca da personagem. Uniforms globais compartilhados
 * (atualizados 1x por quadro na ThirdPersonCamera), material patchado UMA vez, nada e clonado por quadro.
 */
export const occ = {
  a: { value: new Vector3() }, // camera
  b: { value: new Vector3() }, // alvo (cabeca da personagem)
  r: { value: 1.05 }, // raio do tubo (m)
  k: { value: 0 }, // forca 0..1 (0 = desligado: selfie, carro, overview)
  ground: { value: -1e3 }, // abaixo desta altura (pes + folga) nada e cortado
}

const PATCHED = '__occ'

/** Faz o material (e instancias dele) esmaecer quando bloqueia a camera. Idempotente; compoe com onBeforeCompile existente. */
export function makeOccludable<T extends Material>(m: T): T {
  if (m.userData[PATCHED]) return m
  m.userData[PATCHED] = true
  const prev = m.onBeforeCompile
  m.onBeforeCompile = (sh, r) => {
    prev?.call(m, sh, r)
    sh.uniforms.uOccA = occ.a
    sh.uniforms.uOccB = occ.b
    sh.uniforms.uOccR = occ.r
    sh.uniforms.uOccK = occ.k
    sh.uniforms.uOccG = occ.ground
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vOccW;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        {
          vec4 occP = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
          occP = instanceMatrix * occP;
          #endif
          vOccW = (modelMatrix * occP).xyz;
        }`,
      )
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vOccW;\nuniform vec3 uOccA;\nuniform vec3 uOccB;\nuniform float uOccR;\nuniform float uOccK;\nuniform float uOccG;')
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        if (uOccK > 0.0 && vOccW.y > uOccG) {
          vec3 ab = uOccB - uOccA;
          float t = dot(vOccW - uOccA, ab) / max(dot(ab, ab), 1e-4);
          if (t > 0.0 && t < 0.93) {
            float d = distance(vOccW, uOccA + ab * t);
            float h = (1.0 - smoothstep(uOccR * 0.45, uOccR, d)) * 0.9 * uOccK;
            if (h > 0.0 && fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) < h) discard;
          }
        }`,
      )
  }
  const key = m.customProgramCacheKey.bind(m)
  m.customProgramCacheKey = () => key() + '|occ'
  m.needsUpdate = true
  return m
}
