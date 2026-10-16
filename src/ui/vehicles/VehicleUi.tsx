import { useEffect, useState } from 'react'
import { drive, useVehicleStore } from '../../game/vehicles/driveStore'
import { enterCar, useCarFade } from '../../game/vehicles/enterExit'
import { STATIONS, vehicleAudio } from '../../game/vehicles/vehicleAudio'
import { resolveDestination } from '../../game/navigation/destinations'
import { useDeviceStore } from '../../game/systems/device'
import { useInteractionStore } from '../../game/interaction/interactionStore'
import { carBySlug } from '../../game/vehicles/catalog'
import { Garage } from './Garage'
import { TouchControls } from './TouchControls'
import './vehicles.css'

interface Snap {
  kmh: number
  gear: number
  rpm: number
  boost: number
  drift: number
  boosting: boolean
  gps: number | null
}

/** "Dirigir [F]" / botao no celular, perto de um carro. */
function DrivePrompt() {
  const uid = useVehicleStore((s) => s.nearbyUid)
  const driving = useVehicleStore((s) => s.drivingUid)
  const car = useVehicleStore((s) => s.cars.find((c) => c.uid === uid))
  const isTouch = useDeviceStore((s) => s.isTouch)
  const stacked = useInteractionStore((s) => s.nearby !== null)
  if (driving || !car) return null
  return (
    <div className={`car-prompt${stacked ? ' car-prompt--stacked' : ''}`} key={car.uid} role="status">
      <span className="car-prompt__name">{carBySlug(car.slug).nome}</span>
      {isTouch ? (
        <button
          type="button"
          className="car-prompt__btn"
          onClick={() => {
            enterCar(car.uid)
            vehicleAudio.door()
          }}
        >
          Dirigir
        </button>
      ) : (
        <span className="car-prompt__sub">
          <span className="car-key">F</span> Dirigir
        </span>
      )}
    </div>
  )
}

const GEAR = (g: number, kmh: number) => (g < 0 ? 'R' : kmh < 1 ? 'N' : String(g))

/** Velocimetro, nitro, derrapagem, radio e GPS. */
function Dashboard() {
  const isTouch = useDeviceStore((s) => s.isTouch)
  const station = useVehicleStore((s) => s.station)
  const gpsTo = useVehicleStore((s) => s.gpsTo)
  const gpsName = useVehicleStore((s) => s.gpsName)
  const [s, setS] = useState<Snap>({ kmh: 0, gear: 1, rpm: 0, boost: 1, drift: 0, boosting: false, gps: null })
  const [tip, setTip] = useState(true)

  useEffect(() => {
    const id = window.setInterval(() => {
      let gps: number | null = null
      if (gpsTo) {
        const d = resolveDestination(gpsTo)
        if (d) gps = Math.hypot(d.x - drive.pos.x, d.z - drive.pos.z)
      }
      setS({ kmh: Math.round(drive.kmh), gear: drive.gear, rpm: drive.rpm, boost: drive.boost, drift: drive.drift, boosting: drive.boosting, gps })
    }, 70)
    const t = window.setTimeout(() => setTip(false), 11000)
    return () => {
      window.clearInterval(id)
      window.clearTimeout(t)
    }
  }, [gpsTo])

  const R = 46
  const C = 2 * Math.PI * R
  const arc = 0.75 // 270 graus
  const rpmLen = C * arc * Math.min(1, s.rpm)
  const st = station > 0 ? STATIONS[station - 1] : null
  return (
    <>
      <div className={`car-dash glass${s.boosting ? ' boost' : ''}${isTouch ? ' car-dash--touch' : ''}`}>
        <svg viewBox="0 0 120 120" className="car-dash__arc" aria-hidden>
          <circle cx="60" cy="60" r={R} className="trk" strokeDasharray={`${C * arc} ${C}`} transform="rotate(135 60 60)" />
          <circle cx="60" cy="60" r={R} className={`val${s.rpm > 0.86 ? ' hot' : ''}`} strokeDasharray={`${rpmLen} ${C}`} transform="rotate(135 60 60)" />
        </svg>
        <div className="car-dash__n">
          <b>{s.kmh}</b>
          <small>km/h</small>
        </div>
        <div className="car-dash__gear">{GEAR(s.gear, s.kmh)}</div>
        <div className="car-dash__boost" title="Nitro">
          <i style={{ width: `${s.boost * 100}%` }} />
          <span>{s.boosting ? 'NITRO' : s.boost < 0.99 ? 'carregando' : 'nitro pronto'}</span>
        </div>
        {s.drift > 0.35 && <div className="car-dash__drift">Derrapando</div>}
      </div>
      {st && (
        <div className="car-radio glass" role="status">
          <span className="car-radio__eq" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <b>{st.name}</b>
          <small>{st.genre}</small>
        </div>
      )}
      {gpsTo && (
        <div className="car-gps glass" role="status">
          <b>{gpsName ?? 'Destino'}</b>
          <small>{s.gps !== null ? (s.gps >= 1000 ? `${(s.gps / 1000).toFixed(1)} km` : `${Math.round(s.gps)} m`) : ''}</small>
          <button type="button" onClick={() => useVehicleStore.getState().setGps(null)} aria-label="Cancelar GPS">
            ×
          </button>
        </div>
      )}
      {tip && !isTouch && (
        <div className="car-tip glass" role="note">
          <span><span className="car-key">W</span><span className="car-key">S</span> acelera / freia</span>
          <span><span className="car-key">A</span><span className="car-key">D</span> vira</span>
          <span><span className="car-key">Espaço</span> freio de mão (derrapa)</span>
          <span><span className="car-key">Shift</span> nitro</span>
          <span><span className="car-key">H</span> buzina · <span className="car-key">R</span> rádio · <span className="car-key">V</span> câmera</span>
          <span><span className="car-key">F</span> sair</span>
        </div>
      )}
    </>
  )
}

/** Fade branco rapido ao entrar/sair do carro. */
function CarFade() {
  const n = useCarFade((s) => s.n)
  if (n === 0) return null
  return <div key={n} className="car-fade" />
}

/** Interface dos veiculos: aviso, painel, controles de toque, garagem. */
export function VehicleUi() {
  const driving = useVehicleStore((s) => s.drivingUid !== null)
  const isTouch = useDeviceStore((s) => s.isTouch)
  return (
    <>
      <DrivePrompt />
      {driving && <Dashboard />}
      {driving && isTouch && <TouchControls />}
      <Garage />
      <CarFade />
    </>
  )
}
