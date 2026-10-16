import { useEffect, useMemo, useState } from 'react'
import { getDestination } from '../../game/travel/destinations'
import { skipFlight } from '../../game/travel/actions'
import { useTravelStore } from '../../game/travel/travelStore'
import { IPlane } from './icons'
import './travel.css'

/** nuvens determinísticas: posicao, tamanho, camada de profundidade (parallax) e velocidade */
function useClouds() {
  return useMemo(() => {
    let s = 4242
    const r = () => {
      s = (s * 16807) % 2147483647
      return s / 2147483647
    }
    return Array.from({ length: 16 }, (_, i) => {
      const layer = i % 3 // 0 = longe, 2 = perto
      return {
        top: 8 + r() * 78,
        left: -30 + r() * 150,
        w: 22 + layer * 16 + r() * 18,
        h: 7 + layer * 4 + r() * 5,
        dur: 16 - layer * 4.2 + r() * 3,
        delay: -r() * 14,
        o: 0.55 + layer * 0.2,
        blur: 3 - layer * 0.8,
      }
    })
  }, [])
}

/**
 * Cena da janela do aviao (3-6 s, pulavel): ceu do destino, nuvens em parallax, asa com luz piscando e, no fim, a costa
 * (mar turquesa e praia) ou a cidade subindo. Tudo CSS (continua suave mesmo quando o jogo carrega a cidade por tras).
 * Depois da troca de cidade a cena fica ate o mundo novo montar e entao some em fade.
 */
export function FlightOverlay() {
  const flight = useTravelStore((s) => s.flight)
  const clouds = useClouds()
  const [shade, setShade] = useState(false)
  useEffect(() => {
    if (!flight) {
      setShade(false)
      return
    }
    const t = window.setTimeout(() => setShade(true), 60)
    return () => window.clearTimeout(t)
  }, [flight])

  if (!flight) return null
  const to = getDestination(flight.to)
  const from = getDestination(flight.from)
  if (!to) return null
  const land = flight.stage !== 'flying'
  const dur = flight.skip ? 1.2 : flight.seconds
  const style = {
    ['--sky0' as string]: to.sky[0],
    ['--sky1' as string]: to.sky[1],
    ['--sky2' as string]: to.sky[2],
    ['--dur' as string]: `${dur}s`,
  }
  return (
    <div className={`fl-root fl-${flight.stage}${flight.skip ? ' fl-skip' : ''}`} style={style} role="status" aria-live="polite">
      <div className="fl-cabin">
        <div className="fl-window">
          <div className="fl-view">
            <div className={`fl-sky${land ? ' fl-sky--land' : ''}`} />
            <div className="fl-sun" />
            {clouds.map((c, i) => (
              <i
                key={i}
                className="fl-cloud"
                style={{ top: `${c.top}%`, left: `${c.left}%`, width: `${c.w}%`, height: `${c.h}%`, opacity: c.o, filter: `blur(${c.blur}px)`, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}
              />
            ))}
            <div className={`fl-ground fl-ground--${to.approach}`}>
              <i className="fl-ground__shore" />
              <i className="fl-ground__glint" />
            </div>
            <svg className="fl-wing" viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden>
              <defs>
                <linearGradient id="flw" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#f4f1ea" />
                  <stop offset="1" stopColor="#b9b4ab" />
                </linearGradient>
              </defs>
              <path d="M-10 200 L120 78 C190 40 300 22 430 16 L430 30 C310 48 240 80 200 200 Z" fill="url(#flw)" />
              <path d="M120 78 C190 40 300 22 430 16" stroke="#fff" strokeWidth="2.4" fill="none" opacity="0.8" />
            </svg>
            <i className="fl-beacon" />
            <div className="fl-glass" />
          </div>
          <div className={`fl-shade${shade ? ' fl-shade--open' : ''}`} />
        </div>
        <div className="fl-seat" aria-hidden />
      </div>

      <div className="fl-caption">
        <span className="fl-caption__ic">
          <IPlane width={20} height={20} />
        </span>
        <div>
          <b>{land ? `Pousando em ${to.name}` : `Voo para ${to.name}`}</b>
          <small>{land ? 'Quase lá...' : from ? `Saindo de ${from.name}` : 'Boa viagem!'}</small>
        </div>
      </div>
      <div className="fl-bar" aria-hidden>
        <i style={{ animationDuration: `${dur}s` }} className={land ? 'fl-bar--full' : ''} />
      </div>
      {!land && (
        <button type="button" className="fl-skipbtn" onClick={skipFlight}>
          Pular
        </button>
      )}
    </div>
  )
}
