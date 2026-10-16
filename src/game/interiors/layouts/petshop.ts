import type { RoomLayout } from '../types'
import { builder, npc, SKINS } from './helpers'

/** Petshop Patinhas (Jardim Romântico): balcão, prateleiras de ração, estação de banho/tosa e canto de adestramento. */
const W = 11
const D = 9
const H = 3.3
const b = builder(W, D, H)
const { add, wall, ceil, top } = b

// prateleiras de ração e produtos (parede norte)
for (const x of [-4.2, -2.8, -1.4]) add('salao/product_shelf_glass', x, -4.25, 0)
wall('salao/product_wall', 'N', 0.9)
wall('boutique/shoe_wall_shelf', 'N', 3.2)
wall('boutique/bag_shelf_wall', 'N', 4.6)
// balcão de atendimento
add('salao/reception_desk_curved', 2.6, -2.2, 0)
top('salao/spa_decor_set', 3.3, -2.2, 1.27)
// expositores de acessórios (coleiras, laços, roupinhas)
add('boutique/table_display_round', -3.6, -0.6, 0)
add('boutique/table_display_long', 0.6, 0.4, 0)
add('boutique/hat_tree_gold', -4.7, 0.9, 0)
// estação de banho e tosa
add('salao/mirror_station_lit', 4.3, 1.0, 270)
add('salao/trolley_salon', 4.6, 2.6, 0)
add('salao/towel_warmer_rack', 4.85, -0.2, 270)
top('salao/towel_stack', 3.4, -2.2, 1.27)
add('salao/robe_stand', 4.7, 3.7, 270)
// canto de adestramento e descanso
add('shared/rug_round', -3.2, 2.7, 0, { noCol: true, s: 2.1 })
add('shared/rug_rect', 0.8, 2.9, 0, { noCol: true, s: 1.4 })
add('salao/sofa_waiting_pearl', -4.1, 3.9, 180)
add('salao/manicure_table', 0.8, 3.3, 0)
add('shared/plant_potted', -5.0, -3.6, 0)
add('shared/plant_potted', 5.0, -4.0, 0)
add('shared/plant_small', -2.0, 3.9, 0)
add('shared/plant_potted', 2.3, 4.0, 0)

wall('shared/picture_frame', 'W', -2.6)
wall('shared/picture_frame', 'W', 2.4)
wall('shared/mirror_wall_oval', 'S', -3.0)
wall('shared/wall_sconce', 'W', -0.6)
wall('shared/wall_sconce', 'E', -2.5)
wall('shared/wall_sconce', 'S', 3.2)
wall('shared/shelf_wall', 'E', 0.4)
wall('shared/fairy_lights_curtain', 'W', 0.4)
ceil('salao/chandelier_orbs', -2.4, -0.6)
ceil('salao/chandelier_orbs', 2.4, 0.4)

export const petshop: RoomLayout = {
  id: 'petshop',
  poi: 'petshop',
  label: 'Petshop Patinhas',
  slot: 8,
  w: W,
  d: D,
  h: H,
  wall: '#d4dccb',
  wainscot: '#8fa58f',
  wainH: 1.05,
  ceiling: '#f6f2ea',
  trimColor: '#c9a24e',
  floor: { kind: 'wood', a: '#b99a72', b: '#9d7f5b', tile: 2 },
  palette: {
    base: '#c2ac86',
    accent: '#f2ece0',
    accent2: '#3a7d6e',
    soft: '#e2dac8',
    deep: '#3b3a33',
    white: '#f7f3ea',
    fabric: '#7da08f',
    glass: '#dfe8e4',
    glow: '#fff0d6',
    leaf: '#5d8a58',
    metal: '#c9a24e',
  },
  items: b.items,
  actions: {
    'salao/reception_desk_curved:reception': { type: 'shop', id: 'petshop', label: 'Balcão: pets, ração e acessórios' },
    'salao/product_shelf_glass:products': { type: 'shop', id: 'petshop', label: 'Ver ração e produtos' },
    'salao/mirror_station_lit:style': { type: 'minigame', id: 'petbanho', label: 'Banho e tosa (minijogo)' },
    'salao/manicure_table:nails': { type: 'minigame', id: 'petadestra', label: 'Adestramento (minijogo)' },
  },
  uses: [
    { key: 'petshop:treino', label: 'Adestramento (minijogo)', x: -3.2, z: 2.2, radius: 1.5, action: { type: 'minigame', id: 'petadestra' } },
    { key: 'petshop:acc', label: 'Ver acessórios', x: -3.6, z: 0.5, radius: 1.3, action: { type: 'shop', id: 'petshop' } },
  ],
  lights: [
    { x: -2.4, y: 2.7, z: -0.6, color: '#fff0dc', intensity: 16, distance: 10 },
    { x: 2.4, y: 2.7, z: 0.4, color: '#fff0dc', intensity: 14, distance: 10 },
    { x: -2.8, y: 2.2, z: -3.7, color: '#fff6ec', intensity: 10, distance: 6 },
    { x: -3.2, y: 2.5, z: 3.0, color: '#ffe8cc', intensity: 10, distance: 8 },
    { x: 4.0, y: 2.4, z: 1.5, color: '#ffeccf', intensity: 10, distance: 7 },
  ],
  hemi: { sky: '#fff4e6', ground: '#b4a88e', intensity: 0.6 },
  exposure: 0.88,
  envIntensity: 0.4,
  windows: [
    { wall: 'S', at: -3.4, w: 1.8, h: 1.6, y: 1.0 },
    { wall: 'S', at: 3.2, w: 1.8, h: 1.6, y: 1.0 },
  ],
  npcs: [
    npc('atendente', 2.6, -3.3, 0, 'idle', { hair: 'hair.chestnutWaves', hairColor: '#3a2417', suit: '#7da08f', skin: SKINS[1], top: 'tank', line: 'Bem-vinda ao Patinhas! Quer conhecer os filhotes ou comprar ração?' }),
    npc('tosadora', 4.0, 2.0, 270, 'idle', { hair: 'hair.meshyUpdo', hairColor: '#16141a', suit: '#3b3a33', skin: SKINS[2], line: 'Banho e tosa exigem mão leve. Quer treinar?' }),
  ],
  ambient: 'boutique',
}
