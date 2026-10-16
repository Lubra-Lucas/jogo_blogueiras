import type { Seat } from '../sit/seats'
import type { Action, Item, NpcDef, PieceInfo, RoomLayout } from './types'
import type { Catalog } from './catalog'

export const ROOM_X0 = 2000
export const ROOM_DX = 120

export const roomOrigin = (l: RoomLayout): [number, number] => [ROOM_X0 + l.slot * ROOM_DX, 0]

export interface Placed {
  item: Item
  info: PieceInfo
  x: number
  y: number
  z: number
  rot: number
  s: number
}

export interface ColliderDef {
  pos: [number, number, number]
  half: [number, number, number]
  rot: number
  cyl?: boolean
}

export interface Spot {
  key: string
  label: string
  /** mundo */
  x: number
  z: number
  radius: number
  yaw: number
  action: Action | 'exit' | 'talk'
  line?: string
}

export interface Resolved {
  layout: RoomLayout
  ox: number
  oz: number
  placed: Placed[]
  colliders: ColliderDef[]
  seats: Seat[]
  spots: Spot[]
  /** retangulos orientados de bloqueio (mundo): cx, cz, hx, hz, rot */
  rects: [number, number, number, number, number][]
  spawn: { x: number; z: number; yaw: number }
}

const rad = (d: number) => (d * Math.PI) / 180

/** local da peca -> local da sala (rotacao em Y do three: x' = x cos + z sin ; z' = -x sin + z cos) */
function xf(p: Placed, lx: number, lz: number): [number, number] {
  const c = Math.cos(p.rot)
  const s = Math.sin(p.rot)
  return [p.x + (lx * c + lz * s) * p.s, p.z + (-lx * s + lz * c) * p.s]
}

export function pieceLabel(key: string): string {
  return key
}

export function resolveRoom(layout: RoomLayout, cat: Catalog, actions: Record<string, Action>): Resolved {
  const [ox, oz] = roomOrigin(layout)
  const placed: Placed[] = []
  for (const it of layout.items) {
    const info = cat.pieces[it.p]
    if (!info) {
      console.warn('[interiors] peca desconhecida', it.p)
      continue
    }
    const y = it.y ?? (info.mount === 'ceiling' ? layout.h : 0)
    placed.push({ item: it, info, x: it.x, y, z: it.z, rot: rad(it.r ?? 0), s: it.s ?? 1 })
  }

  const colliders: ColliderDef[] = []
  const rects: Resolved['rects'] = []
  const seats: Seat[] = []
  const spots: Spot[] = []

  const dummyBench = { id: -1, kind: 'bubble' as const, x: 0, z: 0, rot: 0 }

  for (const p of placed) {
    const { info } = p
    const col = info.collider
    if (col && !p.item.noCol && info.mount !== 'ceiling' && info.mount !== 'tabletop' && !info.walkable) {
      if (col.type === 'box') {
        let [sx, sy, sz] = col.size
        let [cx, cy, cz] = col.center
        // pecas de sentar: o colisor para na altura do assento (a frente fica livre para sentar/levantar)
        const sit = info.sit
        if (sit && sit.length && sit.every((h) => h.face[1] > 0.5) && !/massage_bed|dryer/.test(p.item.p)) {
          const zmax = Math.min(...sit.map((h) => h.pos[2])) + 0.25
          const zmin = cz - sz / 2
          const zTop = Math.min(cz + sz / 2, zmax)
          if (zTop > zmin + 0.1) {
            sz = zTop - zmin
            cz = zmin + sz / 2
          }
        }
        const [wx, wz] = xf(p, cx, cz)
        colliders.push({ pos: [wx, p.y + cy * p.s, wz], half: [(sx * p.s) / 2, (sy * p.s) / 2, (sz * p.s) / 2], rot: p.rot })
        rects.push([wx, wz, (sx * p.s) / 2, (sz * p.s) / 2, p.rot])
      } else {
        const [wx, wz] = xf(p, col.center[0], col.center[2])
        const r = col.radius * p.s
        colliders.push({ pos: [wx, p.y + (col.height * p.s) / 2, wz], half: [r, (col.height * p.s) / 2, r], rot: 0, cyl: true })
        rects.push([wx, wz, r, r, 0])
      }
    }
    for (const h of info.sit ?? []) {
      const [sx, sz] = xf(p, h.pos[0], h.pos[2])
      const fc = Math.cos(p.rot)
      const fs = Math.sin(p.rot)
      const fx = h.face[0] * fc + h.face[1] * fs
      const fz = -h.face[0] * fs + h.face[1] * fc
      const yaw = Math.atan2(fx, fz)
      seats.push({
        id: `i:${p.item.p}:${h.id}:${p.x.toFixed(2)},${p.z.toFixed(2)}`,
        bench: dummyBench,
        x: ox + sx,
        z: oz + sz,
        y: p.y + h.pos[1] * p.s,
        yaw,
        ax: ox + sx + Math.sin(yaw) * 0.95,
        az: oz + sz + Math.cos(yaw) * 0.95,
        label: h.label && /Deitar|Lavar/.test(h.label) ? 'Descansar' : 'Sentar',
        simple: true,
      })
    }
    for (const h of info.use ?? []) {
      const key = `${p.item.p}:${h.id}`
      const act = actions[p.item.id ? `${p.item.id}:${h.id}` : key] ?? actions[key]
      if (!act) continue
      const [ux, uz] = xf(p, h.pos[0], h.pos[2])
      const fc = Math.cos(p.rot)
      const fs = Math.sin(p.rot)
      const fx = h.face[0] * fc + h.face[1] * fs
      const fz = -h.face[0] * fs + h.face[1] * fc
      spots.push({
        key: `${key}@${p.x.toFixed(1)},${p.z.toFixed(1)}`,
        label: act.label ?? h.label ?? 'Usar',
        x: ox + ux,
        z: oz + uz,
        radius: 1.2,
        yaw: Math.atan2(fx, fz),
        action: act,
      })
    }
  }

  for (const s of layout.uses) {
    spots.push({ key: s.key, label: s.label, x: ox + s.x, z: oz + s.z, radius: s.radius ?? 1.3, yaw: 0, action: s.action })
  }
  for (const b of layout.blockers ?? []) {
    colliders.push({ pos: [b[0], 1, b[1]], half: [b[2] / 2, 1, b[3] / 2], rot: 0 })
    rects.push([b[0], b[1], b[2] / 2, b[3] / 2, 0])
  }

  const doorX = layout.doorX ?? 0
  const doorZ = layout.d / 2
  spots.push({ key: '__exit', label: 'Sair', x: ox + doorX, z: oz + doorZ - 0.9, radius: 1.5, yaw: 0, action: 'exit' })
  for (const n of layout.npcs) {
    if (!n.line) continue
    spots.push({ key: `npc:${n.id}`, label: 'Conversar', x: ox + n.x, z: oz + n.z, radius: 2.1, yaw: 0, action: 'talk', line: n.line })
  }
  // a frente do assento pode estar bloqueada (banqueta no balcao): escolhe o lado livre
  for (const s of seats) {
    const cand: [number, number][] = [
      [Math.sin(s.yaw), Math.cos(s.yaw)],
      [-Math.sin(s.yaw), -Math.cos(s.yaw)],
      [Math.cos(s.yaw), -Math.sin(s.yaw)],
      [-Math.cos(s.yaw), Math.sin(s.yaw)],
    ]
    for (const [dx, dz] of cand) {
      const ax = s.x + dx * 0.95
      const az = s.z + dz * 0.95
      if (freeAt(rects, ox, oz, ax, az, 0.3, layout)) {
        s.ax = ax
        s.az = az
        break
      }
    }
  }

  const sp = {
    x: ox + doorX,
    z: oz + layout.d / 2 - 2.0,
    yaw: Math.PI,
  }
  return { layout, ox, oz, placed, colliders, seats, spots, rects, spawn: sp }
}

/** ponto livre de colisores e paredes (mundo)? */
export function freeAt(rects: Resolved['rects'], ox: number, oz: number, x: number, z: number, r: number, l: RoomLayout): boolean {
  if (Math.abs(x - ox) > l.w / 2 - r || Math.abs(z - oz) > l.d / 2 - r) return false
  for (const [cx, cz, hx, hz, rot] of rects) {
    const dx = x - (ox + cx)
    const dz = z - (oz + cz)
    const c = Math.cos(rot)
    const s = Math.sin(rot)
    const lx = dx * c - dz * s
    const lz = dx * s + dz * c
    if (Math.abs(lx) < hx + r && Math.abs(lz) < hz + r) return false
  }
  return true
}

export type { NpcDef }
