import { useMemo } from 'react'
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, IcosahedronGeometry, LineSegments, Mesh, ShaderMaterial } from 'three'
import { lampSpots } from '../environment/lamps'
import { CITY } from '../city/layout'
import { env } from '../environment/envState'
import { useFrame } from '@react-three/fiber'
import { LIFE_TIER } from './lifeQuality'
import { lifeU } from './lifeState'
import { GLSL_COMMON } from './patch'

/**
 * Fios de luzinhas entre postes proximos (festao), que balancam com o vento (vertex shader) e acendem a noite.
 * Cada fio e uma catenaria: pontos do fio (LineSegments) + lampadas (icosaedros pequenos), tudo em 2 malhas.
 */

const MAX = { low: 20, medium: 44, high: 80 }[LIFE_TIER]
const HUBS: [number, number][] = [
  [0, 0],
  [0, 158],
  [0, 94],
  [150, 0],
  [0, -90],
  [0, -150],
]

const VERT = /* glsl */ `
${GLSL_COMMON}
attribute float aS;
attribute vec3 aCol;
attribute float aBulb;
varying vec3 vCol;
varying float vBulb;
varying float vPh;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  float w = 4.0 * aS * (1.0 - aS);
  wp.xyz += lfSway(wp.xyz, w, 0.5) * 1.0 + vec3(0.0, sin(uLifeT * 1.3 + wp.x * 0.7 + wp.z) * 0.02 * w, 0.0);
  vCol = aCol;
  vBulb = aBulb;
  vPh = aS * 40.0 + wp.x;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`
const FRAG = /* glsl */ `
varying vec3 vCol;
varying float vBulb;
varying float vPh;
uniform float uOn;
uniform float uT;
void main() {
  vec3 c = vCol;
  if (vBulb > 0.5) {
    float tw = 0.9 + 0.1 * sin(uT * 2.0 + vPh * 3.0);
    c = vCol * (0.35 + 2.4 * uOn * tw);
  } else {
    c = vec3(0.12, 0.12, 0.13) * (0.4 + 0.6 * (1.0 - uOn));
  }
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}
`

interface Str {
  a: [number, number, number]
  b: [number, number, number]
  neon: boolean
}

function pairs(): Str[] {
  const spots = lampSpots()
  const used = new Set<string>()
  const out: (Str & { score: number })[] = []
  for (let i = 0; i < spots.length; i++) {
    let bj = -1
    let bd = 1e9
    for (let j = 0; j < spots.length; j++) {
      if (j === i) continue
      const d = Math.hypot(spots[i].x - spots[j].x, spots[i].z - spots[j].z)
      if (d > 4.5 && d < 13 && d < bd && !used.has(`${Math.min(i, j)}-${Math.max(i, j)}`)) {
        bd = d
        bj = j
      }
    }
    if (bj < 0) continue
    used.add(`${Math.min(i, bj)}-${Math.max(i, bj)}`)
    const a = spots[i]
    const b = spots[bj]
    const mx = (a.x + b.x) / 2
    const mz = (a.z + b.z) / 2
    const score = Math.min(...HUBS.map(([hx, hz]) => Math.hypot(mx - hx, mz - hz)))
    out.push({ a: [a.x, a.y - 0.12, a.z], b: [b.x, b.y - 0.12, b.z], neon: !a.y2k && false, score })
  }
  void CITY
  out.sort((p, q) => p.score - q.score)
  return out.slice(0, MAX)
}

export function Bunting() {
  const { line, bulbs, mat } = useMemo(() => {
    const strs = pairs()
    const lp: number[] = []
    const ls: number[] = []
    const lc: number[] = []
    const lb: number[] = []
    const bp: number[] = []
    const bs: number[] = []
    const bc: number[] = []
    const bb: number[] = []
    const bi: number[] = []
    const ico = new IcosahedronGeometry(0.075, 0)
    const icoPos = ico.getAttribute('position')
    const col = new Color()
    const warm = ['#ffe2a8', '#ffd9a0', '#fff0cf', '#ffe2a8']
    strs.forEach((s, k) => {
      const len = Math.hypot(s.b[0] - s.a[0], s.b[2] - s.a[2])
      const sag = len * 0.07
      const N = Math.max(6, Math.round(len * 1.1))
      const at = (u: number): [number, number, number] => [s.a[0] + (s.b[0] - s.a[0]) * u, s.a[1] + (s.b[1] - s.a[1]) * u - sag * 4 * u * (1 - u), s.a[2] + (s.b[2] - s.a[2]) * u]
      for (let i = 0; i < N; i++) {
        const u0 = i / N
        const u1 = (i + 1) / N
        lp.push(...at(u0), ...at(u1))
        ls.push(u0, u1)
        lc.push(0.1, 0.1, 0.1, 0.1, 0.1, 0.1)
        lb.push(0, 0)
      }
      const nb = Math.floor(len * 0.9)
      for (let i = 1; i <= nb; i++) {
        const u = i / (nb + 1)
        const p = at(u)
        col.set(warm[(k + i) % warm.length])
        const base = bp.length / 3
        for (let v = 0; v < icoPos.count; v++) {
          bp.push(p[0] + icoPos.getX(v), p[1] - 0.09 + icoPos.getY(v), p[2] + icoPos.getZ(v))
          bs.push(u)
          bc.push(col.r, col.g, col.b)
          bb.push(1)
          bi.push(base + v)
        }
      }
    })
    const lg = new BufferGeometry()
    lg.setAttribute('position', new Float32BufferAttribute(lp, 3))
    lg.setAttribute('aS', new Float32BufferAttribute(ls, 1))
    lg.setAttribute('aCol', new Float32BufferAttribute(lc, 3))
    lg.setAttribute('aBulb', new Float32BufferAttribute(lb, 1))
    const bg = new BufferGeometry()
    bg.setAttribute('position', new Float32BufferAttribute(bp, 3))
    bg.setAttribute('aS', new Float32BufferAttribute(bs, 1))
    bg.setAttribute('aCol', new Float32BufferAttribute(bc, 3))
    bg.setAttribute('aBulb', new Float32BufferAttribute(bb, 1))
    const m = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      side: DoubleSide,
      uniforms: { uWind: lifeU.uWind, uLifeT: lifeU.uLifeT, uPlayer: lifeU.uPlayer, uBal0: lifeU.uBal0, uBal1: lifeU.uBal1, uBal2: lifeU.uBal2, uBal3: lifeU.uBal3, uCloud: lifeU.uCloud, uFlick: lifeU.uFlick, uOn: { value: 0 }, uT: lifeU.uLifeT },
    })
    return { line: lg, bulbs: bg, mat: m }
  }, [])
  void LineSegments
  void Mesh
  useFrame(() => {
    mat.uniforms.uOn.value = env.lights
  })
  return (
    <>
      <lineSegments geometry={line} material={mat} frustumCulled={false} />
      <mesh geometry={bulbs} material={mat} frustumCulled={false} />
    </>
  )
}
