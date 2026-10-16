import type { ClipName } from '../character/animation/animator'
import type { EmoteId } from '../character/animation/emoteStore'
import type { MenuTab } from '../../state/uiStore'
import type { ShopId } from '../economy/types'

/** Slots de material dos GLBs de interiores (nomes "base.003" -> "base"). */
export type SlotName = 'base' | 'accent' | 'accent2' | 'soft' | 'deep' | 'white' | 'fabric' | 'trim' | 'glass' | 'glow' | 'glow2' | 'leaf'

export interface RoomPalette {
  base: string
  accent: string
  accent2: string
  soft: string
  deep: string
  white: string
  fabric: string
  glass: string
  glow: string
  glow2?: string
  leaf?: string
  /** metal do slot "trim" */
  metal: string
  metalRough?: number
}

export type FloorKind = 'checker' | 'wood' | 'marble' | 'lacquer' | 'concrete' | 'dance' | 'carpet'

export interface FloorStyle {
  kind: FloorKind
  a: string
  b: string
  /** metros por repeticao do desenho */
  tile?: number
}

/** Posicao de uma peca do kit na sala. Coordenadas locais da sala (centro em 0,0; chao em y=0). */
export interface Item {
  /** chave do catalogo, ex.: 'cafe/counter_service' */
  p: string
  x: number
  z: number
  /** graus; 0 = frente da peca para +Z (para a porta) */
  r?: number
  /** altura (tampos de mesa, pecas de teto = pe-direito) */
  y?: number
  s?: number
  /** paleta alternativa (chave de layout.palettes) */
  pal?: string
  /** nao cria colisor */
  noCol?: boolean
  /** id para referenciar em `actions` */
  id?: string
}

export type Action =
  | { type: 'minigame'; id: string; label?: string }
  | { type: 'shop'; id: ShopId; label?: string }
  | { type: 'menu'; tab: MenuTab; label?: string }
  | { type: 'sleep'; label?: string }
  | { type: 'emote'; clip: EmoteId; label?: string }
  | { type: 'toast'; text: string; sub?: string; label?: string }

export interface UseSpot {
  /** chave do catalogo + id do `use` do kit (ex.: 'cafe/counter_service:order') ou id proprio */
  key: string
  label: string
  /** posicao do jogador (local da sala) e direcao do olhar */
  x: number
  z: number
  /** raio de ativacao (m) */
  radius?: number
  action: Action
}

export interface LightDef {
  x: number
  y: number
  z: number
  color: string
  intensity: number
  distance: number
}

export interface NpcDef {
  id: string
  x: number
  z: number
  /** graus; 0 = olhando para +Z */
  r: number
  clip: ClipName
  hair: string
  hairColor: string
  skin: string
  suit: string
  top?: string
  bottom?: string
  dress?: string
  /** fala curta ao apertar [E] perto */
  line?: string
  y?: number
}

export type AmbientKind = 'cafe' | 'salon' | 'boutique' | 'jewel' | 'studio' | 'club' | 'home' | 'casino'

export interface WindowDef {
  wall: 'N' | 'S' | 'E' | 'W'
  /** deslocamento ao longo da parede */
  at: number
  w: number
  h: number
  y: number
}

export interface RoomLayout {
  id: string
  /** POI da porta na cidade */
  poi: string
  label: string
  /** indice do espaco no mundo (x = 2000 + 120*slot) */
  slot: number
  w: number
  d: number
  h: number
  wall: string
  /** faixa inferior da parede (lambri) */
  wainscot?: string
  wainH?: number
  ceiling: string
  trimColor: string
  floor: FloorStyle
  palette: RoomPalette
  palettes?: Record<string, RoomPalette>
  items: Item[]
  lights: LightDef[]
  /** luz ambiente (hemisferio) */
  hemi: { sky: string; ground: string; intensity: number }
  exposure?: number
  envIntensity?: number
  /** acoes dos pontos de uso do kit: chave 'peca:idDoUse' (ex.: 'cafe/counter_service:order') */
  actions: Record<string, Action>
  /** pontos de uso proprios (x,z locais da sala) */
  uses: UseSpot[]
  npcs: NpcDef[]
  windows?: WindowDef[]
  ambient: AmbientKind
  /** posicao de saida (porta, parede S) */
  doorX?: number
  /** tapetes etc. sem colisor: mesmo `items` com noCol */
  /** colisores extras: caixas [cx, cz, sx, sz] */
  blockers?: [number, number, number, number][]
  /** dev: neon/fundo */
  fog?: string
}

export interface PieceInfo {
  file: string
  tris: number
  size: [number, number, number]
  bbox_min: [number, number, number]
  bbox_max: [number, number, number]
  mount: 'floor' | 'wall' | 'ceiling' | 'tabletop'
  walkable?: boolean
  collider?: { type: 'box'; size: [number, number, number]; center: [number, number, number] } | { type: 'cylinder'; radius: number; height: number; center: [number, number, number] }
  sit?: { id: string; pos: [number, number, number]; face: [number, number]; label?: string }[]
  use?: { id: string; pos: [number, number, number]; face: [number, number]; label?: string }[]
  lights?: { pos: [number, number, number]; color: string; range: number; intensity: number }[]
}
