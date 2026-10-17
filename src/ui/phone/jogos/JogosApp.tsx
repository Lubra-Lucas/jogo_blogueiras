import { useMemo, useState } from 'react'
import { useUiStore } from '../../../state/uiStore'
import { useTravelStore } from '../../../game/travel/travelStore'
import { DESTINATIONS } from '../../../game/travel/destinations'
import { usePetStore } from '../../../game/pets/petStore'
import { useShopStore } from '../../shop/shopStore'
import { fastTravelTo } from '../../navBridge'
import { GBolt, GPin } from '../../glyphs'
import { dismissPhone } from '../phoneMin'
import { getMinigame, type MinigameCategory, type MinigameDef } from '../../minigames/registry'
import { CATEGORIES, bestOf, blockedReason, categoryId, categoryInfo, cityOf, iconOf, listGames, placeOf, playFromPhone, professionOf, useRecentGames } from './jogosLogic'

/** Viagem rapida ate a porta (mesmo fade das missoes). */
function goThere(d: MinigameDef) {
  const ui = useUiStore.getState()
  ui.closePhone()
  useUiStore.setState({ travelFade: ui.travelFade + 1 })
  window.setTimeout(() => fastTravelTo(d.poi), 380)
}

function GameCard({ d }: { d: MinigameDef }) {
  const here = useTravelStore((s) => s.cityId)
  const pet = usePetStore((s) => s.active)
  const cat = categoryInfo(d)
  const Ic = iconOf(d)
  const best = bestOf(d)
  const prof = professionOf(d)
  const city = cityOf(d)
  const inCity = here === city
  const cityName = DESTINATIONS.find((x) => x.id === city)?.name ?? city
  const block = blockedReason(d, !!pet)
  return (
    <div className="pjg" data-game={d.id} style={{ ['--c' as string]: cat.color }}>
      <div className="pjg__top">
        <span className="pjg__ic">
          <Ic />
        </span>
        <div className="pjg__txt">
          <h3>{d.label}</h3>
          <small>
            <GPin /> {placeOf(d)}
          </small>
        </div>
      </div>
      {d.description && <p>{d.description}</p>}
      <div className="pq__rew">
        <span className="ptag pjg__cat">{cat.label}</span>
        {prof && (
          <span className="ptag">
            {prof.name} nv {prof.level}
          </span>
        )}
        <span className="ptag">{best ? `Recorde ${best.toLocaleString('pt-BR')}` : 'Sem recorde'}</span>
        {d.onSiteOnly && <span className="ptag">Só no local</span>}
        {!inCity && <span className="ptag">{cityName}</span>}
      </div>
      <div className="pq__act">
        {block === 'pet' ? (
          <button
            type="button"
            className="pbtn pbtn--pri"
            onClick={() => {
              dismissPhone()
              useShopStore.getState().openShop('petshop')
            }}
          >
            Precisa de um pet · Loja
          </button>
        ) : (
          <button type="button" className="pbtn pbtn--pri" disabled={block !== null} onClick={() => playFromPhone(d.id)}>
            Jogar agora
          </button>
        )}
        {inCity ? (
          <button type="button" className="pbtn" onClick={() => goThere(d)}>
            <GBolt /> Ir até lá
          </button>
        ) : (
          <button
            type="button"
            className="pbtn"
            onClick={() => {
              useUiStore.getState().closePhone()
              useTravelStore.getState().setPanel(true)
            }}
          >
            <GBolt /> Viagens
          </button>
        )}
      </div>
    </div>
  )
}

/** Conteudo do app Jogos: todos os minijogos do registro, com filtro e "Jogue de novo". */
export function JogosApp() {
  const [filter, setFilter] = useState<MinigameCategory | 'todos'>('todos')
  const recent = useRecentGames((s) => s.ids)
  const pet = usePetStore((s) => s.active)
  const all = useMemo(listGames, [])
  const cats = CATEGORIES.filter((c) => all.some((g) => categoryId(g) === c.id))
  const shown = all.filter((g) => filter === 'todos' || categoryId(g) === filter)
  const again = recent
    .map(getMinigame)
    .filter((g): g is MinigameDef => !!g && g.id !== 'viagem')
    .slice(0, 4)
  return (
    <>
      {again.length > 0 && (
        <section className="pjg-again" aria-label="Jogue de novo">
          <h4>Jogue de novo</h4>
          <div className="pjg-again__row">
            {again.map((g) => {
              const Ic = iconOf(g)
              return (
                <button key={g.id} type="button" className="pjg-chip" style={{ ['--c' as string]: categoryInfo(g).color }} disabled={blockedReason(g, !!pet) !== null} onClick={() => playFromPhone(g.id)}>
                  <span className="pjg__ic">
                    <Ic />
                  </span>
                  <b>{g.label}</b>
                </button>
              )
            })}
          </div>
        </section>
      )}
      <div className="pjg-filters" role="tablist" aria-label="Categorias">
        {[{ id: 'todos' as const, label: 'Todos' }, ...cats].map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={filter === c.id} className="pjg-f" onClick={() => setFilter(c.id)}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="pjg-list">
        {shown.map((g) => (
          <GameCard key={g.id} d={g} />
        ))}
      </div>
    </>
  )
}
