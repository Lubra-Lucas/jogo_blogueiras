import { CullCtx } from './cull'
import { Surfaces } from './Surfaces'
import { Buildings } from './Buildings'
import { KitScene } from './kit'
import { CENTRO_BUILDINGS, CENTRO_PROPS } from './centro'
import { ROMANTIC_BIG, ROMANTIC_SMALL, ROMANTIC_WALK, SMALL_DIST } from './romantic'
import { Lago } from './Lago'
import { ParqueDeco } from './ParqueDeco'
import { Landmarks, Lamps, ShopLabels, Trees } from './Props'
import { NightLights } from '../environment/NightLights'

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
      <Trees shadows={shadows} />
      <Lamps shadows={shadows} />
      <Landmarks shadows={shadows} />
      <ShopLabels />
      <NightLights />
      </group>
    </CullCtx.Provider>
  )
}
