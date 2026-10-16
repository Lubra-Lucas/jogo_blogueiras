import { Suspense, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { CullCtx } from '../city/cull'
import { NightLights } from '../environment/NightLights'
import { env } from '../environment/envState'
import { usePlayerStore } from '../../../state/playerStore'
import { useTravelStore } from '../../travel/travelStore'
import { worldMods } from '../../travel/worldMods'
import { MiamiGround } from './Ground'
import { MiamiSea } from './Sea'
import { BeachFx } from './Fx'
import { MiamiNpcs } from './Npcs'
import { MiamiKitScene, MiamiWind, type KitItem } from './kit'
import { MIAMI, SEA } from './layout'
import { armSea, stopSea, updateSea } from './seaSound'

/** Itens de kit dos predios (cada predio + a placa neon sobre a porta, se tiver) */
function buildingItems(): { bld: KitItem[]; signs: KitItem[] } {
  const bld: KitItem[] = []
  const signs: KitItem[] = []
  for (const b of MIAMI.buildings) {
    bld.push({ piece: b.piece, x: b.x, z: b.z, rot: b.rot, s: b.s, pal: b.pal })
    if (b.sign) {
      // a placa fica na fachada, sobre a porta: desloca (frente + 0,3) para a frente do predio e sobe a altura da marquise
      const fx = Math.sin(b.rot)
      const fz = Math.cos(b.rot)
      const off = b.d / 2 + 0.5 * b.s
      const y = b.piece === 'deco_shop' ? 5.6 * b.s : b.piece === 'deco_hotel_a' ? 5.0 * b.s : 4.6 * b.s
      signs.push({ piece: b.sign, x: b.x + fx * off, z: b.z + fz * off, y, rot: b.rot, s: 0.95 * b.s, pal: 'white', collide: false })
    }
  }
  return { bld, signs }
}

/** quando todos os GLBs do kit estiverem prontos, avisa a viagem (a transicao so termina depois disso) */
function ReadyProbe() {
  useEffect(() => {
    useTravelStore.getState().markReady('miami')
  }, [])
  return null
}

function MiamiAudio() {
  useEffect(() => {
    armSea()
    return () => stopSea()
  }, [])
  useFrame((_, dt) => {
    const p = usePlayerStore.getState().position
    // proximidade do mar: 1 na beira, cai ate 0 a 90 m
    const near = Math.max(0, Math.min(1, 1 - (SEA.shoreX - p.x) / 90))
    updateSea(near * near, env.day, Math.min(dt, 0.1))
  })
  return null
}

/** Miami Beach inteira. Dados em ./layout.ts, pecas em tools/blender/miami_kit.py -> public/assets/miami/kit. */
export default function MiamiCity({ shadows, propDist, buildingDist }: { shadows: boolean; propDist: number; buildingDist: number }) {
  const { bld, signs } = useMemo(buildingItems, [])
  const pier = useMemo(() => MIAMI.items.filter((i) => i.piece.startsWith('pier_')), [])
  const BIG = ['airport_terminal', 'airplane_deco', 'checkin_counter', 'sign_airport', 'sign_miami']
  const big = useMemo(() => MIAMI.items.filter((i) => BIG.includes(i.piece)), [])
  const props = useMemo(() => MIAMI.items.filter((i) => !i.piece.startsWith('pier_') && !BIG.includes(i.piece)), [])
  useEffect(
    () => () => {
      worldMods.speedMul = 1
      worldMods.wet = 0
    },
    [],
  )
  return (
    <CullCtx.Provider value={{ props: propDist, buildings: buildingDist }}>
      <group>
        <MiamiGround shadows={shadows} />
        <MiamiSea />
        <MiamiWind />
        <BeachFx />
        <MiamiAudio />
        <Suspense fallback={null}>
          {/* predios Art Deco: massas projetam sombra; troca para a versao leve alem de 60 m */}
          <MiamiKitScene items={bld} shadows={shadows} lod={60} chunk={56} />
          <MiamiKitScene items={big} shadows={shadows} lod={90} chunk={80} pad={30} />
          <MiamiKitScene items={signs} shadows={shadows} cast={false} cull="props" max={120} chunk={60} pad={5} />
          {/* palmeiras, torres de salva-vidas, pier, aeroporto (props grandes) */}
          <MiamiKitScene items={props} shadows={shadows} cull="props" lod={26} chunk={60} pad={8} />
          <MiamiKitScene items={pier} shadows={shadows} cull="props" lod={70} chunk={80} pad={8} walkable />
          {/* mobiliario pequeno (guarda-sois, bancos, postes...): somem cedo */}
          <MiamiKitScene items={MIAMI.small} shadows={shadows} cull="props" cast={false} max={78} chunk={44} pad={4} />
          <NightLights />
          <ReadyProbe />
        </Suspense>
        <Suspense fallback={null}>
          <MiamiNpcs />
        </Suspense>
      </group>
    </CullCtx.Provider>
  )
}
