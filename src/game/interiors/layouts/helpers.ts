import type { Item, NpcDef } from '../types'

/** Construtor de itens para uma sala w x d: paredes N(-z) S(+z, porta) W(-x) E(+x). 0 graus = frente para +Z. */
export function builder(w: number, d: number, h: number) {
  const items: Item[] = []
  const add = (p: string, x: number, z: number, r = 0, extra: Partial<Item> = {}) => {
    items.push({ p, x, z, r, ...extra })
    return items[items.length - 1]
  }
  const wall = (p: string, side: 'N' | 'S' | 'W' | 'E', at: number, extra: Partial<Item> = {}) => {
    const it: Item =
      side === 'N' ? { p, x: at, z: -d / 2, r: 0 } : side === 'S' ? { p, x: at, z: d / 2, r: 180 } : side === 'W' ? { p, x: -w / 2, z: at, r: 90 } : { p, x: w / 2, z: at, r: 270 }
    items.push({ ...it, noCol: true, ...extra })
    return it
  }
  const ceil = (p: string, x: number, z: number, extra: Partial<Item> = {}) => {
    items.push({ p, x, z, y: h, noCol: true, ...extra })
  }
  /** pecas de apoio sobre tampo */
  const top = (p: string, x: number, z: number, y: number, r = 0, extra: Partial<Item> = {}) => {
    items.push({ p, x, z, y, r, noCol: true, ...extra })
  }
  return { items, add, wall, ceil, top }
}

export const SKINS = ['#efcdbd', '#d9a98a', '#b57e5b', '#8a5a3c', '#f3d9c8']

export function npc(id: string, x: number, z: number, r: number, clip: NpcDef['clip'], o: Partial<NpcDef> = {}): NpcDef {
  return { id, x, z, r, clip, hair: 'hair.chestnutWaves', hairColor: '#3a2417', skin: SKINS[0], suit: '#2a2d3a', ...o }
}
