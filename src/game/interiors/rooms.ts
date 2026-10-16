import type { RoomLayout } from './types'
import { cafe } from './layouts/cafe'
import { salao } from './layouts/salao'
import { boutique } from './layouts/boutique'
import { joalheria } from './layouts/joalheria'
import { estudio } from './layouts/estudio'
import { palco } from './layouts/palco'
import { casa } from './layouts/casa'
import { cassino } from './layouts/cassino'

export const ROOMS: RoomLayout[] = [cafe, salao, boutique, joalheria, estudio, palco, casa, cassino]
export const ROOMS_BY_POI: Record<string, RoomLayout> = Object.fromEntries(ROOMS.map((r) => [r.poi, r]))
export const ROOMS_BY_ID: Record<string, RoomLayout> = Object.fromEntries(ROOMS.map((r) => [r.id, r]))
