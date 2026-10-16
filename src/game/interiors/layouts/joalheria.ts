import type { RoomLayout } from '../types'
import { builder, npc, SKINS } from './helpers'

const W = 10
const D = 8.5
const H = 3.3
const b = builder(W, D, H)
const { add, wall, ceil, top } = b

// vitrines baixas ao longo do norte, caixa no centro
add('joalheria/case_counter_long', -3.2, -3.3, 0)
add('joalheria/case_counter_long', -1.0, -3.3, 0)
add('joalheria/counter_checkout_black', 2.0, -3.3, 0)
add('joalheria/safe_heart_vault', 4.4, -3.7, 0)
top('joalheria/tray_velvet_jewelry', -3.2, -3.3, 1.36)
top('joalheria/bust_necklace_stand', -1.0, -3.3, 1.36)
top('joalheria/ring_tree_stand', -0.6, -3.3, 1.36)
top('joalheria/mirror_tryon_stand', 1.3, -3.3, 1.28)
wall('joalheria/wall_shadowbox_lit', 'N', -4.2)
wall('joalheria/wall_shadowbox_lit', 'N', -2.1)
wall('joalheria/wall_shadowbox_lit', 'N', 0.0)
wall('joalheria/wall_shadowbox_lit', 'N', 2.1)
wall('joalheria/sign_gold_diamond', 'N', 4.2, { y: 0 })

// colunas de vidro e pedestais
add('joalheria/case_tower_glass', -4.2, -0.6, 0)
add('joalheria/case_tower_glass', 4.2, -0.6, 0)
add('joalheria/pedestal_dome_gem', -2.0, 0.2, 0)
add('joalheria/pedestal_dome_gem', 2.0, 0.2, 0)
add('joalheria/diamond_island', 0, 0.5, 0)
wall('joalheria/necklace_velvet_wall', 'W', -0.6)
wall('joalheria/necklace_velvet_wall', 'E', -0.6)
add('joalheria/appraisal_desk', -4.3, 1.4, 90)
top('joalheria/gift_box_stack', -1.5, 3.4, 0.71)

// sala de espera
add('joalheria/loveseat_velvet_tufted', -3.2, 3.2, 180)
add('joalheria/table_side_gold_glass', -1.5, 3.4, 0)
add('joalheria/armchair_velvet_wing', 3.2, 3.2, 200)
add('joalheria/table_side_gold_glass', 4.4, 3.6, 0)
add('shared/rug_round', -3.2, 2.6, 0, { noCol: true, s: 1.8 })
add('shared/plant_potted', -4.5, 3.6, 0)
add('shared/plant_potted', 4.5, -2.0, 0)
wall('shared/wall_sconce', 'W', -2.6)
wall('shared/wall_sconce', 'W', 2.0)
wall('shared/wall_sconce', 'E', -2.4)
wall('shared/wall_sconce', 'E', 2.0)
wall('shared/picture_frame', 'S', 3.4)
wall('shared/mirror_wall_oval', 'S', -3.6)
ceil('joalheria/chandelier_gold_cascade', 0, -0.2)
ceil('joalheria/chandelier_gold_cascade', 0, 2.6)

export const joalheria: RoomLayout = {
  id: 'joalheria',
  poi: 'joalheria',
  label: 'Joalheria',
  slot: 3,
  w: W,
  d: D,
  h: H,
  wall: '#26222b',
  wainscot: '#3b2a2f',
  wainH: 1.0,
  ceiling: '#1d1a20',
  trimColor: '#d8c590',
  floor: { kind: 'marble', a: '#19171c', b: '#b8a98a', tile: 2 },
  palette: {
    base: '#17151a',
    accent: '#26222b',
    accent2: '#6e1f33',
    soft: '#3a343f',
    deep: '#0c0b0e',
    white: '#e6d8b8',
    fabric: '#6e1f33',
    glass: '#cdd5df',
    glow: '#ffe6b0',
    leaf: '#4f7a55',
    metal: '#d8c590',
  },
  items: b.items,
  actions: {
    'joalheria/counter_checkout_black:pay': { type: 'shop', id: 'joalheria', label: 'Caixa: comprar joias' },
    'joalheria/case_counter_long:browse': { type: 'minigame', id: 'joia', label: 'Joia Sob Medida (minijogo)' },
    'joalheria/case_tower_glass:browse': { type: 'shop', id: 'joalheria', label: 'Ver joias' },
    'joalheria/mirror_tryon_stand:tryon': { type: 'menu', tab: 'aparencia', label: 'Provar joias' },
    'joalheria/safe_heart_vault:safe': { type: 'toast', text: 'Cofre trancado', sub: 'Peças raras ficam guardadas aqui.', label: 'Cofre' },
  },
  uses: [],
  lights: [
    { x: 0, y: 2.7, z: -0.2, color: '#ffe6b0', intensity: 22, distance: 9 },
    { x: 0, y: 2.7, z: 2.6, color: '#ffe0a0', intensity: 16, distance: 8 },
    { x: -2.1, y: 2.4, z: -3.0, color: '#ffeccf', intensity: 12, distance: 6 },
    { x: 2.1, y: 2.4, z: -3.0, color: '#ffeccf', intensity: 12, distance: 6 },
    { x: -4.0, y: 2.2, z: 0, color: '#ffe0a0', intensity: 8, distance: 6 },
  ],
  hemi: { sky: '#d9c9a8', ground: '#3a2f33', intensity: 0.75 },
  exposure: 1.05,
  envIntensity: 0.6,
  npcs: [
    npc('joalheira', 2.0, -4.0, 0, 'idle', { hair: 'hair.meshyUpdo', hairColor: '#16141a', suit: '#17151a', skin: SKINS[0], top: 'blazer', line: 'Cada peça tem uma história. Quer ver de perto?' }),
  ],
  ambient: 'jewel',
}
