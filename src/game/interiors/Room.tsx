import { Suspense, useMemo } from 'react'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import { RepeatWrapping, type Texture } from 'three'
import { Character } from '../character/Character'
import { DEFAULT_APPEARANCE, type Appearance } from '../../shared/appearance'
import { instantiate, pieceUrl } from './catalog'
import { floorTextures, casinoCarpet } from './textures'
import type { Resolved } from './resolve'
import type { NpcDef, RoomLayout, WindowDef } from './types'
import { QUALITY_SETTINGS, getQuality } from '../systems/quality'

const WALL_T = 0.3

type Box = { pos: [number, number, number]; size: [number, number, number] }

/** Piso com textura repetida; mesh marcado `walkable` para o click-to-move. */
function Floor({ l }: { l: RoomLayout }) {
  const tex = useMemo(() => {
    if (l.floor.kind === 'carpet') {
      const t = casinoCarpet() as Texture
      t.repeat.set(l.w / 2.4, l.d / 2.4)
      t.wrapS = t.wrapT = RepeatWrapping
      return { map: t, emissive: undefined as Texture | undefined }
    }
    const t = floorTextures(l.floor)
    const tile = l.floor.tile ?? (l.floor.kind === 'wood' ? 2 : 1.6)
    t.map.repeat.set(l.w / tile, l.d / tile)
    if (t.emissive) t.emissive.repeat.set(l.w / tile, l.d / tile)
    return t
  }, [l])
  const glossy = l.floor.kind === 'lacquer' || l.floor.kind === 'marble' || l.floor.kind === 'checker' || l.floor.kind === 'dance'
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.002, 0]} userData={{ walkable: true }}>
      <planeGeometry args={[l.w, l.d]} />
      <meshPhysicalMaterial
        map={tex.map}
        emissiveMap={tex.emissive}
        emissive={tex.emissive ? '#ffffff' : '#000000'}
        emissiveIntensity={tex.emissive ? 1.6 : 0}
        roughness={l.floor.kind === 'lacquer' ? 0.1 : glossy ? 0.22 : 0.5}
        metalness={l.floor.kind === 'lacquer' ? 0.2 : 0}
        clearcoat={glossy ? 0.6 : 0.1}
        clearcoatRoughness={0.12}
      />
    </mesh>
  )
}

function Walls({ l }: { l: RoomLayout }) {
  const { w, d, h } = l
  const wainH = l.wainH ?? 1.05
  const wain = l.wainscot
  const doorX = l.doorX ?? 0
  const walls: Box[] = [
    { pos: [0, h / 2, -d / 2 - WALL_T / 2], size: [w + WALL_T * 2, h, WALL_T] },
    { pos: [0, h / 2, d / 2 + WALL_T / 2], size: [w + WALL_T * 2, h, WALL_T] },
    { pos: [-w / 2 - WALL_T / 2, h / 2, 0], size: [WALL_T, h, d] },
    { pos: [w / 2 + WALL_T / 2, h / 2, 0], size: [WALL_T, h, d] },
  ]
  const lining: Box[] = [
    { pos: [0, wainH / 2, -d / 2 + 0.02], size: [w, wainH, 0.04] },
    { pos: [0, wainH / 2, d / 2 - 0.02], size: [w, wainH, 0.04] },
    { pos: [-w / 2 + 0.02, wainH / 2, 0], size: [0.04, wainH, d] },
    { pos: [w / 2 - 0.02, wainH / 2, 0], size: [0.04, wainH, d] },
  ]
  const base: Box[] = [
    { pos: [0, 0.07, -d / 2 + 0.05], size: [w, 0.14, 0.1] },
    { pos: [0, 0.07, d / 2 - 0.05], size: [w, 0.14, 0.1] },
    { pos: [-w / 2 + 0.05, 0.07, 0], size: [0.1, 0.14, d] },
    { pos: [w / 2 - 0.05, 0.07, 0], size: [0.1, 0.14, d] },
  ]
  const crown: Box[] = [
    { pos: [0, h - 0.07, -d / 2 + 0.06], size: [w, 0.14, 0.12] },
    { pos: [0, h - 0.07, d / 2 - 0.06], size: [w, 0.14, 0.12] },
    { pos: [-w / 2 + 0.06, h - 0.07, 0], size: [0.12, 0.14, d] },
    { pos: [w / 2 - 0.06, h - 0.07, 0], size: [0.12, 0.14, d] },
  ]
  return (
    <group>
      {walls.map((m, i) => (
        <mesh key={i} position={m.pos}>
          <boxGeometry args={m.size} />
          <meshStandardMaterial color={l.wall} roughness={0.82} />
        </mesh>
      ))}
      {wain &&
        lining.map((m, i) => (
          <mesh key={i} position={m.pos}>
            <boxGeometry args={m.size} />
            <meshStandardMaterial color={wain} roughness={0.5} />
          </mesh>
        ))}
      {[...base, ...crown].map((m, i) => (
        <mesh key={i} position={m.pos}>
          <boxGeometry args={m.size} />
          <meshStandardMaterial color={l.trimColor} roughness={0.4} metalness={0.1} />
        </mesh>
      ))}
      {/* teto */}
      <mesh position={[0, h, 0]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={l.ceiling} roughness={0.9} />
      </mesh>
      {/* porta de saida (parede S) */}
      <group position={[doorX, 0, d / 2 - 0.03]}>
        <mesh position={[0, 1.1, 0]}>
          <boxGeometry args={[1.5, 2.2, 0.06]} />
          <meshStandardMaterial color={l.trimColor} roughness={0.35} metalness={0.3} />
        </mesh>
        <mesh position={[0, 1.1, -0.04]} rotation-y={Math.PI}>
          <planeGeometry args={[1.2, 2.0]} />
          <meshBasicMaterial color="#dff1ff" toneMapped={false} />
        </mesh>
        {[-0.3, 0.3].map((x) => (
          <mesh key={x} position={[x, 1.1, -0.045]}>
            <boxGeometry args={[0.03, 2.0, 0.02]} />
            <meshStandardMaterial color={l.trimColor} roughness={0.3} metalness={0.5} />
          </mesh>
        ))}
        <mesh position={[0.5, 1.05, -0.07]}>
          <sphereGeometry args={[0.04, 10, 8]} />
          <meshStandardMaterial color={l.trimColor} roughness={0.2} metalness={0.9} />
        </mesh>
        <mesh position={[0, 0.012, -0.55]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[1.3, 0.8]} />
          <meshStandardMaterial color={l.trimColor} roughness={0.9} />
        </mesh>
      </group>
      {l.windows?.map((wd, i) => <Window key={i} wd={wd} l={l} />)}
    </group>
  )
}

function Window({ wd, l }: { wd: WindowDef; l: RoomLayout }) {
  const { w, d } = l
  const cy = wd.y + wd.h / 2
  const pos: [number, number, number] =
    wd.wall === 'N' ? [wd.at, cy, -d / 2 + 0.05] : wd.wall === 'S' ? [wd.at, cy, d / 2 - 0.05] : wd.wall === 'W' ? [-w / 2 + 0.05, cy, wd.at] : [w / 2 - 0.05, cy, wd.at]
  const ry = wd.wall === 'N' ? 0 : wd.wall === 'S' ? Math.PI : wd.wall === 'W' ? Math.PI / 2 : -Math.PI / 2
  return (
    <group position={pos} rotation={[0, ry, 0]}>
      <mesh>
        <planeGeometry args={[wd.w, wd.h]} />
        <meshBasicMaterial color="#e6f2ff" toneMapped={false} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={`v${s}`} position={[(s * wd.w) / 2, 0, 0.02]}>
          <boxGeometry args={[0.08, wd.h + 0.08, 0.05]} />
          <meshStandardMaterial color={l.trimColor} roughness={0.4} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`h${s}`} position={[0, (s * wd.h) / 2, 0.02]}>
          <boxGeometry args={[wd.w + 0.08, 0.08, 0.05]} />
          <meshStandardMaterial color={l.trimColor} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.025]}>
        <boxGeometry args={[0.04, wd.h, 0.03]} />
        <meshStandardMaterial color={l.trimColor} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.025]}>
        <boxGeometry args={[wd.w, 0.04, 0.03]} />
        <meshStandardMaterial color={l.trimColor} roughness={0.4} />
      </mesh>
    </group>
  )
}

function Furniture({ r }: { r: Resolved }) {
  const l = r.layout
  const objs = useMemo(
    () =>
      r.placed.map((p) => {
        const palKey = p.item.pal ?? 'main'
        const pal = p.item.pal ? (l.palettes?.[p.item.pal] ?? l.palette) : l.palette
        const isCasino = p.item.p.startsWith('casino/')
        const o = instantiate(pieceUrl(p.item.p, p.info), palKey, isCasino ? null : pal)
        return { p, o }
      }),
    [r, l],
  )
  return (
    <group>
      {objs.map(({ p, o }, i) =>
        o ? (
          <group key={i} position={[p.x, p.y, p.z]} rotation={[0, p.rot, 0]} scale={p.s}>
            <primitive object={o} />
          </group>
        ) : null,
      )}
    </group>
  )
}

const HAIRS = ['hair.meshyUpdo', 'hair.chestnutWaves', 'hair.platinumUndercut', 'hair.caramelCurls']

function npcAppearance(n: NpcDef): Appearance {
  return {
    ...DEFAULT_APPEARANCE,
    skin: { tone: n.skin },
    suit: { color: n.suit, finish: 'satin' },
    lips: { color: '#a8566e', gloss: 0.5 },
    hair: { id: HAIRS.includes(n.hair) ? n.hair : HAIRS[0], color: n.hairColor },
    morphs: { waistThin: 0.4, bustBig: 0.3 },
    outfit: {
      ...(n.top ? { top: { id: n.top } } : {}),
      ...(n.bottom ? { bottom: { id: n.bottom } } : {}),
      ...(n.dress ? { dress: { id: n.dress } } : {}),
    },
  }
}

function NpcDoll({ n }: { n: NpcDef }) {
  const app = useMemo(() => npcAppearance(n), [n])
  return <Character appearance={app} anim={{ clip: n.clip }} shadows={false} />
}

function Npcs({ l }: { l: RoomLayout }) {
  const max = getQuality() === 'low' ? 2 : 4
  return (
    <>
      {l.npcs.slice(0, max).map((n) => (
        <Suspense key={n.id} fallback={null}>
          <group position={[n.x, n.y ?? 0, n.z]} rotation={[0, (n.r * Math.PI) / 180, 0]}>
            <NpcDoll n={n} />
          </group>
        </Suspense>
      ))}
    </>
  )
}

/** Colisores fixos da sala: piso, paredes, moveis. */
function Colliders({ r }: { r: Resolved }) {
  const { w, d, h } = r.layout
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[w / 2 + 1, 0.3, d / 2 + 1]} position={[0, -0.3, 0]} />
      <CuboidCollider args={[w / 2 + 1, h, 0.5]} position={[0, h / 2, -d / 2 - 0.5]} />
      <CuboidCollider args={[w / 2 + 1, h, 0.5]} position={[0, h / 2, d / 2 + 0.5]} />
      <CuboidCollider args={[0.5, h, d / 2 + 1]} position={[-w / 2 - 0.5, h / 2, 0]} />
      <CuboidCollider args={[0.5, h, d / 2 + 1]} position={[w / 2 + 0.5, h / 2, 0]} />
      {r.colliders.map((c, i) =>
        c.cyl ? (
          <CylinderCollider key={i} args={[c.half[1], c.half[0]]} position={c.pos} />
        ) : (
          <CuboidCollider key={i} args={c.half} position={c.pos} rotation={[0, c.rot, 0]} />
        ),
      )}
    </RigidBody>
  )
}

export function RoomView({ r }: { r: Resolved }) {
  const l = r.layout
  const tier = getQuality()
  const lights = tier === 'low' ? l.lights.slice(0, 3) : l.lights.slice(0, QUALITY_SETTINGS[tier].lampLights + 2)
  return (
    <group position={[r.ox, 0, r.oz]}>
      <hemisphereLight args={[l.hemi.sky, l.hemi.ground, l.hemi.intensity]} />
      {lights.map((ld, i) => (
        <pointLight key={i} position={[ld.x, ld.y, ld.z]} color={ld.color} intensity={ld.intensity} distance={ld.distance} decay={1.6} />
      ))}
      <Floor l={l} />
      <Walls l={l} />
      <Furniture r={r} />
      <Npcs l={l} />
      <Colliders r={r} />
    </group>
  )
}
