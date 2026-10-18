import { Component, Suspense, useRef, useState, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import type { Group } from 'three'
import { Character } from '../character/Character'
import { usePlayerStore } from '../../state/playerStore'
import { getQuality } from '../systems/quality'
import { PLAYER } from '../player/config'
import { bubbles, motions, useNetStore, type Peer } from './net'
import '../../ui/chat/chat.css'

/** jogadora remota que falha ao carregar (item desconhecido...) nao derruba o mundo: some e pronto */
class PeerBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

const RUN_FROM = (PLAYER.walkSpeed + PLAYER.runSpeed) / 2
const clipOf = (speed: number) => (speed < 0.2 ? 'idle' : speed < RUN_FROM ? 'walk_normal' : 'run')

function RemotePlayer({ id, peer }: { id: string; peer: Peer }) {
  const g = useRef<Group>(null)
  const from = useRef({ x: 0, y: 0, z: 0, yaw: 0, at: -1 })
  const [clip, setClip] = useState<'idle' | 'walk_normal' | 'run'>('idle')
  const [bubble, setBubble] = useState<string | null>(null)
  useFrame(() => {
    const o = g.current
    const m = motions.get(id)
    if (!o || !m) return
    const f = from.current
    // amostra nova: interpola a partir de onde a boneca esta agora ate ela, no mesmo intervalo em que chegou
    if (f.at !== m.at) Object.assign(f, f.at < 0 ? { x: m.x, y: m.y, z: m.z, yaw: m.yaw } : { x: o.position.x, y: o.position.y, z: o.position.z, yaw: o.rotation.y }, { at: m.at })
    const u = m.span > 0 ? Math.min(1, (performance.now() - m.at) / m.span) : 1
    o.position.set(f.x + (m.x - f.x) * u, f.y + (m.y - f.y) * u, f.z + (m.z - f.z) * u)
    const dy = Math.atan2(Math.sin(m.yaw - f.yaw), Math.cos(m.yaw - f.yaw))
    o.rotation.y = f.yaw + dy * u
    const c = clipOf(m.speed)
    if (c !== clip) setClip(c)
    const b = bubbles.get(id)
    const text = b && performance.now() < b.until ? b.text : null
    if (text !== bubble) setBubble(text)
  })
  return (
    <group ref={g}>
      <Character appearance={peer.appearance} anim={{ clip }} shadows={false} />
      <Html position={[0, 1.95, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div style={{ position: 'relative', width: 0, height: 0 }}>
          {bubble ? (
            <div className="speech">{bubble}</div>
          ) : (
            <div className="speech" style={{ opacity: 0.85, fontWeight: 700 }}>
              {peer.name}
            </div>
          )}
        </div>
      </Html>
    </group>
  )
}

/** monta so quem esta na mesma zona e perto (ate 70 m), os N mais proximos por qualidade: cada boneca custa ~60 mil triangulos */
export function RemotePlayers() {
  const peers = useNetStore((s) => s.peers)
  const myZone = useNetStore((s) => s.myZone)
  const [on, setOn] = useState<string[]>([])
  const acc = useRef(1)
  const max = getQuality() === 'low' ? 3 : getQuality() === 'medium' ? 6 : 10
  useFrame((_, dt) => {
    acc.current += dt
    if (acc.current < 0.5) return
    acc.current = 0
    const p = usePlayerStore.getState().position
    const near: { id: string; d: number }[] = []
    for (const [id, peer] of Object.entries(peers)) {
      const m = motions.get(id)
      if (peer.zone !== myZone || !m) continue
      const d = Math.hypot(m.x - p.x, m.z - p.z)
      if (d < 70) near.push({ id, d })
    }
    const ids = near
      .sort((a, b) => a.d - b.d)
      .slice(0, max)
      .map((x) => x.id)
      .sort()
    if (ids.length !== on.length || ids.some((x, i) => x !== on[i])) setOn(ids)
  })
  return (
    <>
      {on.map((id) =>
        peers[id] ? (
          <PeerBoundary key={id}>
            <Suspense fallback={null}>
              <RemotePlayer id={id} peer={peers[id]} />
            </Suspense>
          </PeerBoundary>
        ) : null,
      )}
    </>
  )
}
