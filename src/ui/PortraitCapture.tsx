import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { PerspectiveCamera, SRGBColorSpace, Vector3, WebGLRenderTarget } from 'three'
import { create } from 'zustand'
import { usePlayerStore } from '../state/playerStore'
import { useCameraStore } from '../state/cameraStore'
import { useAppearanceStore } from '../state/appearanceStore'
import { CAMERA } from '../game/camera/config'
import { PLAYER } from '../game/player/config'
import { getHeadInfo } from './selfie/headFrame'

const SIZE = 128
const REFRESH_S = 0.5

/** Retrato do rosto da jogadora: canvas 2D alimentado pelo componente `PortraitCapture` (dentro do Canvas). */
export const portraitCanvas: HTMLCanvasElement = document.createElement('canvas')
portraitCanvas.width = portraitCanvas.height = SIZE
export const usePortraitStore = create<{ version: number }>()(() => ({ version: 0 }))

/**
 * Renderiza a cena de uma camera presa na cabeca da jogadora para um WebGLRenderTarget pequeno e copia os pixels
 * para `portraitCanvas`. Atualiza a cada ~0,5 s e logo depois de mudar a aparencia (nao a cada frame).
 */
export function PortraitCapture() {
  const ctx = useMemo(() => {
    const rt = new WebGLRenderTarget(SIZE, SIZE, { colorSpace: SRGBColorSpace })
    const cam = new PerspectiveCamera(28, 1, 0.05, 40)
    return { rt, cam, buf: new Uint8Array(SIZE * SIZE * 4), img: new ImageData(SIZE, SIZE), t: 99, dirty: true, v: new Vector3(), g2d: portraitCanvas.getContext('2d') }
  }, [])

  useEffect(() => {
    let timer = 0
    const unsub = useAppearanceStore.subscribe(() => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => (ctx.dirty = true), 600) // espera o GLB/cores aplicarem
    })
    return () => {
      unsub()
      window.clearTimeout(timer)
      ctx.rt.dispose()
    }
  }, [ctx])

  useFrame(({ gl, scene }, dt) => {
    ctx.t += dt
    if (!ctx.dirty && ctx.t < REFRESH_S) return
    const player = usePlayerStore.getState()
    if (!player.body || !ctx.g2d) return
    // personagem some quando a camera chega muito perto: nao tem rosto para fotografar
    if (useCameraStore.getState().distance <= (CAMERA.fadeStart + CAMERA.fadeEnd) / 2) return
    ctx.t = 0
    const wasDirty = ctx.dirty
    ctx.dirty = false
    const p = player.position
    // rosto pelo osso Head (acompanha altura/postura); sem o osso, estimativa pela capsula
    const info = getHeadInfo(scene, p.x, p.y, p.z, wasDirty ? 0 : Infinity) // remede o topo (cabelo/chapeu) so quando a aparencia muda
    let headY = p.y - (PLAYER.halfHeight + PLAYER.radius) + 1.36 * usePlayerStore.getState().fit.heightScale
    let dist = 0.85
    let hx = p.x
    let hz = p.z
    if (info) {
      info.head.updateWorldMatrix(true, false)
      info.head.getWorldPosition(ctx.v)
      headY = ctx.v.y + 0.07
      hx = ctx.v.x
      hz = ctx.v.z
      dist *= Math.max(1, (info.topY - headY + 0.09) / 0.3) // cabelo alto / chapeu: afasta para caber
    }
    const fx = Math.sin(player.yaw)
    const fz = Math.cos(player.yaw)
    ctx.cam.position.set(hx + fx * dist, headY + 0.02, hz + fz * dist)
    ctx.cam.lookAt(hx, headY + 0.01, hz)
    ctx.cam.updateMatrixWorld()

    const prev = gl.getRenderTarget()
    gl.setRenderTarget(ctx.rt)
    gl.clear()
    gl.render(scene, ctx.cam)
    gl.setRenderTarget(prev)
    gl.readRenderTargetPixels(ctx.rt, 0, 0, SIZE, SIZE, ctx.buf)
    // linhas vem de baixo para cima: inverte
    const row = SIZE * 4
    for (let y = 0; y < SIZE; y++) ctx.img.data.set(ctx.buf.subarray((SIZE - 1 - y) * row, (SIZE - y) * row), y * row)
    ctx.g2d.putImageData(ctx.img, 0, 0)
    usePortraitStore.setState((s) => ({ version: s.version + 1 }))
  })
  return null
}
