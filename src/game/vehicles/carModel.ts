import {
  BoxGeometry,
  Box3,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
  type Material,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { carBySlug } from './catalog'

export type WheelKey = 'FL' | 'FR' | 'RL' | 'RR'
export const WHEEL_KEYS: WheelKey[] = ['FL', 'FR', 'RL', 'RR']

export interface WheelInfo {
  key: WheelKey
  /** centro do eixo no espaco do modelo (y = raio) */
  hub: Vector3
  radius: number
}

/** Resultado do carregamento de um modelo (compartilhado entre instancias). */
export interface CarAsset {
  slug: string
  scene: Group
  /** caixa do modelo (largura x, altura y, comprimento z) */
  size: Vector3
  center: Vector3
  wheels: Record<WheelKey, WheelInfo>
  /** quadril da motorista (topo da almofada) */
  seat: Vector3
  fallback: boolean
}

/** Dimensoes para o modelo provisorio (se o GLB nao existir). [largura, altura, comprimento, entre-eixos, raio] */
const FALLBACK_DIMS: Record<string, [number, number, number, number, number]> = {
  compacto: [1.7, 1.55, 3.5, 2.25, 0.3],
  conversivel: [1.85, 1.25, 4.5, 2.75, 0.34],
  suv: [1.9, 1.85, 4.5, 2.8, 0.4],
  esportivo: [1.95, 1.12, 4.4, 2.6, 0.34],
  van: [2.0, 2.5, 5.2, 3.2, 0.36],
}

function fallbackScene(slug: string): Group {
  const [w, h, l, wb, r] = FALLBACK_DIMS[slug] ?? FALLBACK_DIMS.compacto
  const g = new Group()
  const mat = (name: string, color: string, rough = 0.4, metal = 0) => {
    const m = new MeshStandardMaterial({ color, roughness: rough, metalness: metal })
    m.name = name
    return m
  }
  const body = mat('body', '#cccccc', 0.35)
  const glass = mat('glass', '#3a4658', 0.1)
  glass.transparent = true
  glass.opacity = 0.55
  const tire = mat('tire', '#1c1d21', 0.9)
  const rim = mat('rim', '#d9dde6', 0.3, 1)
  const slabH = h * 0.42
  const slab = new Mesh(new BoxGeometry(w, slabH, l), body)
  slab.position.set(0, 0.22 + slabH / 2, 0)
  const cab = new Mesh(new BoxGeometry(w * 0.88, h - 0.22 - slabH, l * 0.5), glass)
  cab.position.set(0, 0.22 + slabH + (h - 0.22 - slabH) / 2, -l * 0.05)
  const head = new Mesh(new BoxGeometry(w * 0.7, 0.1, 0.06), mat('headlight', '#fff3d0'))
  head.position.set(0, 0.22 + slabH * 0.6, l / 2)
  const tail = new Mesh(new BoxGeometry(w * 0.7, 0.1, 0.06), mat('taillight', '#d02020'))
  tail.position.set(0, 0.22 + slabH * 0.6, -l / 2)
  g.add(slab, cab, head, tail)
  const tx = w / 2 - 0.12
  const mk = (key: WheelKey, x: number, z: number) => {
    const steer = new Object3D()
    steer.name = `wheel_${key}`
    steer.position.set(x, r, z)
    const spin = new Mesh(new CylinderGeometry(r, r, 0.22, 20), tire)
    spin.name = `wheel_${key}_mesh`
    spin.rotation.z = Math.PI / 2
    // eixo ao longo de X: o cilindro padrao e vertical, entao o grupo gira o cilindro para dentro de um pai
    const holder = new Group()
    holder.name = spin.name
    spin.name = ''
    spin.material = tire
    holder.add(spin)
    const cap = new Mesh(new CylinderGeometry(r * 0.55, r * 0.55, 0.24, 14), rim)
    cap.rotation.z = Math.PI / 2
    holder.add(cap)
    steer.add(holder)
    g.add(steer)
  }
  mk('FL', tx, wb / 2)
  mk('FR', -tx, wb / 2)
  mk('RL', tx, -wb / 2)
  mk('RR', -tx, -wb / 2)
  const seat = new Object3D()
  seat.name = 'seat'
  seat.position.set(w * 0.2, 0.5, -0.1)
  g.add(seat)
  return g
}

const cache = new Map<string, Promise<CarAsset>>()
const loader = new GLTFLoader()

function analyse(slug: string, scene: Group, fallback: boolean): CarAsset {
  scene.updateMatrixWorld(true)
  const box = new Box3().setFromObject(scene)
  const size = box.getSize(new Vector3())
  const center = box.getCenter(new Vector3())
  const wheels = {} as Record<WheelKey, WheelInfo>
  const wb = new Box3()
  for (const key of WHEEL_KEYS) {
    const node = scene.getObjectByName(`wheel_${key}`)
    const hub = new Vector3()
    let radius = 0.33
    if (node) {
      node.getWorldPosition(hub)
      wb.setFromObject(node)
      radius = Math.max(0.2, (wb.max.y - wb.min.y) / 2)
    } else {
      hub.set(key.endsWith('L') ? size.x * 0.4 : -size.x * 0.4, radius, key.startsWith('F') ? size.z * 0.3 : -size.z * 0.3)
    }
    wheels[key] = { key, hub, radius }
  }
  const seatNode = scene.getObjectByName('seat')
  const seat = new Vector3()
  if (seatNode) seatNode.getWorldPosition(seat)
  else seat.set(size.x * 0.2, size.y * 0.35, 0)
  return { slug, scene, size, center, wheels, seat, fallback }
}

/** Carrega (uma vez) o GLB do carro; se faltar, devolve um modelo provisorio de caixas. */
export function loadCarAsset(slug: string): Promise<CarAsset> {
  let p = cache.get(slug)
  if (!p) {
    const url = carBySlug(slug).modelo
    p = new Promise<CarAsset>((resolve) => {
      loader.load(
        url,
        (gltf) => resolve(analyse(slug, gltf.scene as unknown as Group, false)),
        undefined,
        () => resolve(analyse(slug, fallbackScene(slug), true)),
      )
    })
    cache.set(slug, p)
  }
  return p
}

export interface WheelVis {
  key: WheelKey
  steer: Object3D
  spin: Object3D
  hub: Vector3
  radius: number
  front: boolean
}

export interface CarVisual {
  root: Group
  wheels: WheelVis[]
  body: Material[]
  rim: Material[]
  head: MeshStandardMaterial[]
  tail: MeshStandardMaterial[]
  /** material de vidro (para escurecer/clarear) */
  glass: Material[]
  setColors: (body: string, rim: string) => void
  /** 0..1 */
  setLights: (headlights: number, brake: number) => void
  dispose: () => void
}

const _c = new Color()

/** Cria uma instancia visual (materiais clonados nos slots que mudam). */
export function createCarVisual(asset: CarAsset, bodyHex: string, rimHex: string, castShadow: boolean): CarVisual {
  const root = asset.scene.clone(true) as Group
  const owned: Material[] = []
  const body: Material[] = []
  const rim: Material[] = []
  const head: MeshStandardMaterial[] = []
  const tail: MeshStandardMaterial[] = []
  const glass: Material[] = []
  const baseEmissive = new Map<Material, number>()
  const swap = (m: Material): Material => {
    const c = m.clone()
    owned.push(c)
    return c
  }
  root.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = castShadow
    mesh.receiveShadow = false
    const fix = (m: Material): Material => {
      const n = m.name.toLowerCase()
      if (n.startsWith('body')) {
        const c = swap(m)
        body.push(c)
        return c
      }
      if (n.startsWith('rim')) {
        const c = swap(m)
        rim.push(c)
        return c
      }
      if (n.startsWith('headlight')) {
        const c = swap(m) as MeshStandardMaterial
        baseEmissive.set(c, c.emissiveIntensity || 1)
        head.push(c)
        return c
      }
      if (n.startsWith('taillight')) {
        const c = swap(m) as MeshStandardMaterial
        baseEmissive.set(c, c.emissiveIntensity || 1)
        tail.push(c)
        return c
      }
      if (n.startsWith('glass')) {
        const c = swap(m)
        glass.push(c)
        return c
      }
      return m
    }
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(fix) : fix(mesh.material)
  })

  const wheels: WheelVis[] = WHEEL_KEYS.map((key) => {
    const steer = root.getObjectByName(`wheel_${key}`) ?? new Object3D()
    const spin = root.getObjectByName(`wheel_${key}_mesh`) ?? steer
    if (spin === steer) steer.rotation.order = 'YXZ'
    const info = asset.wheels[key]
    return { key, steer, spin, hub: info.hub.clone(), radius: info.radius, front: key[0] === 'F' }
  })

  const setColors = (b: string, r: string) => {
    _c.set(b)
    for (const m of body) (m as MeshStandardMaterial).color.copy(_c)
    _c.set(r)
    for (const m of rim) (m as MeshStandardMaterial).color.copy(_c)
  }
  setColors(bodyHex, rimHex)

  const setLights = (h: number, br: number) => {
    for (const m of head) {
      m.emissiveIntensity = (baseEmissive.get(m) ?? 1) * (0.25 + h * 2.6)
    }
    for (const m of tail) {
      m.emissiveIntensity = (baseEmissive.get(m) ?? 1) * (0.2 + h * 0.7 + br * 3.2)
    }
  }
  setLights(0, 0)

  return {
    root,
    wheels,
    body,
    rim,
    head,
    tail,
    glass,
    setColors,
    setLights,
    dispose: () => owned.forEach((m) => m.dispose()),
  }
}
