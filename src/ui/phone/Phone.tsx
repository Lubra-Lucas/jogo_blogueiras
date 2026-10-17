import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useUiStore, type PhoneApp } from '../../state/uiStore'
import { useProfileStore, CURRENCY_NAME } from '../../state/profileStore'
import { usePhotoStore } from '../../state/photoStore'
import { QUESTS } from '../../state/quests'
import { useEnvStore } from '../../game/world/environment/envStore'
import { WEATHER_LABEL } from '../../game/world/environment/config'
import { fastTravelTo, navigateTo } from '../navBridge'
import { portraitCanvas, usePortraitStore } from '../PortraitCapture'
import { GBack, GBlogram, GCamera, GCheck, GCloud, GMap, GMercado, GMessages, GMissions, GMoon, GPin, GProfile, GRain, GSettings, GStar, GSun, GWardrobe, GBolt, GClose, GMinimize, GRestore, GFlipCam, GZoomIn, GZoomOut } from '../glyphs'
import { dismissPhone, minimizePhone, restorePhone, usePhoneMin } from './phoneMin'
import { SELFIE_POSES, useSelfieStore } from '../selfie/selfieStore'
import { playEmote, stopEmote } from '../../game/character/animation/emoteStore'
import { PhoneShop } from '../shop/PhoneShop'
import { GCar } from '../vehicles/CarArt'
import { useVehicleStore } from '../../game/vehicles/driveStore'
import { openMarket } from '../market/marketUi'
import { IconTag } from '../shop/icons'
import { IPlane } from '../travel/icons'
import { useTravelStore } from '../../game/travel/travelStore'
import '../shop/shop.css'
import '../phone/phone.css'

const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
const hhmm = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`

function WeatherGlyph() {
  const hour = useEnvStore((s) => s.hour)
  const weather = useEnvStore((s) => s.weather)
  if (weather === 'chuva' || weather === 'garoa') return <GRain />
  if (weather === 'nublado') return <GCloud />
  return hour >= 19.5 || hour < 5.5 ? <GMoon /> : <GSun />
}

/** Dispara a viagem rapida com uma transicao curta (fade) e fecha o celular. */
function travel(poi: string) {
  const ui = useUiStore.getState()
  ui.closePhone()
  useUiStore.setState({ travelFade: ui.travelFade + 1 })
  window.setTimeout(() => fastTravelTo(poi), 380)
}

function StatusBar() {
  const hour = useEnvStore((s) => s.hour)
  return (
    <div className="pstatus">
      <span>{hhmm(hour)}</span>
      <span className="pstatus__r">
        <WeatherGlyph />
        <i className="pbatt" />
        <button type="button" className="pmin" aria-label="Minimizar celular" title="Minimizar" onClick={minimizePhone}>
          <GMinimize />
        </button>
      </span>
    </div>
  )
}

const APPS: Array<{ id: string; label: string; color: string; icon: ReactNode; run: () => void }> = [
  { id: 'missoes', label: 'Missões', color: '#d99a2b', icon: <GMissions />, run: () => useUiStore.getState().setPhoneApp('missoes') },
  { id: 'blogram', label: 'Blogram', color: '#d9789f', icon: <GBlogram />, run: () => (usePhotoStore.getState().reload(), useUiStore.getState().setPhoneApp('blogram')) },
  { id: 'mensagens', label: 'Mensagens', color: '#3a9f8a', icon: <GMessages />, run: () => useUiStore.getState().setPhoneApp('mensagens') },
  { id: 'loja', label: 'Loja', color: '#2f7f86', icon: <IconTag />, run: () => useUiStore.getState().setPhoneApp('loja') },
  { id: 'mercado', label: 'Mercado', color: '#b8892f', icon: <GMercado />, run: () => (useUiStore.getState().closePhone(), openMarket()) },
  { id: 'garagem', label: 'Garagem', color: '#4a6a8a', icon: <GCar />, run: () => (useUiStore.getState().closePhone(), useVehicleStore.getState().setGarage(true)) },
  { id: 'mapa', label: 'Mapa', color: '#4b8fcf', icon: <GMap />, run: () => (useUiStore.getState().closePhone(), useUiStore.getState().setBigMap(true)) },
  { id: 'viagens', label: 'Viagens', color: '#2f8fa8', icon: <IPlane />, run: () => (useUiStore.getState().closePhone(), useTravelStore.getState().setPanel(true)) },
  { id: 'camera', label: 'Câmera', color: '#4a3a56', icon: <GCamera />, run: () => useUiStore.getState().setCameraMode(true) },
  { id: 'guarda', label: 'Guarda-roupa', color: '#7d63b0', icon: <GWardrobe />, run: () => useUiStore.getState().openMenu('guardaroupa') },
  { id: 'perfil', label: 'Perfil', color: '#c4688a', icon: <GProfile />, run: () => useUiStore.getState().openMenu('perfil') },
  { id: 'ajustes', label: 'Ajustes', color: '#7a8794', icon: <GSettings />, run: () => useUiStore.getState().openMenu('config') },
]

function Home() {
  const hour = useEnvStore((s) => s.hour)
  const weather = useEnvStore((s) => s.weather)
  return (
    <div className="phome">
      <div className="pclock">
        <b>{hhmm(hour)}</b>
        <span>{WEATHER_LABEL[weather]}</span>
      </div>
      <div className="papps">
        {APPS.map((a) => (
          <button key={a.id} type="button" className="papp" style={{ ['--c' as string]: a.color }} onClick={a.run}>
            <span className="papp__ic">{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>
      <div className="phome__bar" />
    </div>
  )
}

function AppFrame({ title, children }: { title: string; children: ReactNode }) {
  const setApp = useUiStore((s) => s.setPhoneApp)
  return (
    <div className="papp-view">
      <div className="papp-head">
        <button type="button" className="pbtn-ic" aria-label="Voltar" onClick={() => setApp('home')}>
          <GBack />
        </button>
        <h2>{title}</h2>
      </div>
      <div className="papp-body">{children}</div>
    </div>
  )
}

function Missions() {
  const done = useProfileStore((s) => s.done)
  const tracked = useProfileStore((s) => s.tracked)
  const track = useProfileStore((s) => s.track)
  // os POIs das missoes sao da cidade principal: fora dela (ex.: Miami) a viagem rapida nao faria nada
  const inMain = useTravelStore((s) => s.cityId === 'main')
  const go = (poi: string) => {
    useUiStore.getState().closePhone()
    void navigateTo(poi)
  }
  return (
    <AppFrame title="Missões">
      {QUESTS.map((q) => {
        const ok = done.includes(q.id)
        return (
          <div key={q.id} className={`pq${ok ? ' pq--done' : ''}`}>
            <div className="pq__top">
              <h3>{q.title}</h3>
              {!ok && (
                <button type="button" className="pstar" aria-pressed={tracked === q.id} aria-label="Acompanhar missão" title="Acompanhar" onClick={() => track(tracked === q.id ? null : q.id)}>
                  <GStar />
                </button>
              )}
            </div>
            <p>{q.desc}</p>
            <div className="pq__rew">
              <span className="ptag">+{q.xp} XP</span>
              <span className="ptag">
                +{q.coins} {CURRENCY_NAME}
              </span>
              {ok && (
                <span className="ptag ptag--ok">
                  <GCheck width={11} height={11} /> Concluída
                </span>
              )}
            </div>
            {!ok && (
              <div className="pq__act">
                <button type="button" className="pbtn pbtn--pri" onClick={() => go(q.poi)}>
                  <GPin /> Ir até lá
                </button>
                {inMain && (
                  <button type="button" className="pbtn" onClick={() => travel(q.poi)}>
                    <GBolt /> Viagem rápida
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </AppFrame>
  )
}

function Avatar() {
  const cv = useRef<HTMLCanvasElement>(null)
  const version = usePortraitStore((s) => s.version)
  useEffect(() => {
    const ctx = cv.current?.getContext('2d')
    if (ctx && version > 0) ctx.drawImage(portraitCanvas, 0, 0, 128, 128)
  }, [version])
  return (
    <div className="pbg-av">
      <canvas ref={cv} width={128} height={128} />
    </div>
  )
}

function Blogram() {
  const name = useProfileStore((s) => s.name)
  const level = useProfileStore((s) => s.level)
  const photos = usePhotoStore((s) => s.photos)
  return (
    <AppFrame title="Blogram">
      <div className="pbg-head">
        <Avatar />
        <div>
          <div style={{ font: '800 15px var(--f-sans)' }}>{name}</div>
          <div className="pbg-stats">
            <span>
              <b>{photos.length}</b>fotos
            </span>
            <span>
              <b>{level}</b>nível
            </span>
          </div>
        </div>
      </div>
      {photos.length === 0 ? (
        <div className="pempty">
          <GCamera />
          <div>Nenhuma foto ainda. Abra a Câmera e registre seus passeios.</div>
        </div>
      ) : (
        <div className="pgrid">
          {photos.map((p) => (
            <img key={p.id} src={p.thumb} alt={p.title} loading="lazy" />
          ))}
        </div>
      )}
    </AppFrame>
  )
}

const FRIENDS: Array<[string, string, string]> = [
  ['Mimi', '#d9789f', 'Online'],
  ['Duda', '#7d63b0', 'Online'],
  ['Cacau', '#3a9f8a', 'Ausente'],
  ['Bia Glam', '#d99a2b', 'Ausente'],
]

function Messages() {
  return (
    <AppFrame title="Mensagens">
      <button
        type="button"
        className="pbtn pbtn--pri"
        style={{ width: '100%', marginBottom: 10 }}
        onClick={() => {
          useUiStore.getState().closePhone()
          useUiStore.getState().setChatOpen(true)
        }}
      >
        <GMessages /> Abrir o chat da cidade
      </button>
      {FRIENDS.map(([n, c, st]) => (
        <div className="prow" key={n}>
          <span className="pavatar" style={{ ['--c' as string]: c }}>
            {n[0]}
          </span>
          <span>
            {n}
            <small>{st}</small>
          </span>
          {st === 'Online' && <span className="pdot" />}
        </div>
      ))}
      <div className="pempty">Amizades e conversas privadas chegam em breve.</div>
    </AppFrame>
  )
}

function Shop() {
  return (
    <AppFrame title="Loja">
      <PhoneShop />
    </AppFrame>
  )
}

/** Abinha do celular minimizado: mostra o essencial (missao acompanhada ou hora) e restaura com um clique. */
function PhoneTab({ show }: { show: boolean }) {
  const tracked = useProfileStore((s) => s.tracked)
  const hour = useEnvStore((s) => s.hour)
  const q = QUESTS.find((x) => x.id === tracked)
  return (
    <button type="button" className={`phone-tab${show ? ' phone-tab--on' : ''}`} aria-label="Restaurar celular (P)" tabIndex={show ? 0 : -1} onClick={restorePhone}>
      <span className="phone-tab__ic">
        <GMissions />
        {q && <i className="dock__badge" />}
      </span>
      <span className="phone-tab__txt">
        <b>{q ? q.title : 'Celular'}</b>
        <small>{q ? 'Missão ativa' : hhmm(hour)}</small>
      </span>
      <GRestore className="phone-tab__up" />
    </button>
  )
}

/** Celular: desliza de baixo; P abre/fecha (minimizado: P restaura), Esc fecha. Minimizar guarda a tela atual e deixa so uma abinha. */
export function Phone() {
  const open = useUiStore((s) => s.phoneOpen)
  const app = useUiStore((s) => s.phoneApp)
  const min = usePhoneMin((s) => s.min)
  const hideTab = useUiStore((s) => s.menuOpen || s.cameraMode)
  const [mounted, setMounted] = useState(false)
  const [out, setOut] = useState(false)
  const active = open || min

  useEffect(() => {
    if (active) {
      setMounted(true)
      setOut(false)
      return
    }
    setOut(true)
    const t = window.setTimeout(() => setMounted(false), 220)
    return () => window.clearTimeout(t)
  }, [active])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ui = useUiStore.getState()
      const minimized = usePhoneMin.getState().min
      if (e.code === 'Escape') {
        if (ui.phoneOpen || minimized) dismissPhone()
        else if (ui.cameraMode) ui.setCameraMode(false)
      } else if (e.code === 'KeyP' && !e.repeat && !e.ctrlKey && !e.metaKey && !isTyping(e.target) && !ui.menuOpen) {
        if (minimized) restorePhone()
        else ui.phoneOpen ? ui.closePhone() : ui.openPhone()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!mounted) return null
  const screens: Record<PhoneApp, ReactNode> = { home: <Home />, missoes: <Missions />, blogram: <Blogram />, mensagens: <Messages />, loja: <Shop /> }
  return (
    <>
      <div className={`phone-wrap${out ? ' phone-wrap--out' : ''}${min ? ' phone-wrap--min' : ''}`} role="dialog" aria-label="Celular" aria-hidden={min}>
        <div className="phone">
          <div className="phone__screen">
            <div className="phone__notch" />
            <StatusBar />
            {screens[app]}
          </div>
        </div>
      </div>
      <PhoneTab show={min && !hideTab} />
    </>
  )
}

/** Viewfinder da camera do celular: traseira (foto normal) ou frontal (selfie); o botao tira a foto da tela e salva no Blogram. */
export function CameraOverlay() {
  const on = useUiStore((s) => s.cameraMode)
  const flash = usePhotoStore((s) => s.flash)
  const front = useSelfieStore((s) => s.front)
  const zoom = useSelfieStore((s) => s.zoom)
  const pose = useSelfieStore((s) => s.pose)
  const [tip, setTip] = useState('Enquadre e toque no obturador')
  useEffect(() => {
    if (flash > 0) setTip('Foto salva no Blogram')
  }, [flash])
  useEffect(() => {
    if (on) setTip(useSelfieStore.getState().front ? 'Selfie: o rosto no quadro' : 'Enquadre e toque no obturador')
  }, [on, front])
  // sai da camera: volta para a traseira e solta a pose da selfie
  useEffect(() => {
    if (on) return
    const sf = useSelfieStore.getState()
    if (sf.front || sf.pose !== 0) {
      useSelfieStore.setState({ front: false, pose: 0 })
      stopEmote()
    }
  }, [on])
  if (!on) return null
  const setZoom = useSelfieStore.getState().setZoom
  const choosePose = () => {
    useSelfieStore.getState().nextPose()
    const emote = SELFIE_POSES[useSelfieStore.getState().pose].emote
    if (emote) playEmote(emote, { once: true, silent: true })
    else stopEmote()
  }
  return (
    <div className="cam">
      <span className="cam__c cam__c--tl" />
      <span className="cam__c cam__c--tr" />
      <span className="cam__c cam__c--bl" />
      <span className="cam__c cam__c--br" />
      <div className="cam__tip">{tip}</div>
      {flash > 0 && <div key={flash} className="cam__flash" />}
      {front && (
        <div className="cam__tools">
          <button type="button" className="cam__t" aria-label="Afastar (mais busto)" onClick={() => setZoom(zoom + 0.2)}>
            <GZoomOut />
          </button>
          <button type="button" className="cam__t" aria-label="Aproximar (rosto)" onClick={() => setZoom(zoom - 0.2)}>
            <GZoomIn />
          </button>
          <button type="button" className="cam__t cam__t--pose" aria-label="Trocar pose" onClick={choosePose}>
            <GStar /> {SELFIE_POSES[pose].label}
          </button>
        </div>
      )}
      <div className="cam__bar">
        <button type="button" className="cam__x" aria-label="Fechar câmera" onClick={() => useUiStore.getState().setCameraMode(false)}>
          <GClose />
        </button>
        <button type="button" className="cam__shutter" aria-label="Tirar foto" onClick={() => usePhotoStore.getState().shoot()} />
        <button
          type="button"
          className="cam__x"
          aria-label={front ? 'Câmera traseira' : 'Câmera frontal (selfie)'}
          aria-pressed={front}
          onClick={() => {
            const sf = useSelfieStore.getState()
            sf.setFront(!sf.front)
            if (sf.front) {
              useSelfieStore.setState({ pose: 0 })
              stopEmote()
            }
          }}
        >
          <GFlipCam />
        </button>
      </div>
    </div>
  )
}

export function TravelFade() {
  const n = useUiStore((s) => s.travelFade)
  if (n === 0) return null
  return <div key={n} className="travel-fade" />
}

