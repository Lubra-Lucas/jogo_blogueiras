import { useEffect, useState, type ReactNode } from 'react'
import { useAppearanceStore } from '../../state/appearanceStore'
import { IconSave } from './icons'
import type { StageFocus } from './CharacterPreview'
import { BodySection, BrowsSection, EyesSection, FaceSection, HairSection, LipsSection, LooksSection, MakeupSection, NailsSection, SkinSection } from './appearance/sections'
import { CIconBody, CIconBrow, CIconCompare, CIconDice, CIconEye, CIconFace, CIconHair, CIconLips, CIconLooks, CIconMakeup, CIconNail, CIconRedo, CIconSkin, CIconUndo } from './appearance/icons'
import { randomLook } from './appearance/random'
import './appearance/appearance.css'

type Cat = 'looks' | 'rosto' | 'olhos' | 'sobrancelhas' | 'labios' | 'maquiagem' | 'pele' | 'corpo' | 'cabelo' | 'unhas'

/** Categorias do criador: o enquadramento da camera acompanha (close no rosto ao editar rosto/maquiagem). */
const CATS: Array<{ id: Cat; label: string; focus: StageFocus; icon: ReactNode; view: () => ReactNode }> = [
  { id: 'looks', label: 'Looks', focus: 'body', icon: <CIconLooks />, view: () => <LooksSection /> },
  { id: 'rosto', label: 'Rosto', focus: 'face', icon: <CIconFace />, view: () => <FaceSection /> },
  { id: 'olhos', label: 'Olhos', focus: 'eyes', icon: <CIconEye />, view: () => <EyesSection /> },
  { id: 'sobrancelhas', label: 'Sobrancelhas', focus: 'eyes', icon: <CIconBrow />, view: () => <BrowsSection /> },
  { id: 'labios', label: 'Lábios', focus: 'mouth', icon: <CIconLips />, view: () => <LipsSection /> },
  { id: 'maquiagem', label: 'Maquiagem', focus: 'face', icon: <CIconMakeup />, view: () => <MakeupSection /> },
  { id: 'pele', label: 'Pele', focus: 'torso', icon: <CIconSkin />, view: () => <SkinSection /> },
  { id: 'corpo', label: 'Corpo', focus: 'body', icon: <CIconBody />, view: () => <BodySection /> },
  { id: 'cabelo', label: 'Cabelo', focus: 'hair', icon: <CIconHair />, view: () => <HairSection /> },
  { id: 'unhas', label: 'Unhas', focus: 'hands', icon: <CIconNail />, view: () => <NailsSection /> },
]

export function AppearanceTab({ onFocus }: { onFocus: (f: StageFocus) => void }) {
  const [cat, setCat] = useState<Cat>('rosto')
  const appearance = useAppearanceStore((s) => s.appearance)
  const saved = useAppearanceStore((s) => s.saved)
  const past = useAppearanceStore((s) => s.past.length)
  const future = useAppearanceStore((s) => s.future.length)
  const compare = useAppearanceStore((s) => s.compare)
  const setCompare = useAppearanceStore((s) => s.setCompare)
  const save = useAppearanceStore((s) => s.save)
  const revert = useAppearanceStore((s) => s.revert)
  const undo = useAppearanceStore((s) => s.undo)
  const redo = useAppearanceStore((s) => s.redo)
  const [justSaved, setJustSaved] = useState(false)

  const dirty = JSON.stringify(appearance) !== JSON.stringify(saved)
  const cur = CATS.find((c) => c.id === cat)!

  // ao sair da aba, o antes/depois desliga
  useEffect(() => () => useAppearanceStore.getState().setCompare(false), [])
  // Ctrl+Z / Ctrl+Shift+Z (fora de campos de texto)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.code !== 'KeyZ') return
      const t = e.target
      if (t instanceof HTMLElement && /^(INPUT|TEXTAREA)$/.test(t.tagName) && (t as HTMLInputElement).type !== 'range') return
      e.preventDefault()
      if (e.shiftKey) useAppearanceStore.getState().redo()
      else useAppearanceStore.getState().undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = (c: (typeof CATS)[number]) => {
    setCat(c.id)
    onFocus(c.focus)
  }

  return (
    <div className="cc">
      <div className="cc__rail" role="tablist" aria-label="Categorias da aparência">
        {CATS.map((c) => (
          <button key={c.id} type="button" role="tab" className="cc__cat" aria-selected={cat === c.id} onClick={() => go(c)}>
            {c.icon}
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      <div className="cc__tools" role="toolbar" aria-label="Ferramentas">
        <button type="button" className="cc__tool" disabled={!past} onClick={undo} title="Desfazer (Ctrl+Z)">
          <CIconUndo />
          <span>Desfazer</span>
        </button>
        <button type="button" className="cc__tool" disabled={!future} onClick={redo} title="Refazer (Ctrl+Shift+Z)">
          <CIconRedo />
          <span>Refazer</span>
        </button>
        <button type="button" className="cc__tool" aria-pressed={compare} disabled={!dirty && !compare} onClick={() => setCompare(!compare)} title="Alterna entre o look salvo e o atual">
          <CIconCompare />
          <span>{compare ? 'Vendo o salvo' : 'Antes/depois'}</span>
        </button>
        <button type="button" className="cc__tool" onClick={() => useAppearanceStore.getState().setAppearance(randomLook(useAppearanceStore.getState().appearance, 'all'))} title="Sorteia rosto, corpo, cabelo e maquiagem">
          <CIconDice />
          <span>Aleatório</span>
        </button>
      </div>

      <div className="cc__body" key={cat}>
        <h3 className="cc__title">{cur.label}</h3>
        {cur.view()}
      </div>

      <div className="actions cc__foot">
        <button type="button" className="btn btn--primary" disabled={!dirty} onClick={() => (save(), setJustSaved(true), window.setTimeout(() => setJustSaved(false), 1800))}>
          <IconSave /> {justSaved && !dirty ? 'Salvo!' : 'Salvar'}
        </button>
        <button type="button" className="btn" disabled={!dirty} onClick={revert}>
          Voltar ao salvo
        </button>
        {dirty && <span className="unsaved">Alterações não salvas</span>}
      </div>
    </div>
  )
}
