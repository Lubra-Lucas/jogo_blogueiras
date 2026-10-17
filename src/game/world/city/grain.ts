import { DataTexture, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, RGBAFormat, UnsignedByteType, type Material, type WebGLProgramParametersWithUniforms } from 'three'
import { chainPatch } from '../life/patch'

/**
 * "Textura" procedural leve (pedra, reboco, asfalto, madeira) para os materiais compartilhados da cidade, SEM UV e SEM
 * geometria extra: uma textura de ruido 128x128 (R = fbm de reboco/pedra, G = granulado fino, B = veios) amostrada em
 * espaco de mundo com projecao triplanar "de um eixo so" (escolhe o plano pela normal dominante). Gera
 *  - normal por derivada (bump) e
 *  - leve variacao de albedo,
 * e some com a distancia (fade 14 -> 48 m) para nao custar nada longe nem tremer. Um fetch por fragmento.
 */

let TEX: DataTexture | null = null
export function grainTexture(): DataTexture {
  if (TEX) return TEX
  const N = 128
  const data = new Uint8Array(N * N * 4)
  // ruido de valor periodico (hash determinístico)
  const hash = (x: number, y: number, s: number) => {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 2147483647)) | 0
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295
  }
  const vnoise = (u: number, v: number, per: number, s: number) => {
    const x0 = Math.floor(u)
    const y0 = Math.floor(v)
    const fx = u - x0
    const fy = v - y0
    const sx = fx * fx * (3 - 2 * fx)
    const sy = fy * fy * (3 - 2 * fy)
    const w = (x: number) => ((x % per) + per) % per
    const a = hash(w(x0), w(y0), s)
    const b = hash(w(x0 + 1), w(y0), s)
    const c = hash(w(x0), w(y0 + 1), s)
    const d = hash(w(x0 + 1), w(y0 + 1), s)
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
  }
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const u = x / N
      const v = y / N
      let f = 0
      let amp = 0.5
      let tot = 0
      for (let o = 0; o < 4; o++) {
        const per = 4 << o
        f += vnoise(u * per, v * per, per, o + 1) * amp
        tot += amp
        amp *= 0.5
      }
      f /= tot
      const sp = vnoise(u * 32, v * 32, 32, 9) * 0.6 + vnoise(u * 64, v * 64, 64, 11) * 0.4
      // veios: ruido esticado em uma direcao (madeira / tecido)
      const st = vnoise(u * 3, v * 40, 40, 17) * 0.7 + vnoise(u * 7, v * 80, 80, 19) * 0.3
      const i = (y * N + x) * 4
      data[i] = Math.round(f * 255)
      data[i + 1] = Math.round(sp * 255)
      data[i + 2] = Math.round(st * 255)
      data[i + 3] = 255
    }
  }
  TEX = new DataTexture(data, N, N, RGBAFormat, UnsignedByteType)
  TEX.wrapS = TEX.wrapT = RepeatWrapping
  TEX.magFilter = LinearFilter
  TEX.minFilter = LinearMipmapLinearFilter
  TEX.generateMipmaps = true
  TEX.anisotropy = 4
  TEX.needsUpdate = true
  return TEX
}

export interface GrainOpts {
  /** forca do relevo (0.01 = quase nada, 0.05 = pedra aparente) */
  bump?: number
  /** escala: 1 = ladrilho de ~1,4 m; maior = grao mais fino */
  scale?: number
  /** variacao de albedo (0..0.3) */
  tone?: number
  /** distancia (m) em que o efeito some */
  far?: number
  /** 0 = fbm (reboco/pedra), 1 = granulado (asfalto), 2 = veios (madeira) */
  channel?: 0 | 1 | 2
}

/** Encadeia (sem perder os outros remendos: janelas, vento, nuvens) o grao procedural no material. Uma vez por material. */
export function addGrain(mat: Material, o: GrainOpts = {}) {
  const bump = o.bump ?? 0.02
  const scale = o.scale ?? 1
  const tone = o.tone ?? 0.1
  const far = o.far ?? 48
  const ch = o.channel ?? 0
  const swz = ['r', 'g', 'b'][ch]
  chainPatch(mat, `grain-${bump}-${scale}-${tone}-${far}-${ch}`, (sh: WebGLProgramParametersWithUniforms) => {
    sh.uniforms.uGrain = { value: grainTexture() }
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGrWp;\nvarying vec3 vGrWn;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        {
          vec4 grp = vec4(transformed, 1.0);
          vec3 grn = objectNormal;
          #ifdef USE_INSTANCING
            grp = instanceMatrix * grp;
            grn = mat3(instanceMatrix) * grn;
          #endif
          vGrWp = (modelMatrix * grp).xyz;
          vGrWn = normalize(mat3(modelMatrix) * grn);
        }`,
      )
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGrWp;\nvarying vec3 vGrWn;\nuniform sampler2D uGrain;')
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          float grFade = 1.0 - smoothstep(${(far * 0.3).toFixed(1)}, ${far.toFixed(1)}, length(vViewPosition));
          if (grFade > 0.01) {
            vec3 ga = abs(vGrWn);
            vec2 guv = ga.y > max(ga.x, ga.z) ? vGrWp.xz : (ga.x > ga.z ? vGrWp.zy : vGrWp.xy);
            float gh = texture2D(uGrain, guv * ${(0.7 * scale).toFixed(3)}).${swz};
            diffuseColor.rgb *= 1.0 + (gh - 0.5) * ${(tone * 2).toFixed(3)} * grFade;
            vec2 gd = vec2(dFdx(gh), dFdy(gh)) * ${bump.toFixed(4)} * grFade;
            vec3 gq0 = dFdx(-vViewPosition);
            vec3 gq1 = dFdy(-vViewPosition);
            vec3 gR1 = cross(gq1, normal);
            vec3 gR2 = cross(normal, gq0);
            float gDet = dot(gq0, gR1);
            normal = normalize(abs(gDet) * normal - sign(gDet) * (gd.x * gR1 + gd.y * gR2));
          }
        }`,
      )
  })
}
