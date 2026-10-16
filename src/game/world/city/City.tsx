import { CullCtx } from './cull'
import { Surfaces } from './Surfaces'
import { Buildings } from './Buildings'
import { KitScene } from './kit'
import { CENTRO_BUILDINGS, CENTRO_PROPS } from './centro'
import { Landmarks, Lamps, ShopLabels, Trees } from './Props'

/** Cidade inteira (blockout). Dados em ./layout.ts. */
export function City({ shadows, propDist, buildingDist }: { shadows: boolean; propDist: number; buildingDist: number }) {
  return (
    <CullCtx.Provider value={{ props: propDist, buildings: buildingDist }}>
      <group>
      <Surfaces shadows={shadows} />
      <Buildings shadows={shadows} />
      <KitScene items={CENTRO_BUILDINGS} shadows={shadows} />
      <KitScene items={CENTRO_PROPS} shadows={shadows} cull="props" />
      <Trees shadows={shadows} />
      <Lamps shadows={shadows} />
      <Landmarks shadows={shadows} />
      <ShopLabels />
      </group>
    </CullCtx.Provider>
  )
}
