import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, useGLTF } from '@react-three/drei'
import { Color, type Group } from 'three'
import { loadPetCatalog, PET_BASE, usePetCatalog, type PetBreed, type PetClip, type PetCoat } from './catalog'
import { createPetModel } from './model'
import { CITY } from '../world/city/layout'
import { usePlayerStore } from '../../state/playerStore'
import { PetSystem } from './PetSystem'

/** Folha de arte (dev): `?petsheet=none` so deixa a UI (testes de loja/minijogos); `?petsheet=all` mostra todas as pelagens; `?petsheet=<raca>` mostra os 7 clipes de uma raca. */
export const PET_SHEET = new URLSearchParams(window.location.search).get('petsheet')

const CLIPS: PetClip[] = ['idle', 'walk', 'run', 'sit', 'lie', 'happy', 'eat']

function One({ breed, coat, clip, x, z, label }: { breed: PetBreed; coat: PetCoat; clip: PetClip; x: number; z: number; label: string }) {
  const gltf = useGLTF(`${PET_BASE}${breed.file}`)
  const m = useMemo(() => createPetModel(gltf, coat.colors), [gltf, coat])
  useEffect(() => {
    m.actions[clip]?.reset().play()
    m.mixer.setTime(0.6)
    return () => {
      m.mixer.stopAllAction()
    }
  }, [m, clip])
  useFrame((_, dt) => m.mixer.update(Math.min(dt, 0.05)))
  return (
    <group position={[x, 0, z]} rotation={[0, 0.5, 0]}>
      <primitive object={m.scene} />
      <Html position={[0, 0.0, 0.32]} center style={{ pointerEvents: 'none' }}>
        <div className="pet-tag" style={{ opacity: 1, fontSize: 10 }}>
          {label}
        </div>
      </Html>
    </group>
  )
}

/** Demo leve (dev): `?petsheet=follow`. Uma "jogadora" (capsula) anda em volta do Petshop e o pet de verdade a segue,
 * usando os predios reais do layout como obstaculos. Serve para validar o seguir/desviar sem carregar a cidade inteira. */
const ROUTE: [number, number][] = [[-54, 156], [-72, 158], [-72, 184], [-38, 184], [-38, 160], [-54, 160], [-54, 150], [-54, 156]]
function FollowDemo() {
  const { camera } = useThree()
  const player = useRef<Group>(null)
  const st = useRef({ seg: 0, t: 0, wait: 0 })
  const near = useMemo(() => CITY.blocks.filter((b) => Math.hypot(b.x + 54, b.z - 168) < 60), [])
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const s = st.current
    const a = ROUTE[s.seg % ROUTE.length]
    const b = ROUTE[(s.seg + 1) % ROUTE.length]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    const ps = usePlayerStore.getState()
    let moving = true
    if (s.wait > 0) {
      s.wait -= dt
      moving = false
    } else {
      s.t += (3.4 * dt) / len
      if (s.t >= 1) {
        s.t = 0
        s.seg++
        if (s.seg % ROUTE.length === 1 || s.seg % ROUTE.length === 4) s.wait = 7
      }
    }
    const x = a[0] + (b[0] - a[0]) * Math.min(1, s.t)
    const z = a[1] + (b[1] - a[1]) * Math.min(1, s.t)
    ps.position.set(x, 0, z)
    ps.yaw = Math.atan2(b[0] - a[0], b[1] - a[1])
    ps.speed = moving ? 3.4 : 0
    if (player.current) {
      player.current.position.set(x, 0, z)
      player.current.rotation.y = ps.yaw
    }
    const dx = Math.sin(ps.yaw)
    const dz = Math.cos(ps.yaw)
    camera.position.set(x - dx * 6 + 3, 5.2, z - dz * 6 + 1)
    camera.lookAt(x, 0.6, z)
  })
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-54, -0.01, 168]}>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial color="#8fc16c" roughness={0.95} />
      </mesh>
      {near.map((b) => (
        <mesh key={b.id} position={[b.x, b.h / 2, b.z]} rotation={[0, b.rot, 0]}>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial color={b.shopId === 'petshop' ? '#7fb8a4' : '#e8cdb0'} roughness={0.8} />
        </mesh>
      ))}
      <group ref={player}>
        <mesh position={[0, 0.8, 0]}>
          <capsuleGeometry args={[0.28, 1.05, 4, 10]} />
          <meshStandardMaterial color="#b08fd0" roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.7, 0]}>
          <sphereGeometry args={[0.2, 12, 10]} />
          <meshStandardMaterial color="#f0d3bf" roughness={0.5} />
        </mesh>
      </group>
      <PetSystem />
    </>
  )
}

export function PetSheetScene() {
  if (PET_SHEET === 'follow') return <FollowScene />
  return <SheetScene />
}

function FollowScene() {
  const { scene } = useThree()
  useEffect(() => {
    scene.background = new Color('#cfe0ee')
  }, [scene])
  return (
    <>
      <ambientLight intensity={1.3} />
      <hemisphereLight args={['#fff6e8', '#8d8374', 0.9]} />
      <directionalLight position={[30, 40, 20]} intensity={2.2} />
      <FollowDemo />
    </>
  )
}

function SheetScene() {
  const breeds = usePetCatalog((s) => s.breeds)
  const loaded = usePetCatalog((s) => s.loaded)
  const { camera, scene } = useThree()
  useEffect(() => loadPetCatalog(), [])
  useEffect(() => {
    scene.background = new Color('#cfd6d0')
    const ui = document.querySelector('.ui-layer') as HTMLElement | null
    if (ui && PET_SHEET !== 'none' && PET_SHEET !== 'follow') ui.style.display = 'none'
  }, [scene])
  const cells = useMemo(() => {
    if (!loaded || !PET_SHEET || PET_SHEET === 'none') return []
    if (PET_SHEET === 'all') {
      const out: { b: PetBreed; c: PetCoat; clip: PetClip }[] = []
      for (const b of breeds) for (const c of b.coats) out.push({ b, c, clip: 'idle' })
      return out
    }
    const b = breeds.find((x) => x.id === PET_SHEET) ?? breeds[0]
    return CLIPS.map((clip) => ({ b, c: b.coats[0], clip }))
  }, [loaded, breeds])
  const cols = PET_SHEET === 'all' ? 5 : 4
  useFrame(() => {
    const rows = Math.ceil(cells.length / cols) || 1
    const all = PET_SHEET === 'all'
    camera.position.set(0, (all ? 4.1 : 2.2) + rows * 0.2, (rows - 1) * 0.5 + (all ? 4.7 : 3.1))
    camera.lookAt(0, 0.12, (rows - 1) * 0.5 - 0.1)
  })
  return (
    <>
      <ambientLight intensity={1.2} />
      <hemisphereLight args={['#fff6e8', '#8d8374', 0.9]} />
      <directionalLight position={[3, 5, 4]} intensity={2.4} />
      <directionalLight position={[-4, 2, -2]} intensity={0.8} color="#d6e4ff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 2]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#b9b2a3" roughness={0.95} />
      </mesh>
      <Suspense fallback={null}>
        {cells.map((cell, i) => {
          const col = i % cols
          const row = Math.floor(i / cols)
          const x = (col - (cols - 1) / 2) * (PET_SHEET === 'all' ? 1.0 : 0.95)
          const z = row * (PET_SHEET === 'all' ? 1.0 : 1.05)
          return <One key={i} breed={cell.b} coat={cell.c} clip={cell.clip} x={x} z={z} label={PET_SHEET === 'all' ? `${cell.b.label} · ${cell.c.label}` : cell.clip} />
        })}
      </Suspense>
    </>
  )
}
