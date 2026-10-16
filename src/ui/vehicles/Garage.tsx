import { useEffect } from 'react'
import { BODY_COLORS, CARS, RIM_COLORS, carBySlug } from '../../game/vehicles/catalog'
import { ownedSlugs, paintOf, useVehicleStore } from '../../game/vehicles/driveStore'
import { callCar } from '../../game/vehicles/spawn'
import { useProfileStore } from '../../state/profileStore'
import { CarSilhouette } from './CarArt'

const RARITY: Record<string, string> = { comum: 'Comum', raro: 'Raro', epico: 'Épico', lendario: 'Lendário' }

const fmt = (n: number) => n.toLocaleString('pt-BR')

function Bar({ label, v }: { label: string; v: number }) {
  return (
    <div className="gar-bar">
      <span>{label}</span>
      <i>
        <b style={{ width: `${v * 10}%` }} />
      </i>
    </div>
  )
}

/** Garagem: escolha o carro, a cor e as rodas; "Chamar carro" faz ele aparecer na pista mais perto. */
export function Garage() {
  const open = useVehicleStore((s) => s.garageOpen)
  const selected = useVehicleStore((s) => s.selected)
  const paint = useVehicleStore((s) => s.paint)
  const cars = useVehicleStore((s) => s.cars)
  const owned = useProfileStore((s) => s.owned)
  const mine = cars.find((c) => c.kind === 'mine')
  const own = ownedSlugs(owned)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyK') {
        e.stopPropagation()
        useVehicleStore.getState().setGarage(false)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open])

  if (!open) return null
  const spec = carBySlug(selected)
  const p = paintOf(selected, paint)
  const isOwned = own.includes(selected)
  const st = useVehicleStore.getState()

  const call = () => {
    if (!isOwned) return
    if (callCar()) st.setGarage(false)
    else useVehicleStore.setState({ garageOpen: true })
  }
  const stow = () => {
    st.setCars(st.cars.filter((c) => c.kind !== 'mine'))
  }
  const choose = (slug: string) => {
    st.select(slug)
    // trocou de modelo com o carro chamado: troca na hora, no mesmo lugar
    if (mine && mine.slug !== slug && own.includes(slug) && !st.drivingUid) {
      const pp = paintOf(slug, useVehicleStore.getState().paint)
      st.setCars(st.cars.map((c) => (c.kind === 'mine' ? { ...c, slug, body: pp.body, rim: pp.rim } : c)))
    }
  }

  return (
    <div className="gar" role="dialog" aria-label="Garagem" onClick={() => st.setGarage(false)}>
      <div className="gar-panel glass" onClick={(e) => e.stopPropagation()}>
        <div className="gar-head">
          <h2>Garagem</h2>
          <button type="button" className="gar-x" aria-label="Fechar garagem" onClick={() => st.setGarage(false)}>
            ×
          </button>
        </div>
        <div className="gar-main">
          <div className="gar-view">
            <CarSilhouette slug={selected} body={p.body} rim={p.rim} width={300} />
            <div className="gar-name">
              <b>{spec.nome}</b>
              <span className={`gar-rar gar-rar--${spec.raridade}`}>{RARITY[spec.raridade]}</span>
            </div>
            <p className="gar-desc">{spec.descricao}</p>
            <Bar label="Velocidade" v={spec.stats.velocidade} />
            <Bar label="Aceleração" v={spec.stats.aceleracao} />
            <Bar label="Controle" v={spec.stats.controle} />
          </div>
          <div className="gar-side">
            <div className="gar-lbl">Cor da carroceria</div>
            <div className="gar-sw">
              {BODY_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`gar-dot${p.body.toLowerCase() === c.hex ? ' on' : ''}`}
                  style={{ background: c.hex }}
                  title={c.nome}
                  aria-label={c.nome}
                  onClick={() => st.setPaint(selected, { body: c.hex })}
                />
              ))}
            </div>
            <div className="gar-lbl">Rodas</div>
            <div className="gar-sw">
              {RIM_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`gar-dot${p.rim.toLowerCase() === c.hex ? ' on' : ''}`}
                  style={{ background: c.hex }}
                  title={c.nome}
                  aria-label={c.nome}
                  onClick={() => st.setPaint(selected, { rim: c.hex })}
                />
              ))}
            </div>
            <div className="gar-act">
              <button type="button" className="gar-btn gar-btn--pri" disabled={!isOwned || !!st.drivingUid} onClick={call}>
                {mine ? 'Chamar de novo' : 'Chamar carro'}
              </button>
              {mine && (
                <button type="button" className="gar-btn" disabled={!!st.drivingUid} onClick={stow}>
                  Guardar
                </button>
              )}
            </div>
            {!isOwned && <div className="gar-note">Este carro ainda não é seu. Compre na Concessionária pelo app Loja do celular.</div>}
          </div>
        </div>
        <div className="gar-list">
          {CARS.map((c) => {
            const have = own.includes(c.slug)
            const pp = paintOf(c.slug, paint)
            return (
              <button key={c.id} type="button" className={`gar-card${c.slug === selected ? ' on' : ''}${have ? '' : ' lock'}`} onClick={() => choose(c.slug)}>
                <CarSilhouette slug={c.slug} body={pp.body} rim={pp.rim} width={96} />
                <b>{c.nome}</b>
                <small>{have ? 'No seu nome' : c.precoBrilhos ? `${fmt(c.precoBrilhos)} Brilhos` : c.precoDiamantes ? `${fmt(c.precoDiamantes)} Diamantes` : 'Em breve'}</small>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
