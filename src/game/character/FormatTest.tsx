import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Plane, Vector3, type Group, type Material, type Mesh, type PerspectiveCamera } from 'three'
import { defaultAppearanceFor, type Appearance } from '../../shared/appearance'
import { randomAppearance } from '../../shared/randomAppearance'
import type { Gender } from '../../shared/faceLayers'
import { Character } from './Character'

/**
 * Tela de teste dos FORMATOS do rosto (`?formattest=1`): cabecas (bonecas/masculino pelo mesmo caminho do jogo) em grade, cortadas no pescoco.
 *   scene=fsheet  kind=female|male  rows=f_a,f_b,...  cols=0,0.5,1   (cada linha = um morph; colunas = pesos; de frente e de perfil)
 *   scene=frand   n=12 seed=<s>   rostos aleatorios (2 generos), com cabelo
 *   scene=fcombo  kind=...  sets=f_a:1+f_b:0.5;f_c:1       cada conjunto = uma cabeca (frente + perfil)
 *   hair=1 (com cabelo)  fov=<graus>  pad=<fator de folga da camera>
 */
export const FORMATTEST = new URLSearchParams(window.location.search).has('formattest')
const Q = new URLSearchParams(window.location.search)
const CHIN: Record<Gender, number> = { female: 1.272, male: 1.455 }
const TOP: Record<Gender, number> = { female: 1.6, male: 1.75 }

interface Cell {
  gender: Gender
  app: Appearance
  x: number
  y: number
  yaw: number
}

function base(gender: Gender, shape: Record<string, number>, hair: boolean): Appearance {
  const b = defaultAppearanceFor(gender)
  return { ...b, shape, outfit: {}, accessories: [], hair: hair ? b.hair : { ...b.hair, id: null as unknown as string } }
}

function Head({ cell, cutBelow }: { cell: Cell; cutBelow: number }) {
  const ref = useRef<Group>(null)
  const gl = useThree((s) => s.gl)
  const plane = useMemo(() => new Plane(new Vector3(0, 1, 0), -(CHIN[cell.gender] - cutBelow + cell.y)), [cell.gender, cell.y, cutBelow])
  useEffect(() => {
    gl.localClippingEnabled = true
  }, [gl])
  const n = useRef(0)
  useFrame(() => {
    n.current++
    if (n.current > 400 || n.current % 5 !== 0 || !ref.current) return
    ref.current.traverse((o) => {
      const m = (o as Mesh).material as Material | Material[] | undefined
      if (!m) return
      for (const mm of Array.isArray(m) ? m : [m]) if (mm.clippingPlanes?.[0] !== plane) mm.clippingPlanes = [plane]
    })
  })
  return (
    <group ref={ref} position={[cell.x, cell.y, 0]} rotation={[0, cell.yaw, 0]}>
      <Suspense fallback={null}>
        <Character appearance={cell.app} />
      </Suspense>
    </group>
  )
}

function Rig({ w, h, cx, cy }: { w: number; h: number; cx: number; cy: number }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)
  useEffect(() => {
    const fov = Number(Q.get('fov')) || 6
    const t = Math.tan((fov * Math.PI) / 360)
    const aspect = size.width / size.height
    const dist = Math.max(w / 2 / (t * aspect), h / 2 / t) * (Number(Q.get('pad')) || 1.06)
    camera.fov = fov
    camera.near = 0.5
    camera.far = 200
    camera.position.set(cx, cy, dist)
    camera.lookAt(cx, cy, 0)
    camera.updateProjectionMatrix()
    document.querySelectorAll<HTMLElement>('.ui-layer').forEach((e) => (e.style.display = 'none'))
  }, [camera, size, w, h, cx, cy])
  return null
}

function Lights() {
  return (
    <>
      <color attach="background" args={['#e9e4f1']} />
      <Environment resolution={128} frames={1} background={false} environmentIntensity={0.6}>
        <Lightformer form="rect" intensity={2.4} color="#ffffff" position={[0, 6, 2]} rotation-x={Math.PI / 2} scale={[14, 14, 1]} />
        <Lightformer form="rect" intensity={2.4} color="#fff0e0" position={[6, 2, 4]} rotation-y={-Math.PI / 2} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={1.8} color="#dde6ff" position={[-6, 2, 4]} rotation-y={Math.PI / 2} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={1.8} color="#ffffff" position={[0, 2, 8]} rotation-y={Math.PI} scale={[12, 5, 1]} />
      </Environment>
      <hemisphereLight args={['#fff4ea', '#c9c0e8', 0.6]} />
      <directionalLight position={[2.5, 5, 6]} intensity={1.5} color="#fff1e4" />
    </>
  )
}

const parseSet = (s: string): Record<string, number> => {
  const o: Record<string, number> = {}
  for (const part of s.split('+')) {
    const [k, v] = part.split(':')
    if (k) o[k] = v === undefined ? 1 : Number(v)
  }
  return o
}

export function FormatTest() {
  const scene = Q.get('scene') ?? 'fsheet'
  const kind = (Q.get('kind') ?? 'female') as Gender
  const hair = Q.get('hair') === '1'
  const cells: Cell[] = []
  let w = 1
  let h = 1
  let cx = 0
  let cy = 0
  const cut = 0.04
  if (scene === 'frand') {
    const n = Number(Q.get('n')) || 12
    const seed = Q.get('seed') ?? 'fr'
    const per = Math.ceil(n / 2)
    const sp = 0.3
    const rowH = TOP.male - CHIN.male + 0.34
    for (let i = 0; i < n; i++) {
      const gender: Gender = i < per ? 'female' : 'male'
      const col = i % per
      const app = randomAppearance(`${seed}-${i}`, { gender, profile: 'player' })
      const y = (i < per ? 0 : -rowH) + (gender === 'female' ? 0.18 : 0)
      cells.push({ gender, app: { ...app, outfit: {}, accessories: [] }, x: (col - (per - 1) / 2) * sp, y, yaw: 0.25 })
    }
    w = per * sp + 0.1
    h = rowH * 2
    cx = 0
    cy = 1.5 - rowH / 2 + 0.08
  } else {
    const rowsQ = (Q.get('rows') ?? '').split(',').filter(Boolean)
    const sets = scene === 'fcombo' ? (Q.get('sets') ?? '').split(';').filter(Boolean) : rowsQ
    const cols = (Q.get('cols') ?? (rowsQ.some((r) => r.includes('/')) ? '-1,0,1' : '0,0.5,1')).split(',').map(Number)
    const sp = 0.27
    const rowH = TOP[kind] - CHIN[kind] + cut + 0.075
    const yShift = kind === 'female' ? 0 : 0
    const nCols = scene === 'fcombo' ? 1 : cols.length
    const total = nCols * 2
    sets.forEach((s, r) => {
      for (let c = 0; c < nCols; c++) {
        const [pl, mi] = s.split('/')
        const v0 = mi || !cols.includes(-1) ? cols[c] : (cols[c] + 1) / 2
        const shape = scene === 'fcombo' ? parseSet(s) : mi ? (v0 < 0 ? { [mi]: -v0 } : { [pl]: v0 }) : { [pl]: v0 }
        for (let v = 0; v < 2; v++) {
          const i = c + v * nCols
          cells.push({ gender: kind, app: base(kind, shape, hair), x: (i - (total - 1) / 2) * sp + (v === 1 ? 0.04 : 0), y: -r * rowH + yShift, yaw: v === 0 ? 0 : 1.4 })
        }
      }
    })
    w = total * sp + 0.12
    h = sets.length * rowH
    cx = 0
    cy = (kind === 'female' ? 1.43 : 1.6) - (sets.length - 1) * rowH * 0.5
  }
  return (
    <>
      <Lights />
      <Rig w={w} h={h} cx={cx} cy={cy} />
      {cells.map((c, i) => (
        <Head key={i} cell={c} cutBelow={scene === 'frand' ? 0.1 : cut} />
      ))}
    </>
  )
}
