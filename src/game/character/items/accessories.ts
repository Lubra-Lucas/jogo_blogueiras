import { InstancedMesh, Matrix4, Mesh, SphereGeometry, Vector3 } from 'three'
import { headSurface } from '../body'
import { BODY } from '../joints'
import { Batch, ellipsoid, makeMatrix, taperedTube } from '../geometry'
import { fabricMaterial, goldMaterial, pearlMaterial } from '../materials'
import { registerItem } from './registry'
import type { BuiltPart } from './types'

const HC = BODY.headCenter

// ------------------------------------------------------------ colar de perolas

function pearlChoker(gold: string): BuiltPart[] {
  const n = 26
  const pearls = new InstancedMesh(new SphereGeometry(0.0074, 7, 5), pearlMaterial(), n)
  pearls.name = 'choker'
  const m = new Matrix4()
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    // raio sobre o pescoco (cilindro r~0.035) + leve queda na frente
    const front = Math.max(0, Math.cos(a))
    const y = 0.02 - 0.007 * front
    m.makeTranslation(Math.sin(a) * 0.041, y, Math.cos(a) * 0.041)
    pearls.setMatrixAt(i, m)
  }
  pearls.instanceMatrix.needsUpdate = true
  // pingente dourado na frente
  const pendant = new Batch()
    .addAt(new SphereGeometry(0.0085, 12, 8), [0, 0.006, 0.0455])
    .addAt(new SphereGeometry(0.0055, 10, 8), [0, -0.007, 0.046])
  const pm = new Mesh(pendant.build(), goldMaterial(gold))
  pm.name = 'choker.pendant'
  return [
    { joint: 'neck', object: pearls },
    { joint: 'neck', object: pm },
  ]
}

registerItem({
  id: 'acc.pearlChoker',
  slot: 'accessory',
  attachTo: ['neck'],
  defaultColors: ['#e6b84f'],
  defaultParams: {},
  build: (s) => pearlChoker(s.colors[0]),
})

// ------------------------------------------------------------ brincos

function earrings(gold: string): BuiltPart[] {
  const b = new Batch()
  for (const s of [-1, 1]) {
    const x = s * 0.149
    const y = HC - 0.075
    b.addAt(new SphereGeometry(0.0072, 8, 6), [x, y, -0.004])
    b.addAt(ellipsoid(0.0042, 0.009, 0.0042, 6, 5), [x + s * 0.003, y - 0.014, -0.004])
    b.addAt(ellipsoid(0.0075, 0.0105, 0.0075, 8, 6), [x + s * 0.004, y - 0.03, -0.004])
  }
  const m = new Mesh(b.build(), goldMaterial(gold))
  m.name = 'earrings'
  return [{ joint: 'head', object: m }]
}

registerItem({
  id: 'acc.earringsGold',
  slot: 'accessory',
  attachTo: ['head'],
  defaultColors: ['#e6b84f'],
  defaultParams: {},
  build: (s) => earrings(s.colors[0]),
})

// ------------------------------------------------------------ laco grande

/** Laco com borda dourada; fica sobre o coque no alto da cabeca, levemente para tras. */
function bow(cloth: string, gold: string): BuiltPart[] {
  const fab = new Batch()
  const gld = new Batch()
  const pos = new Vector3(0, HC + 0.185, -0.075)
  const base = makeMatrix([pos.x, pos.y, pos.z], [-0.35, 0, 0])
  const add = (batch: Batch, g: import('three').BufferGeometry, local: [number, number, number], rot: [number, number, number], sc?: [number, number, number]) => {
    batch.add(g, base.clone().multiply(makeMatrix(local, rot, sc)))
  }
  for (const s of [-1, 1]) {
    // asa (almofadada) + borda dourada em elipse
    add(fab, ellipsoid(0.085, 0.052, 0.022, 14, 8), [s * 0.085, 0, 0], [0, s * 0.12, s * 0.22])
    const outline: Vector3[] = []
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2
      outline.push(new Vector3(Math.cos(a) * 0.088, Math.sin(a) * 0.055, 0))
    }
    const edge = taperedTube(outline, () => 0.0042, { radial: 4, closed: true, hint: new Vector3(0, 0, 1) })
    add(gld, edge, [s * 0.085, 0, 0], [0, s * 0.12, s * 0.22])
    // fitas pendentes
    add(fab, ellipsoid(0.026, 0.085, 0.009, 10, 8), [s * 0.03, -0.075, -0.012], [0.15, 0, s * 0.3])
  }
  // no central dourado-trim
  add(fab, ellipsoid(0.034, 0.036, 0.03, 12, 10), [0, 0, 0.006], [0, 0, 0])
  const band: Vector3[] = []
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    band.push(new Vector3(Math.cos(a) * 0.036, Math.sin(a) * 0.038, 0.006))
  }
  add(gld, taperedTube(band, () => 0.0045, { radial: 4, closed: true, hint: new Vector3(0, 0, 1) }), [0, 0, 0.0], [0, 0, 0])
  add(gld, new SphereGeometry(0.011, 12, 8), [0, 0, 0.036], [0, 0, 0])
  const fm = new Mesh(fab.build(), fabricMaterial(cloth))
  fm.name = 'bow'
  const gm = new Mesh(gld.build(), goldMaterial(gold))
  gm.name = 'bow.gold'
  return [
    { joint: 'head', object: fm },
    { joint: 'head', object: gm },
  ]
}

registerItem({
  id: 'acc.hairBow',
  slot: 'accessory',
  attachTo: ['head'],
  defaultColors: ['#ffc9dc', '#e6b84f'],
  defaultParams: {},
  build: (s) => bow(s.colors[0], s.colors[1]),
})

// ------------------------------------------------------------ tiara

function tiara(gold: string, gem: string): BuiltPart[] {
  const g = new Batch()
  const gems = new Batch()
  const arc: Vector3[] = []
  const hints: Vector3[] = []
  const tmp: [number, number, number] = [0, 0, 0]
  const N = 30
  const elev = (a: number) => 0.9 - 0.42 * (a / 1.05) ** 2
  const at = (a: number, sc: number) => {
    headSurface(a, elev(a), sc, tmp)
    return new Vector3(tmp[0], HC + tmp[1], tmp[2])
  }
  for (let i = 0; i < N; i++) {
    const a = -1.05 + (2.1 * i) / (N - 1)
    const p = at(a, 1.085)
    arc.push(p)
    hints.push(new Vector3(p.x, p.y - HC, p.z).normalize())
  }
  g.add(taperedTube(arc, () => 0.0042, { radial: 6, flat: 0.8, hint: hints }))
  // perolas ao longo do arco + joia central maior (rosa)
  for (const a of [-0.84, -0.56, -0.28, 0.28, 0.56, 0.84]) {
    const p = at(a, 1.1)
    gems.add(new SphereGeometry(0.0085, 10, 8), new Matrix4().makeTranslation(p.x, p.y, p.z))
  }
  const c = at(0, 1.1)
  g.add(new SphereGeometry(0.0135, 12, 8), new Matrix4().makeTranslation(c.x, c.y, c.z))
  const gm = new Mesh(g.build(), goldMaterial(gold))
  gm.name = 'tiara'
  const pm = new Mesh(gems.build(), pearlMaterial())
  pm.name = 'tiara.pearls'
  // joia central rosa (material proprio)
  const jewel = new Mesh(new SphereGeometry(0.0105, 14, 10), pearlMaterial(gem))
  jewel.name = 'tiara.gem'
  jewel.position.set(c.x, c.y + 0.0, c.z + 0.007)
  return [
    { joint: 'head', object: gm },
    { joint: 'head', object: pm },
    { joint: 'head', object: jewel },
  ]
}

registerItem({
  id: 'acc.tiara',
  slot: 'accessory',
  attachTo: ['head'],
  defaultColors: ['#e6b84f', '#ff9fc4'],
  defaultParams: {},
  build: (s) => tiara(s.colors[0], s.colors[1]),
})
