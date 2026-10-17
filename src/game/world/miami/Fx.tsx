import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, DynamicDrawUsage, InstancedMesh, MathUtils, Matrix4, Mesh, Object3D, Points, RingGeometry, ShaderMaterial, Vector3 } from 'three'
import { usePlayerStore } from '../../../state/playerStore'
import { worldMods } from '../../travel/worldMods'
import { env } from '../environment/envState'
import { SAND_X, SEA, waterDepthAt } from './layout'

const smooth = MathUtils.smoothstep

/**
 * Efeitos da praia ligados a jogadora:
 *  - agua rasa: velocidade cai ate ~45% quando a agua chega a cintura (profundidade 0,8 m no muro invisivel);
 *  - aneis de ondulacao ao redor das pernas e gotas de respingo ao andar na agua;
 *  - areia: pegadas que somem em ~14 s e um sopro de graos ao correr.
 * Tudo em piscinas fixas (sem alocar por quadro) para rodar bem no celular.
 */
const FOOT_MAX = 24
const SPRAY_MAX = 40

export function BeachFx() {
  const ring = useRef<Mesh>(null)
  const ringMat = useRef<ShaderMaterial>(null)
  const foot = useRef<InstancedMesh>(null)
  const spray = useRef<Points>(null)
  const st = useMemo(
    () => ({
      lastFoot: new Vector3(),
      side: 1,
      fi: 0,
      born: new Float32Array(FOOT_MAX).fill(-100),
      t: 0,
      acc: 0,
      si: 0,
      sp: new Float32Array(SPRAY_MAX * 3),
      sv: new Float32Array(SPRAY_MAX * 3),
      sage: new Float32Array(SPRAY_MAX).fill(9),
      scol: new Float32Array(SPRAY_MAX * 3),
    }),
    [],
  )
  const dummy = useMemo(() => new Object3D(), [])
  const ringGeo = useMemo(() => new RingGeometry(0.5, 0.58, 32).rotateX(-Math.PI / 2), [])
  const sprayGeo = useMemo(() => {
    const g = new BufferGeometry()
    const pos = new BufferAttribute(st.sp, 3)
    pos.setUsage(DynamicDrawUsage)
    g.setAttribute('position', pos)
    g.setAttribute('aAge', new BufferAttribute(st.sage, 1).setUsage(DynamicDrawUsage))
    g.setAttribute('aCol', new BufferAttribute(st.scol, 3).setUsage(DynamicDrawUsage))
    return g
  }, [st])
  const sprayMat = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uPx: { value: 90 } },
        vertexShader: `
          attribute float aAge; attribute vec3 aCol; varying float vA; varying vec3 vC; uniform float uPx;
          void main(){
            vA = 1.0 - smoothstep(0.0, 0.7, aAge); vC = aCol;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = uPx * (0.06 + 0.1 * aAge) / max(0.5, -mv.z) * step(aAge, 0.7);
          }`,
        fragmentShader: `
          varying float vA; varying vec3 vC;
          void main(){ vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.15, length(d)) * vA * 0.8; if (a < 0.01) discard; gl_FragColor = vec4(vC, a); }`,
      }),
    [],
  )
  const footMat = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        uniforms: { uNow: { value: 0 } },
        vertexShader: `
          attribute float aBorn; varying float vL; uniform float uNow;
          void main(){ vL = 1.0 - clamp((uNow - aBorn) / 14.0, 0.0, 1.0);
            gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
        fragmentShader: `varying float vL; void main(){ gl_FragColor = vec4(0.45, 0.36, 0.22, 0.42 * vL * vL); }`,
      }),
    [],
  )
  const footGeo = useMemo(() => {
    const g = new BufferGeometry()
    // pegada ovalada simples (leque de triangulos)
    const n = 10
    const v: number[] = [0, 0, 0]
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2
      v.push(Math.cos(a) * 0.075, 0, Math.sin(a) * 0.17)
    }
    const idx: number[] = []
    for (let i = 1; i <= n; i++) idx.push(0, i + 1, i)
    g.setAttribute('position', new BufferAttribute(new Float32Array(v), 3))
    g.setIndex(idx)
    g.setAttribute('aBorn', new BufferAttribute(st.born, 1).setUsage(DynamicDrawUsage))
    return g
  }, [st])

  useEffect(() => () => {
    ringGeo.dispose()
    sprayGeo.dispose()
    footGeo.dispose()
    sprayMat.dispose()
    footMat.dispose()
  }, [ringGeo, sprayGeo, footGeo, sprayMat, footMat])

  const m4 = useMemo(() => new Matrix4(), [])
  const sandCol = useMemo(() => new Color('#f1dcae'), [])
  const foamCol = useMemo(() => new Color('#f4fdff'), [])

  useFrame(({ camera }, dt0) => {
    const dt = Math.min(dt0, 0.1)
    st.t += dt
    const ps = usePlayerStore.getState()
    const p = ps.position
    const feetY = p.y - 0.825
    const d = waterDepthAt(p.x)
    const inWater = d > 0.02 && p.x < SEA.wallX + 2
    const wet = smooth(d, 0.05, 0.5)
    worldMods.wet = wet
    // andar na agua: devagar (ate 45%), mas so enquanto a agua sobe; areia fofa um pouco mais lenta
    const sandy = p.x > SAND_X + 3 && !inWater ? 0.93 : 1
    worldMods.speedMul = (1 - 0.55 * wet) * sandy
    const moving = ps.speed > 0.3

    // anel de ondulacao
    const r = ring.current
    const rm = ringMat.current
    if (r) {
      r.visible = inWater
      if (inWater) {
        r.position.set(p.x, SEA.waterY + 0.012, p.z)
        const k = 1 + 0.12 * Math.sin(st.t * 3) + (moving ? 0.35 : 0)
        r.scale.setScalar(k * (0.9 + wet * 0.5))
        if (rm) rm.opacity = (moving ? 0.32 : 0.16) * (1 - env.night * 0.7)
      }
    }

    // respingos (agua) / graos (areia)
    st.acc += dt
    const rate = moving ? (ps.speed > 2.4 ? 0.07 : 0.13) : 1e9
    if (st.acc > rate && (inWater || (p.x > SAND_X && p.x < SEA.shoreX + 3 && ps.speed > 2.2))) {
      st.acc = 0
      const n = inWater ? 3 : 2
      for (let i = 0; i < n; i++) {
        const k = st.si++ % SPRAY_MAX
        const a = Math.random() * 6.283
        st.sp[k * 3] = p.x + Math.cos(a) * 0.3
        st.sp[k * 3 + 1] = inWater ? SEA.waterY + 0.05 : feetY + 0.08
        st.sp[k * 3 + 2] = p.z + Math.sin(a) * 0.3
        st.sv[k * 3] = Math.cos(a) * (0.4 + Math.random() * 0.7) - ps.velocity.x * 0.15
        st.sv[k * 3 + 1] = 1.3 + Math.random() * 1.2
        st.sv[k * 3 + 2] = Math.sin(a) * (0.4 + Math.random() * 0.7) - ps.velocity.z * 0.15
        st.sage[k] = 0
        const c = inWater ? foamCol : sandCol
        st.scol[k * 3] = c.r
        st.scol[k * 3 + 1] = c.g
        st.scol[k * 3 + 2] = c.b
      }
    }
    for (let k = 0; k < SPRAY_MAX; k++) {
      if (st.sage[k] > 0.8) continue
      st.sage[k] += dt
      st.sv[k * 3 + 1] -= 9 * dt
      st.sp[k * 3] += st.sv[k * 3] * dt
      st.sp[k * 3 + 1] += st.sv[k * 3 + 1] * dt
      st.sp[k * 3 + 2] += st.sv[k * 3 + 2] * dt
    }
    const sg = spray.current?.geometry
    if (sg) {
      sg.attributes.position.needsUpdate = true
      sg.attributes.aAge.needsUpdate = true
      sg.attributes.aCol.needsUpdate = true
    }
    void camera

    // pegadas na areia seca / umida (alternando os pes a cada ~0,7 m)
    const f = foot.current
    if (f && moving && !inWater && p.x > SAND_X && p.x < SEA.shoreX + 3 && ps.grounded) {
      if (Math.hypot(p.x - st.lastFoot.x, p.z - st.lastFoot.z) > 0.7) {
        st.lastFoot.copy(p)
        st.side = -st.side
        const yaw = ps.yaw
        const ox = Math.cos(yaw) * 0.11 * st.side
        const oz = -Math.sin(yaw) * 0.11 * st.side
        dummy.position.set(p.x + ox, 0.012, p.z + oz)
        dummy.rotation.set(0, yaw, 0)
        dummy.updateMatrix()
        const i = st.fi++ % FOOT_MAX
        f.setMatrixAt(i, dummy.matrix)
        st.born[i] = st.t
        f.instanceMatrix.needsUpdate = true
        ;(f.geometry.attributes.aBorn as BufferAttribute).needsUpdate = true
      }
    }
    footMat.uniforms.uNow.value = st.t
  })

  useEffect(() => {
    const f = foot.current
    if (!f) return
    // pegadas "mortas" fora da vista
    m4.makeTranslation(0, -50, 0)
    for (let i = 0; i < FOOT_MAX; i++) f.setMatrixAt(i, m4)
    f.instanceMatrix.needsUpdate = true
  }, [m4])

  return (
    <>
      <mesh ref={ring} geometry={ringGeo} visible={false} renderOrder={6}>
        <meshBasicMaterial ref={ringMat as never} color="#ffffff" transparent opacity={0.4} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </mesh>
      <instancedMesh ref={foot} args={[footGeo, footMat, FOOT_MAX]} frustumCulled={false} renderOrder={2} />
      <points ref={spray} geometry={sprayGeo} material={sprayMat} frustumCulled={false} renderOrder={7} />
    </>
  )
}
