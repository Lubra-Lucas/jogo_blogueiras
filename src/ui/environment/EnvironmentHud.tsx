import { useEnvStore, setFrozen, setHour, setWeather, setWeatherLocked } from '../../game/world/environment/envStore'
import { URL_ENV, WEATHERS, WEATHER_LABEL, type Weather } from '../../game/world/environment/config'
import './environment.css'

const hhmm = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`

/** Painel de testes de hora e clima (so com ?env=1). O relogio/clima na tela fica no celular do jogo (useEnvInfo). */
export function EnvironmentHud() {
  return URL_ENV.panel ? <DevPanel /> : null
}

function DevPanel() {
  const hour = useEnvStore((s) => s.hour)
  const weather = useEnvStore((s) => s.weather)
  const frozen = useEnvStore((s) => s.frozen)
  const locked = useEnvStore((s) => s.weatherLocked)
  return (
    <div className="env-dev">
      <b>Ambiente (teste)</b>
      <div>
        Hora {hhmm(hour)}
        <input type="range" min={0} max={24} step={0.05} value={hour} onChange={(e) => setHour(parseFloat(e.target.value))} />
      </div>
      <div className="env-dev__row">
        {[6, 12, 16.5, 18.5, 22].map((h) => (
          <button key={h} onClick={() => setHour(h)}>
            {hhmm(h)}
          </button>
        ))}
      </div>
      <div className="env-dev__row">
        {WEATHERS.map((w: Weather) => (
          <button key={w} data-on={weather === w ? 1 : 0} onClick={() => setWeather(w, true)}>
            {WEATHER_LABEL[w]}
          </button>
        ))}
      </div>
      <div className="env-dev__row">
        <button data-on={frozen ? 1 : 0} onClick={() => setFrozen(!frozen)}>
          {frozen ? 'Relogio parado' : 'Relogio correndo'}
        </button>
        <button data-on={locked ? 1 : 0} onClick={() => setWeatherLocked(!locked)}>
          {locked ? 'Clima fixo' : 'Clima sorteado'}
        </button>
      </div>
    </div>
  )
}
