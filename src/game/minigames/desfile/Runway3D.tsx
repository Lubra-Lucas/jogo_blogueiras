import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { CanvasTexture, Color, InstancedMesh, Object3D, SRGBColorSpace, Vector3, type Group, type PerspectiveCamera } from 'three'
import { DEFAULT_APPEARANCE, type Appearance } from '../../../shared/appearance'
import type { ClipName } from '../../character/animation/animator'
import { playSfx } from '../audio'
import type { PoseId } from './bonePoses'
import { POSE_FRAMES } from './poses'
import { Confetti, Doll, GradientBackdrop, Label3D, StudioEnv } from './sceneKit'
import { useDesfileStore } from './store'
import { JUDGES } from './scoring'

/** Comprimento da passarela (m) e posições-chave no eixo +Z (a modelo caminha em direção às juradas). */
export const RUNWAY_LEN = 6.5
const SPEED = 0.86 // m/s: velocidade que o clipe 'desfile' cobre a 1x (sem deslize de pé)
const Z_END = RUNWAY_LEN - 0.4
const TABLE_Z = RUNWAY_LEN + 3.6
const TOP = 0.1

const BACK: [number, string][] = [[0, '#1d1633'], [0.55, '#33264f'], [1, '#52406f']]

function wallTexture(): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 400
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 1024, 400)
  grad.addColorStop(0, '#cdb8f0')
  grad.addColorStop(0.5, '#f1dcc0')
  grad.addColorStop(1, '#a9cdf0')
  g.fillStyle = grad
  g.fillRect(0, 0, 1024, 400)
  for (let i = 0; i < 70; i++) {
    g.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.5})`
    const x = Math.random() * 1024
    const y = Math.random() * 400
    const r = 2 + Math.random() * 5
    g.beginPath()
    g.arc(x, y, r, 0, 7)
    g.fill()
  }
  g.textAlign = 'center'
  g.fillStyle = '#2f2548'
  g.font = 'italic 600 112px "Playfair Display", "Times New Roman", serif'
  g.fillText('Passarela', 512, 200)
  g.font = 'italic 600 54px "Playfair Display", "Times New Roman", serif'
  g.fillStyle = '#fff3c8'
  g.fillText('das Blogueiras', 512, 280)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

function Stage() {
  const wall = useMemo(wallTexture, [])
  const strips = useMemo(() => {
    const cols = ['#ffe9a8', '#b9e4ff', '#ddd0f8', '#bfe8d6']
    return Array.from({ length: Math.round(RUNWAY_LEN * 2) }, (_, i) => ({ z: 0.25 + i * 0.5, c: cols[i % cols.length] }))
  }, [])
  const beamColors = ['#ffe9a8', '#cfe5fb', '#e6d6ff', '#ffe9a8']
  return (
    <group>
      {/* piso geral */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 5]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#2a2142" roughness={0.6} />
      </mesh>
      {/* passarela */}
      <mesh position={[0, TOP / 2, RUNWAY_LEN / 2 - 0.35]}>
        <boxGeometry args={[2.3, TOP, RUNWAY_LEN + 1.7]} />
        <meshPhysicalMaterial color="#17131d" roughness={0.16} metalness={0.1} clearcoat={0.6} clearcoatRoughness={0.12} envMapIntensity={0.35} />
      </mesh>
      {/* faixa central champagne */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, TOP + 0.002, RUNWAY_LEN / 2 - 0.35]}>
        <planeGeometry args={[0.06, RUNWAY_LEN + 1.5]} />
        <meshBasicMaterial color="#e8c872" toneMapped={false} />
      </mesh>
      {/* ponta (T) */}
      <mesh position={[0, TOP / 2, RUNWAY_LEN + 0.55]}>
        <boxGeometry args={[4.2, TOP, 1.1]} />
        <meshPhysicalMaterial color="#17131d" roughness={0.16} clearcoat={0.6} envMapIntensity={0.35} />
      </mesh>
      {/* luzes de borda */}
      {strips.map((s, i) => (
        <group key={i}>
          <mesh position={[-1.16, TOP * 0.5, s.z]}>
            <boxGeometry args={[0.05, 0.05, 0.36]} />
            <meshBasicMaterial color={s.c} toneMapped={false} />
          </mesh>
          <mesh position={[1.16, TOP * 0.5, s.z]}>
            <boxGeometry args={[0.05, 0.05, 0.36]} />
            <meshBasicMaterial color={s.c} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* painel de fundo */}
      <mesh position={[0, 2.5, -2.6]}>
        <planeGeometry args={[9, 3.5]} />
        <meshBasicMaterial map={wall} toneMapped={false} />
      </mesh>
      <mesh position={[0, 2.5, -2.64]}>
        <planeGeometry args={[9.4, 3.9]} />
        <meshStandardMaterial color="#e8b84a" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* feixes de luz (cones aditivos) */}
      {beamColors.map((c, i) => (
        <mesh key={i} position={[i % 2 ? 1.1 : -1.1, 2.4, 0.8 + i * 1.9]}>
          <cylinderGeometry args={[0.1, 0.9, 4.8, 20, 1, true]} />
          <meshBasicMaterial color={c} transparent opacity={0.1} depthWrite={false} blending={2} toneMapped={false} />
        </mesh>
      ))}
      <pointLight position={[0, 3.2, 1.2]} intensity={14} distance={9} color="#fff2e0" />
      <pointLight position={[0, 3.2, 3.8]} intensity={14} distance={9} color="#ffeef8" />
      <pointLight position={[0, 3.2, Z_END]} intensity={18} distance={9} color="#fff6ea" />
    </group>
  )
}

/** Plateia: silhuetas escuras em fileiras dos dois lados, balançando; celulares acesos piscando. */
function Audience() {
  const bodies = useRef<InstancedMesh>(null)
  const heads = useRef<InstancedMesh>(null)
  const phones = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const people = useMemo(() => {
    const out: { x: number; z: number; y: number; ph: number; phone: boolean; flip: number }[] = []
    for (const side of [-1, 1]) {
      for (let row = 0; row < 3; row++) {
        for (let k = 0; k < 11; k++) {
          out.push({
            x: side * (2.15 + row * 0.85) + (Math.random() - 0.5) * 0.15,
            z: 0.2 + k * 0.62 + (Math.random() - 0.5) * 0.15,
            y: row * 0.3,
            ph: Math.random() * 6.28,
            phone: Math.random() < 0.35,
            flip: side,
          })
        }
      }
    }
    return out
  }, [])
  useEffect(() => {
    const palette = ['#14101e', '#1b1530', '#241b3a', '#2d2347', '#3a2a52'].map((c) => new Color(c))
    people.forEach((_p, i) => {
      const col = palette[i % palette.length]
      bodies.current?.setColorAt(i, col)
      heads.current?.setColorAt(i, col)
    })
    if (bodies.current?.instanceColor) bodies.current.instanceColor.needsUpdate = true
    if (heads.current?.instanceColor) heads.current.instanceColor.needsUpdate = true
  }, [people])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    people.forEach((p, i) => {
      const bob = Math.sin(t * 2.2 + p.ph) * 0.03
      dummy.rotation.set(0, 0, 0)
      dummy.scale.setScalar(0.82)
      dummy.position.set(p.x, 0.52 + p.y + bob, p.z)
      dummy.updateMatrix()
      bodies.current?.setMatrixAt(i, dummy.matrix)
      dummy.position.set(p.x, 0.92 + p.y + bob, p.z)
      dummy.updateMatrix()
      heads.current?.setMatrixAt(i, dummy.matrix)
      const on = p.phone && Math.sin(t * 3 + p.ph * 3) > -0.4
      dummy.position.set(p.x - p.flip * 0.2, 1.0 + p.y + bob, p.z)
      dummy.scale.setScalar(on ? 1 : 0.0001)
      dummy.updateMatrix()
      phones.current?.setMatrixAt(i, dummy.matrix)
    })
    for (const m of [bodies.current, heads.current, phones.current]) if (m) m.instanceMatrix.needsUpdate = true
  })
  const n = people.length
  return (
    <group>
      <instancedMesh ref={bodies} args={[undefined, undefined, n]} frustumCulled={false}>
        <capsuleGeometry args={[0.2, 0.55, 4, 10]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, n]} frustumCulled={false}>
        <sphereGeometry args={[0.15, 12, 10]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={phones} args={[undefined, undefined, n]} frustumCulled={false}>
        <boxGeometry args={[0.07, 0.12, 0.01]} />
        <meshBasicMaterial color="#d6ecff" toneMapped={false} />
      </instancedMesh>
      {/* arquibancadas baixas */}
      {[-1, 1].map((side) =>
        [0, 1, 2].map((r) => (
          <mesh key={`${side}${r}`} position={[side * (2.15 + r * 0.85), 0.15 * r - 0.02, RUNWAY_LEN / 2 + 0.1]}>
            <boxGeometry args={[0.8, 0.3 + r * 0.3, RUNWAY_LEN + 1.4]} />
            <meshStandardMaterial color="#1a1428" roughness={0.9} />
          </mesh>
        )),
      )}
    </group>
  )
}

function judgeAppearance(j: (typeof JUDGES)[number]): Appearance {
  return {
    ...DEFAULT_APPEARANCE,
    skin: { tone: j.skin },
    suit: { color: j.suit, finish: 'satin' },
    lips: { color: j.lips, gloss: 0.6 },
    hair: { id: j.hairId, color: j.hair },
    morphs: j.id === 'madame' ? { waistThin: 0.5 } : j.id === 'kiki' ? { hipsWide: 0.4 } : { bustBig: 0.3 },
  }
}

function JudgeTable({ moods }: { moods: Record<string, ClipName> }) {
  const apps = useMemo(() => JUDGES.map(judgeAppearance), [])
  return (
    <group position={[0, 0, TABLE_Z]}>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[5.2, 0.84, 0.9]} />
        <meshPhysicalMaterial color="#fff4e0" roughness={0.22} clearcoat={1} />
      </mesh>
      <mesh position={[0, 0.86, 0]}>
        <boxGeometry args={[5.35, 0.05, 1.02]} />
        <meshStandardMaterial color="#e8b84a" metalness={0.9} roughness={0.28} />
      </mesh>
      {JUDGES.map((j, i) => {
        const x = (i - 1) * 1.65
        return (
          <group key={j.id}>
            <Doll appearance={apps[i]} clip={moods[j.id] ?? 'idle'} position={[x, 0, 0.75]} rotationY={Math.PI} />
            <Label3D text={j.name} position={[x, 1.02, -0.2]} height={0.13} />
          </group>
        )
      })}
    </group>
  )
}

/** Diretora da cena: anda com a modelo, conduz as poses (QTE) e a câmera. */
function Director({ appearance, moods }: { appearance: Appearance; moods: Record<string, ClipName> }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const [anim, setAnim] = useState<{ clip?: ClipName; pose?: PoseId }>({ clip: 'idle' })
  const [burst, setBurst] = useState<{ id: number; perfect: boolean } | null>(null)
  const group = useRef<Group>(null)
  const devQ = useRef(import.meta.env.DEV ? new URLSearchParams(window.location.search) : null)
  const st = useRef({ t: 0, z: 0, mode: 'wait' as 'wait' | 'walk' | 'queue' | 'qte' | 'hold' | 'end' | 'judged', next: 0, holdUntil: 0, handled: 0, punch: 0, cut: false })
  const look = useRef(new Vector3(0, 1, 2))
  const want = useMemo(() => new Vector3(), [])
  const wantLook = useMemo(() => new Vector3(), [])

  useLayoutEffect(() => {
    camera.position.set(6, 2.6, 1.8)
    camera.fov = 40
    camera.updateProjectionMatrix()
    st.current = { t: 0, z: 0, mode: 'wait', next: 0, holdUntil: 0, handled: 0, punch: 0, cut: false }
    if (import.meta.env.DEV) {
      // dev (capturas): ?dzmode=walk|poses&dzz=metros
      const q = new URLSearchParams(window.location.search)
      const m = q.get('dzmode')
      if (m === 'walk') {
        st.current.mode = 'walk'
        st.current.z = Number(q.get('dzz') ?? 3)
        st.current.t = 5
        setAnim({ clip: 'desfile' })
        useDesfileStore.getState().setRunStage('walk')
      } else if (m === 'poses') {
        st.current.mode = 'queue'
        st.current.z = Z_END
        st.current.t = 5
        st.current.next = 5
        useDesfileStore.getState().setRunStage('poses')
      }
    }
    if (group.current) group.current.position.set(0, TOP, st.current.z)
  }, [camera])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const s = st.current
    const store = useDesfileStore.getState()
    s.t += dt
    const now = performance.now()

    if (store.phase === 'runway') {
      if (s.mode === 'wait' && s.t > 1.6) {
        s.mode = 'walk'
        setAnim({ clip: 'desfile' })
        store.setRunStage('walk')
      } else if (s.mode === 'walk') {
        s.z += SPEED * dt
        if (s.z >= Z_END) {
          s.z = Z_END
          s.mode = 'queue'
          s.next = s.t + 1.1
          setAnim({ clip: 'idle' })
          store.setRunStage('poses')
        }
      } else if (s.mode === 'queue' && s.t >= s.next) {
        s.mode = 'qte'
        store.startQte(now, now + 1300)
        playSfx('tap')
      } else if (s.mode === 'qte') {
        const q = store.qte
        if (q && now > q.targetAt + 260 && !devQ.current?.get('dznomiss')) store.recordPose('miss')
        if (store.poses.length > s.handled) {
          // a jogadora respondeu: faz a pose
          const g = store.lastGrade?.grade ?? 'miss'
          const f = POSE_FRAMES[s.handled % POSE_FRAMES.length]
          s.handled = store.poses.length
          setAnim(g === 'miss' ? { clip: 'idle' } : { pose: f.id })
          if (g !== 'miss') setBurst({ id: s.handled, perfect: g === 'perfect' })
          s.punch = g === 'perfect' ? 1 : g === 'good' ? 0.5 : 0
          playSfx(g === 'perfect' ? 'combo' : g === 'good' ? 'tip' : 'bad')
          s.mode = 'hold'
          s.holdUntil = s.t + 1.25
        }
      } else if (s.mode === 'hold' && s.t >= s.holdUntil) {
        setAnim({ clip: 'idle' })
        if (s.handled >= 3) {
          s.mode = 'end'
          s.next = s.t + 0.7
          store.setRunStage('done')
        } else {
          s.mode = 'queue'
          s.next = s.t + 0.5
        }
      } else if (s.mode === 'end' && s.t >= s.next) {
        s.mode = 'judged'
        store.finishRunway()
      }
    }
    if (group.current) group.current.position.z = s.z

    // ---- câmera ----
    s.punch = Math.max(0, s.punch - dt * 1.6)
    if (store.phase === 'judging') {
      // corte seco para a mesa das juradas (a modelo sai de cena)
      want.set(0, 1.55, TABLE_Z - 4.4)
      wantLook.set(0, 1.15, TABLE_Z)
      if (!s.cut) {
        s.cut = true
        camera.position.copy(want)
        look.current.copy(wantLook)
        camera.fov = 40
        camera.updateProjectionMatrix()
        if (group.current) group.current.visible = false
      }
    } else if (s.mode === 'wait') {
      // abertura: plano aberto à frente da modelo, ainda parada no início da passarela
      want.set(1.5, 1.5, 4.3)
      wantLook.set(0, 1.0, 0.3)
    } else if (s.mode === 'walk') {
      // câmera à frente da modelo, andando de costas, balançando um pouco
      want.set(Math.sin(s.t * 0.5) * 0.7 + 0.2, 1.2 + Math.sin(s.t * 0.9) * 0.05, s.z + 3.7)
      wantLook.set(0, 0.92, s.z)
    } else {
      // poses: mais perto e levemente de lado, com giro lento
      const a = Math.sin(s.t * 0.4)
      want.set(1.2 + a * 0.35, 1.25 + s.punch * 0.05, Z_END + 3.0 - s.punch * 0.5)
      wantLook.set(0.05, 0.95, Z_END)
    }
    const k = devQ.current?.get('dzmode') || devQ.current?.get('dzsnap') ? 1 : 1 - Math.exp(-(store.phase === 'judging' ? 1.6 : 3.2) * dt)
    camera.position.lerp(want, k)
    look.current.lerp(wantLook, k * 1.3)
    camera.lookAt(look.current)
    const fov = 40 - s.punch * 5
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov += (fov - camera.fov) * 0.2
      camera.updateProjectionMatrix()
    }
  })

  return (
    <>
      <group ref={group} position={[0, TOP, 0]}>
        <Doll appearance={appearance} clip={anim.clip} pose={anim.pose} />
        {burst && (
          <Sparkles key={burst.id} count={burst.perfect ? 60 : 30} scale={[1.8, 2.2, 1.8]} position={[0, 1.05, 0]} size={burst.perfect ? 9 : 6} speed={1.4} color={burst.perfect ? '#ffe08a' : '#cfe5fb'} />
        )}
      </group>
      <Confetti active={!!burst?.perfect} count={80} origin={[0, 5.5, Z_END]} spread={3} burst />
      <JudgeTable moods={moods} />
    </>
  )
}

/** Passarela completa: palco, plateia, juradas e a modelo desfilando (fases 'runway' e 'judging'). */
export function Runway3D({ appearance }: { appearance: Appearance }) {
  const result = useDesfileStore((s) => s.result)
  const moods = useMemo(() => {
    const m: Record<string, ClipName> = {}
    if (result) for (const j of result.judges) m[j.judgeId] = j.total >= 7 ? 'clap' : 'idle'
    return m
  }, [result])
  return (
    <>
      <GradientBackdrop stops={BACK} />
      <fog attach="fog" args={['#2a2142', 14, 42]} />
      <StudioEnv intensity={0.35} />
      <hemisphereLight args={['#e6dcff', '#2a2142', 0.7]} />
      <directionalLight position={[3, 5, 4]} intensity={0.9} color="#fff2e0" />
      <Stage />
      <Audience />
      <Director appearance={appearance} moods={moods} />
      <Sparkles count={90} scale={[8, 4, RUNWAY_LEN + 4]} position={[0, 2.2, RUNWAY_LEN / 2]} size={4} speed={0.3} color="#fff0c8" />
    </>
  )
}
