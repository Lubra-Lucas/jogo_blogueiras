import { CullCtx } from './cull'
import { Surfaces } from './Surfaces'
import { Buildings } from './Buildings'
import { KitScene } from './kit'
import { CENTRO_BUILDINGS, CENTRO_PROPS } from './centro'
import { ROMANTIC_BIG, ROMANTIC_SMALL, ROMANTIC_WALK, SMALL_DIST } from './romantic'
import { STREET_BIG, STREET_SMALL, STREET_WALK, STREET_SMALL_DIST } from './streetProps'
import { StreetPaint } from './StreetPaint'
import { Lago } from './Lago'
import { ParqueDeco } from './ParqueDeco'
import { Landmarks, Lamps, ShopLabels, Trees } from './Props'
import { NightLights } from '../environment/NightLights'

/** ?streetprops=0 desliga o mobiliario urbano; ?streetprops=paint,big,small,walk liga so essas partes (comparacao de desempenho). */
const SP = new URLSearchParams(window.location.search).get('streetprops')
const STREET_ON = (k: string) => SP === null || SP === '1' || SP.split(',').includes(k)

/** Cidade inteira (blockout). Dados em ./layout.ts. */
export function City({ shadows, propDist, buildingDist }: { shadows: boolean; propDist: number; buildingDist: number }) {
  return (
    <CullCtx.Provider value={{ props: propDist, buildings: buildingDist }}>
      <group>
      <Surfaces shadows={shadows} />
      <ParqueDeco shadows={shadows} />
      <Lago shadows={shadows} />
      <Buildings shadows={shadows} />
      <KitScene items={CENTRO_BUILDINGS} shadows={shadows} />
      <KitScene items={CENTRO_PROPS} shadows={shadows} cull="props" />
      {/* Jardim + Parque: massas (casas, Casa dos Sonhos, fonte, coreto) projetam sombra; detalhes e props pequenos nao, e somem a ~70 m */}
      <KitScene items={ROMANTIC_BIG} shadows={shadows} />
      <KitScene items={ROMANTIC_SMALL} shadows={shadows} cast={false} max={SMALL_DIST} />
      <KitScene items={ROMANTIC_WALK} shadows={shadows} walkable />
      {/* mobiliario urbano: massas projetam sombra; pequenos somem a ~78 m; varais a ~95 m */}
      {STREET_ON('paint') && <StreetPaint />}
      {STREET_ON('big') && <KitScene items={STREET_BIG} shadows={shadows} cast={false} max={90} chunk={80} pad={6} />}
      {STREET_ON('small') && <KitScene items={STREET_SMALL} shadows={shadows} cull="props" cast={false} max={STREET_SMALL_DIST} chunk={34} pad={2} />}
      {STREET_ON('walk') && <KitScene items={STREET_WALK} shadows={shadows} cull="props" cast={false} max={STREET_SMALL_DIST} chunk={80} pad={2} walkable />}
      <Trees shadows={shadows} />
      <Lamps shadows={shadows} />
      <Landmarks shadows={shadows} />
      <ShopLabels />
      <NightLights />
      </group>
    </CullCtx.Provider>
  )
}
