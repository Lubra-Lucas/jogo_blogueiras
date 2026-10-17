import { useEffect, useMemo, useState } from 'react'
import { useProfileStore } from '../../state/profileStore'
import { useInteractionStore } from '../../game/interaction/interactionStore'
import { useInteriorStore } from '../../game/interiors/interiorStore'
import { useSitStore } from '../../game/sit/sitStore'
import { useMinigameStore } from '../../game/minigames/minigameStore'
import { useVehicleStore } from '../../game/vehicles/driveStore'
import { useShopStore } from '../shop/shopStore'
import { useDeviceStore } from '../../game/systems/device'
import { useUiStore } from '../../state/uiStore'
import { PET_ACCESSORIES, PET_FOOD, petAccFits, type PetAccSlot } from '../../game/economy/prices'
import { findPet, loadPetCatalog, PET_NAME_IDEAS, usePetCatalog } from '../../game/pets/catalog'
import { usePetStore } from '../../game/pets/petStore'
import { petRuntime } from '../../game/pets/runtime'
import { IconBowl, IconClose, IconHeart, IconPaw } from './icons'
import './pets.css'

const SLOT_LABEL: Record<PetAccSlot, string> = { collar: 'Coleira', bow: 'Laço', outfit: 'Roupinha' }
const SLOTS: PetAccSlot[] = ['collar', 'bow', 'outfit']

/** Estado (fora do React) do painel do pet. */
export const petUi = (() => {
  let open = false
  const subs = new Set<() => void>()
  return {
    get: () => open,
    set: (v: boolean) => {
      open = v
      subs.forEach((f) => f())
    },
    sub: (f: () => void) => {
      subs.add(f)
      return () => {
        subs.delete(f)
      }
    },
  }
})()

function useOpen() {
  const [v, setV] = useState(petUi.get())
  useEffect(() => petUi.sub(() => setV(petUi.get())), [])
  return v
}

function Bar({ label, value, tone }: { label: string; value: number; tone: 'amber' | 'rose' }) {
  return (
    <div className="pet-bar" title={`${label}: ${Math.round(value)}%`}>
      <span>{label}</span>
      <i>
        <b className={`pet-bar__fill pet-bar__fill--${tone}`} style={{ width: `${Math.round(value)}%` }} />
      </i>
    </div>
  )
}

/** Nome, necessidades e atalho para o painel do pet + aviso de carinho perto dele. */
export function PetHud() {
  const active = usePetStore((s) => s.active)
  const names = usePetStore((s) => s.names)
  const loaded = usePetCatalog((s) => s.loaded)
  const breeds = usePetCatalog((s) => s.breeds)
  const isTouch = useDeviceStore((s) => s.isTouch)
  const busy = useUiStore((s) => s.menuOpen || s.phoneOpen || s.cameraMode)
  const shop = useShopStore((s) => !!s.open)
  const mg = useMinigameStore((s) => !!s.active)
  const open = useOpen()
  const [near, setNear] = useState(false)
  const [, tick] = useState(0)
  const nearbyPoi = useInteractionStore((s) => s.nearby !== null)
  const sitBusy = useSitStore((s) => s.nearest !== null || s.seat !== null)
  const roomPrompt = useInteriorStore((s) => s.prompt !== null)
  // o aviso do carro ("F Dirigir") tem prioridade sobre o carinho
  const carBusy = useVehicleStore((s) => s.nearbyUid !== null || s.drivingUid !== null)
  useEffect(() => loadPetCatalog(), [])
  useEffect(() => {
    const t = window.setInterval(() => {
      setNear(!!usePetStore.getState().active && petRuntime.dist < 2.7)
      tick((n) => n + 1)
    }, 300)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyE' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target
      if (t instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return
      const p = usePetStore.getState()
      if (!p.active || petRuntime.dist > 2.7 || petUi.get()) return
      if (useInteractionStore.getState().nearby || useSitStore.getState().nearest || useSitStore.getState().seat || useInteriorStore.getState().prompt) return
      if (useVehicleStore.getState().nearbyUid || useVehicleStore.getState().drivingUid) return
      if (useShopStore.getState().open || useMinigameStore.getState().active) return
      p.caress(p.active)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const info = useMemo(() => (active && loaded ? findPet(breeds, active) : null), [active, loaded, breeds])
  if (!active || !info || shop || mg) return null
  const n = usePetStore.getState().needsOf(active)
  const label = names[active] || info.breed.label
  return (
    <>
      {!busy && (
        <button type="button" className="pet-chip glass" onClick={() => petUi.set(true)} aria-label={`Abrir painel de ${label}`}>
          <IconPaw />
          <span className="pet-chip__name">{label}</span>
          <span className="pet-chip__bars">
            <i style={{ width: `${n.hunger}%` }} className="pet-chip__a" />
            <i style={{ width: `${n.joy}%` }} className="pet-chip__r" />
          </span>
        </button>
      )}
      {near && !nearbyPoi && !sitBusy && !roomPrompt && !carBusy && !open && !busy && (
        <div className="pet-prompt" role="status">
          <span className="pet-prompt__name">{label}</span>
          <button type="button" className="pet-btn" onClick={() => usePetStore.getState().caress(active)}>
            {!isTouch && <span className="pet-key">E</span>}
            Fazer carinho
          </button>
        </div>
      )}
      {open && <PetPanel id={active} breedId={info.breed.id} breedLabel={info.breed.label} coatLabel={info.coat.label} />}
    </>
  )
}

function PetPanel({ id, breedId, breedLabel, coatLabel }: { id: string; breedId: string; breedLabel: string; coatLabel: string }) {
  const owned = useProfileStore((s) => s.owned)
  const breeds = usePetCatalog((s) => s.breeds)
  const names = usePetStore((s) => s.names)
  const food = usePetStore((s) => s.food)
  const equip = usePetStore((s) => s.equip[id]) ?? {}
  const [name, setName] = useState(names[id] ?? '')
  const [, tick] = useState(0)
  const n = usePetStore.getState().needsOf(id)
  const pets = owned.filter((o) => o.startsWith('pet.'))
  const accs = PET_ACCESSORIES.filter((a) => !a.hidden && owned.includes(a.id))
  const close = () => petUi.set(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.stopPropagation()
        petUi.set(false)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])
  const save = () => usePetStore.getState().rename(id, name)
  return (
    <div className="pet-modal" role="presentation" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div className="pet-panel glass" role="dialog" aria-modal="true" aria-label="Meu pet">
        <header>
          <div>
            <h3>{names[id] || breedLabel}</h3>
            <small>
              {breedLabel} · {coatLabel}
            </small>
          </div>
          <button type="button" className="pet-x" aria-label="Fechar" onClick={close}>
            <IconClose />
          </button>
        </header>

        <section>
          <label className="pet-lbl" htmlFor="pet-name">
            Nome
          </label>
          <div className="pet-row">
            <input
              id="pet-name"
              className="pet-input"
              value={name}
              maxLength={14}
              placeholder={breedLabel}
              onChange={(e) => setName(e.target.value)}
              onBlur={save}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Enter') {
                  save()
                  ;(e.target as HTMLInputElement).blur()
                }
              }}
            />
            <button
              type="button"
              className="pet-btn pet-btn--ghost"
              onClick={() => {
                const nm = PET_NAME_IDEAS[Math.floor(Math.random() * PET_NAME_IDEAS.length)]
                setName(nm)
                usePetStore.getState().rename(id, nm)
              }}
            >
              Sugerir
            </button>
          </div>
        </section>

        <section>
          <Bar label="Fome" value={n.hunger} tone="amber" />
          <Bar label="Alegria" value={n.joy} tone="rose" />
          <p className="pet-note">Sem pressa: as barras caem devagar e nada de ruim acontece. Cuidar só deixa seu pet mais feliz.</p>
        </section>

        <section>
          <div className="pet-lbl">Alimentar</div>
          <div className="pet-grid">
            {PET_FOOD.map((f) => {
              const have = food[f.id] ?? 0
              return (
                <button
                  key={f.id}
                  type="button"
                  className="pet-item"
                  disabled={have <= 0}
                  onClick={() => {
                    usePetStore.getState().feed(id, f.id)
                    tick((v) => v + 1)
                  }}
                >
                  <IconBowl />
                  <b>{f.label}</b>
                  <small>{have > 0 ? `${have} no estoque` : 'Compre no Petshop'}</small>
                </button>
              )
            })}
          </div>
        </section>

        {accs.length > 0 && (
          <section>
            <div className="pet-lbl">Acessórios</div>
            {SLOTS.map((slot) => {
              const list = accs.filter((a) => a.slot === slot)
              if (!list.length) return null
              return (
                <div className="pet-acc" key={slot}>
                  <span>{SLOT_LABEL[slot]}</span>
                  <button type="button" className="pet-chipbtn" aria-pressed={!equip[slot]} onClick={() => usePetStore.getState().setEquip(id, slot, null)}>
                    Nenhum
                  </button>
                  {list.map((a) => {
                    const fits = petAccFits(a, breedId)
                    return (
                      <button
                        key={a.id}
                        type="button"
                        className="pet-chipbtn"
                        aria-pressed={equip[slot] === a.id}
                        disabled={!fits}
                        title={fits ? undefined : 'Só para cães'}
                        onClick={() => usePetStore.getState().setEquip(id, slot, a.id)}
                      >
                        <i style={{ background: a.color }} />
                        {a.label}
                        {fits ? '' : ' (Só para cães)'}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </section>
        )}

        {pets.length > 1 && (
          <section>
            <div className="pet-lbl">Quem vem com você</div>
            <div className="pet-acc">
              {pets.map((pid) => {
                const f = findPet(breeds, pid)
                if (!f) return null
                return (
                  <button key={pid} type="button" className="pet-chipbtn" aria-pressed={pid === id} onClick={() => usePetStore.getState().setActive(pid)}>
                    <IconHeart />
                    {names[pid] || `${f.breed.label} ${f.coat.label}`}
                  </button>
                )
              })}
            </div>
          </section>
        )}
        <button
          type="button"
          className="pet-btn pet-btn--ghost"
          onClick={() => {
            usePetStore.getState().setActive(null)
            close()
          }}
        >
          Deixar em casa
        </button>
      </div>
    </div>
  )
}
