import type { RoomLayout } from '../types'
import { builder, npc, SKINS } from './helpers'

const W = 12
const D = 9
const H = 3.3
const b = builder(W, D, H)
const { add, wall, ceil, top } = b

// estacoes de espelho na parede norte, cadeiras hidraulicas de frente para elas
for (const x of [-4.2, -2.6, -1.0]) {
  add('salao/mirror_station_lit', x, -4.2, 0)
  add('salao/chair_styling_hydraulic', x, -2.55, 180)
}
add('salao/trolley_salon', -5.3, -3.6, 0)
// produtos
add('salao/product_shelf_glass', 2.4, -4.25, 0)
add('salao/product_shelf_glass', 3.8, -4.25, 0)
add('salao/product_shelf_glass', 5.2, -4.25, 0)
top('salao/spa_decor_set', 0.9, -4.15, 0.95)
// lavatorios na parede oeste
add('salao/washbasin_chair', -5.2, -0.2, 90)
add('salao/washbasin_chair', -5.2, 1.6, 90)
add('salao/towel_warmer_rack', -5.55, 3.4, 90)
// manicure
add('salao/manicure_table', 3.8, -1.2, 0)
add('salao/stool_salon_round', 3.8, -0.3, 180)
add('salao/stool_salon_round', 3.8, -2.1, 0)
// spa
add('salao/spa_massage_bed', 4.6, 1.4, 90)
add('shared/rug_round', 4.6, 1.4, 0, { noCol: true, s: 1.5 })
add('salao/dryer_hood_chair', 5.3, 3.2, 270)
add('salao/dryer_hood_chair', 3.9, 3.7, 180)
// recepcao
add('salao/reception_desk_curved', 2.2, 2.8, 180)
add('salao/sofa_waiting_pearl', -3.6, 3.7, 180)
add('shared/rug_round', -3.6, 2.7, 0, { noCol: true, s: 1.7 })
add('shared/plant_potted', -5.3, 4.0, 0)
add('shared/plant_potted', 5.3, -2.9, 0)
add('shared/plant_potted', 0.9, 4.0, 0)

wall('shared/mirror_wall_oval', 'W', 3.0, { y: 0 })
wall('shared/picture_frame', 'S', -4.4)
wall('shared/picture_frame', 'S', -2.8)
wall('salao/sign_scissors_neon', 'W', -3.3)
wall('shared/wall_sconce', 'W', -1.7)
wall('salao/product_wall', 'E', -1.9)
wall('salao/nail_polish_rack', 'E', 1.4)
add('salao/robe_stand', -5.4, -2.0, 90)
top('salao/towel_stack', 1.4, 2.8, 1.27)
wall('shared/wall_sconce', 'E', -3.0)
wall('shared/wall_sconce', 'S', 4.0)
wall('shared/shelf_wall', 'E', 0.6)
top('salao/spa_decor_set', 5.9, 0.6, 1.32)
ceil('salao/chandelier_orbs', -2.6, -0.5)
ceil('salao/chandelier_orbs', 1.2, 0.8)
ceil('salao/chandelier_orbs', 4.2, -0.5)

export const salao: RoomLayout = {
  id: 'salao',
  poi: 'salao-spa',
  label: 'Salão & Spa',
  slot: 1,
  w: W,
  d: D,
  h: H,
  wall: '#d9d1c4',
  wainscot: '#b9ae9f',
  wainH: 1.1,
  ceiling: '#f5f1ea',
  trimColor: '#c9a24e',
  floor: { kind: 'marble', a: '#cfc8bb', b: '#7f786c', tile: 2 },
  palette: {
    base: '#b9ae9f',
    accent: '#f2ece0',
    accent2: '#2b2a29',
    soft: '#d8cfc2',
    deep: '#3b3835',
    white: '#f6f1e8',
    fabric: '#c9bfae',
    glass: '#dfe6e6',
    glow: '#ffeccf',
    leaf: '#5f8a5e',
    metal: '#c9a24e',
  },
  items: b.items,
  actions: {
    'salao/mirror_station_lit:style': { type: 'minigame', id: 'salao', label: 'Salão Express (minijogo)' },
    'salao/manicure_table:nails': { type: 'minigame', id: 'manicure', label: 'Fazer as unhas (minijogo)' },
    'salao/reception_desk_curved:reception': { type: 'shop', id: 'salao', label: 'Recepção: serviços' },
    'salao/product_shelf_glass:products': { type: 'shop', id: 'salao', label: 'Ver produtos' },
    'salao/spa_massage_bed:spa': { type: 'toast', text: 'Sala de spa', sub: 'Deite-se na maca para relaxar um pouco.', label: 'Spa' },
  },
  uses: [],
  lights: [
    { x: -2.6, y: 2.7, z: -0.5, color: '#fff0dc', intensity: 16, distance: 10 },
    { x: 1.2, y: 2.7, z: 0.8, color: '#fff0dc', intensity: 14, distance: 10 },
    { x: 4.2, y: 2.7, z: -0.5, color: '#ffeccf', intensity: 14, distance: 9 },
    { x: -3.6, y: 2.5, z: 3.0, color: '#ffe8cc', intensity: 10, distance: 8 },
    { x: -2.6, y: 2.0, z: -3.6, color: '#fff6ec', intensity: 10, distance: 6 },
  ],
  hemi: { sky: '#fff4e6', ground: '#b8ad9c', intensity: 0.6 },
  exposure: 0.85,
  envIntensity: 0.4,
  windows: [
    { wall: 'S', at: -3.6, w: 1.8, h: 1.6, y: 1.0 },
    { wall: 'S', at: 3.8, w: 1.8, h: 1.6, y: 1.0 },
  ],
  npcs: [
    npc('cabeleireira', -2.6, -1.45, 180, 'idle', { hair: 'hair.platinumUndercut', hairColor: '#e8dcc8', suit: '#2b2a29', skin: SKINS[1], top: 'tank', line: 'Quer um corte novo hoje? Senta aqui!' }),
    npc('recepcionista', 2.2, 4.0, 180, 'texting', { hair: 'hair.meshyUpdo', hairColor: '#16141a', suit: '#d8cfc2', skin: SKINS[2], line: 'Bem-vinda ao Salão & Spa. Posso agendar um horário?' }),
  ],
  ambient: 'salon',
}
