import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  BufferGeometry,
  Color,
  DirectionalLight,
  HemisphereLight,
  Material,
  Mesh,
  MeshPhysicalMaterial,
  Object3D,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SkinnedMesh,
  SRGBColorSpace,
  Texture,
  Vector3,
  WebGLRenderer,
  type Group,
} from 'three'
import { GLTFLoader, type GLTF } from 'three-stdlib'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { BASES } from '../../../game/character/assets'
import { getCatalogItem, loadCatalog, type CatalogItem } from '../../../game/character/catalog'
import { createHairMaterial } from '../../../game/character/dollMaterial'
import { applyFinish, applyJewelMaterial, fabricTex, onFabricTextureLoad } from '../../../game/character/fabric'
import { applyHairCalib, hairCalibFor } from '../../../game/character/hairFit'
import { getWearable } from '../../../game/character/items'
import { syncJewelEnv } from '../../../game/character/jewelShine'
import { motifColor, patternTexture } from '../../../game/character/patterns'
import { ensureTangents } from '../../../game/character/tangents'
import type { Appearance } from '../../../shared/appearance'

/**
 * Miniaturas 3D das pecas: UM unico WebGLRenderer (canvas solto, fora da pagina) renderiza a peca sozinha
 * (GLB em repouso, sem corpo) com as cores/acabamentos/estampa do jogo e devolve um blob URL (PNG transparente).
 * Fila FIFO so com cartoes visiveis, 1 miniatura por janela ociosa (requestIdleCallback), LRU de resultados e de GLBs.
 * Geometrias/materiais/texturas criados so para a miniatura sao liberados logo apos o render.
 */

export interface ThumbSpec {
  id: string
  /** cores por slot de material (ItemRef.colors); omitido = padrao do manifesto */
  colors?: string[]
  finishes?: string[]
  pattern?: string
  /** cabelo: aparencia do cabelo (cor, ombre, mechas...) */
  hair?: Appearance['hair']
}

export const THUMB_CSS = 160
const GLB_LRU = 8
const RESULT_LRU = 320

export function thumbKey(s: ThumbSpec): string {
  const h = s.hair
  return JSON.stringify([s.id, s.colors ?? 0, s.finishes ?? 0, s.pattern ?? 0, h ? [h.color, h.color2, h.mode, h.amount, h.gloss] : 0])
}

// ---------------------------------------------------------------- metricas
export const thumbStats = { rendered: 0, failed: 0, cacheHits: 0, firstMs: 0, totalMs: 0, buildMs: 0, drawMs: 0, started: 0, lastError: '' as string, failedIds: [] as string[] }

// ---------------------------------------------------------------- GLBs (LRU proprio, descartavel)
const loader = new GLTFLoader()
const glbs = new Map<string, Promise<GLTF>>()
function disposeGltf(g: GLTF) {
  g.scene.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh) return
    m.geometry.dispose()
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
      for (const v of Object.values(mat)) if (v && (v as Texture).isTexture) (v as Texture).dispose()
      mat.dispose()
    }
  })
}
function loadGlb(url: string): Promise<GLTF> {
  let p = glbs.get(url)
  if (p) {
    glbs.delete(url) // reinsere = mais recente
    glbs.set(url, p)
    return p
  }
  p = loader.loadAsync(url)
  p.catch(() => glbs.delete(url))
  glbs.set(url, p)
  while (glbs.size > GLB_LRU) {
    const [k, old] = glbs.entries().next().value as [string, Promise<GLTF>]
    glbs.delete(k)
    old.then(disposeGltf, () => {})
  }
  return p
}

let atlas: Promise<{ map: Texture | null; normalMap: Texture | null }> | null = null
/** Textura do atlas do corpo (so as texturas; a malha do corpo e descartada). Cabelos "atlas" usam o mesmo UV. */
function loadAtlas() {
  atlas ??= loader.loadAsync(BASES.doll.glb).then((g) => {
    let map: Texture | null = null
    let normalMap: Texture | null = null
    g.scene.traverse((o) => {
      const m = o as SkinnedMesh
      if (m.isSkinnedMesh && !map) {
        const mat = m.material as MeshPhysicalMaterial
        map = mat.map
        normalMap = mat.normalMap
        m.geometry.dispose()
      }
    })
    return { map, normalMap }
  })
  atlas.catch(() => (atlas = null))
  return atlas
}

// ---------------------------------------------------------------- renderer unico
let R: { renderer: WebGLRenderer; scene: Scene; cam: PerspectiveCamera; size: number } | null = null
function ctx() {
  if (R) return R
  const size = Math.round(THUMB_CSS * Math.min(window.devicePixelRatio || 1, 1.6))
  const canvas = document.createElement('canvas')
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault()
    R = null // o proximo render recria o renderer unico
  })
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(1)
  renderer.setSize(size, size, false)
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.setClearColor(new Color('#ffffff'), 0)
  const scene = new Scene()
  const pm = new PMREMGenerator(renderer)
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.55
  pm.dispose()
  scene.add(new AmbientLight('#fff4f8', 0.25))
  scene.add(new HemisphereLight('#ffffff', '#f1d4e2', 0.7))
  const key = new DirectionalLight('#fff6ee', 1.9)
  key.position.set(2.5, 3.5, 3.5)
  const fill = new DirectionalLight('#ffd9ea', 0.7)
  fill.position.set(-3, 1.2, 2)
  scene.add(key, fill)
  R = { renderer, scene, cam: new PerspectiveCamera(28, 1, 0.01, 50), size }
  return R
}

/** Enquadra a caixa na camera (3/4 de frente, leve elevacao) com margem. */
function frame(cam: PerspectiveCamera, box: Box3) {
  const c = box.getCenter(new Vector3())
  const yaw = (28 * Math.PI) / 180
  const pitch = (10 * Math.PI) / 180
  const fwd = new Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch))
  const right = new Vector3(0, 1, 0).cross(fwd).normalize()
  const up = new Vector3().crossVectors(fwd, right)
  const t = Math.tan((cam.fov * Math.PI) / 360)
  let d = 0.05
  for (let i = 0; i < 8; i++) {
    const p = new Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).sub(c)
    const f = p.dot(fwd)
    d = Math.max(d, Math.abs(p.dot(right)) / t + f, Math.abs(p.dot(up)) / t + f)
  }
  d *= 1.05
  cam.position.copy(c).addScaledVector(fwd, d)
  cam.near = Math.max(d / 50, 0.005)
  cam.far = d * 4
  cam.up.set(0, 1, 0)
  cam.lookAt(c)
  cam.updateProjectionMatrix()
}

const slotName = (m: Material | Material[]): string => (Array.isArray(m) ? m[0] : m).name.replace(/\.\d+$/, '')

/** Geometria "casca": mesmos atributos (sem copiar dados), para poder liberar a copia da GPU sem tocar no original. */
function shell(g: BufferGeometry): BufferGeometry {
  const s = new BufferGeometry()
  s.index = g.index
  for (const k in g.attributes) s.setAttribute(k, g.attributes[k])
  for (const k in g.morphAttributes) (s.morphAttributes as Record<string, typeof g.morphAttributes.position>)[k] = (g.morphAttributes as Record<string, typeof g.morphAttributes.position>)[k]
  s.morphTargetsRelative = g.morphTargetsRelative
  for (const gr of g.groups) s.addGroup(gr.start, gr.count, gr.materialIndex)
  return s
}

const texReady = (t: Texture | null) => {
  if (!t) return true
  const i = t.image as { complete?: boolean; width?: number; naturalWidth?: number } | null | undefined
  return !!i && i.complete !== false && (i.width || i.naturalWidth || 0) > 0
}

interface Built {
  root: Object3D
  meshes: Mesh[]
  mats: MeshPhysicalMaterial[]
  /** reaplica cores/texturas (chamado de novo quando uma textura termina de carregar) */
  apply: () => void
  pending: () => boolean
}

async function build(spec: ThumbSpec): Promise<Built> {
  await loadCatalog()
  const hairDef = getWearable(spec.id)
  const item: CatalogItem | null = hairDef ? null : getCatalogItem(spec.id)
  if (!hairDef && !item) throw new Error('peça desconhecida')
  const gltf = await loadGlb((hairDef ?? item)!.glb)
  const rigid = item?.kind === 'jewelry'
  const root = (rigid ? gltf.scene.clone(true) : cloneSkinned(gltf.scene)) as Group
  const meshes: Mesh[] = []
  root.traverse((o) => {
    if ((o as Mesh).isMesh) meshes.push(o as Mesh)
  })
  if (!meshes.length) throw new Error('GLB sem malha')
  for (const m of meshes) {
    ensureTangents(m.geometry)
    m.geometry = shell(m.geometry)
    m.frustumCulled = false
    m.morphTargetInfluences?.fill(0) // morphs do corpo ficam em 0 (peça em repouso)
  }
  const mats: MeshPhysicalMaterial[] = []

  if (hairDef) {
    const own = hairDef.texture === 'own' ? ((meshes[0].material as MeshPhysicalMaterial | undefined) ?? undefined) : undefined
    const at = own ? null : await loadAtlas()
    const h = own ? createHairMaterial(own.map, own.normalMap, hairDef.refLum) : createHairMaterial(at!.map, at!.normalMap)
    applyHairCalib(h.uniforms, hairCalibFor((hairDef.glb.split('/').pop() ?? '').replace('.glb', '')))
    let ymin = Infinity
    let ymax = -Infinity
    for (const m of meshes) {
      m.material = h.material
      m.geometry.computeBoundingBox()
      ymin = Math.min(ymin, m.geometry.boundingBox!.min.y)
      ymax = Math.max(ymax, m.geometry.boundingBox!.max.y)
    }
    h.uniforms.uYMin.value = ymin
    h.uniforms.uYMax.value = ymax
    mats.push(h.material)
    const hr = spec.hair
    const col = hr?.color ?? hairDef.defaultColor
    const apply = () => {
      ;(h.uniforms.uHair.value as Color).set(col)
      ;(h.uniforms.uHair2.value as Color).set(hr?.color2 ?? col)
      h.uniforms.uHairMode.value = hr?.mode === 'ombre' ? 1 : hr?.mode === 'highlights' ? 2 : hr?.mode === 'twotone' ? 3 : 0
      h.uniforms.uHairAmt.value = hr?.amount ?? 0.5
      h.uniforms.uHairGloss.value = hr?.gloss ?? 0.5
      h.material.sheenColor.set(col).lerp(new Color('#ffffff'), 0.25).multiplyScalar(0.35 + (hr?.gloss ?? 0.5) * 0.7)
    }
    return { root, meshes, mats, apply, pending: () => false }
  }

  // roupa e joia: um material por slot (nome do material no GLB), como no jogo
  const bySlot = new Map<string, MeshPhysicalMaterial>()
  for (const m of meshes) {
    const slot = slotName(m.material)
    let mat = bySlot.get(slot)
    if (!mat) {
      bySlot.set(slot, (mat = new MeshPhysicalMaterial({ name: slot })))
      mats.push(mat)
    }
    m.material = mat
  }
  const it = item!
  const apply = () => {
    it.mats.forEach((ms, i) => {
      const mat = bySlot.get(ms.id)
      if (!mat) return
      const color = spec.colors?.[i] ?? ms.color
      if (it.kind === 'jewelry') {
        applyJewelMaterial(mat, ms.id, color, ms.fin)
        return
      }
      applyFinish(mat, spec.finishes?.[i] ?? ms.finish, color)
      const patId = spec.pattern ?? it.defaultPattern
      const isPatSlot = it.patternSlot ? ms.id === it.patternSlot : i === 0
      const pat = isPatSlot && patId && patId !== 'none' ? it.patterns?.find((x) => x.id === patId) : undefined
      if (pat) {
        const motif = motifColor(color, spec.colors?.[1] ?? it.mats[1]?.color)
        mat.map = pat.texture ? fabricTex(pat.texture, true, pat.scale ?? 4) : patternTexture(pat.id, color, motif, pat.scale ?? 4)
        mat.color.set(pat.texture && pat.tonal ? color : pat.texture && !spec.pattern ? color : '#ffffff')
        mat.needsUpdate = true
      }
    })
  }
  return { root, meshes, mats, apply, pending: () => mats.some((m) => !texReady(m.map) || !texReady(m.normalMap)) }
}

function freeBuilt(b: Built, hair: boolean) {
  for (const m of b.meshes) m.geometry.dispose() // so a casca (copia na GPU deste renderer)
  for (const mat of b.mats) {
    // texturas de estampa/tecido sao do cache do jogo: soltar a copia da GPU (reenviam sozinhas se o jogo usar)
    if (!hair) for (const t of [mat.map, mat.normalMap]) if (t && t.isTexture) t.dispose()
    mat.dispose()
  }
}

const waitTex = (ms: number) =>
  new Promise<void>((res) => {
    const off = onFabricTextureLoad(() => (off(), clearTimeout(t), res()))
    const t = setTimeout(() => (off(), res()), ms)
  })

async function renderOne(spec: ThumbSpec): Promise<string> {
  const t0 = performance.now()
  const b = await build(spec)
  thumbStats.buildMs += performance.now() - t0
  try {
    const t1 = performance.now()
    try {
      return await draw(b)
    } finally {
      thumbStats.drawMs += performance.now() - t1
    }
  } finally {
    freeBuilt(b, !!getWearable(spec.id))
  }
}

async function draw(b: Built): Promise<string> {
  {
    b.apply()
    for (let i = 0; i < 3 && b.pending(); i++) {
      await waitTex(2500)
      b.apply()
    }
    const { renderer, scene, cam } = ctx()
    for (const m of b.mats) syncJewelEnv(m, scene)
    scene.add(b.root)
    b.root.updateMatrixWorld(true)
    for (const m of b.meshes) (m as SkinnedMesh).skeleton?.update()
    const box = new Box3().setFromObject(b.root)
    if (box.isEmpty() || !isFinite(box.min.x)) throw new Error('caixa vazia')
    frame(cam, box)
    renderer.render(scene, cam)
    scene.remove(b.root)
    const blob = await new Promise<Blob | null>((res) => renderer.domElement.toBlob(res, 'image/png'))
    if (!blob) throw new Error('toBlob falhou')
    return URL.createObjectURL(blob)
  }
}

// ---------------------------------------------------------------- cache de resultados (LRU)
const results = new Map<string, string>()
const failed = new Set<string>()
export function peekThumb(key: string): string | undefined {
  const u = results.get(key)
  if (u) {
    results.delete(key)
    results.set(key, u)
  }
  return u
}

// ---------------------------------------------------------------- fila
interface Job {
  key: string
  spec: ThumbSpec
  waiters: Set<(url: string | null) => void>
}
const queue: Job[] = []
let running = false

const idle = (): Promise<void> =>
  new Promise((res) => {
    const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }
    if (w.requestIdleCallback) w.requestIdleCallback(() => res(), { timeout: 250 })
    else setTimeout(res, 24)
  })

function prefetch() {
  // aquece os GLBs dos proximos da fila enquanto o atual renderiza
  for (const j of queue.slice(0, 3)) {
    const d = getWearable(j.spec.id) ?? getCatalogItem(j.spec.id)
    if (d) loadGlb(d.glb).catch(() => {})
  }
}

async function pump() {
  if (running) return
  running = true
  try {
    while (queue.length) {
      await idle() // no maximo uma miniatura por janela ociosa
      const job = queue.shift()
      if (!job) break
      prefetch()
      const t0 = performance.now()
      if (!thumbStats.started) thumbStats.started = t0
      let url: string | null = null
      try {
        url = await renderOne(job.spec)
        results.set(job.key, url)
        while (results.size > RESULT_LRU) {
          const [k, u] = results.entries().next().value as [string, string]
          results.delete(k)
          URL.revokeObjectURL(u)
        }
        thumbStats.rendered++
        thumbStats.totalMs += performance.now() - t0
        if (!thumbStats.firstMs) thumbStats.firstMs = performance.now() - thumbStats.started
      } catch (e) {
        failed.add(job.key)
        thumbStats.failed++
        thumbStats.failedIds.push(`${job.spec.id}: ${(e as Error).message}`)
        thumbStats.lastError = (e as Error).message
      }
      for (const w of job.waiters) w(url)
    }
  } finally {
    running = false
  }
}

/** Pede uma miniatura; `cb` recebe a URL (ou null se falhar). Devolve o cancelamento (tira da fila se ainda nao comecou). */
export function requestThumb(spec: ThumbSpec, cb: (url: string | null) => void): () => void {
  const key = thumbKey(spec)
  const hit = peekThumb(key)
  if (hit) {
    thumbStats.cacheHits++
    cb(hit)
    return () => {}
  }
  if (failed.has(key)) {
    cb(null)
    return () => {}
  }
  let job = queue.find((j) => j.key === key)
  if (!job) queue.push((job = { key, spec, waiters: new Set() }))
  job.waiters.add(cb)
  void pump()
  const j = job
  return () => {
    j.waiters.delete(cb)
    if (!j.waiters.size) {
      const i = queue.indexOf(j)
      if (i >= 0) queue.splice(i, 1)
    }
  }
}

if (import.meta.env.DEV) (window as unknown as { __thumbs: unknown }).__thumbs = { stats: thumbStats, results, queue }
