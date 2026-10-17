import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Html, useGLTF } from '@react-three/drei'
import { DoubleSide, Group, Mesh, MeshBasicMaterial, Shape, ShapeGeometry, Vector3, type Material } from 'three'
import { usePlayerStore } from '../../state/playerStore'
import { useSitStore } from '../sit/sitStore'
import { useEmoteStore } from '../character/animation/emoteStore'
import { useInteriorStore } from '../interiors/interiorStore'
import { clearMoveTarget } from '../input/intent'
import { cancelNavigation } from '../navigation/navigation'
import { createPetModel, attachAccessories } from './model'
import { PET_BASE, findPet, loadPetCatalog, usePetCatalog, type PetBreed, type PetClip } from './catalog'
import { usePetStore } from './petStore'
import { petFree } from './walkable'
import { petRuntime } from './runtime'

const PET_DEBUG = new URLSearchParams(window.location.search).has('petdebug')
const _v = new Vector3()

const HAPPY_EMOTES = new Set(['wave', 'kiss', 'thankful', 'clap', 'laugh', 'jump', 'dance', 'bow'])

/** Escala de exibicao (os pets reais seriam pequenos perto de uma boneca de 1,6 m). */
const PET_SCALE = 1.3

const wrap = (a: number) => {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

/** Camada 3D dos pets: o pet ativo acompanha a jogadora (cidade e interiores). */
export function PetSystem() {
  const active = usePetStore((s) => s.active)
  const loaded = usePetCatalog((s) => s.loaded)
  const breeds = usePetCatalog((s) => s.breeds)
  useEffect(() => loadPetCatalog(), [])
  const found = useMemo(() => (active && loaded ? findPet(breeds, active) : null), [active, loaded, breeds])
  if (!active || !found) return null
  return (
    <Suspense fallback={null}>
      <PetActor key={active} id={active} breed={found.breed} colors={found.coat.colors} />
    </Suspense>
  )
}

function heartGeometry() {
  const s = new Shape()
  s.moveTo(0, -0.5)
  s.bezierCurveTo(-0.9, 0.1, -0.5, 0.75, 0, 0.35)
  s.bezierCurveTo(0.5, 0.75, 0.9, 0.1, 0, -0.5)
  return new ShapeGeometry(s)
}
const HEART = heartGeometry()
const HEART_MAT = new MeshBasicMaterial({ color: '#c9485b', transparent: true, side: DoubleSide, depthWrite: false })

interface Heart {
  mesh: Mesh
  t: number
  vx: number
  vz: number
}

function PetActor({ id, breed, colors }: { id: string; breed: PetBreed; colors: Record<string, string> }) {
  const gltf = useGLTF(`${PET_BASE}${breed.file}`)
  const root = useRef<Group>(null)
  const nameTag = useRef<HTMLDivElement>(null)
  const equip = usePetStore((s) => s.equip[id])
  const petLabel = usePetStore((s) => s.names[id]) || breed.label

  const built = useMemo(() => createPetModel(gltf, colors), [gltf, colors])
  useEffect(
    () => () => {
      built.mixer.stopAllAction()
    },
    [built],
  )
  useEffect(() => attachAccessories(built, breed, equip), [built, equip, breed])

  // ---- estado de movimento
  const st = useRef({
    x: 0,
    z: 0,
    yaw: 0,
    init: false,
    clip: 'idle' as PetClip,
    timer: 0,
    mode: 'follow' as 'follow' | 'happy' | 'eat' | 'sit' | 'lie',
    idleFor: 0,
    stuck: 0,
    room: null as string | null,
    lastEmote: null as string | null,
    lastEvent: 0,
    side: id.length % 2 ? 1 : -1,
    speed: 0,
    bowl: false,
  })
  const hearts = useRef<Heart[]>([])
  const bowlRef = useRef<Group>(null)
  const heartGroup = useRef<Group>(null)

  const play = (clip: PetClip, fade = 0.25, ts = 1) => {
    const s = st.current
    const a = built.actions[clip]
    if (!a) return
    if (s.clip !== clip || !a.isRunning()) {
      const prev = built.actions[s.clip]
      a.reset().fadeIn(fade).play()
      if (prev && prev !== a) prev.fadeOut(fade)
      s.clip = clip
    }
    a.timeScale = ts
  }

  const spawnNear = (px: number, pz: number, yaw: number) => {
    const s = st.current
    for (let k = 0; k < 16; k++) {
      const ang = yaw + Math.PI + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.5
      const r = 1.3 + (k > 7 ? 0.6 : 0)
      const x = px + Math.sin(ang) * r
      const z = pz + Math.cos(ang) * r
      if (petFree(x, z)) {
        s.x = x
        s.z = z
        s.yaw = Math.atan2(px - x, pz - z)
        s.stuck = 0
        return true
      }
    }
    // sem lugar livre perto (ex.: jogadora na água): procura em anéis maiores em vez de ficar em cima dela
    for (let r = 2.5; r <= 40; r += 1.5) {
      for (let k = 0; k < 12; k++) {
        const ang = (k / 12) * Math.PI * 2
        const x = px + Math.sin(ang) * r
        const z = pz + Math.cos(ang) * r
        if (petFree(x, z)) {
          s.x = x
          s.z = z
          s.yaw = Math.atan2(px - x, pz - z)
          s.stuck = 0
          return true
        }
      }
    }
    s.x = px
    s.z = pz
    return false
  }

  const addHearts = (n: number) => {
    const g = heartGroup.current
    if (!g) return
    for (let i = 0; i < n; i++) {
      const mesh = new Mesh(HEART, HEART_MAT.clone())
      const sc = breed.meta.hr * (0.9 + Math.random() * 0.5)
      mesh.scale.setScalar(sc)
      mesh.position.set((Math.random() - 0.5) * breed.meta.hr * 1.6, breed.meta.height * PET_SCALE + 0.05, (Math.random() - 0.5) * breed.meta.hr)
      g.add(mesh)
      hearts.current.push({ mesh, t: -i * 0.12, vx: (Math.random() - 0.5) * 0.25, vz: (Math.random() - 0.5) * 0.25 })
    }
  }

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const s = st.current
    const g = root.current
    if (!g) return
    const pl = usePlayerStore.getState()
    const px = pl.position.x
    const pz = pl.position.z
    const roomId = useInteriorStore.getState().roomId
    const seated = useSitStore.getState().seat !== null
    if (!s.init) {
      spawnNear(px, pz, pl.yaw)
      s.init = true
      s.room = roomId
      play('idle', 0)
    }
    if (s.room !== roomId) {
      s.room = roomId
      spawnNear(px, pz, pl.yaw)
      s.mode = 'follow'
    }

    let dx = px - s.x
    let dz = pz - s.z
    let d = Math.hypot(dx, dz)
    const inside = roomId !== null
    if (d > (inside ? 10 : 28)) {
      spawnNear(px, pz, pl.yaw)
      dx = px - s.x
      dz = pz - s.z
      d = Math.hypot(dx, dz)
    }

    // ---- eventos (carinho / comida) e emotes
    const ev = usePetStore.getState().event
    if (ev && ev.pet === id && ev.id !== s.lastEvent) {
      s.lastEvent = ev.id
      if (ev.kind === 'pet') {
        s.mode = 'happy'
        s.timer = 2.4
        addHearts(4)
      } else if (ev.kind === 'feed') {
        s.mode = 'eat'
        s.timer = 3.4
      } else {
        s.mode = 'happy'
        s.timer = 2
        addHearts(2)
      }
    }
    const emote = useEmoteStore.getState().emote
    if (emote !== s.lastEmote) {
      s.lastEmote = emote
      if (emote && HAPPY_EMOTES.has(emote) && d < 5 && (s.mode === 'follow' || s.mode === 'sit' || s.mode === 'lie')) {
        s.mode = 'happy'
        s.timer = 2.6
      }
    }

    let moving = false
    let speed = 0
    if (s.mode === 'happy' || s.mode === 'eat') {
      s.timer -= dt
      const face = Math.atan2(dx, dz)
      if (s.mode === 'happy') s.yaw += wrap(face - s.yaw) * Math.min(1, dt * 5)
      play(s.mode, 0.2)
      if (s.timer <= 0) {
        s.mode = 'follow'
        s.idleFor = 0
      }
    } else {
      const playerMoving = pl.speed > 0.4
      const want = seated ? 1.5 : 1.7
      moving = s.speed > 0 ? d > want - 0.15 : d > want + 0.25
      if (moving) {
        s.mode = 'follow'
        s.idleFor = 0
        speed = Math.min(5.2, 1.6 + (d - want) * 1.5)
        if (d > 7) speed = 5.2
        // direcao com desvio de obstaculos
        const base = Math.atan2(dx, dz)
        const offs = [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9]
        let moved = false
        for (const o of offs) {
          const a = base + o * s.side
          const nx = s.x + Math.sin(a) * speed * dt * 2.2
          const nz = s.z + Math.cos(a) * speed * dt * 2.2
          if (petFree(nx, nz)) {
            s.yaw += wrap(a - s.yaw) * Math.min(1, dt * 9)
            const step = speed * dt
            const sx = s.x + Math.sin(s.yaw) * step
            const sz = s.z + Math.cos(s.yaw) * step
            if (petFree(sx, sz)) {
              s.x = sx
              s.z = sz
            }
            moved = true
            break
          }
        }
        s.stuck = moved ? Math.max(0, s.stuck - dt) : s.stuck + dt
        if (s.stuck > (inside ? 2.2 : 3) && d > 2.5) spawnNear(px, pz, pl.yaw)
        s.speed = speed
        if (speed > 3.2) play('run', 0.2, Math.min(1.4, speed / 4.4))
        else play('walk', 0.2, Math.max(0.7, speed / 1.7))
      } else {
        s.stuck = 0
        s.speed = 0
        s.idleFor += dt
        // olha para a jogadora
        const face = Math.atan2(dx, dz)
        s.yaw += wrap(face - s.yaw) * Math.min(1, dt * 3)
        if (seated) {
          if (s.mode !== 'sit' && s.mode !== 'lie') s.mode = 'sit'
        } else if (playerMoving) {
          s.mode = 'follow'
          s.idleFor = 0
        } else if (s.idleFor > 14) s.mode = 'lie'
        else if (s.idleFor > 4.5 && s.mode === 'follow') s.mode = 'sit'
        play(s.mode === 'lie' ? 'lie' : s.mode === 'sit' ? 'sit' : 'idle', 0.35)
      }
    }

    g.position.set(s.x, 0, s.z)
    g.rotation.y = s.yaw
    built.mixer.update(dt)

    // posicao publicada (UI: aviso de carinho)
    petRuntime.x = s.x
    petRuntime.z = s.z
    petRuntime.id = id
    petRuntime.dist = d
    petRuntime.height = breed.meta.height
    petRuntime.mode = s.mode
    petRuntime.clip = s.clip
    if (PET_DEBUG) {
      _v.set(s.x, breed.meta.height * PET_SCALE * 0.5, s.z).project(state.camera)
      petRuntime.sx = ((_v.x + 1) / 2) * state.size.width
      petRuntime.sy = ((1 - _v.y) / 2) * state.size.height
    }

    // tigela
    const bowl = bowlRef.current
    if (bowl) {
      bowl.visible = s.mode === 'eat'
      if (bowl.visible) bowl.position.set(s.x + Math.sin(s.yaw) * 0.46, 0, s.z + Math.cos(s.yaw) * 0.46)
    }
    // coracoes
    const hg = heartGroup.current
    if (hg) {
      hg.position.set(s.x, 0, s.z)
      const keep: Heart[] = []
      for (const h of hearts.current) {
        h.t += dt
        if (h.t < 0) {
          h.mesh.visible = false
          keep.push(h)
          continue
        }
        h.mesh.visible = true
        h.mesh.position.y += dt * 0.45
        h.mesh.position.x += h.vx * dt
        h.mesh.position.z += h.vz * dt
        h.mesh.quaternion.copy(state.camera.quaternion)
        ;(h.mesh.material as MeshBasicMaterial).opacity = Math.max(0, 1 - h.t / 1.4)
        if (h.t < 1.4) keep.push(h)
        else {
          hg.remove(h.mesh)
          ;(h.mesh.material as Material).dispose()
        }
      }
      hearts.current = keep
    }
    if (nameTag.current) nameTag.current.style.opacity = d < 4.5 ? '1' : '0'
  })

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    clearMoveTarget()
    cancelNavigation()
    if (petRuntime.dist < 6) usePetStore.getState().caress(id)
  }

  const m = breed.meta
  return (
    <>
      <group ref={root} scale={PET_SCALE}>
        <primitive object={built.scene} />
        <mesh position={[0, m.height * 0.5, 0]} onClick={onClick} visible={false}>
          <boxGeometry args={[m.bw * 3.2, m.height * 1.2, m.L * 1.6]} />
          <meshBasicMaterial />
        </mesh>
        <Html position={[0, m.height + 0.12, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
          <div ref={nameTag} className="pet-tag">
            {petLabel}
          </div>
        </Html>
      </group>
      <group ref={heartGroup} />
      <group ref={bowlRef} visible={false}>
        <mesh position={[0, 0.035, 0]}>
          <cylinderGeometry args={[0.13, 0.095, 0.07, 18]} />
          <meshStandardMaterial color="#e9e2d4" roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.07, 0]}>
          <cylinderGeometry args={[0.105, 0.105, 0.015, 18]} />
          <meshStandardMaterial color="#8a5a35" roughness={0.9} />
        </mesh>
      </group>
    </>
  )
}
