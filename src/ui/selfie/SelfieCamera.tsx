import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import { MathUtils, Quaternion, Vector3, type Bone, type PerspectiveCamera } from 'three'
import { useUiStore } from '../../state/uiStore'
import { usePlayerStore } from '../../state/playerStore'
import { useCameraStore } from '../../state/cameraStore'
import { useEmoteStore } from '../../game/character/animation/emoteStore'
import { cameraIntent } from '../../game/input/intent'
import { driveBridge } from '../../game/vehicles/driveStore'
import { interiorBridge } from '../../game/interiors/interiorBridge'
import { CAMERA as C } from '../../game/camera/config'
import { useAppearanceStore } from '../../state/appearanceStore'
import { getHeadInfo, invalidateHeadTop } from './headFrame'
import { selfieBridge, useSelfieStore } from './selfieStore'

const FOV = 62 // camera frontal de celular: grande angular
const EYE_UP = 0.09 // osso Head (base da cabeca) -> linha dos olhos, em metros
const EYE_LINE = 0.38 // os olhos ficam a 38% da altura do quadro, de cima para baixo
const MAX_LOOK = MathUtils.degToRad(40)

const _p = new Vector3()
const _a = new Vector3()
const _b = new Vector3()
const _c = new Vector3()
const _d = new Vector3()
const _e = new Vector3()
const _qa = new Quaternion()
const _qb = new Quaternion()
const _qc = new Quaternion()
const _qd = new Quaternion()
const FWD = new Vector3(0, 0, 1)

/** Gira `bone` (no mundo, rotacao minima) para que a direcao ate `child` aponte para `dir`; `w` mistura com a pose atual. */
function aim(bone: Bone, child: Bone, dir: Vector3, w: number) {
  bone.updateWorldMatrix(true, true)
  bone.getWorldPosition(_a)
  child.getWorldPosition(_b)
  _c.copy(_b).sub(_a).normalize()
  _qa.setFromUnitVectors(_c, dir)
  bone.getWorldQuaternion(_qb).premultiply(_qa)
  bone.parent!.getWorldQuaternion(_qc).invert().multiply(_qb)
  bone.quaternion.slerp(_qc, w)
  bone.updateWorldMatrix(false, true)
}

/**
 * Selfie: com a camera do celular em modo frontal, a camera vai para a FRENTE do rosto (osso Head), com o enquadramento do
 * rosto ao busto (zoom ajustavel), o braco direito sobe segurando o celular e a cabeca olha para a lente. Ajusta-se ao cabelo
 * alto/chapeu (mede o topo do personagem) e nao atravessa paredes (esfera lancada do rosto ate a camera, como a de 3a pessoa).
 * Montada dentro do <Physics> (a ThirdPersonCamera a renderiza) e DEPOIS do PlayerController: roda apos a animacao do frame.
 */
export function SelfieCamera() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const scene = useThree((s) => s.scene)
  const { world, rapier } = useRapier()
  const st = useMemo(
    () => ({
      fov0: 50,
      pos: new Vector3(),
      look: new Vector3(),
      inited: false,
      dist: 1,
      armW: 0,
      headW: 0,
      clock: 0,
      shape: new rapier.Ball(0.1),
      rot: { x: 0, y: 0, z: 0, w: 1 },
      flags: rapier.QueryFilterFlags.EXCLUDE_SENSORS | rapier.QueryFilterFlags.EXCLUDE_DYNAMIC | rapier.QueryFilterFlags.EXCLUDE_KINEMATIC,
      origin: { x: 0, y: 0, z: 0 },
      dir: { x: 0, y: 0, z: 1 },
    }),
    [rapier],
  )

  // trocou cabelo/chapeu/morphs: remede o topo da cabeca (apos o GLB carregar)
  useEffect(() => {
    let timer = 0
    const unsub = useAppearanceStore.subscribe(() => {
      window.clearTimeout(timer)
      timer = window.setTimeout(invalidateHeadTop, 900)
    })
    return () => {
      unsub()
      window.clearTimeout(timer)
    }
  }, [])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const ui = useUiStore.getState()
    const sf = useSelfieStore.getState()
    const want = ui.cameraMode && sf.front && !driveBridge.active
    if (want !== selfieBridge.active) {
      selfieBridge.active = want
      if (want) {
        st.fov0 = camera.fov
        camera.fov = FOV
        camera.updateProjectionMatrix()
        st.inited = false
        // a personagem so aparece enquanto a camera esta longe (ver PlayerController)
        const cs = useCameraStore.getState()
        cs.distance = Math.max(cs.distance, (C.fadeStart + C.fadeEnd) / 2 + 1)
      } else {
        camera.fov = st.fov0
        camera.updateProjectionMatrix()
        st.armW = st.headW = 0
      }
    }
    if (!want) return
    st.clock += dt

    // roda do mouse / pinca = zoom da selfie; o resto da intencao de camera e descartado (nao acumula)
    if (cameraIntent.zoomDelta !== 0) sf.setZoom(sf.zoom + cameraIntent.zoomDelta * 0.8)
    cameraIntent.yawDelta = cameraIntent.pitchDelta = cameraIntent.zoomDelta = 0

    const ps = usePlayerStore.getState()
    const info = getHeadInfo(scene, ps.position.x, ps.position.y, ps.position.z, 5)
    if (!info) return
    const { head } = info
    head.updateWorldMatrix(true, false)
    head.getWorldPosition(_p)

    // ---- enquadramento: rosto -> busto, contando o topo (cabelo, coque, chapeu) ----
    const eyeY = _p.y + EYE_UP
    const z = sf.zoom
    // altura (m) do quadro: do rosto ao busto; cresce se o topo (coque, cachos, chapeu) nao coubesse
    const span = Math.max(MathUtils.lerp(0.55, 1.0, z), (info.topY + 0.04 - eyeY) / EYE_LINE)
    const width = MathUtils.lerp(0.4, 0.72, z)
    const cy = eyeY - (0.5 - EYE_LINE) * span
    const tanH = Math.tan(MathUtils.degToRad(FOV) / 2)
    const aspect = camera.aspect || 1
    let wantD = Math.max(span / 2 / tanH, width / 2 / (tanH * aspect))
    wantD = MathUtils.clamp(wantD, 0.3, 1.6)

    const yaw = ps.yaw
    const dx = Math.sin(yaw)
    const dz = Math.cos(yaw)
    // alvo: centro do quadro sobre o eixo da cabeca; a camera fica na frente (direcao do rosto), um pouco acima
    const ax = _p.x
    const az = _p.z
    const ex = dx
    const ey = 0.07
    const ez = dz
    const el = Math.hypot(ex, ey, ez)
    st.dir.x = ex / el
    st.dir.y = ey / el
    st.dir.z = ez / el

    // ---- colisao: esfera do rosto ate a camera ----
    let allowed = wantD
    st.origin.x = ax
    st.origin.y = cy
    st.origin.z = az
    const hit = world.castShape(st.origin, st.rot, st.dir, st.shape, 0, wantD, false, st.flags, undefined, undefined, ps.body ?? undefined)
    if (hit) allowed = Math.max(0.22, Math.min(wantD, hit.time_of_impact - 0.04))
    if (!st.inited) st.dist = allowed
    else if (allowed < st.dist) st.dist = allowed
    else st.dist += (allowed - st.dist) * (1 - Math.exp(-3 * dt))

    if (import.meta.env.DEV) (window as unknown as { __selfieDbg?: unknown }).__selfieDbg = { head: _p.toArray(), topY: info.topY, eyeY, span, wantD, dist: st.dist, hit: hit ? hit.time_of_impact : null }
    let camY = cy + st.dir.y * st.dist
    camY = Math.max(camY, C.minCameraY)
    if (interiorBridge.active) camY = Math.min(camY, interiorBridge.ceiling - 0.15)
    _d.set(ax + st.dir.x * st.dist, camY, az + st.dir.z * st.dist)
    if (!st.inited) {
      st.pos.copy(_d)
      st.look.set(ax, cy, az)
      st.inited = true
    } else {
      const k = 1 - Math.exp(-14 * dt)
      st.pos.lerp(_d, k)
      st.look.x += (ax - st.look.x) * k
      st.look.y += (cy - st.look.y) * k
      st.look.z += (az - st.look.z) * k
    }
    camera.position.copy(st.pos)
    camera.lookAt(st.look)
    camera.updateMatrixWorld()

    // ---- cabeca olha para a lente (apos a animacao do frame) ----
    const emoting = useEmoteStore.getState().emote !== null
    st.headW += ((emoting ? 0.55 : 0.9) - st.headW) * (1 - Math.exp(-6 * dt))
    _e.set(_p.x, _p.y + EYE_UP, _p.z)
    _c.copy(camera.position).sub(_e).normalize()
    head.getWorldQuaternion(_qa)
    _a.copy(FWD).applyQuaternion(_qa) // frente do rosto (+Z do osso, como no repouso do Mixamo)
    _qb.setFromUnitVectors(_a, _c)
    const ang = 2 * Math.acos(Math.min(1, Math.abs(_qb.w)))
    if (ang > 1e-4) {
      if (ang > MAX_LOOK) _qb.slerp(_qd.identity(), 1 - MAX_LOOK / ang)
      _qb.slerp(_qd.identity(), 1 - st.headW)
      _qa.premultiply(_qb)
      head.parent!.getWorldQuaternion(_qc).invert().multiply(_qa)
      head.quaternion.copy(_qc)
      head.updateWorldMatrix(false, true)
    }

    // ---- braco direito sobe com o celular (so se nao estiver num emote) ----
    st.armW += ((emoting ? 0 : 1) - st.armW) * (1 - Math.exp(-7 * dt))
    const arm = findBone(head, 'mixamorigRightArm')
    const fore = findBone(head, 'mixamorigRightForeArm')
    const hand = findBone(head, 'mixamorigRightHand')
    const larm = findBone(head, 'mixamorigLeftArm')
    if (arm && fore && hand && larm && st.armW > 0.01) {
      arm.updateWorldMatrix(true, true)
      arm.getWorldPosition(_a) // ombro S
      fore.getWorldPosition(_b)
      hand.getWorldPosition(_c)
      const L1 = _a.distanceTo(_b)
      const L2 = _b.distanceTo(_c)
      larm.getWorldPosition(_e)
      // lado da mao: do ombro esquerdo para o direito
      const side = _d.copy(_a).sub(_e)
      side.y = 0
      side.normalize()
      // mao fica junto da lente, um pouco abaixo e ao lado (o aparelho e a camera)
      const tx = camera.position.x + side.x * 0.1 - st.dir.x * 0.02
      const ty = camera.position.y - 0.12
      const tz = camera.position.z + side.z * 0.1 - st.dir.z * 0.02
      const t = new Vector3(tx, ty, tz) // (alocacao so enquanto a selfie esta aberta)
      const reach = (L1 + L2) * 0.97
      const toT = t.clone().sub(_a)
      const dd = toT.length()
      if (dd > reach) {
        toT.multiplyScalar(reach / dd)
        t.copy(_a).add(toT)
      }
      const dist = Math.max(0.05, Math.min(dd, reach))
      const dirST = toT.normalize()
      const aa = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist)
      const hh = Math.sqrt(Math.max(0, L1 * L1 - aa * aa))
      const pole = new Vector3(side.x * 0.7, -1, side.z * 0.7).addScaledVector(new Vector3(st.dir.x, 0, st.dir.z), -0.25)
      pole.addScaledVector(dirST, -pole.dot(dirST)).normalize()
      const elbow = _a.clone().addScaledVector(dirST, aa).addScaledVector(pole, hh)
      aim(arm, fore, _e.copy(elbow).sub(_a).normalize(), st.armW)
      fore.getWorldPosition(_b)
      aim(fore, hand, _e.copy(t).sub(_b).normalize(), st.armW)
    }
  })
  return null
}

const boneCache = new WeakMap<Bone, Record<string, Bone | null>>()
/** acha um osso irmao (mesmo esqueleto) a partir do osso da cabeca */
function findBone(from: Bone, name: string): Bone | null {
  let m = boneCache.get(from)
  if (!m) boneCache.set(from, (m = {}))
  if (name in m && m[name]) return m[name]
  let root: Bone = from
  while (root.parent && (root.parent as Bone).isBone) root = root.parent as Bone
  const o = root.getObjectByName(name) as Bone | undefined
  m[name] = o ?? null
  return m[name]
}
