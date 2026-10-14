import { CapsuleGeometry, CylinderGeometry, Mesh, SphereGeometry, type BufferGeometry, type Material } from 'three'
import { BODY, HEAD, type JointName } from './joints'
import { Batch, ellipsoid, lathe, resampleProfile } from './geometry'
import type { CharacterRig } from './rig'

/** Perfil do torso (y local da junta spine, raio). Cintura fina. Usado tambem pelo corpete. */
export const TORSO_PROFILE: ReadonlyArray<readonly [number, number]> = [
  [-0.09, 0.118],
  [-0.04, 0.103],
  [0, 0.093],
  [0.05, 0.1],
  [0.11, 0.115],
  [0.17, 0.128],
  [0.22, 0.132],
  [0.27, 0.12],
  [0.31, 0.098],
  [0.34, 0.066],
  [0.365, 0.042],
  [0.385, 0.033],
]
export const TORSO_DEPTH = 0.74 // escala em z (corpo mais fundo que largo -> 0.74)

// ---------------------------------------------------------------- cabeca

/** Fator de estreitamento do queixo para um sen(elevacao) (uy) dado. */
export function jawFactor(uy: number): number {
  // ovo suave: queixo pequeno e arredondado, bochechas um pouco mais cheias
  const jaw = uy < 0 ? 1 - 0.17 * Math.pow(-uy, 2.2) : 1
  const cheek = 0.04 * Math.exp(-(((uy + 0.3) / 0.28) ** 2))
  return jaw + cheek
}

/** Ponto na superficie (deformada) da cabeca, relativo ao centro. `scale` > 1 afasta da superficie. */
export function headSurface(
  azimuth: number,
  elevation: number,
  scale = 1,
  out: [number, number, number] = [0, 0, 0],
): [number, number, number] {
  const ux = Math.sin(azimuth) * Math.cos(elevation)
  const uy = Math.sin(elevation)
  const uz = Math.cos(azimuth) * Math.cos(elevation)
  const k = jawFactor(uy)
  out[0] = ux * k * HEAD.rx * scale
  out[1] = uy * HEAD.ry * scale
  out[2] = uz * k * HEAD.rz * scale
  return out
}

/** Deforma uma esfera unitaria na forma da cabeca (redonda, queixo suave). */
export function deformHead(g: BufferGeometry, scale = 1): BufferGeometry {
  const p = g.getAttribute('position')
  const n = g.getAttribute('normal')
  for (let i = 0; i < p.count; i++) {
    const ux = p.getX(i)
    const uy = p.getY(i)
    const uz = p.getZ(i)
    const k = jawFactor(uy)
    p.setXYZ(i, ux * k * HEAD.rx * scale, uy * HEAD.ry * scale, uz * k * HEAD.rz * scale)
    // normal analitica do elipsoide (igual para cabeca e decalque -> iluminacao identica, sem emenda)
    const nx = ux / HEAD.rx
    const ny = uy / HEAD.ry
    const nz = uz / HEAD.rz
    const l = Math.hypot(nx, ny, nz) || 1
    n.setXYZ(i, nx / l, ny / l, nz / l)
  }
  n.needsUpdate = true
  return g
}

// ---------------------------------------------------------------- maos

function handGeometry(side: 1 | -1): BufferGeometry {
  const b = new Batch()
  const inward = -side // direcao para o corpo (x)
  // palma
  b.addAt(ellipsoid(0.013, 0.035, 0.025, 10, 8), [0, -0.036, 0])
  const finger = (z: number, y0: number, len: number, r: number, c1: number, c2: number, spread: number) => {
    // dois segmentos: proximal (curva leve) e distal (curva maior)
    let x = 0
    let y = y0
    const l1 = len * 0.55
    const l2 = len * 0.45
    const seg = (l: number, ang: number) => {
      const dx = Math.sin(ang) * inward
      const dy = -Math.cos(ang)
      const cx = x + dx * (l / 2 + r * 0.6)
      const cy = y + dy * (l / 2 + r * 0.6)
      b.addAt(new CapsuleGeometry(r, l, 2, 6), [cx, cy, z], [spread, 0, ang * inward])
      x += dx * l
      y += dy * l
    }
    seg(l1, c1)
    seg(l2, c2)
  }
  finger(-0.016, -0.066, 0.036, 0.0072, 0.1, 0.55, 0.05) // minimo
  finger(-0.0055, -0.07, 0.046, 0.0078, 0.1, 0.5, 0.02) // anelar
  finger(0.0055, -0.07, 0.048, 0.008, 0.1, 0.45, -0.02) // medio
  finger(0.016, -0.066, 0.042, 0.0078, 0.12, 0.5, -0.05) // indicador
  // polegar: sai do lado da palma, para frente
  {
    const r = 0.0085
    b.addAt(new CapsuleGeometry(r, 0.022, 2, 6), [inward * 0.004, -0.05, 0.027], [-0.55, 0, 0.25 * inward])
    b.addAt(new CapsuleGeometry(r * 0.9, 0.02, 2, 6), [inward * 0.011, -0.07, 0.04], [-0.9, 0, 0.5 * inward])
  }
  const g = b.build()
  g.scale(1.22, 1.22, 1.22) // maos um pouco maiores e mais suaves
  return g
}

// ---------------------------------------------------------------- corpo

export interface BodyBuild {
  meshes: Mesh[]
}

/** Constroi o corpo de pele (um mesh por junta, geometria fixa, compartilhando o material). */
export function buildBody(rig: CharacterRig, skin: Material): BodyBuild {
  const meshes: Mesh[] = []
  const put = (joint: JointName, geo: BufferGeometry, name: string) => {
    const m = new Mesh(geo, skin)
    m.name = name
    rig.joints[joint].add(m)
    meshes.push(m)
  }

  // pelve
  put('hips', ellipsoid(0.148, 0.105, 0.108, 18, 10), 'skin.pelvis')

  // torso (revolucao elíptica)
  {
    const g = lathe(resampleProfile(TORSO_PROFILE, 18), 28)
    g.scale(1, 1, TORSO_DEPTH)
    g.computeVertexNormals()
    put('spine', g, 'skin.torso')
  }

  // pescoco
  {
    const g = new CylinderGeometry(0.029, 0.034, 0.1, 16, 1)
    g.translate(0, 0.03, 0)
    put('neck', g, 'skin.neck')
  }

  // cabeca + nariz + orelhas
  {
    const b = new Batch()
    const head = deformHead(new SphereGeometry(1, 28, 20))
    b.addAt(head, [0, BODY.headCenter, 0])
    for (const s of [-1, 1]) {
      b.addAt(ellipsoid(0.011, 0.024, 0.014, 10, 8), [s * (HEAD.rx - 0.002), BODY.headCenter - 0.006, -0.004], [0, 0, s * 0.12])
    }
    put('head', b.build(), 'skin.head')
  }

  for (const [s, side] of [
    [1, 'L'],
    [-1, 'R'],
  ] as const) {
    // braco superior: ombro + manga de pele
    {
      const b = new Batch()
      b.addAt(new SphereGeometry(0.046, 16, 12))
      b.add(lathe([[0, 0.046], [-0.1, 0.042], [-0.27, 0.032]], 16))
      put(`upperArm${side}` as JointName, b.build(), `skin.upperArm${side}`)
    }
    // antebraco (+ esfera do cotovelo)
    {
      const b = new Batch()
      b.addAt(new SphereGeometry(0.033, 14, 10))
      b.add(lathe([[0, 0.033], [-0.07, 0.035], [-0.24, 0.022]], 16))
      b.addAt(new SphereGeometry(0.023, 12, 8), [0, -BODY.lowerArm, 0])
      put(`lowerArm${side}` as JointName, b.build(), `skin.lowerArm${side}`)
    }
    // mao
    put(`hand${side}` as JointName, handGeometry(s), `skin.hand${side}`)

    // coxa
    {
      const b = new Batch()
      b.addAt(new SphereGeometry(0.07, 12, 8))
      b.add(lathe([[0, 0.07], [-0.1, 0.069], [-0.25, 0.056], [-0.38, 0.046], [-0.42, 0.044]], 14))
      b.addAt(new SphereGeometry(0.044, 14, 10), [0, -BODY.upperLeg, 0])
      put(`upperLeg${side}` as JointName, b.build(), `skin.upperLeg${side}`)
    }
    // canela
    {
      const b = new Batch()
      b.add(lathe([[0, 0.044], [-0.06, 0.044], [-0.14, 0.047], [-0.24, 0.038], [-0.33, 0.028], [-0.38, 0.026]], 14))
      b.addAt(new SphereGeometry(0.027, 12, 8), [0, -BODY.lowerLeg, 0])
      put(`lowerLeg${side}` as JointName, b.build(), `skin.lowerLeg${side}`)
    }
    // pe (inclinado para o salto)
    {
      const b = new Batch()
      b.addAt(ellipsoid(0.03, 0.022, 0.094, 14, 10), [0, -0.05, 0.05], [0.36, 0, 0])
      put(`foot${side}` as JointName, b.build(), `skin.foot${side}`)
    }
  }

  return { meshes }
}
