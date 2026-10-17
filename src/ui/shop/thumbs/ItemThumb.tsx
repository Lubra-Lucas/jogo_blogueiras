import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Appearance } from '../../../shared/appearance'
import { requestThumb, peekThumb, thumbKey, type ThumbSpec } from './thumbRenderer'

/** Observa a visibilidade (um IntersectionObserver por elemento; margem para comecar um pouco antes de entrar na tela). */
function useVisible(ref: React.RefObject<Element | null>): boolean {
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setVis(true)
      return
    }
    const io = new IntersectionObserver((es) => setVis(es.some((e) => e.isIntersecting)), { rootMargin: '120px' })
    io.observe(el)
    return () => io.disconnect()
  }, [ref])
  return vis
}

/** Cores/acabamentos/estampa que a peca tem no look atual (se estiver vestida); senao os padroes do manifesto. */
export function specFromAppearance(id: string, a?: Appearance): ThumbSpec {
  if (!a) return { id }
  if (a.hair.id === id) return { id, hair: a.hair }
  const ref = Object.values(a.outfit).find((r) => r?.id === id) ?? a.accessories.find((r) => r.id === id)
  return ref ? { id, colors: ref.colors, finishes: ref.finishes, pattern: ref.pattern } : { id }
}

/**
 * Miniatura 3D da peca (renderizador compartilhado em `thumbRenderer.ts`). Enquanto nao fica pronta, ou se falhar,
 * mostra `fallback` (o icone do slot). Muda a cor/estampa -> nova chave -> nova miniatura.
 */
export function ItemThumb({ id, appearance, fallback, className }: { id: string; appearance?: Appearance; fallback: ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const visible = useVisible(ref)
  const spec = useMemo(() => specFromAppearance(id, appearance), [id, appearance])
  const key = thumbKey(spec)
  const [url, setUrl] = useState<string | null>(() => peekThumb(key) ?? null)
  useEffect(() => {
    const hit = peekThumb(key)
    if (hit) return setUrl(hit)
    if (!visible) return
    return requestThumb(spec, (u) => setUrl(u)) // spec e derivado da chave
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, visible])
  return (
    <span ref={ref} className={`it-thumb${url ? ' is-ready' : ''}${className ? ` ${className}` : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', borderRadius: 'inherit', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
      {url ? <img src={url} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 'inherit', pointerEvents: 'none', filter: 'drop-shadow(0 1px 1.5px rgba(70, 40, 80, 0.3))' }} /> : fallback}
    </span>
  )
}
