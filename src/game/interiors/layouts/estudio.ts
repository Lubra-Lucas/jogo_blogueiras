import type { RoomLayout } from '../types'
import { builder, npc, SKINS } from './helpers'

const W = 12
const D = 9
const H = 3.8
const b = builder(W, D, H)
const { add, wall, ceil } = b

// set de fotos ao norte: ciclorama, luzes, camera e poses
add('estudio/backdrop_roll_stand', 0, -3.7, 0)
add('estudio/softbox_light_stand', -3.1, -2.0, 35)
add('estudio/umbrella_reflector_stand', 3.2, -2.1, -35)
add('estudio/ring_light_stand', 1.7, 0.3, 200)
add('estudio/camera_tripod_pro', 0, 1.2, 180)
add('estudio/chair_heart_pose', -1.0, -2.4, 0)
add('estudio/posing_blocks_set', 1.3, -2.7, 0)
add('shared/rug_round', 0, -2.2, 0, { noCol: true, s: 2.2 })

// ilha de edicao e camarim a oeste
add('estudio/desk_monitor_station', -4.9, -3.6, 90)
add('estudio/chair_swivel_pink', -3.9, -3.6, 270)
add('estudio/screen_changing_folding', -5.2, 1.0, 90)
add('estudio/costume_rack', -4.7, 2.9, 90)
add('estudio/prop_trunk', 3.9, 0.9, 270)
add('estudio/pampas_vase', -2.4, -4.0, 0)
add('estudio/balloon_arch_light', 4.3, -3.9, 0, { noCol: true })
add('estudio/reflector_panel', 2.5, -0.7, 200)
add('boutique/dress_form_stand', -3.6, 2.6, 30)
wall('estudio/polaroid_wall_string', 'W', -1.6)
wall('estudio/polaroid_wall_string', 'W', -3.2, { y: -0.45 })

// sofa de espera e plantas a leste
add('shared/plant_potted', 5.3, 3.9, 0)
add('shared/plant_potted', -5.3, 4.0, 0)
wall('estudio/sign_neon_camera', 'E', -0.4)
wall('shared/picture_frame', 'E', 2.0)
wall('shared/picture_frame', 'E', 3.4)
wall('shared/picture_frame', 'S', -3.5)
wall('shared/picture_frame', 'S', 3.5)
ceil('estudio/track_spots_ceiling', -2.0, -2.2)
ceil('estudio/track_spots_ceiling', 0.0, -2.2)
ceil('estudio/track_spots_ceiling', 2.0, -2.2)
ceil('estudio/track_spots_ceiling', -2.0, 1.8)
ceil('estudio/track_spots_ceiling', 2.0, 1.8)

export const estudio: RoomLayout = {
  id: 'estudio',
  poi: 'estudio-fotos',
  label: 'Estúdio de Fotos',
  slot: 4,
  w: W,
  d: D,
  h: H,
  wall: '#b9bbbe',
  wainscot: '#2a2b2d',
  wainH: 0.9,
  ceiling: '#2b2c2e',
  trimColor: '#1f2021',
  floor: { kind: 'concrete', a: '#74767a', b: '#5a5c60', tile: 2 },
  palette: {
    base: '#8b8d90',
    accent: '#f1f1ef',
    accent2: '#c79a6b',
    soft: '#c9cbcd',
    deep: '#1e1f21',
    white: '#fafafa',
    fabric: '#4a4c50',
    glass: '#dbe3e8',
    glow: '#fff3df',
    glow2: '#ffd9a8',
    leaf: '#5f8a5e',
    metal: '#dfe2e6',
  },
  items: b.items,
  actions: {
    'estudio/camera_tripod_pro:camera': { type: 'minigame', id: 'foto', label: 'Ensaio Fotográfico (minijogo)' },
    'estudio/backdrop_roll_stand:pose': { type: 'minigame', id: 'foto', label: 'Posar: Ensaio Fotográfico' },
    'estudio/screen_changing_folding:change': { type: 'menu', tab: 'guardaroupa', label: 'Trocar de roupa' },
    'estudio/desk_monitor_station:edit': { type: 'toast', text: 'Edição de fotos', sub: 'As fotos do ensaio ficam salvas no seu perfil.', label: 'Ver fotos' },
  },
  uses: [],
  lights: [
    { x: 0, y: 3.2, z: -2.2, color: '#fff3e0', intensity: 30, distance: 10 },
    { x: 0, y: 3.2, z: 2.0, color: '#fff3e0', intensity: 22, distance: 10 },
    { x: -4.6, y: 2.6, z: -0.5, color: '#ffe3c0', intensity: 12, distance: 7 },
    { x: 4.0, y: 2.6, z: 1.0, color: '#ffe3c0', intensity: 10, distance: 7 },
  ],
  hemi: { sky: '#f4f4f2', ground: '#7d7f82', intensity: 0.55 },
  exposure: 0.8,
  envIntensity: 0.45,
  windows: [{ wall: 'E', at: 0.8, w: 2.8, h: 1.8, y: 1.1 }],
  npcs: [
    npc('fotografa', -0.6, 2.3, 0, 'idle', { hair: 'hair.platinumUndercut', hairColor: '#2a2a2e', suit: '#1e1f21', skin: SKINS[2], top: 'tank', line: 'Vamos fazer um ensaio? A luz está perfeita.' }),
    npc('modelo', 0.2, -2.4, 0, 'idle', { hair: 'hair.chestnutWaves', hairColor: '#3a2417', suit: '#c79a6b', skin: SKINS[3], line: 'Posso trocar de look rapidinho?' }),
  ],
  ambient: 'studio',
}
