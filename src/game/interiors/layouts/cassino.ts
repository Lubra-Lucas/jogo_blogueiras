import type { RoomLayout, UseSpot } from '../types'
import { builder, npc, SKINS } from './helpers'

const W = 16
const D = 11
const H = 4.2
const b = builder(W, D, H)
const { add, ceil } = b

const play = (key: string, label: string, x: number, z: number): UseSpot => ({ key, label, x, z, radius: 1.5, action: { type: 'minigame', id: 'cassino' } })

// mesas
add('casino/card_table', -3.2, -1.0, 0)
add('casino/poker_table', 3.2, -1.0, 0)
add('casino/roulette_table', 0, 2.0, 180)
// caca-niqueis ao longo da parede oeste
for (const z of [-3.6, -2.4, -1.2, 0.0]) add('casino/slot_machine', -7.5, z, 90)
for (const z of [1.2, 2.4]) add('casino/slot_machine', -7.5, z, 90)
// bar ao norte
add('casino/bar_counter', 4.6, -4.2, 0)
for (const x of [3.4, 4.6, 5.8]) add('casino/bar_stool', x, -2.9, 180)
// colunas e luminarias
for (const [x, z] of [
  [-6.0, -4.5],
  [6.0, 4.0],
  [-6.0, 4.0],
  [0, -4.6],
] as [number, number][]) add('casino/pillar', x, z, 0)
add('casino/lamp_floor', 7.2, -1.0, 0)
add('casino/lamp_floor', 7.2, 3.2, 0)
add('casino/lamp_floor', -4.2, 4.6, 0)
ceil('casino/chandelier', -3.2, -1.0)
ceil('casino/chandelier', 3.2, -1.0)
ceil('casino/chandelier', 0, 2.0)
add('shared/plant_potted', 7.2, 4.4, 0)

export const cassino: RoomLayout = {
  id: 'cassino',
  poi: 'cassino',
  label: 'Lounge de Jogos',
  slot: 7,
  w: W,
  d: D,
  h: H,
  wall: '#3a1f2b',
  wainscot: '#22141b',
  wainH: 1.1,
  ceiling: '#1b1015',
  trimColor: '#c9a15a',
  floor: { kind: 'carpet', a: '#5a1a2a', b: '#c9a15a', tile: 2.4 },
  palette: {
    base: '#3a1f2b', accent: '#22141b', accent2: '#c9a15a', soft: '#5a2b3a', deep: '#120a0e', white: '#efe3c8', fabric: '#6e1f33',
    glass: '#d8d8e0', glow: '#ffd98a', leaf: '#4f7a55', metal: '#c9a15a',
  },
  items: b.items,
  actions: {},
  uses: [
    play('cassino:21', 'Mesa de 21 (Lounge de Jogos)', -3.2, 0.4),
    play('cassino:poker', 'Mesa de poker (Lounge de Jogos)', 3.2, 0.4),
    play('cassino:roleta', 'Roleta (Lounge de Jogos)', 0, 0.6),
    play('cassino:slots', 'Caça-níqueis (Lounge de Jogos)', -6.4, -1.8),
    play('cassino:slots2', 'Caça-níqueis (Lounge de Jogos)', -6.4, 1.8),
  ],
  lights: [
    { x: -3.2, y: 3.3, z: -1.0, color: '#ffd98a', intensity: 22, distance: 10 },
    { x: 3.2, y: 3.3, z: -1.0, color: '#ffd98a', intensity: 22, distance: 10 },
    { x: 0, y: 3.3, z: 2.0, color: '#ffd98a', intensity: 22, distance: 10 },
    { x: -6.5, y: 2.2, z: -1.2, color: '#ff8a5c', intensity: 12, distance: 7 },
    { x: 4.6, y: 2.2, z: -3.6, color: '#ffd98a', intensity: 12, distance: 7 },
  ],
  hemi: { sky: '#e8c9a0', ground: '#3a1f2b', intensity: 0.8 },
  exposure: 1.05,
  envIntensity: 0.4,
  npcs: [
    npc('crupie', -3.2, -2.1, 0, 'idle', { hair: 'hair.meshyUpdo', hairColor: '#16141a', suit: '#120a0e', skin: SKINS[0], top: 'blazer', line: 'Façam suas apostas! Aqui só valem as fichas do lounge.' }),
    npc('barman', 4.6, -4.9, 0, 'idle', { hair: 'hair.platinumUndercut', hairColor: '#e8dcc8', suit: '#22141b', skin: SKINS[3], line: 'Uma água com gás e limão para a senhorita?' }),
  ],
  ambient: 'casino',
}
