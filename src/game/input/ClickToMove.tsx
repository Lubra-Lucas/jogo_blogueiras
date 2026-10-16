import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Matrix3, Raycaster, Vector2, Vector3, type Mesh, type Object3D } from 'three'
import { isPointerClaimed, setMoveTarget } from './intent'
import { navigateToPoint } from '../navigation/navigation'
import { driveBridge } from '../vehicles/driveStore'

const MAX_MOVE_PX = 6 // acima disso e arrasto de camera, nao clique
const MAX_HOLD_MS = 300
const DOUBLE_TAP_MS = 350
const DOUBLE_TAP_PX = 30
const MIN_NORMAL_Y = 0.7 // so aceita superficies "de chao"

/**
 * Click-to-move (mouse esquerdo e toque). Usa eventos do canvas sem interferir na camera (CameraInput):
 * so conta como clique se o ponteiro andou < 6 px e ficou pressionado < 300 ms.
 * Apenas meshes com userData.walkable = true sao alvos validos.
 * Duplo clique / duplo toque = correr ate la.
 */
export function ClickToMove() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)

  useEffect(() => {
    const el = gl.domElement
    const ray = new Raycaster()
    const ndc = new Vector2()
    const normal = new Vector3()
    const normalMatrix = new Matrix3()
    const walkables: Object3D[] = []
    const collect = (o: Object3D) => {
      if (o.userData.walkable && (o as Mesh).isMesh) walkables.push(o)
    }

    let down: { id: number; x: number; y: number; t: number; far: boolean } | null = null
    let lastTap = { t: -1e9, x: 0, y: 0 }

    const onDown = (e: PointerEvent) => {
      if (driveBridge.active) {
        down = null // dirigindo: sem click-to-move
        return
      }
      if (isPointerClaimed(e.pointerId)) {
        down = null // dedo reservado por outro controle (joystick)
        return
      }
      if (!e.isPrimary) {
        down = null // segundo dedo (pinca/zoom): invalida o toque
        return
      }
      if (e.pointerType === 'mouse' && e.button !== 0) {
        down = null
        return
      }
      down = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), far: false }
    }

    // Passou do limite em qualquer momento = arrasto de camera (mesmo que volte ao ponto inicial).
    const onMove = (e: PointerEvent) => {
      const d = down
      if (d && e.pointerId === d.id && Math.hypot(e.clientX - d.x, e.clientY - d.y) > MAX_MOVE_PX) d.far = true
    }

    const onUp = (e: PointerEvent) => {
      const d = down
      if (!d || e.pointerId !== d.id) return
      down = null
      const now = performance.now()
      if (d.far || Math.hypot(e.clientX - d.x, e.clientY - d.y) > MAX_MOVE_PX) return
      if (now - d.t > MAX_HOLD_MS) return

      const rect = el.getBoundingClientRect()
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      walkables.length = 0
      scene.traverse(collect)
      const hit = ray.intersectObjects(walkables, false)[0]
      if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__c2m = { n: walkables.length, hit: hit ? [hit.point.x, hit.point.y, hit.point.z] : null, t: now }
      if (!hit || !hit.face) return
      normalMatrix.getNormalMatrix(hit.object.matrixWorld)
      normal.copy(hit.face.normal).applyMatrix3(normalMatrix).normalize()
      if (normal.y <= MIN_NORMAL_Y) return

      const dbl =
        now - lastTap.t < DOUBLE_TAP_MS &&
        Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < DOUBLE_TAP_PX
      lastTap = dbl ? { t: -1e9, x: 0, y: 0 } : { t: now, x: e.clientX, y: e.clientY }
      // caminho livre: linha reta de sempre; bloqueado (predio, lago...): desvia pelo A* de game/navigation
      if (!navigateToPoint(hit.point.x, hit.point.z, dbl)) setMoveTarget(hit.point, dbl)
    }

    const onCancel = () => {
      down = null
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onCancel)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onCancel)
    }
  }, [gl, camera, scene])

  return null
}
