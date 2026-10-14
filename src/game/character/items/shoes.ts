import { CylinderGeometry, Mesh, TorusGeometry } from 'three'
import { Batch, ellipsoid } from '../geometry'
import { goldMaterial } from '../materials'
import { registerItem } from './registry'
import type { BuiltPart } from './types'

/** Espaco da junta foot (na posicao do tornozelo; o chao fica em y = -0.10). */
function heel(color: string): BuiltPart[] {
  const parts: BuiltPart[] = []
  for (const side of ['L', 'R'] as const) {
    const b = new Batch()
    // cabedal: bico + peito do pe, inclinado para o salto
    b.addAt(ellipsoid(0.036, 0.027, 0.1, 16, 10), [0, -0.046, 0.05], [0.36, 0, 0])
    // contraforte do calcanhar
    b.addAt(ellipsoid(0.034, 0.032, 0.04, 10, 8), [0, -0.03, -0.034], [0.2, 0, 0])
    // salto agulha
    const stiletto = new CylinderGeometry(0.0125, 0.0055, 0.074, 8, 1)
    b.addAt(stiletto, [0, -0.063, -0.047], [-0.07, 0, 0])
    // tira do tornozelo
    b.addAt(new TorusGeometry(0.031, 0.0042, 5, 14), [0, -0.012, 0.004], [Math.PI / 2 - 0.1, 0, 0])
    const m = new Mesh(b.build(), goldMaterial(color))
    m.name = `shoe${side}`
    parts.push({ joint: side === 'L' ? 'footL' : 'footR', object: m })
  }
  return parts
}

registerItem({
  id: 'shoes.goldHeels',
  slot: 'shoes',
  attachTo: ['footL', 'footR'],
  defaultColors: ['#e6b84f'],
  defaultParams: {},
  build: (spec) => heel(spec.colors[0]),
})
