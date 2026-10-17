import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Quaternion, Vector3, type Group, type SkinnedMesh } from 'three'
import { DEFAULT_APPEARANCE, type Appearance } from '../../shared/appearance'
import { DEFAULT_BODY, type BodyParams } from '../../shared/faceCatalog'
import { Character, type CharacterHandle } from './Character'
import type { ClipName } from './animation/animator'
import { fitOf, proportionsOf } from './proportions'
import { SEAT_HIPS_GAP, useSitStore } from '../sit/sitStore'

/**
 * Teste de "nao deformar" (`?bodytest=1`): grade de corpos extremos e combinados, vestidos com roupa longa (`outfit=dress`),
 * calca (`pants`) ou casaco (`coat`), parados ou andando. Parametros:
 *   outfit=dress|pants|coat|none   anim=idle|walk|run|sit   t=<s> (congela o clipe)   yaw=<graus> (0 frente, 90 perfil)
 *   set=0|1 (12 corpos por grade; set=1 e a segunda lista)   acc=1 (joias na cabeca/mao/bolsa)   cam=<distancia>
 * Relatorio no console `[BODYTEST]` e em `window.__bodytest` (altura do corpo e ponto mais baixo da malha, por corpo).
 */
export const BODYTEST = new URLSearchParams(window.location.search).has('bodytest')

const b = (o: Partial<BodyParams>): BodyParams => ({ ...DEFAULT_BODY, ...o })

interface Spec {
  name: string
  body: BodyParams
}
const SETS: Spec[][] = [
  [
    { name: 'padrao', body: b({}) },
    { name: 'baixa', body: b({ height: -1 }) },
    { name: 'alta', body: b({ height: 1 }) },
    { name: 'pernas longas', body: b({ legs: 1 }) },
    { name: 'pernas curtas', body: b({ legs: -1 }) },
    { name: 'tronco longo', body: b({ torso: 1 }) },
    { name: 'corcunda', body: b({ posture: 1, neck: 0.3 }) },
    { name: 'ombros largos', body: b({ shoulders: 1 }) },
    { name: 'cabeca grande', body: b({ headSize: 1 }) },
    { name: 'cabeca pequena', body: b({ headSize: -1 }) },
    { name: 'alta + corcunda + ombros caidos', body: b({ height: 0.9, posture: 0.9, shouldersSlope: 0.8, hands: 0.6 }) },
    { name: 'baixa + cabeca grande + pes grandes + lordose', body: b({ height: -0.9, headSize: 0.7, feet: 0.8, lordosis: 1, legs: -0.5 }) },
  ],
  [
    { name: 'bracos longos', body: b({ arms: 1 }) },
    { name: 'bracos curtos', body: b({ arms: -1 }) },
    { name: 'pescoco longo', body: b({ neck: 1 }) },
    { name: 'pescoco curto', body: b({ neck: -1 }) },
    { name: 'maos grandes', body: b({ hands: 1 }) },
    { name: 'maos pequenas', body: b({ hands: -1 }) },
    { name: 'pes grandes', body: b({ feet: 1 }) },
    { name: 'pes pequenos', body: b({ feet: -1 }) },
    { name: 'ereta', body: b({ posture: -1 }) },
    { name: 'lordose', body: b({ lordosis: 1 }) },
    { name: 'ombros caidos', body: b({ shouldersSlope: 1 }) },
    { name: 'ombros estreitos', body: b({ shoulders: -1 }) },
  ],
]

// set=2: seis corpos representativos (mais leve para as capturas com roupa: cada roupa e um GLB + material por corpo)
SETS.push([SETS[0][0], SETS[0][2], SETS[0][3], SETS[0][4], SETS[0][6], SETS[0][10]])

const OUTFITS: Record<string, Appearance['outfit']> = {
  dress: { dress: { id: 'gala_train_gown' }, shoes: { id: 'stiletto_pumps' } },
  pants: { top: { id: 'tee' }, bottom: { id: 'flare_pants' }, shoes: { id: 'chunky_sneakers' } },
  coat: { top: { id: 'winter_coat' }, bottom: { id: 'skinny_jeans' }, shoes: { id: 'knee_boots' } },
  none: {},
}

const Q = new URLSearchParams(window.location.search)
let COLS = 6
const SEAT_Y = 0.45
const GAP = 1.15

interface Report {
  name: string
  height: number
  minY: number
  headY: number
  hipsY: number
  /** sentada: altura do osso do quadril acima do assento (esperado ~ SEAT_HIPS_GAP = 0,08) */
  hipsAboveSeat: number
}

export function BodyTest() {
  if (Q.get('solo')) COLS = Math.max(1, Q.get('solo')!.split(',').length)
  const all = SETS[Number(Q.get('set') ?? 0)] ?? SETS[0]
  // solo=0,4 mostra so esses corpos (indices da lista), maiores (cam=3 ly=0.7 aproxima)
  const solo = Q.get('solo')?.split(',').map(Number).filter((n) => Number.isFinite(n) && all[n])
  const set = useMemo(() => (solo?.length ? solo.map((n) => all[n]) : all), [all, solo?.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps
  const outfit = OUTFITS[Q.get('outfit') ?? 'none'] ?? {}
  const animQ = Q.get('anim') ?? 'idle'
  const clip = ({ walk: 'walk_normal', idle: 'idle', sit: 'stand_to_sit', run: 'run' } as Record<string, ClipName>)[animQ] ?? (animQ as ClipName)
  const t = Q.get('t') !== null ? Number(Q.get('t')) : undefined
  const yaw = ((Number(Q.get('yaw')) || 0) * Math.PI) / 180
  const dist = Number(Q.get('cam')) || 13
  const acc = Q.get('acc') === '1'
  const camera = useThree((s) => s.camera)
  const handles = useRef<Array<CharacterHandle | null>>([])
  const sitClip = useSitStore((st) => st.clip)
  const sitting = clip === 'stand_to_sit'

  const specs = useMemo(
    () =>
      set.map((s) => ({
        name: s.name,
        app: {
          ...DEFAULT_APPEARANCE,
          body: s.body,
          outfit,
          hair: { ...DEFAULT_APPEARANCE.hair, id: Q.get('hair') ?? DEFAULT_APPEARANCE.hair.id },
          accessories: acc ? [{ id: 'sun_hat' }, { id: 'tennis_bracelet' }, { id: 'anklet' }, { id: 'pearl_studs' }, { id: 'structured_handbag' }, { id: 'cocktail_ring' }] : [],
        } as Appearance,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(() => {
    const rows = Math.ceil(set.length / COLS)
    const ly = Number(Q.get('ly'))
    camera.position.set(0, Q.get('ly') ? ly : 1.0 * rows + 0.2, dist)
    camera.lookAt(0, Q.get('ly') ? ly : 0.95 * rows - 0.1 + (rows - 1) * 0.2, 0)
    document.querySelectorAll<HTMLElement>('.ui-layer').forEach((e) => (e.style.display = 'none'))
  }, [camera, set.length, dist])

  // rotulos (DOM simples, projetados a cada quadro) e relatorio
  const labels = useRef<HTMLDivElement[]>([])
  useEffect(() => {
    const els = set.map((s) => {
      const d = document.createElement('div')
      d.textContent = s.name
      d.style.cssText = 'position:fixed;left:0;top:0;transform:translate(-50%,0);font:12px system-ui,sans-serif;color:#2b2240;white-space:nowrap;background:#ffffffcc;padding:1px 5px;border-radius:4px;pointer-events:none;z-index:9'
      document.body.appendChild(d)
      return d
    })
    labels.current = els
    return () => els.forEach((e) => e.remove())
  }, [set])
  const frames = useRef(0)
  // window.__gaze(): inclinacao do olhar (graus, + = acima do horizonte) de cada boneca agora; eixo frontal do osso Head = (0, 0.072, 0.997) (medido em repouso)
  useEffect(() => {
    const f = new Vector3(0, 0.072, 0.997)
    const q = new Quaternion()
    const w = new Vector3()
    ;(window as unknown as { __gaze: () => number[] }).__gaze = () =>
      handles.current.map((h) => {
        if (!h) return NaN
        h.bones.mixamorigHead.getWorldQuaternion(q)
        return (Math.asin(w.copy(f).applyQuaternion(q).y) * 180) / Math.PI
      })
  }, [])
  const v = useMemo(() => new Vector3(), [])
  useFrame(({ size }) => {
    labels.current.forEach((el, i) => {
      const col = i % COLS
      const row = Math.floor(i / COLS)
      v.set((col - (COLS - 1) / 2) * GAP, (Math.ceil(set.length / COLS) - 1 - row) * 2.15 - 0.1, 0).project(camera)
      el.style.left = `${((v.x + 1) / 2) * size.width}px`
      el.style.top = `${((1 - v.y) / 2) * size.height}px`
    })
    if (handles.current.length < set.length || !handles.current.every(Boolean)) return
    frames.current++
    if (frames.current !== 4) return
    const rep: Report[] = []
    handles.current.forEach((h, i) => {
      if (!h) return
      const body = (h as unknown as { body: SkinnedMesh }).body
      h.root.updateWorldMatrix(true, true)
      body.skeleton.update()
      let minY = Infinity
      const pos = body.geometry.getAttribute('position')
      for (let k = 0; k < pos.count; k++) {
        body.getVertexPosition(k, v)
        v.applyMatrix4(body.matrixWorld)
        if (v.y < minY) minY = v.y
      }
      const hv = new Vector3()
      h.bones.mixamorigHead.getWorldPosition(hv)
      const hp = new Vector3()
      h.bones.mixamorigHips.getWorldPosition(hp)
      const group = h.root.parent!.parent!.parent as Group
      const gy = group.getWorldPosition(new Vector3()).y
      rep.push({ name: set[i].name, height: +proportionsOf(set[i].body).height.toFixed(3), minY: +(minY - gy).toFixed(4), headY: +(hv.y - gy).toFixed(3), hipsY: +(hp.y - gy).toFixed(3), hipsAboveSeat: +(hp.y - gy - SEAT_Y).toFixed(3) })
    })
    ;(window as unknown as { __bodytest: Report[] }).__bodytest = rep
    console.info('[BODYTEST]', JSON.stringify(rep))
    const pre = document.createElement('pre')
    pre.id = 'bodytest-report'
    pre.style.display = 'none'
    pre.textContent = JSON.stringify(rep)
    document.body.appendChild(pre)
  })

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
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.001, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#d8d2e4" roughness={1} />
      </mesh>
      {specs.map((s, i) => {
        const col = i % COLS
        const row = Math.floor(i / COLS)
        const x = (col - (COLS - 1) / 2) * GAP
        const y0 = (Math.ceil(set.length / COLS) - 1 - row) * 2.15
        // sentada: mesma conta do PlayerController (quadril sobre o assento, com o corpo ajustado)
        const fit = fitOf(set[i].body)
        const y = sitting ? y0 + SEAT_Y + SEAT_HIPS_GAP - (sitClip.endY + fit.hipsDelta) : y0
        const zc = sitting ? -sitClip.offZ * fit.stride : 0
        return (
          <group key={s.name} position={[x, y0, 0]} rotation={[0, yaw, 0]}>
            <group position={[0, y - y0, zc]}>
              <Character ref={(h) => void (handles.current[i] = h)} appearance={s.app} anim={{ clip, t }} />
            </group>
            {sitting && (
              <mesh position={[0, SEAT_Y - 0.03, 0]}>
                <boxGeometry args={[0.8, 0.06, 0.5]} />
                <meshStandardMaterial color="#7a5a8a" />
              </mesh>
            )}
          </group>
        )
      })}
    </>
  )
}
