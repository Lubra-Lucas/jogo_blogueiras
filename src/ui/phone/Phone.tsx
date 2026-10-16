import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useUiStore, type PhoneApp } from '../../state/uiStore'
import { useProfileStore, CURRENCY_NAME } from '../../state/profileStore'
import { usePhotoStore } from '../../state/photoStore'
import { QUESTS } from '../../state/quests'
import { useEnvStore } from '../../game/world/environment/envStore'
import { WEATHER_LABEL } from '../../game/world/environment/config'
import { fastTravelTo, navigateTo } from '../navBridge'
import { portraitCanvas, usePortraitStore } from '../PortraitCapture'
import { GBack, GBlogram, GCamera, GCheck, GCloud, GMap, GMercado, GMessages, GMissions, GMoon, GPin, GProfile, GRain, GSettings, GStar, GSun, GWardrobe, GBolt, GClose } from '../glyphs'
import { PhoneShop } from '../shop/PhoneShop'
import { GCar } from '../vehicles/CarArt'
import { useVehicleStore } from '../../game/vehicles/driveStore'
import { openMarket } from '../market/marketUi'
import { IconTag } from '../shop/icons'
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
                <button type="button" className="pbtn" onClick={() => travel(q.poi)}>
                  <GBolt /> Viagem rápida
                </button>
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

/** Celular: desliza de baixo; P abre/fecha, Esc fecha. Mostra hora e clima do jogo (somente leitura). */
export function Phone() {
  const open = useUiStore((s) => s.phoneOpen)
  const app = useUiStore((s) => s.phoneApp)
  const [mounted, setMounted] = useState(false)
  const [out, setOut] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      setOut(false)
      return
    }
    setOut(true)
    const t = window.setTimeout(() => setMounted(false), 220)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ui = useUiStore.getState()
      if (e.code === 'Escape') {
        if (ui.phoneOpen) ui.closePhone()
        else if (ui.cameraMode) ui.setCameraMode(false)
      } else if (e.code === 'KeyP' && !e.repeat && !e.ctrlKey && !e.metaKey && !isTyping(e.target) && !ui.menuOpen) {
        ui.phoneOpen ? ui.closePhone() : ui.openPhone()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!mounted) return null
  const screens: Record<PhoneApp, ReactNode> = { home: <Home />, missoes: <Missions />, blogram: <Blogram />, mensagens: <Messages />, loja: <Shop /> }
  return (
    <div className={`phone-wrap${out ? ' phone-wrap--out' : ''}`} role="dialog" aria-label="Celular">
      <div className="phone">
        <div className="phone__screen">
          <div className="phone__notch" />
          <StatusBar />
          {screens[app]}
        </div>
      </div>
    </div>
  )
}

/** Viewfinder da camera do celular: o botao tira a foto da tela e salva no Blogram. */
export function CameraOverlay() {
  const on = useUiStore((s) => s.cameraMode)
  const flash = usePhotoStore((s) => s.flash)
  const [tip, setTip] = useState('Enquadre e toque no obturador')
  useEffect(() => {
    if (flash > 0) setTip('Foto salva no Blogram')
  }, [flash])
  useEffect(() => {
    if (on) setTip('Enquadre e toque no obturador')
  }, [on])
  if (!on) return null
  return (
    <div className="cam">
      <span className="cam__c cam__c--tl" />
      <span className="cam__c cam__c--tr" />
      <span className="cam__c cam__c--bl" />
      <span className="cam__c cam__c--br" />
      <div className="cam__tip">{tip}</div>
      {flash > 0 && <div key={flash} className="cam__flash" />}
      <div className="cam__bar">
        <button type="button" className="cam__x" aria-label="Fechar câmera" onClick={() => useUiStore.getState().setCameraMode(false)}>
          <GClose />
        </button>
        <button type="button" className="cam__shutter" aria-label="Tirar foto" onClick={() => usePhotoStore.getState().shoot()} />
        <span style={{ width: 44 }} />
      </div>
    </div>
  )
}

export function TravelFade() {
  const n = useUiStore((s) => s.travelFade)
  if (n === 0) return null
  return <div key={n} className="travel-fade" />
}

