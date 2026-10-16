import { DEFAULT_APPEARANCE, sanitizeAppearance, type Appearance } from '../shared/appearance'
import { editionBaseItemIds } from '../game/economy/api'
import { useProfileStore } from './profileStore'

/**
 * Codigo de compartilhamento de look: "JB4-<base64url do JSON so com o que difere do padrao>-<2 caracteres de checagem>".
 * Importar valida tudo (`sanitizeAppearance`) e remove pecas que a jogadora nao possui (o look nunca da itens de graca).
 */

function diff(a: unknown, d: unknown): unknown {
  if (a && d && typeof a === 'object' && typeof d === 'object' && !Array.isArray(a) && !Array.isArray(d)) {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(a as object)) {
      const v = diff((a as Record<string, unknown>)[k], (d as Record<string, unknown>)[k])
      if (v !== undefined) out[k] = v
    }
    return Object.keys(out).length ? out : undefined
  }
  return JSON.stringify(a) === JSON.stringify(d) ? undefined : a
}

function b64(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function unb64(s: string): string {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}
function check(s: string): string {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return ((h >>> 0) % 1296).toString(36).padStart(2, '0')
}

export function encodeLook(a: Appearance): string {
  const d = diff(a, DEFAULT_APPEARANCE) ?? {}
  const body = b64(JSON.stringify(d))
  return `JB4-${body}-${check(body)}`
}

/** Itens da aparencia que a jogadora nao possui (ids). */
export function ownedSet(): Set<string> {
  return new Set([...useProfileStore.getState().owned, ...editionBaseItemIds()])
}

/** Remove pecas nao possuidas (cabelo, roupas, acessorios). */
export function stripUnowned(a: Appearance, owned: Set<string> = ownedSet()): Appearance {
  const outfit: Appearance['outfit'] = {}
  for (const [k, r] of Object.entries(a.outfit)) if (r && owned.has(r.id)) outfit[k as keyof Appearance['outfit']] = r
  return { ...a, outfit, hair: a.hair.id && !owned.has(a.hair.id) ? { ...a.hair, id: DEFAULT_APPEARANCE.hair.id } : a.hair, accessories: a.accessories.filter((r) => owned.has(r.id)) }
}

export type DecodeResult = { ok: true; appearance: Appearance; dropped: number } | { ok: false; error: string }

export function decodeLook(code: string): DecodeResult {
  const m = /^JB4-([A-Za-z0-9_-]+)-([0-9a-z]{2})$/.exec(code.trim())
  if (!m) return { ok: false, error: 'Código inválido. Ele começa com JB4-.' }
  if (check(m[1]) !== m[2]) return { ok: false, error: 'Código incompleto ou alterado.' }
  try {
    const raw = JSON.parse(unb64(m[1])) as unknown
    const merged = mergeOver(DEFAULT_APPEARANCE, raw)
    const a = sanitizeAppearance(merged)
    if (!a) return { ok: false, error: 'Código sem aparência.' }
    const stripped = stripUnowned(a)
    const count = (x: Appearance) => Object.keys(x.outfit).length + x.accessories.length + (x.hair.id ? 1 : 0)
    return { ok: true, appearance: stripped, dropped: count(a) - count(stripped) }
  } catch {
    return { ok: false, error: 'Não consegui ler esse código.' }
  }
}

function mergeOver(base: unknown, over: unknown): unknown {
  if (over && typeof over === 'object' && !Array.isArray(over) && base && typeof base === 'object' && !Array.isArray(base)) {
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
    for (const k of Object.keys(over)) if (k !== '__proto__' && k !== 'constructor') out[k] = mergeOver((base as Record<string, unknown>)[k], (over as Record<string, unknown>)[k])
    return out
  }
  return over === undefined ? base : over
}
