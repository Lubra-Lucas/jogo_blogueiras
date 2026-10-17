import { lazy, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { CullCtx } from '../world/city/cull'
import { MiamiKitScene, type KitItem } from '../world/miami/kit'
import { setEnvHook } from '../world/environment/envState'
import { setLampProvider } from '../world/environment/lamps'
import { navBridge } from '../navigation/navStore'
import { invalidateGraph } from '../navigation/pathfinder'
import { MAIN_AIRPORT } from './airportSite'
import { activeWorld, arrivalOf } from './worlds'
import { useTravelStore } from './travelStore'
import { HOME_ID } from './destinations'
import { locateHook } from '../world/city/layout'

const MiamiCity = lazy(() => import('../world/miami/MiamiCity'))

/** avisa a viagem que a cidade (e seus modelos) terminou de montar: a transicao de volta so some depois disso */
function HomeReady() {
  useEffect(() => {
    useTravelStore.getState().markReady(HOME_ID)
  }, [])
  return null
}

/** Aeroporto da cidade principal: terminal Art Deco, balcao de check-in, escultura de aviao, palmeiras e postes. */
function mainAirportItems(): KitItem[] {
  const { cx, cz, rot } = MAIN_AIRPORT
  const out: KitItem[] = [
    { piece: 'airport_terminal', x: cx, z: cz, rot, pal: 'white' },
    { piece: 'checkin_counter', x: cx + 2.2, z: cz, rot, pal: 'mint' },
    { piece: 'sign_airport', x: cx + 11.0, z: cz, y: 9.55, rot, pal: 'white', collide: false, s: 1.25 },
    { piece: 'airplane_deco', x: cx + 26, z: cz - 34, rot: 0.55, pal: 'white', y: 2.5 },
  ]
  // via de acesso: postes e palmeiras dos dois lados (trecho norte-sul em x = -90 e trecho leste-oeste ate o terminal)
  for (let z = -14; z >= -118; z -= 26) out.push({ piece: 'lamp_deco', x: -84.6, z, rot: 0, pal: 'cream' }, { piece: 'lamp_deco', x: -95.4, z: z - 8, rot: 0, pal: 'cream' })
  for (let x = -100; x >= -134; x -= 12) {
    out.push({ piece: 'lamp_deco', x, z: cz - 5.5, rot: 0, pal: 'cream' }, { piece: 'lamp_deco', x: x - 6, z: cz + 5.5, rot: 0, pal: 'cream' })
    out.push({ piece: 'palm_royal', x: x - 3, z: cz - 6.6, rot: x, s: 0.95, pal: 'nat' }, { piece: 'palm_royal', x: x - 9, z: cz + 6.6, rot: x * 2, s: 0.95, pal: 'nat' })
  }
  for (const dz of [-12, -8, 8, 12]) out.push({ piece: dz % 8 === 0 ? 'palm_coconut' : 'palm_royal', x: cx + 14, z: cz + dz, rot: dz, s: 0.95, pal: 'nat' })
  return out
}

/**
 * Cidades do jogo: so UMA fica montada. `children` = a cidade principal (City); Miami (e as futuras) vem de componentes carregados
 * sob demanda. Tambem liga/desliga o preset de ambiente e os postes da cidade ativa e posiciona a jogadora se o jogo abre numa cidade nova.
 */
export function TravelWorlds({ shadows, propDist, buildingDist, children }: { shadows: boolean; propDist: number; buildingDist: number; children: ReactNode }) {
  const cityId = useTravelStore((s) => s.cityId)
  const items = useMemo(mainAirportItems, [])
  const first = useRef(true)

  useEffect(() => {
    const w = activeWorld()
    setEnvHook(w?.envHook ?? null)
    setLampProvider(w?.lamps ?? null)
    locateHook.fn = w ? (x, z) => w.locate(x, z) : null
    invalidateGraph()
    // o jogo abriu direto numa cidade nova (salvo / ?city=): espera o chao existir (senao a jogadora cai e renasce na cidade principal)
    let timer = 0
    if (first.current && cityId === HOME_ID) first.current = false
    if (first.current) {
      const t0 = performance.now()
      timer = window.setInterval(() => {
        if (useTravelStore.getState().ready[cityId] || performance.now() - t0 > 60000) {
          window.clearInterval(timer)
          first.current = false
          const a = arrivalOf(cityId)
          navBridge.teleport = { x: a.x, z: a.z, yaw: a.yaw }
        }
      }, 200)
    }
    return () => window.clearInterval(timer)
  }, [cityId])

  if (cityId === HOME_ID) {
    return (
      <>
        <Suspense fallback={null}>
          {children}
          <HomeReady />
        </Suspense>
        <CullCtx.Provider value={{ props: propDist, buildings: buildingDist }}>
          <Suspense fallback={null}>
            <MiamiKitScene items={items} shadows={shadows} cull="props" lod={40} chunk={70} pad={14} />
          </Suspense>
        </CullCtx.Provider>
      </>
    )
  }
  return (
    <Suspense fallback={null}>
      <MiamiCity shadows={shadows} propDist={propDist} buildingDist={buildingDist} />
    </Suspense>
  )
}
