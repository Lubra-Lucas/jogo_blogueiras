import { CullCtx } from './cull'
import { Surfaces } from './Surfaces'
import { Buildings } from './Buildings'
import { Landmarks, Lamps, ShopLabels, Trees } from './Props'

/** Cidade inteira (blockout). Dados em ./layout.ts. */
export function City({ shadows, propDist, buildingDist }: { shadows: boolean; propDist: number; buildingDist: number }) {
  return (
    <CullCtx.Provider value={{ props: propDist, buildings: buildingDist }}>
      <group>
      <Surfaces shadows={shadows} />
      <Buildings shadows={shadows} />
      <Trees shadows={shadows} />
      <Lamps shadows={shadows} />
      <Landmarks shadows={shadows} />
      <ShopLabels />
      </group>
    </CullCtx.Provider>
  )
}
