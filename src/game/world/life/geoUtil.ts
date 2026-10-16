import { BufferGeometry, Color, Euler, Float32BufferAttribute, Matrix4, Quaternion, Vector3 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/** Pinta a geometria inteira com uma cor de vertice. */
export function paintGeo(g: BufferGeometry, color: string | number): BufferGeometry {
  const c = new Color(color as string)
  const n = g.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r
    arr[i * 3 + 1] = c.g
    arr[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new Float32BufferAttribute(arr, 3))
  return g
}

/** Junta geometrias (position/normal/color), descartando uv e demais atributos. */
export function mergeGeo(list: BufferGeometry[]): BufferGeometry {
  const clean = list.map((g) => {
    const c = g.index ? g.clone() : g.clone()
    for (const name of Object.keys(c.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'color') c.deleteAttribute(name)
    if (!c.index) c.setIndex(Array.from({ length: c.attributes.position.count }, (_, i) => i))
    if (!c.attributes.color) paintGeo(c, '#ffffff')
    return c
  })
  return mergeGeometries(clean, false)!
}

const _m = new Matrix4()
const _q = new Quaternion()
/** Aplica escala, rotacao (euler XYZ em rad) e posicao a uma geometria. */
export function xform(g: BufferGeometry, pos: [number, number, number], rot: [number, number, number] = [0, 0, 0], scale: [number, number, number] = [1, 1, 1]) {
  _q.setFromEuler(new Euler(rot[0], rot[1], rot[2]))
  _m.compose(new Vector3(...pos), _q, new Vector3(...scale))
  g.applyMatrix4(_m)
  return g
}
