import { useMemo, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import { Color, Matrix4, MeshPhysicalMaterial, Quaternion, Vector3, type BufferGeometry, type Material, type Mesh } from 'three'
import kit from './miamiKit.json'
import { merge, paint } from '../city/geo'
import { Cull, LodCull, useCullDist } from '../city/cull'
import { kitMaterials } from '../city/kit'

/**
 * Kit de Miami Beach (public/assets/miami/kit + miamiKit.json, gerado por tools/blender/miami_kit.py).
 * Mesma ideia do kit da cidade: o slot de material do GLB vira COR DE VERTICE conforme a paleta da instancia, as pecas
 * de cada celula espacial sao fundidas por classe (porcelana, metal, vidro, brilho, folha, pano) e os materiais sao os
 * mesmos da cidade (acabamento porcelana/vinil, janelas que acendem a noite, neon que brilha mais).
 * Folhas (palmeiras) usam um material proprio com balanco de vento no vertex shader.
 */

type Slot = 'base' | 'accent' | 'accent2' | 'soft' | 'deep' | 'white' | 'trim' | 'glass' | 'glow' | 'glow2' | 'leaf' | 'wood' | 'cloth'
type Pal = Record<string, string> & { metal: string }
const PALETTES = kit.palettes as unknown as Record<string, Pal>
const METALS = kit.metals as Record<string, { color: string; roughness: number; metallic: number }>

export interface KitItem {
  piece: string
  x: number
  z: number
  y?: number
  rot?: number
  s?: number
  pal: string
  over?: Partial<Record<Slot, string>>
  /** false = sem colisor */
  collide?: boolean
}

type Collider = { type: 'cylinder' | 'box' | 'boxes'; size: number[] | number[][]; center: number[] | null }
interface PieceDef {
  file: string
  collider?: Collider
}
const PIECES = kit.pieces as unknown as Record<string, PieceDef>
const BASE = `${import.meta.env.BASE_URL}assets/miami/`
const lodOf = (p: string): string | undefined => (PIECES['lod_' + p] ? 'lod_' + p : undefined)

/** Baixa o kit inteiro (chamado no inicio da viagem para a cidade nova ja estar pronta ao chegar). */
export function preloadMiamiKit() {
  Object.keys(PIECES).forEach((n) => useGLTF.preload(BASE + PIECES[n].file))
}

type Cls = 'por' | 'metal' | 'glass' | 'glow' | 'leaf' | 'cloth'
const CLASS_OF: Record<Slot, Cls> = {
  base: 'por', accent: 'por', accent2: 'por', soft: 'por', deep: 'por', white: 'por', wood: 'por',
  trim: 'metal', glass: 'glass', glow: 'glow', glow2: 'glow', leaf: 'leaf', cloth: 'cloth',
}

function slotColor(slot: Slot, p: Pal, over?: Partial<Record<Slot, string>>): string {
  if (over && over[slot]) return over[slot]!
  if (slot === 'trim') return METALS[p.metal].color
  if (slot === 'glass') return new Color(p.glass).lerp(new Color('#ffffff'), 0.4).getStyle()
  return p[slot] ?? p.base
}

// ---- folhas: material com balanco de vento (so a copa se mexe; a geometria ja esta em coordenadas de mundo) ----
export const leafTime = { value: 0 }
let LEAF: MeshPhysicalMaterial | null = null
function leafMaterial(): MeshPhysicalMaterial {
  if (LEAF) return LEAF
  LEAF = new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.3, side: 2 })
  LEAF.onBeforeCompile = (sh) => {
    sh.uniforms.uLeafT = leafTime
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uLeafT;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        {
          float k = smoothstep(3.2, 8.0, transformed.y);
          float ph = transformed.x * 0.31 + transformed.z * 0.27;
          transformed.x += (sin(uLeafT * 1.25 + ph) * 0.2 + sin(uLeafT * 3.1 + ph * 2.0) * 0.05) * k;
          transformed.z += (cos(uLeafT * 1.05 + ph * 1.3) * 0.16 + cos(uLeafT * 2.7 + ph) * 0.05) * k;
          transformed.y += sin(uLeafT * 2.0 + ph * 3.0) * 0.07 * k;
        }`,
      )
  }
  return LEAF
}

/** Relogio do vento das palmeiras (um por quadro); montar UMA vez na cena de Miami. */
export function MiamiWind() {
  const three = useThree()
  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__three = three
  useFrame((_, dt) => {
    leafTime.value += Math.min(dt, 0.1)
  })
  return null
}

interface Part {
  geo: BufferGeometry
  slot: Slot
}

function useParts(names: string[]): Record<string, Part[]> {
  const gltfs = useGLTF(names.map((n) => BASE + PIECES[n].file))
  return useMemo(() => {
    const out: Record<string, Part[]> = {}
    names.forEach((name, i) => {
      const scene = gltfs[i].scene
      scene.updateMatrixWorld(true)
      const parts: Part[] = []
      scene.traverse((o) => {
        const m = o as Mesh
        if (!m.isMesh) return
        const g = m.geometry.clone()
        g.applyMatrix4(m.matrixWorld)
        const mat = m.material as Material
        parts.push({ geo: g, slot: mat.name.split(/[@.]/)[0] as Slot })
      })
      out[name] = parts
    })
    return out
  }, [gltfs, names])
}

const _q = new Quaternion()
const _up = new Vector3(0, 1, 0)
const KIT_DATA = { kit: true }
const WALK_DATA = { kit: true, walkable: true }

type Geo = Partial<Record<Cls, BufferGeometry>>
interface Cell {
  cx: number
  cz: number
  r: number
  geo: Geo
  lo?: Geo
}

function buildCells(items: KitItem[], parts: Record<string, Part[]>, chunk: number, pad: number, withLod: boolean): Cell[] {
  const groups = new Map<number, KitItem[]>()
  for (const it of items) {
    const k = Math.floor(it.x / chunk) * 10000 + Math.floor(it.z / chunk)
    const l = groups.get(k)
    if (l) l.push(it)
    else groups.set(k, [it])
  }
  const col = new Color()
  return [...groups.values()].map((list) => {
    const mkBag = (): Record<Cls, BufferGeometry[]> => ({ por: [], metal: [], glass: [], glow: [], leaf: [], cloth: [] })
    const bag = mkBag()
    const bagLo = mkBag()
    let anyLod = false
    let r = 0
    const cx = list.reduce((a, i) => a + i.x, 0) / list.length
    const cz = list.reduce((a, i) => a + i.z, 0) / list.length
    for (const it of list) {
      const pal = PALETTES[it.pal]
      const s = it.s ?? 1
      const M = new Matrix4().compose(new Vector3(it.x, it.y ?? 0, it.z), _q.setFromAxisAngle(_up, it.rot ?? 0), new Vector3(s, s, s))
      const emit = (name: string, into: Record<Cls, BufferGeometry[]>) => {
        for (const p of parts[name]) {
          const g = p.geo.clone()
          g.applyMatrix4(M)
          paint(g, col.set(slotColor(p.slot, pal, it.over)))
          const cls = CLASS_OF[p.slot]
          // versao distante: metal e vidro viram porcelana (menos malhas/chamadas)
          into[into === bagLo && (cls === 'metal' || cls === 'glass') ? 'por' : cls].push(g)
        }
      }
      emit(it.piece, bag)
      if (withLod) {
        const lp = lodOf(it.piece)
        if (lp) anyLod = true
        emit(lp ?? it.piece, bagLo)
      }
      r = Math.max(r, Math.hypot(it.x - cx, it.z - cz) + pad * s)
    }
    const mk = (b: Record<Cls, BufferGeometry[]>): Geo => {
      const g: Geo = {}
      for (const c of Object.keys(b) as Cls[]) if (b[c].length) g[c] = merge(b[c])
      return g
    }
    return { cx, cz, r, geo: mk(bag), lo: anyLod ? mk(bagLo) : undefined }
  })
}

/** Colisores do kit (cuboid/cilindro): so dependem do JSON (montam antes dos GLBs terminarem de baixar). */
export function MiamiColliders({ items }: { items: KitItem[] }) {
  const nodes: ReactNode[] = []
  items.forEach((it, n) => {
    if (it.collide === false) return
    const c = PIECES[it.piece]?.collider
    if (!c) return
    const s = it.s ?? 1
    const rot = it.rot ?? 0
    const cs = Math.cos(rot)
    const sn = Math.sin(rot)
    const at = (lx: number, ly: number, lz: number): [number, number, number] => [it.x + (lx * cs + lz * sn) * s, (it.y ?? 0) + ly * s, it.z + (-lx * sn + lz * cs) * s]
    if (c.type === 'cylinder') {
      const [r, h] = c.size as number[]
      const ce = c.center ?? [0, h / 2, 0]
      nodes.push(<CylinderCollider key={n} args={[(h / 2) * s, r * s]} position={at(ce[0], ce[1], ce[2])} />)
    } else if (c.type === 'box') {
      const [w, h, d] = c.size as number[]
      const ce = c.center ?? [0, h / 2, 0]
      nodes.push(<CuboidCollider key={n} args={[(w / 2) * s, (h / 2) * s, (d / 2) * s]} position={at(ce[0], ce[1], ce[2])} rotation={[0, rot, 0]} />)
    } else {
      ;(c.size as number[][]).forEach((b, j) => {
        nodes.push(<CuboidCollider key={`${n}-${j}`} args={[(b[0] / 2) * s, (b[1] / 2) * s, (b[2] / 2) * s]} position={at(b[3], b[4], b[5])} rotation={[0, rot, 0]} />)
      })
    }
  })
  return (
    <RigidBody type="fixed" colliders={false}>
      {nodes}
    </RigidBody>
  )
}

/** Cena do kit de Miami: itens fundidos por celula (frustum + distancia + LOD) e materiais compartilhados. */
function MiamiKitMeshes({ items, shadows, cull, max, walkable, chunk, cast, pad, lod }: { items: KitItem[]; shadows: boolean; cull: 'buildings' | 'props'; max?: number; walkable?: boolean; chunk: number; cast: boolean; pad: number; lod?: number }) {
  const names = useMemo(() => {
    const n = new Set(items.map((i) => i.piece))
    if (lod) for (const p of [...n]) { const l = lodOf(p); if (l) n.add(l) }
    return [...n].sort()
  }, [items, lod])
  const parts = useParts(names)
  const dist = useCullDist()
  const cells = useMemo(() => buildCells(items, parts, chunk, pad, !!lod), [items, parts, chunk, pad, lod])
  const mats = kitMaterials()
  const leaf = leafMaterial()
  const data = walkable ? WALK_DATA : KIT_DATA
  const meshes = (g: Geo) => (
    <>
      {g.por && <mesh userData={data} geometry={g.por} material={mats.por} castShadow={shadows && cast} receiveShadow={shadows} />}
      {g.metal && <mesh userData={data} geometry={g.metal} material={mats.metal} receiveShadow={shadows} />}
      {g.glass && <mesh userData={data} geometry={g.glass} material={mats.glass} renderOrder={3} />}
      {g.glow && <mesh userData={data} geometry={g.glow} material={mats.glow} />}
      {g.leaf && <mesh userData={KIT_DATA} geometry={g.leaf} material={leaf} castShadow={shadows && cast} />}
      {g.cloth && <mesh userData={data} geometry={g.cloth} material={mats.cloth} receiveShadow={shadows} />}
    </>
  )
  return (
    <group>
      {cells.map((c, i) => {
        const mx = max !== undefined ? Math.min(max, dist[cull]) : dist[cull]
        return c.lo && lod ? (
          <LodCull key={i} cx={c.cx} cz={c.cz} r={c.r} max={mx} lod={lod} lo={meshes(c.lo)}>
            {meshes(c.geo)}
          </LodCull>
        ) : (
          <Cull key={i} cx={c.cx} cz={c.cz} r={c.r} max={mx}>
            {meshes(c.geo)}
          </Cull>
        )
      })}
    </group>
  )
}

export function MiamiKitScene({ items, shadows, cull = 'buildings', max, walkable, chunk = 56, cast = true, pad = 14, lod }: { items: KitItem[]; shadows: boolean; cull?: 'buildings' | 'props'; max?: number; walkable?: boolean; chunk?: number; cast?: boolean; pad?: number; lod?: number }) {
  return (
    <>
      <MiamiColliders items={items} />
      <MiamiKitMeshes items={items} shadows={shadows} cull={cull} max={max} walkable={walkable} chunk={chunk} cast={cast} pad={pad} lod={lod} />
    </>
  )
}
