import type { RoomLayout } from '../types'
import { builder, npc, SKINS } from './helpers'

const W = 12
const D = 9
const H = 3.4
const b = builder(W, D, H)
const { add, wall, ceil, top } = b

// paredes de arara e sapatos ao norte
wall('boutique/rack_wall_rail', 'N', -4.6)
wall('boutique/rack_wall_rail', 'N', -2.6)
wall('boutique/shoe_wall_shelf', 'N', -0.8)
wall('boutique/shoe_wall_shelf', 'N', 0.8)
wall('boutique/rack_wall_rail', 'N', 2.8)
wall('boutique/rack_wall_rail', 'N', 4.8)
add('boutique/dress_form_stand', -5.0, -3.4, 20)
add('boutique/dress_form_stand', 5.0, -3.4, -20)
add('boutique/mannequin_gown', 0, -3.55, 0)
add('shared/rug_round', 0, -2.4, 0, { noCol: true, s: 1.4 })

// arara redonda e mesas
add('boutique/rack_round_carousel', -2.2, -1.3, 0)
add('boutique/rack_round_carousel', 2.2, -1.3, 0)
add('boutique/table_display_round', 0, 0.5, 0)
top('boutique/shopping_bags_set', 0, 0.5, 1.4)
add('shared/rug_round', 0, 0.5, 0, { noCol: true, s: 2.6 })
add('boutique/hat_tree_gold', 1.9, 1.4, 0)
add('boutique/table_display_long', 2.4, 3.0, 0)
top('boutique/shopping_bags_set', 2.4, 3.0, 1.0)

// provadores a oeste + espelho
add('boutique/fitting_room_curtain', -5.1, -0.9, 90)
add('boutique/fitting_room_curtain', -5.1, 1.7, 90)
add('boutique/ottoman_tufted_blue', -3.2, 0.4, 90)
add('boutique/mirror_trifold_stand', -3.0, 3.7, 180)

// caixa a leste
add('boutique/checkout_counter', 4.8, 0.2, 270)
wall('boutique/sign_marquee_heart', 'E', 0.2)
add('shared/plant_potted', -5.3, 4.0, 0)
add('shared/plant_potted', 5.3, 4.0, 0)
wall('shared/picture_frame', 'S', -4.4)
wall('shared/picture_frame', 'S', -1.5)
wall('shared/mirror_wall_oval', 'S', 1.6)
wall('boutique/bag_shelf_wall', 'W', -3.1)
wall('shared/wall_sconce', 'W', -2.0)
add('boutique/perfume_counter', 5.0, -3.0, 270)
top('boutique/sunglasses_stand', 5.0, -3.5, 0.99)
add('boutique/scarf_carousel', 0.2, 3.0, 0)
wall('shared/wall_sconce', 'W', 3.4)
wall('shared/wall_sconce', 'E', -2.4)
wall('shared/wall_sconce', 'E', 3.4)
ceil('boutique/chandelier_drum_crystal', 0, 0.5)
ceil('boutique/chandelier_drum_crystal', -3.4, -1.3)
ceil('boutique/chandelier_drum_crystal', 3.4, -1.3)
ceil('boutique/chandelier_drum_crystal', 0, -3.0)

export const boutique: RoomLayout = {
  id: 'boutique',
  poi: 'boutique',
  label: 'Boutique',
  slot: 2,
  w: W,
  d: D,
  h: H,
  wall: '#eee7da',
  wainscot: '#2a2826',
  wainH: 0.9,
  ceiling: '#f6f2ea',
  trimColor: '#d9c690',
  floor: { kind: 'wood', a: '#a9784a', b: '#98693d', tile: 2.2 },
  palette: {
    base: '#efe8da',
    accent: '#2a2826',
    accent2: '#b08a5a',
    soft: '#d9ccb8',
    deep: '#1f1d1c',
    white: '#fbf7ef',
    fabric: '#d8c8ae',
    glass: '#e3ebee',
    glow: '#fff0cf',
    leaf: '#5f8a5e',
    metal: '#d8c590',
  },
  items: b.items,
  actions: {
    'boutique/checkout_counter:pay': { type: 'shop', id: 'boutique', label: 'Caixa: comprar roupas' },
    'boutique/rack_round_carousel:browse': { type: 'shop', id: 'boutique', label: 'Ver roupas' },
    'boutique/fitting_room_curtain:change': { type: 'minigame', id: 'estilista', label: 'Provador: Estilista (minijogo)' },
    'boutique/mirror_trifold_stand:mirror': { type: 'menu', tab: 'aparencia', label: 'Provar no espelho' },
  },
  uses: [{ key: 'runway', label: 'Passarela: Desfile (minijogo)', x: 0, z: -2.35, radius: 1.3, action: { type: 'minigame', id: 'desfile' } }],
  lights: [
    { x: 0, y: 2.8, z: 0.5, color: '#fff0d8', intensity: 18, distance: 10 },
    { x: -3.4, y: 2.8, z: -1.3, color: '#fff0d8', intensity: 14, distance: 9 },
    { x: 3.4, y: 2.8, z: -1.3, color: '#fff0d8', intensity: 14, distance: 9 },
    { x: 0, y: 2.8, z: -3.0, color: '#fff6e6', intensity: 12, distance: 8 },
    { x: -3.0, y: 2.4, z: 3.2, color: '#fff0d8', intensity: 8, distance: 7 },
  ],
  hemi: { sky: '#fff4e6', ground: '#b5a58c', intensity: 0.6 },
  exposure: 0.85,
  envIntensity: 0.4,
  windows: [
    { wall: 'S', at: -4.6, w: 1.8, h: 1.8, y: 0.9 },
    { wall: 'S', at: 4.4, w: 1.8, h: 1.8, y: 0.9 },
  ],
  npcs: [
    npc('caixa', 5.65, 0.2, 270, 'texting', { hair: 'hair.chestnutWaves', hairColor: '#3a2417', suit: '#2a2826', skin: SKINS[0], top: 'blazer', line: 'Posso embalar para presente?' }),
    npc('vendedora', -1.0, 2.6, 180, 'idle', { hair: 'hair.caramelCurls', hairColor: '#c08a4e', suit: '#d9ccb8', skin: SKINS[3], line: 'A nova coleção acabou de chegar!' }),
  ],
  ambient: 'boutique',
}
