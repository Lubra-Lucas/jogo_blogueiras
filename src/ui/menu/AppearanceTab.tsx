import { useEffect, useState, type ReactNode } from 'react'
import { useAppearanceStore } from '../../state/appearanceStore'
import { IconSave } from './icons'
import type { StageFocus } from './CharacterPreview'
import { BodySection, HairSection, LooksSection, MakeupSection, NailsSection, SkinSection } from './appearance/sections'
import { BeardLayerSection, BrowLayerSection, EyeLayerSection, ExtrasSection, FacesSection, GenderBar, LashLayerSection, MouthLayerSection, NoseSection, ShapeSection } from './appearance/layersSections'
import { CIconBody, CIconBrow, CIconCompare, CIconDice, CIconEye, CIconFace, CIconHair, CIconLips, CIconLooks, CIconMakeup, CIconNail, CIconRedo, CIconSkin, CIconUndo } from './appearance/icons'
import { randomLook } from './appearance/random'
import './appearance/appearance.css'

type Cat = 'looks' | 'rostos' | 'formato' | 'olhos' | 'cilios' | 'sobrancelhas' | 'boca' | 'nariz' | 'barba' | 'extras' | 'maquiagem' | 'pele' | 'corpo' | 'cabelo' | 'unhas'

/** Categorias do criador: o enquadramento da camera acompanha (close no rosto ao editar rosto/maquiagem). */
const CATS: Array<{ id: Cat; label: string; focus: StageFocus; icon: ReactNode; view: () => ReactNode; only?: 'female' | 'male' }> = [
  { id: 'looks', label: 'Looks', focus: 'body', icon: <CIconLooks />, view: () => <LooksSection /> },
  { id: 'rostos', label: 'Rostos', focus: 'face', icon: <CIconFace />, view: () => <FacesSection /> },
  { id: 'formato', label: 'Formato', focus: 'face', icon: <CIconFace />, view: () => <ShapeSection /> },
  { id: 'olhos', label: 'Olhos', focus: 'eyes', icon: <CIconEye />, view: () => <EyeLayerSection /> },
  { id: 'cilios', label: 'Cílios', focus: 'eyes', icon: <CIconEye />, view: () => <LashLayerSection /> },
  { id: 'sobrancelhas', label: 'Sobrancelhas', focus: 'eyes', icon: <CIconBrow />, view: () => <BrowLayerSection /> },
  { id: 'boca', label: 'Boca', focus: 'mouth', icon: <CIconLips />, view: () => <MouthLayerSection /> },
  { id: 'nariz', label: 'Nariz', focus: 'face', icon: <CIconFace />, view: () => <NoseSection /> },
  { id: 'barba', label: 'Barba', focus: 'mouth', icon: <CIconFace />, view: () => <BeardLayerSection />, only: 'male' },
  { id: 'extras', label: 'Extras', focus: 'face', icon: <CIconMakeup />, view: () => <ExtrasSection /> },
  { id: 'maquiagem', label: 'Maquiagem', focus: 'face', icon: <CIconMakeup />, view: () => <MakeupSection />, only: 'female' },
  { id: 'pele', label: 'Pele e extras', focus: 'torso', icon: <CIconSkin />, view: () => <SkinSection /> },
  { id: 'corpo', label: 'Corpo', focus: 'body', icon: <CIconBody />, view: () => <BodySection /> },
  { id: 'cabelo', label: 'Cabelo', focus: 'hair', icon: <CIconHair />, view: () => <HairSection /> },
  { id: 'unhas', label: 'Unhas', focus: 'hands', icon: <CIconNail />, view: () => <NailsSection />, only: 'female' },
]

export function AppearanceTab({ onFocus }: { onFocus: (f: StageFocus) => void }) {
  const [cat, setCat] = useState<Cat>('rostos')
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
  const cats = CATS.filter((c) => !c.only || c.only === appearance.gender)
  const cur = cats.find((c) => c.id === cat) ?? cats[1]

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
    document.querySelector('.menu__content')?.scrollTo({ top: 0 })
    setCat(c.id)
    onFocus(c.focus)
  }

  return (
    <div className="cc">
      <GenderBar />
      <div className="cc__rail" role="tablist" aria-label="Categorias da aparência">
        {cats.map((c) => (
          <button key={c.id} type="button" role="tab" className="cc__cat" aria-selected={cur.id === c.id} onClick={() => go(c)}>
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
          <IconSave /> {justSaved && !dirty ? 'Salvo!' : 'Salvar look'}
        </button>
        <button type="button" className="btn" disabled={!dirty} onClick={revert}>
          Voltar ao salvo
        </button>
        {dirty && <span className="unsaved">Alterações não salvas</span>}
      </div>
    </div>
  )
}
