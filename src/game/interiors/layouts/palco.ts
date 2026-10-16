import type { RoomLayout } from '../types'
import { builder, npc, SKINS } from './helpers'

const W = 16
const D = 12
const H = 5.6
const b = builder(W, D, H)
const { add, wall, ceil } = b

// palco ao norte com cabine de DJ e paineis de LED
add('palco/stage_platform_4m', -0.45, -4.5, 0)
add('palco/dj_booth_neon', 0, -4.7, 0, { y: 0.62 })
add('palco/mic_stand_stage', 2.2, -3.6, 0, { y: 0.62 })
add('palco/speaker_stack_neon', -3.4, -5.0, 10)
add('palco/speaker_stack_neon', 3.4, -5.0, -10)
wall('palco/stage_curtain_velvet', 'N', 0)
wall('palco/led_wall_panel_2m', 'N', -3.6, { y: 0 })
wall('palco/led_wall_panel_2m', 'N', 3.6, { y: 0 })
ceil('palco/truss_lights_rig', 0, -3.0)
ceil('palco/truss_lights_rig', 0, 0.0)
ceil('palco/disco_ball_mirrored', 0, 0.8)
ceil('palco/neon_stars_cluster', -4.5, 1.5)
ceil('palco/neon_stars_cluster', 4.5, 1.5)

// bar a leste
add('palco/bar_counter_neon', 6.2, -0.6, 270)
add('palco/stool_bar_neon', 5.0, -1.8, 90)
add('palco/stool_bar_neon', 5.0, -0.6, 90)
add('palco/stool_bar_neon', 5.0, 0.6, 90)
wall('palco/sign_neon_heart_big', 'E', -4.5)

add('palco/vip_booth', -6.5, -3.4, 90)
b.top('palco/champagne_bucket', -5.8, -3.4, 0.43)
add('palco/cocktail_table_high', 3.4, 2.2, 0)
add('palco/cocktail_table_high', -2.0, 2.8, 0)
add('palco/cocktail_table_high', 2.4, 4.4, 0)
for (const [x, z] of [[-7.4, -5.4], [7.4, -5.4], [7.4, 5.2], [-7.4, 5.2]]) add('palco/led_column', x, z, 0)

// lounge a oeste
add('palco/sofa_lounge_curved', -6.6, 0.8, 90)
add('palco/table_lounge_glow', -5.0, 0.8, 90)
add('palco/pouf_lounge_neon', -4.3, -0.6, 70)
add('palco/pouf_lounge_neon', -4.3, 2.2, 110)
add('palco/sofa_lounge_curved', -6.6, 4.0, 90)
add('palco/table_lounge_glow', -5.0, 4.0, 90)

// entrada
add('palco/neon_arch_gate', 0, 3.6, 0, { noCol: true })
wall('palco/led_wall_panel_2m', 'W', -4.0)
wall('palco/led_wall_panel_2m', 'W', -2.0, { y: 0 })

export const palco: RoomLayout = {
  id: 'palco',
  poi: 'palco-neon',
  label: 'Palco Neon',
  slot: 5,
  w: W,
  d: D,
  h: H,
  wall: '#171a26',
  wainscot: '#232a45',
  wainH: 1.2,
  ceiling: '#0d0f16',
  trimColor: '#3a4468',
  floor: { kind: 'dance', a: '#10121a', b: '#2fe3ff', tile: 2 },
  palette: {
    base: '#1e212c',
    accent: '#2a3350',
    accent2: '#3b6bff',
    soft: '#3a3f52',
    deep: '#0d0f14',
    white: '#e8ecf6',
    fabric: '#2b3558',
    glass: '#9fd8ff',
    glow: '#ff4fd0',
    glow2: '#38e8ff',
    leaf: '#4f7a55',
    metal: '#c9ced9',
  },
  items: b.items,
  actions: {
    'palco/bar_counter_neon:bar': { type: 'toast', text: 'Suco neon', sub: 'Um copo gelado de maracujá e hortelã.', label: 'Pedir um suco' },
  },
  uses: [
    { key: 'dj', label: 'Tocar como DJ (minijogo)', x: 0, z: -2.5, radius: 1.5, action: { type: 'minigame', id: 'dj' } },
    { key: 'dance', label: 'Dançar na pista', x: -2.6, z: -2.4, radius: 1.3, action: { type: 'emote', clip: 'dance' } },
  ],
  lights: [
    { x: -3, y: 4.4, z: -3, color: '#ff4fd0', intensity: 38, distance: 11 },
    { x: 3, y: 4.4, z: -3, color: '#38e8ff', intensity: 38, distance: 11 },
    { x: 0, y: 4.4, z: 1.0, color: '#7a5cff', intensity: 30, distance: 12 },
    { x: 5.5, y: 2.6, z: -0.6, color: '#38e8ff', intensity: 14, distance: 7 },
    { x: -5.2, y: 2.4, z: 2.4, color: '#ff4fd0', intensity: 14, distance: 8 },
  ],
  hemi: { sky: '#5a5fa8', ground: '#1a1530', intensity: 0.6 },
  exposure: 1.1,
  envIntensity: 0.35,
  npcs: [
    npc('pista1', -1.8, 0.4, 20, 'dance_twerk', { hair: 'hair.caramelCurls', hairColor: '#2a1a40', suit: '#3b6bff', skin: SKINS[2], line: 'Essa batida está demais!' }),
    npc('pista2', 1.9, 1.2, 200, 'clap', { hair: 'hair.chestnutWaves', hairColor: '#15233f', suit: '#e8ecf6', skin: SKINS[0] }),
    npc('barman', 7.0, -0.6, 270, 'idle', { hair: 'hair.platinumUndercut', hairColor: '#e8dcc8', suit: '#0d0f14', skin: SKINS[3], line: 'Hoje o suco neon é por conta da casa.' }),
  ],
  ambient: 'club',
}
