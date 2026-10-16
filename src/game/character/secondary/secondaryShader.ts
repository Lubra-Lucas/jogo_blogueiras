import type { Material, WebGLProgramParametersWithUniforms } from 'three'
import { lifeU } from '../../world/life/lifeState'
import { uSecFlare, uSecHair, uSecSkirt } from './secondaryMotion'

type Shader = WebGLProgramParametersWithUniforms

/** 'hair' = pende abaixo da cabeca; 'skirt' = pende abaixo da cintura (mais na barra) */
export type SecondaryKind = 'hair' | 'skirt'

const SHARED = /* glsl */ `
uniform vec3 uSecOff;
uniform float uSecFlare;
uniform float uLifeT;
uniform vec4 uWind;
`

/**
 * Remenda o material (hair/roupa) para aplicar o deslocamento secundario DEPOIS do skinning.
 * Pesos pela altura (metros, do pe) do vertice em pose de repouso (atributo `position`, antes do skinning):
 *  - cabelo: cai de 1 na ponta (ate ~1,05 m) a 0 na altura da testa (~1,52 m), + pequeno peso no coque;
 *  - saia: 0 na cintura (~0,98 m), cresce ate 1 na barra.
 * O offset de mundo vira local com a transposta de mat3(modelMatrix) (a raiz so gira em Y, escala 1).
 */
export function patchSecondary(mat: Material, kind: SecondaryKind) {
  const tags = (mat.userData.__sec ??= {}) as Record<string, true>
  if (tags[kind]) return
  tags[kind] = true
  const prev = mat.onBeforeCompile
  const prevKey = mat.customProgramCacheKey
  const weight =
    kind === 'hair'
      ? `float hang = smoothstep(1.52, 1.02, hy);
         float w = hang * hang * 0.9 + 0.5 * hang + 0.22 * smoothstep(1.4, 1.66, hy) * (1.0 - hang);`
      : `float w = smoothstep(0.98, 0.3, hy);
         w = pow(w, 1.15);`
  mat.onBeforeCompile = (sh, r) => {
    prev.call(mat, sh, r)
    const s = sh as Shader
    s.uniforms.uSecOff = kind === 'hair' ? uSecHair : uSecSkirt
    s.uniforms.uSecFlare = uSecFlare
    s.uniforms.uLifeT = lifeU.uLifeT
    s.uniforms.uWind = lifeU.uWind
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\n' + SHARED).replace(
      '#include <skinning_vertex>',
      /* glsl */ `#include <skinning_vertex>
      {
        vec3 o0 = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float hy = (modelMatrix * vec4(position, 1.0)).y - o0.y;
        ${weight}
        // tremulo leve que viaja pela altura (vento + movimento)
        float fl = sin(uLifeT * 5.2 + hy * 9.0 + position.x * 7.0) * (0.004 + 0.012 * uWind.z + 0.006 * uSecFlare);
        vec3 dW = uSecOff * w + vec3(fl * uWind.x, fl * 0.3, fl * uWind.y) * w;
        vec3 dL = dW * mat3(modelMatrix);
        ${kind === 'skirt' ? 'vec2 rad = normalize(position.xz + vec2(1e-4)); dL.xz += rad * w * w * (0.012 + 0.07 * uSecFlare);' : ''}
        transformed += dL;
      }`,
    )
  }
  mat.customProgramCacheKey = () => prevKey.call(mat) + '|sec-' + kind
  mat.needsUpdate = true
}
