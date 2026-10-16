import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import type { DirectionalLight, InstancedMesh, Mesh } from 'three'
import { usePlayerStore } from '../../../state/playerStore'
import { CITY } from './layout'

const SUN_OFFSET: [number, number, number] = [18, 26, 12]

/** Sol com sombras que acompanha o jogador (a cidade e grande demais para um frustum fixo). */
export function SunFollow({ castShadow, mapSize }: { castShadow: boolean; mapSize: number }) {
  const light = useRef<DirectionalLight>(null)
  useFrame(() => {
    const l = light.current
    if (!l) return
    const p = usePlayerStore.getState().position
    l.position.set(p.x + SUN_OFFSET[0], SUN_OFFSET[1], p.z + SUN_OFFSET[2])
    l.target.position.set(p.x, 0, p.z)
    l.target.updateMatrixWorld()
  })
  return (
    <>
      <directionalLight
        ref={light}
        position={SUN_OFFSET}
        intensity={2.2}
        color="#fff1da"
        castShadow={castShadow}
        shadow-mapSize={[mapSize, mapSize]}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={34}
        shadow-camera-bottom={-34}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-radius={4}
        shadow-bias={-0.0006}
      />
    </>
  )
}

/** ?map=1: camera ortografica de cima, norte para cima, cidade inteira (para capturas). */
export function MapCamera() {
  const size = useThree((s) => s.size)
  const zoom = Math.min(size.width, size.height) / (CITY.half * 2 + 20)
  return <OrthographicCamera makeDefault position={[0, 300, 0]} rotation-x={-Math.PI / 2} zoom={zoom} near={1} far={1000} />
}

/** ?stats=1: mostra draw calls e triangulos na tela. */
export function StatsProbe() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const enabled = useMemo(() => new URLSearchParams(window.location.search).get('stats') === '1', [])
  useEffect(() => {
    if (!enabled) return
    const el = document.createElement('div')
    el.id = 'stats-probe'
    el.style.cssText =
      'position:fixed;left:8px;bottom:8px;z-index:9;font:12px monospace;background:#000a;color:#fff;padding:4px 8px;pointer-events:none'
    document.body.appendChild(el)
    const id = setInterval(() => {
      const r = gl.info.render
      const rows: [number, string][] = []
      scene.traverse((o) => {
        const m = o as InstancedMesh
        if (!(m as { isMesh?: boolean }).isMesh || !m.geometry) return
        const g = m.geometry
        const t = (g.index ? g.index.count : g.attributes.position.count) / 3
        const n = m.isInstancedMesh ? m.count : 1
        rows.push([t * n, `${o.type}${m.isInstancedMesh ? 'x' + n : ''} ${Math.round(t)}t`])
      })
      let kitTris = 0
      let kitCalls = 0
      scene.traverse((o) => {
        const m = o as Mesh
        if (!o.userData.kit || !m.isMesh || !o.parent?.visible) return
        kitTris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3
        kitCalls++
      })
      rows.unshift([1e12, `KIT visivel: ${Math.round(kitTris)} tris em ${kitCalls} malhas`])
      rows.sort((a, b) => b[0] - a[0])
      el.style.whiteSpace = 'pre'
      el.textContent = `calls ${r.calls} | tris ${r.triangles} | geos ${gl.info.memory.geometries}` + '\n' + rows.slice(0, 12).map((x) => `${x[0] > 1e11 ? '' : Math.round(x[0]) + ' '}${x[1]}`).join('\n')
    }, 500)
    return () => {
      clearInterval(id)
      el.remove()
    }
  }, [enabled, gl, scene])
  return null
}
