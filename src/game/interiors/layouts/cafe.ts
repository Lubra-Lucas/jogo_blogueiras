import type { RoomLayout } from '../types'
import { builder, npc, SKINS } from './helpers'

const W = 11
const D = 9
const H = 3.4
const b = builder(W, D, H)
const { add, wall, ceil, top } = b

// balcao e vitrine ao norte; barista entre o balcao e o fundo de prateleiras
add('cafe/back_bar_shelves', 0, -4.2, 0)
add('cafe/counter_service', -1.2, -2.3, 0)
add('cafe/display_case_pastry', 1.1, -2.3, 0)
top('cafe/espresso_machine', -1.8, -2.35, 0.96, 180)
top('cafe/register_retro', -0.3, -2.3, 0.96, 0)
top('cafe/cake_stand_dome', 0.75, -2.3, 0.97)
top('cafe/croissant_basket', -0.9, -2.2, 0.97)
add('cafe/chalkboard_aframe', 1.9, 3.7, 195)
ceil('cafe/hanging_planter', -3.9, 3.4)
ceil('cafe/hanging_planter', 4.9, -0.4)
add('cafe/stool_bar_rose', -2.35, -1.4, 180)
add('cafe/stool_bar_rose', 0.0, -1.4, 180)

// cabines na parede oeste
for (const z of [-1.2, 1.8]) {
  add('cafe/booth_sofa', -5.0, z, 90)
  add('cafe/bistro_table_round', -3.7, z, 0)
  top('cafe/coffee_set_tray', -3.7, z, 0.77, 90)
  add('cafe/chair_bistro_curvy', -2.8, z, 270)
}
// mesas ao leste
for (const [x, z] of [
  [2.6, 0.9],
  [4.3, 1.6],
  [3.2, 3.0],
]) {
  add('cafe/bistro_table_round', x, z, 0)
  add('cafe/chair_bistro_curvy', x - 0.65, z, 90)
  add('cafe/chair_bistro_curvy', x + 0.65, z, 270)
}
top('cafe/vase_roses', 2.6, 0.9, 0.77)
top('cafe/croissant_basket', 3.2, 3.0, 0.77)
top('cafe/macaron_plate', 4.3, 1.6, 0.77)

// parede e decoracao
wall('cafe/menu_board', 'N', -4.7)
wall('cafe/menu_board', 'N', 4.7)
wall('cafe/coffee_bag_shelf', 'N', -2.9)
wall('cafe/coffee_bag_shelf', 'N', 2.9)
wall('cafe/sign_neon_cup', 'E', -1.8)
wall('shared/mirror_wall_oval', 'E', 1.2)
wall('shared/picture_frame', 'W', -3.7)
wall('shared/picture_frame', 'W', 0.3)
wall('shared/picture_frame', 'W', 3.3)
wall('shared/wall_sconce', 'W', -2.5)
wall('shared/wall_sconce', 'E', -0.3)
wall('shared/shelf_wall', 'E', 3.5)
b.add('shared/plant_potted', -4.7, -3.9, 0)
b.add('shared/plant_potted', 4.8, -3.9, 0)
b.add('shared/plant_potted', 4.8, 4.0, 0, { noCol: false })
b.add('shared/plant_potted', -4.8, 4.0, 0)
ceil('cafe/pendant_lamp_cafe', -1.2, -0.6)
ceil('cafe/pendant_lamp_cafe', 2.6, 0.9)
ceil('cafe/pendant_lamp_cafe', 4.3, 2.4)
ceil('cafe/pendant_lamp_cafe', -3.7, 0.3)
ceil('cafe/pendant_lamp_cafe', 0.0, 2.8)
b.add('shared/rug_round', 3.4, 1.8, 0, { noCol: true, s: 2.4 })

export const cafe: RoomLayout = {
  id: 'cafe',
  poi: 'cafe-rose',
  label: 'Café Rosé',
  slot: 0,
  w: W,
  d: D,
  h: H,
  wall: '#e9e0cf',
  wainscot: '#8fa88c',
  wainH: 1.1,
  ceiling: '#f4eee2',
  trimColor: '#b8914a',
  floor: { kind: 'checker', a: '#efe6d3', b: '#8fa88c', tile: 1.6 },
  palette: {
    base: '#8fa88c',
    accent: '#f1e6d2',
    accent2: '#a8553b',
    soft: '#d9c3a0',
    deep: '#4a3426',
    white: '#f6efe0',
    fabric: '#9bb39a',
    glass: '#d8e6dd',
    glow: '#ffe2ae',
    glow2: '#ffb27a',
    leaf: '#5f8a5e',
    metal: '#c9a24e',
  },
  items: b.items,
  actions: {
    'cafe/counter_service:order': { type: 'minigame', id: 'cafe', label: 'Café Rosé (minijogo)' },
    'cafe/display_case_pastry:pastries': { type: 'toast', text: 'Vitrine do dia', sub: 'Croissants, macarons e bolos fresquinhos.', label: 'Ver doces' },
    'cafe/espresso_machine:coffee': { type: 'toast', text: 'Espresso na hora', sub: 'O barista cuida da máquina.', label: 'Ver a máquina' },
  },
  lights: [
    { x: -1.2, y: 2.7, z: -0.6, color: '#ffd9a0', intensity: 14, distance: 9 },
    { x: 3.3, y: 2.7, z: 1.8, color: '#ffe0b8', intensity: 14, distance: 9 },
    { x: -3.7, y: 2.7, z: 0.3, color: '#ffd9a0', intensity: 12, distance: 8 },
    { x: 0, y: 2.7, z: 3.2, color: '#fff0d8', intensity: 10, distance: 8 },
    { x: 0, y: 2.6, z: -3.4, color: '#ffe8c0', intensity: 12, distance: 7 },
  ],
  hemi: { sky: '#fff3e0', ground: '#b8a68a', intensity: 0.7 },
  exposure: 0.92,
  envIntensity: 0.45,
  windows: [
    { wall: 'E', at: -3.2, w: 1.5, h: 1.6, y: 1.0 },
    { wall: 'E', at: 3.0, w: 1.5, h: 1.6, y: 1.0 },
    { wall: 'S', at: -3.5, w: 1.6, h: 1.6, y: 1.0 },
    { wall: 'S', at: 3.5, w: 1.6, h: 1.6, y: 1.0 },
  ],
  uses: [],
  npcs: [
    npc('barista', -0.6, -3.35, 0, 'idle', { hair: 'hair.meshyUpdo', hairColor: '#3a2417', suit: '#3b4a3c', top: 'tank', skin: SKINS[1], line: 'Bem-vinda ao Café Rosé! O pedido sai já.' }),
    npc('cliente', 3.6, 3.9, 200, 'texting', { hair: 'hair.caramelCurls', hairColor: '#816b58', suit: '#c9b79a', skin: SKINS[0], line: 'Esse cappuccino está uma delícia.' }),
  ],
  ambient: 'cafe',
}
