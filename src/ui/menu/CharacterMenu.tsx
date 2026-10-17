import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { useUiStore, type MenuTab } from '../../state/uiStore'
import { useProfileStore } from '../../state/profileStore'
import { useAppearanceStore } from '../../state/appearanceStore'
import { unownedWorn } from '../shop/tryon'
import { CharacterPreview, type StageFocus } from './CharacterPreview'
import { ProfileTab } from './ProfileTab'
import { AppearanceTab } from './AppearanceTab'
import { WardrobeTab } from './WardrobeTab'
import { SettingsTab } from './SettingsTab'
import { IconBrush, IconClose, IconGear, IconHanger, IconUser } from './icons'
import './menu.css'

/** `?editor=1` (ou `?view=character`) abre o menu direto na aba Aparencia. */
export function editorEnabled(): boolean {
  const q = new URLSearchParams(window.location.search)
  return q.get('editor') === '1'
}

const TABS: Array<{ id: MenuTab; label: string; color: string; icon: ReactNode; stage: boolean }> = [
  { id: 'perfil', label: 'Perfil', color: '#d9789f', icon: <IconUser />, stage: true },
  { id: 'aparencia', label: 'Aparência', color: '#7d63b0', icon: <IconBrush />, stage: true },
  { id: 'guardaroupa', label: 'Guarda-roupa', color: '#3a9f8a', icon: <IconHanger />, stage: true },
  { id: 'config', label: 'Ajustes', color: '#4b8fcf', icon: <IconGear />, stage: false },
]

const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))

/** Atalhos: C / Tab abre e fecha, Esc fecha. */
/** ha alteracoes de aparencia nao salvas (inclui pecas apenas provadas) */
const isDirty = () => {
  const { appearance, saved } = useAppearanceStore.getState()
  return appearance !== saved && JSON.stringify(appearance) !== JSON.stringify(saved)
}

function useMenuHotkeys(tryClose: () => void) {
  const ref = useRef(tryClose)
  ref.current = tryClose
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (useUiStore.getState().menuOpen) ref.current()
        return
      }
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.code === 'Tab') {
        if (isTyping(e.target) && !useUiStore.getState().menuOpen) return
        e.preventDefault()
        if (useUiStore.getState().menuOpen) ref.current()
        else useUiStore.getState().openMenu()
      } else if (e.code === 'KeyC' && !isTyping(e.target)) {
        if (useUiStore.getState().menuOpen) ref.current()
        else useUiStore.getState().openMenu()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

export function CharacterMenu() {
  const [askDiscard, setAskDiscard] = useState(false)
  const tryClose = () => {
    if (isDirty() && useProfileStore.getState().named) setAskDiscard(true)
    else useUiStore.getState().closeMenu()
  }
  useMenuHotkeys(tryClose)
  const open = useUiStore((s) => s.menuOpen)
  const tab = useUiStore((s) => s.tab)
  const setTab = useUiStore((s) => s.setTab)
  const close = tryClose
  const named = useProfileStore((s) => s.named)
  const [mounted, setMounted] = useState(false)
  const [closing, setClosing] = useState(false)
  const [focus, setFocus] = useState<StageFocus>('body')
  const rot = useRef({ yaw: 0 })
  const drag = useRef<{ x: number; yaw: number } | null>(null)

  // animacao de saida: mantem montado ~200 ms depois de fechar
  useEffect(() => {
    if (open) {
      setMounted(true)
      setClosing(false)
      return
    }
    setClosing(true)
    setAskDiscard(false)
    // fechou sem salvar (por qualquer caminho): o look salvo volta para a personagem
    if (isDirty()) useAppearanceStore.getState().revert()
    const t = window.setTimeout(() => setMounted(false), 200)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (tab === 'perfil' || tab === 'guardaroupa') setFocus('body')
    if (tab === 'aparencia') setFocus('face')
  }, [tab])

  // ?editor=1: abre na aba Aparencia
  useEffect(() => {
    if (editorEnabled()) useUiStore.getState().openMenu('aparencia')
  }, [])

  if (!mounted) return null
  const cur = TABS.find((t) => t.id === tab)!

  return (
    <div className={`menu-root${closing ? ' menu-root--closing' : ''}`} onPointerDown={(e) => e.target === e.currentTarget && close()} role="dialog" aria-modal="true" aria-label="Menu da personagem">
      <div className="menu" data-tab={tab}>
        <div className="menu__inner">
          <div className="menu__head">
            <h2 className="menu__title">{cur.label}</h2>
            <span className="menu__hint">
              <kbd>C</kbd> ou <kbd>Tab</kbd> para fechar
            </span>
            <button type="button" className="icon-btn" aria-label="Fechar menu" onClick={close}>
              <IconClose width={18} height={18} />
            </button>
          </div>
          <div className="tabs" role="tablist">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" className="tab" style={{ ['--c' as string]: t.color }} aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>
          <div className="menu__body">
            <div
              className={`menu__stage${cur.stage ? '' : ' menu__stage--none'}`}
              style={cur.stage ? undefined : { display: 'none' }}
              onPointerDown={(e) => {
                drag.current = { x: e.clientX, yaw: rot.current.yaw }
                e.currentTarget.setPointerCapture(e.pointerId)
              }}
              onPointerMove={(e) => {
                if (drag.current) rot.current.yaw = drag.current.yaw + (e.clientX - drag.current.x) * 0.012
              }}
              onPointerUp={() => (drag.current = null)}
              onPointerCancel={() => (drag.current = null)}
            >
              {cur.stage && (
                <Suspense fallback={<div className="stage__loading">Carregando...</div>}>
                  <CharacterPreview focus={focus} rot={rot} />
                </Suspense>
              )}
              <div className="stage__views" onPointerDown={(e) => e.stopPropagation()}>
                {(['body', 'face'] as const).map((f) => (
                  <button key={f} type="button" className="icon-btn" aria-pressed={focus === f} aria-label={f === 'body' ? 'Ver corpo' : 'Ver rosto'} onClick={() => ((rot.current.yaw = 0), setFocus(f))}>
                    {f === 'body' ? 'C' : 'R'}
                  </button>
                ))}
              </div>
              <div className="stage__tip">Arraste para girar</div>
            </div>
            <div className="menu__content">
              {tab === 'perfil' && <ProfileTab />}
              {tab === 'aparencia' && <AppearanceTab onFocus={setFocus} />}
              {tab === 'guardaroupa' && <WardrobeTab />}
              {tab === 'config' && <SettingsTab />}
            </div>
          </div>
        </div>
        {!named && <NameModal />}
        {askDiscard && (
          <div className="modal">
            <div className="modal__box">
              <h3>Descartar alterações?</h3>
              <p>Seu visual ainda não foi salvo. Se fechar agora, a personagem volta ao último look salvo.</p>
              <div className="actions">
                {unownedWorn(useAppearanceStore.getState().appearance).length === 0 && (
                  <button type="button" className="btn btn--primary" autoFocus onClick={() => (useAppearanceStore.getState().save(), useUiStore.getState().closeMenu())}>
                    Salvar look
                  </button>
                )}
                <button type="button" className="btn btn--danger" onClick={() => useUiStore.getState().closeMenu()}>
                  Descartar
                </button>
                <button type="button" className="btn" onClick={() => setAskDiscard(false)}>
                  Continuar editando
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function NameModal() {
  const setName = useProfileStore((s) => s.setName)
  const [v, setV] = useState('')
  const ok = () => setName(v.trim() || 'Blogueira')
  return (
    <div className="modal">
      <div className="modal__box">
        <h3>Bem-vinda!</h3>
        <p>Qual é o seu nome de blogueira?</p>
        <input className="text-input" autoFocus maxLength={20} value={v} placeholder="Blogueira" aria-label="Seu nome" onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ok()} />
        <div className="actions">
          <button type="button" className="btn btn--primary" onClick={ok}>
            Começar
          </button>
          <button type="button" className="btn" onClick={() => setName('Blogueira')}>
            Pular
          </button>
        </div>
      </div>
    </div>
  )
}
