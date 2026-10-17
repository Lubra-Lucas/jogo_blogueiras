import { useEffect, useState } from 'react'
import { useDeviceStore } from '../game/systems/device'
import { loadJson, saveJson } from '../shared/storage'
import { useProfileStore } from '../state/profileStore'
import { QUESTS } from '../state/quests'
import { AreaInfo } from './AreaInfo'
import { Minimap } from './Minimap'
import { PlayerCard } from './PlayerCard'
import { ChatPanel } from './chat/ChatPanel'
import { GameToast } from './GameToast'
import './devBridge'
import './viewport'
import './uiPrefs'
import { QuestWatcher } from './QuestWatcher'
import { GStar } from './glyphs'

const HINT_KEY = 'jb.hint.v1'
const SHOW_STATS = (() => {
  const q = new URLSearchParams(window.location.search)
  return q.get('stats') === '1' || q.get('fps') === '1'
})()

function Fps() {
  const [fps, setFps] = useState(0)
  useEffect(() => {
    let frames = 0
    let last = performance.now()
    let raf = 0
    const loop = (now: number) => {
      frames++
      if (now - last >= 500) {
        setFps(Math.round((frames * 1000) / (now - last)))
        frames = 0
        last = now
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <div className="hud-fps">{fps} FPS</div>
}

/** Dica de controles: aparece uma unica vez (primeira visita), por alguns segundos. */
function FirstTimeTip() {
  const isTouch = useDeviceStore((s) => s.isTouch)
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (loadJson<boolean>(HINT_KEY)) return
    const a = window.setTimeout(() => setShow(true), 2500)
    const b = window.setTimeout(() => {
      setShow(false)
      saveJson(HINT_KEY, true)
    }, 11000)
    return () => {
      window.clearTimeout(a)
      window.clearTimeout(b)
    }
  }, [])
  if (!show) return null
  return (
    <div className="hud-tip glass" role="status">
      {isTouch ? 'Joystick para andar · arraste para girar a câmera · toque no chão para ir até lá' : 'WASD anda · Shift corre · clique no chão para ir até lá · P celular · G emotes · C menu'}
    </div>
  )
}

/** Missao acompanhada: uma linha discreta sob o minimapa. */
function TrackedQuest() {
  const id = useProfileStore((s) => s.tracked)
  const done = useProfileStore((s) => s.done)
  const q = id ? QUESTS.find((x) => x.id === id) : null
  if (!q || done.includes(q.id)) return null
  return (
    <div className="hud-track glass" title={q.desc}>
      <GStar width={12} height={12} />
      <span>{q.title}</span>
    </div>
  )
}

/** HUD essencial: cartao da jogadora, minimapa, chat. (Celular e emotes ficam no Dock, em App.) */
export function Hud() {
  return (
    <>
      {SHOW_STATS && <Fps />}
      <PlayerCard />
      <Minimap />
      <AreaInfo />
      <TrackedQuest />
      <ChatPanel />
      <GameToast />
      <FirstTimeTip />
      <QuestWatcher />
    </>
  )
}
