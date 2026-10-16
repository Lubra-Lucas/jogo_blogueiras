import type { RoomLayout, RoomPalette } from '../types'
import { builder, npc, SKINS } from './helpers'

const W = 18
const D = 13
const H = 3.5
const b = builder(W, D, H)
const { add, wall, ceil, top } = b

const NEU = 'neutral'

// ---- quarto (noroeste): rosa refinado ----
add('casa/bed_canopy', -5.6, -5.2, 0)
add('casa/nightstand_pink', -7.4, -5.9, 0)
add('casa/nightstand_pink', -3.8, -5.9, 0)
top('casa/lamp_table_pink', -7.4, -5.9, 0.76)
top('casa/lamp_table_pink', -3.8, -5.9, 0.76)
add('casa/vanity_hollywood', -8.4, -1.6, 90)
add('casa/stool_tufted', -7.2, -1.6, 90)
add('casa/wardrobe_glass_lit', -8.4, -3.7, 90)
add('casa/armchair_capitone', -3.0, -1.6, 200)
add('casa/bed_bench', -5.6, -3.6, 0)
add('casa/table_side_round', -1.9, -2.4, 0)
add('shared/rug_heart', -5.4, -2.9, 0, { noCol: true, s: 2.2 })
add('casa/bookshelf_pink', -1.3, -6.1, 0)
wall('shared/picture_frame', 'N', -9.0 + 8.3, { y: 0 })
ceil('casa/chandelier_crystal', -5.4, -3.2)

// ---- closet (nordeste): neutro luxuoso ----
add('casa/closet_shoe_wall', 4.0, -6.2, 0, { pal: NEU })
add('casa/closet_shoe_wall', 5.9, -6.2, 0, { pal: NEU })
add('casa/wardrobe_glass_lit', 8.1, -5.8, 0, { pal: NEU })
add('casa/clothes_rail_gold', 3.7, -3.4, 90, { pal: NEU })
add('casa/clothes_rail_gold', 3.7, -1.9, 90, { pal: NEU })
add('casa/closet_island', 6.4, -3.3, 0, { pal: NEU })
add('casa/pouf_round', 8.0, -2.0, 0, { pal: NEU })
add('shared/rug_round', 6.4, -2.6, 0, { noCol: true, s: 2.6, pal: NEU })
ceil('casa/chandelier_crystal', 6.0, -3.4, { pal: NEU })

// ---- sala (sudeste): neutro luxuoso ----
add('casa/sofa_capitone', 6.2, 1.0, 0, { pal: NEU })
add('casa/coffee_table_heart', 6.2, 3.0, 0, { pal: NEU })
add('casa/armchair_capitone', 3.4, 3.0, 90, { pal: NEU })
add('casa/armchair_capitone', 9.0 - 0.8, 3.0, 270, { pal: NEU })
add('casa/tv_console', 6.2, 5.9, 180, { pal: NEU })
add('shared/rug_round', 6.2, 3.0, 0, { noCol: true, s: 3.0, pal: NEU })
add('casa/bookcase_open', 8.6, -0.4, 270, { pal: NEU })
add('shared/floor_lamp_arc', 8.2, 1.9, 0, { pal: NEU })
add('shared/floor_lamp_arc', -1.8, -0.6, 0)
wall('casa/vanity_mirror_wall', 'E', -3.3, { pal: NEU })
wall('casa/art_canvas_large', 'N', 1.4)
wall('casa/art_canvas_large', 'S', -1.9, { pal: NEU })
add('shared/plant_potted', 8.3, 5.5, 0, { pal: NEU })
add('shared/plant_potted', 3.4, 5.5, 0, { pal: NEU })
ceil('casa/chandelier_crystal', 6.2, 2.8, { pal: NEU })
wall('shared/picture_frame', 'E', 2.6, { pal: NEU })
wall('shared/picture_frame', 'E', 4.4, { pal: NEU })

// ---- banheiro / cantinho (sudoeste) ----
add('casa/clawfoot_tub', -7.4, 4.6, 90)
add('casa/bath_vanity_sink', -8.2, 1.6, 90)
wall('shared/mirror_wall_oval', 'W', 1.6)
add('casa/pouf_round', -5.0, 4.4, 0)
add('shared/plant_potted', -8.3, 5.9, 0)
add('shared/plant_potted', -1.6, 5.9, 0, { pal: NEU })
wall('shared/wall_sconce', 'S', -3.5)
wall('shared/wall_sconce', 'S', 3.5)
wall('shared/wall_sconce', 'N', 1.0, { pal: NEU })
wall('shared/wall_sconce', 'W', -4.0)
wall('shared/fairy_lights_curtain', 'W', 5.0)

const neutral: RoomPalette = {
  base: '#e8dfd0',
  accent: '#cbbba3',
  accent2: '#8a7458',
  soft: '#d8ccb8',
  deep: '#3a3128',
  white: '#faf6ee',
  fabric: '#d9ccb6',
  glass: '#e2e6e6',
  glow: '#ffe9c4',
  leaf: '#5f8a5e',
  metal: '#d1ac5d',
}

export const casa: RoomLayout = {
  id: 'casa',
  poi: 'casa-sonhos',
  label: 'Casa dos Sonhos',
  slot: 6,
  w: W,
  d: D,
  h: H,
  wall: '#efe4dc',
  wainscot: '#e3c4c9',
  wainH: 1.0,
  ceiling: '#faf5ef',
  trimColor: '#d1ac5d',
  floor: { kind: 'wood', a: '#bd9468', b: '#ad8459', tile: 2.4 },
  palette: {
    base: '#f1e1dc',
    accent: '#e3bcc4',
    accent2: '#b9677d',
    soft: '#efd6d4',
    deep: '#6e4350',
    white: '#fbf5f0',
    fabric: '#e8c0c8',
    glass: '#f3d9de',
    glow: '#ffe3b8',
    leaf: '#5f8a5e',
    metal: '#d1ac5d',
  },
  palettes: { [NEU]: neutral },
  items: b.items,
  actions: {
    'casa/bed_canopy:sleep': { type: 'sleep', label: 'Dormir até de manhã' },
    'casa/nightstand_pink:lamp': { type: 'toast', text: 'Abajur aceso', sub: 'Luz quentinha para ler antes de dormir.', label: 'Abajur' },
    'casa/vanity_hollywood:vanity': { type: 'menu', tab: 'aparencia', label: 'Penteadeira: aparência' },
    'casa/wardrobe_glass_lit:closet': { type: 'menu', tab: 'guardaroupa', label: 'Abrir o guarda-roupa' },
    'casa/closet_shoe_wall:shoes': { type: 'menu', tab: 'guardaroupa', label: 'Escolher sapatos' },
    'casa/closet_island:jewelry': { type: 'menu', tab: 'aparencia', label: 'Joias e acessórios' },
    'casa/tv_console:tv': { type: 'toast', text: 'Maratona de séries', sub: 'A TV está ligada num programa de decoração.', label: 'Assistir TV' },
    'casa/clawfoot_tub:bath': { type: 'toast', text: 'Banho de espuma', sub: 'Que cheirinho de lavanda...', label: 'Banho de espuma' },
    'casa/bath_vanity_sink:sink': { type: 'toast', text: 'Mãos limpas', label: 'Lavar as mãos' },
  },
  uses: [],
  lights: [
    { x: -5.4, y: 2.8, z: -3.2, color: '#ffe0b8', intensity: 18, distance: 10 },
    { x: 6.0, y: 2.8, z: -3.4, color: '#fff0d8', intensity: 16, distance: 10 },
    { x: 6.2, y: 2.8, z: 2.8, color: '#ffe8c8', intensity: 18, distance: 10 },
    { x: -5.0, y: 2.6, z: 4.0, color: '#ffe0b8', intensity: 12, distance: 9 },
    { x: 0, y: 2.8, z: 0, color: '#fff0dc', intensity: 14, distance: 12 },
    { x: -8.0, y: 1.8, z: -1.6, color: '#ffe8c8', intensity: 10, distance: 5 },
  ],
  hemi: { sky: '#fff4e6', ground: '#bfa996', intensity: 0.6 },
  exposure: 0.88,
  envIntensity: 0.4,
  windows: [
    { wall: 'S', at: -6.5, w: 2.2, h: 1.9, y: 0.9 },
    { wall: 'S', at: 6.5, w: 2.2, h: 1.9, y: 0.9 },
    { wall: 'N', at: -0.6, w: 2.0, h: 1.9, y: 0.9 },
  ],
  npcs: [npc('amiga', 4.4, 1.6, 100, 'texting', { hair: 'hair.caramelCurls', hairColor: '#c08a4e', suit: '#e8dfd0', skin: SKINS[1], line: 'Adorei a decoração nova! Esse closet é um sonho.' })],
  ambient: 'home',
}
