import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import type { Group } from 'three'
import { usePlayerStore } from '../../state/playerStore'
import { useChatStore } from '../../state/chatStore'

/** Balao de fala acima da cabeca da jogadora com a ultima mensagem (~5 s). Vive dentro do Canvas. */
export function ChatBubble() {
  const group = useRef<Group>(null)
  const bubble = useChatStore((s) => s.bubble)
  useFrame(() => {
    const g = group.current
    if (!g) return
    const p = usePlayerStore.getState().position
    g.position.set(p.x, p.y + 1.02, p.z)
    const b = useChatStore.getState().bubble
    if (b && performance.now() > b.until) useChatStore.setState({ bubble: null })
  })
  return (
    <group ref={group}>
      {bubble && (
        <Html center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{ position: 'relative', width: 0, height: 0 }}>
            <div key={bubble.id} className="speech">
              {bubble.text}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}
