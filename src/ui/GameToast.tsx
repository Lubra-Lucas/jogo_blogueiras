import { useEffect } from 'react'
import { useProfileStore } from '../state/profileStore'
import './menu/menu.css'

/** Aviso de nivel/missao concluida (some sozinho). */
export function GameToast() {
  const toast = useProfileStore((s) => s.toast)
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => useProfileStore.setState((s) => (s.toast?.id === toast.id ? { toast: null } : s)), 4000)
    return () => window.clearTimeout(t)
  }, [toast])
  if (!toast) return null
  return (
    <div key={toast.id} className={`gtoast gtoast--${toast.kind}`} role="status" aria-live="polite">
      <b>{toast.text}</b>
      {toast.sub && <span>{toast.sub}</span>}
    </div>
  )
}
