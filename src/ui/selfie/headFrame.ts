import { Box3, Vector3, type Bone, type Object3D, type SkinnedMesh } from 'three'

/**
 * Localiza o osso `mixamorigHead` da jogadora (o mais proximo da posicao dela) e mede a cabeca para enquadrar o rosto:
 * a altura do topo (cabelo/coque/chapeu entram na medida) acima do osso. Usado pela selfie e pelo retrato do perfil.
 */
export interface HeadInfo {
  head: Bone
  root: Object3D
  /** y do ponto mais alto do personagem (cabelo/chapeu inclusos), em metros no mundo */
  topY: number
}

const v = new Vector3()
const box = new Box3()
let cached: { head: Bone; root: Object3D; topY: number; t: number } | null = null

function inScene(o: Object3D) {
  let p: Object3D | null = o
  while (p.parent) p = p.parent
  return (p as { isScene?: boolean }).isScene === true
}

function find(scene: Object3D, px: number, py: number, pz: number): Bone | null {
  let best: Bone | null = null
  let bd = Infinity
  scene.traverse((o) => {
    if (o.name !== 'mixamorigHead' || !(o as Bone).isBone) return
    o.getWorldPosition(v)
    const d = (v.x - px) ** 2 + (v.z - pz) ** 2 + (v.y - py) ** 2 * 0.25
    if (d < bd) {
      bd = d
      best = o as Bone
    }
  })
  return bd < 4 ? best : null // a menos de 2 m
}

/** Forca remedir o topo na proxima chamada (mudou cabelo/chapeu). */
export function invalidateHeadTop() {
  if (cached) cached.t = -99
}

/** O topo e remedido apos `maxAge` s (ou quando invalidado); a medida e por vertice, entao nao e barata. */
export function getHeadInfo(scene: Object3D, px: number, py: number, pz: number, maxAge = 5): HeadInfo | null {
  if (!cached || !inScene(cached.head)) {
    const head = find(scene, px, py, pz)
    if (!head) {
      cached = null
      return null
    }
    let root: Object3D = head
    while (root.parent && !root.children.some((c) => (c as SkinnedMesh).isSkinnedMesh)) root = root.parent
    cached = { head, root, topY: 0, t: -99 }
  }
  const now = performance.now() / 1000
  if (now - cached.t > maxAge) {
    cached.t = now
    cached.head.updateWorldMatrix(true, false)
    cached.head.getWorldPosition(v)
    box.makeEmpty()
    box.setFromObject(cached.root, true) // por vertice (ossos e morphs inclusos): a caixa do repouso nao inclui o cabelo
    // o topo nunca fica abaixo da cabeca (caixa vazia / ossos sem malha)
    cached.topY = Math.max(box.max.y, v.y + 0.18)
    if (!isFinite(cached.topY)) cached.topY = v.y + 0.25
  }
  return cached
}

/** Esquece o cache (troca de personagem/aparencia). */
export function resetHeadInfo() {
  cached = null
}
