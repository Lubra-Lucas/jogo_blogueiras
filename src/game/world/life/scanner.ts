import { DoubleSide, MeshBasicMaterial, type BufferGeometry, type InstancedMesh, type Material, type Mesh, type MeshPhysicalMaterial, type Object3D, type Scene } from 'three'
import { kitMaterials } from '../city/kit'
import { LIFE, LIFE_OFF } from './lifeQuality'
import { addUniforms, chainPatch, cloudShadow, GLSL_COMMON, windCanopy, windKit } from './patch'

/**
 * Varre a cena e remenda MATERIAIS em tempo de execucao (sem editar o codigo da cidade):
 *  - kit (porcelana fundida): vento nas folhas por cor de vertice, empurrao da jogadora, baloes, sombras de nuvem;
 *  - kit 'water': brilho de agua corrente nas fontes; kit 'glow' e tiras neon: piscar sutil a noite;
 *  - arvores instanciadas (esfera/cone/coracao/flor/folhas de palmeira): copa balanca, tronco fica;
 *  - chao caminhavel: sombras de nuvem;
 *  - qualquer malha nova com `userData.sway = 'foliage' | 'hang' | 'flag'` ou material com esse nome.
 */

const done = new WeakSet<Material>()
/** ?lifeoff=wind,cloud,water,neon desliga remendos (diagnostico de desempenho) */
const OFF = new Set((new URLSearchParams(window.location.search).get('lifeoff') ?? '').split(','))

/** Fluxo/brilho nas fontes (material 'water' do kit). */
function waterFlow(sh: Parameters<typeof cloudShadow>[0]) {
  addUniforms(sh, ['uLifeT'])
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vLfW;\nvarying vec3 vLfN;')
    .replace('#include <project_vertex>', '#include <project_vertex>\nvLfW = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvLfN = normalize(mat3(modelMatrix) * normal);')
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vLfW;\nvarying vec3 vLfN;\nuniform float uLifeT;')
    .replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      {
        float t = uLifeT;
        float flat_ = smoothstep(0.55, 0.9, vLfN.y);
        // superficie plana (bacia): luz de caustica que dança
        float c1 = sin(vLfW.x * 3.1 + t * 1.3 + sin(vLfW.z * 2.3 - t * 0.9) * 2.0);
        float c2 = sin(vLfW.z * 3.4 - t * 1.1 + sin(vLfW.x * 2.1 + t * 0.8) * 2.0);
        float caus = smoothstep(0.35, 1.0, c1 * c2);
        // superficie inclinada/vertical (jatos, cascatas): faixas que descem
        float ang = atan(vLfW.z, vLfW.x);
        float fl = sin(vLfW.y * 17.0 - t * 6.5 + sin(ang * 5.0 + t * 0.7) * 1.5);
        float band = smoothstep(0.45, 1.0, fl);
        float k = mix(band * 0.9, caus * 0.7, flat_);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), k * 0.5);
        diffuseColor.a = clamp(diffuseColor.a + k * 0.38, 0.0, 1.0);
      }`,
    )
}

/** Piscar de neon: algumas celulas (letras) tremem de noite; leve zumbido global. */
function neonFlicker(sh: Parameters<typeof cloudShadow>[0]) {
  addUniforms(sh, ['uLifeT', 'uFlick'])
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vLfW;')
    .replace('#include <project_vertex>', '#include <project_vertex>\n{ vec4 lfq = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\nlfq = instanceMatrix * lfq;\n#endif\nvLfW = (modelMatrix * lfq).xyz; }')
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vLfW;\nuniform float uLifeT;\nuniform float uFlick;\nfloat nfH(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }')
    .replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      {
        float cell = nfH(floor(vLfW * vec3(0.45, 0.35, 0.45)));
        float rare = step(0.84, cell);
        float on = step(0.35, sin(uLifeT * (1.1 + cell * 2.3) + cell * 40.0));
        float buzz = 1.0 - rare * uFlick * (0.45 + 0.55 * sin(uLifeT * (26.0 + cell * 30.0))) * 0.5 * (1.0 - on * 0.4);
        float hum = 1.0 - uFlick * 0.07 * (0.5 + 0.5 * sin(uLifeT * 2.7 + cell * 20.0));
        diffuseColor.rgb *= buzz * hum;
      }`,
    )
}

/** Balanco simples para pecas novas marcadas pela cidade: 'hang' (pende da origem), 'flag' (livre em uv.x), 'foliage' (todo o objeto). */
function windSimple(kind: string) {
  return (sh: Parameters<typeof cloudShadow>[0]) => {
    addUniforms(sh, ['uWind', 'uLifeT', 'uPlayer'])
    const w = kind === 'hang' ? 'clamp(-transformed.y * 0.6, 0.0, 1.0)' : kind === 'flag' ? 'clamp(uv.x, 0.0, 1.0)' : '0.6'
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + GLSL_COMMON)
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        {
          vec4 lfp = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            lfp = instanceMatrix * lfp;
          #endif
          vec3 lfw = (modelMatrix * lfp).xyz;
          vec3 lfd = lfSway(lfw, ${w}, ${kind === 'flag' ? '0.55' : '0.2'});
          mvPosition.xyz += (viewMatrix * vec4(lfd, 0.0)).xyz;
          gl_Position = projectionMatrix * mvPosition;
        }`,
      )
  }
}

let kitDone = false
function patchKit() {
  if (kitDone) return
  kitDone = true
  const m = kitMaterials()
  if (!OFF.has('wind')) chainPatch(m.por, 'wind-kit', windKit)
  if (LIFE.cloudShadows && !OFF.has('cloud')) chainPatch(m.por, 'cloud', cloudShadow)
  if (!OFF.has('water')) chainPatch(m.water, 'water-flow', waterFlow)
  if (!OFF.has('neon')) chainPatch(m.glow, 'neon', neonFlicker)
  if (LIFE.cloudShadows && !OFF.has('cloud')) chainPatch(m.metal, 'cloud', cloudShadow)
  done.add(m.por)
  done.add(m.water)
  done.add(m.glow)
  done.add(m.metal)
  done.add(m.glass)
}

function bbox(g: BufferGeometry) {
  if (!g.boundingBox) g.computeBoundingBox()
  return g.boundingBox!
}

function visit(o: Object3D) {
  const mesh = o as Mesh
  if (!mesh.isMesh) return
  const mat = mesh.material as Material
  if (!mat || Array.isArray(mat) || done.has(mat)) return
  done.add(mat)
  const sway = (mesh.userData.sway ?? (/^(sway|flag|hang)/.test(mat.name) ? mat.name.split(/[-_ ]/)[0].replace('sway', 'foliage') : undefined)) as string | undefined
  if (sway) {
    chainPatch(mat, 'sway-' + sway, windSimple(sway))
    return
  }
  const inst = (mesh as InstancedMesh).isInstancedMesh
  const phys = (mat as MeshPhysicalMaterial).isMeshPhysicalMaterial
  if (inst && phys) {
    const t = mesh.geometry.type
    if (t === 'CylinderGeometry' || t === 'TorusGeometry') return
    const b = bbox(mesh.geometry)
    const h = b.max.y - b.min.y
    const colored = (mat as MeshPhysicalMaterial).vertexColors
    if (t === 'BufferGeometry' && colored && mat.side !== DoubleSide) return // base da palmeira
    if (h > 4.5 && t === 'BufferGeometry' && !colored) return
    const amp = colored && mat.side === DoubleSide ? 0.34 : t === 'ConeGeometry' ? 0.12 : 0.16
    chainPatch(mat, 'canopy', windCanopy(b.min.y, b.max.y, amp))
    if (LIFE.cloudShadows) chainPatch(mat, 'cloud', cloudShadow)
    return
  }
  if (mesh.userData.walkable && !inst && LIFE.cloudShadows && ((mat as MeshPhysicalMaterial).isMeshPhysicalMaterial || (mat as { isMeshStandardMaterial?: boolean }).isMeshStandardMaterial)) {
    chainPatch(mat, 'cloud', cloudShadow)
    return
  }
  if ((mat as MeshBasicMaterial).isMeshBasicMaterial && !mat.toneMapped && (mat as MeshBasicMaterial).vertexColors) {
    chainPatch(mat, 'neon', neonFlicker)
  }
}

/** Varre a cena inteira (barato: so toca em materiais ainda nao vistos). */
export function scanScene(scene: Scene) {
  if (LIFE_OFF) return
  patchKit()
  if (OFF.has('scan')) return
  scene.traverse(visit)
}
