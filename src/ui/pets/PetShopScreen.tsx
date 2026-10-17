import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import type { Group } from 'three'
import { clearMoveTarget, setKeyboardAxis, setKeyboardCameraYaw, setStickAxis } from '../../game/input/intent'
import { grantOwnedItem, ownsItem } from '../../game/economy/api'
import { PET_ACCESSORIES, PET_FOOD, petAccFits, type PetAccDef, type PetFoodDef } from '../../game/economy/prices'
import { findPet, loadPetCatalog, PET_BASE, PET_NAME_IDEAS, petItemId, petPrice, usePetCatalog, type PetBreed, type PetCoat } from '../../game/pets/catalog'
import { attachAccessories, createPetModel } from '../../game/pets/model'
import { usePetStore } from '../../game/pets/petStore'
import { useProfileStore } from '../../state/profileStore'
import { IconClose } from '../menu/icons'
import { CurrencyIcon, fmt, WalletChips } from '../shop/parts'
import { useShopStore } from '../shop/shopStore'
import { IconBowl, IconHeart, IconPaw } from './icons'
import './pets.css'

type Tab = 'pets' | 'racao' | 'acessorios' | 'meus'
const TAB_LABEL: Record<Tab, string> = { pets: 'Pets', racao: 'Ração', acessorios: 'Acessórios', meus: 'Meus pets' }
const TABS: Tab[] = ['pets', 'racao', 'acessorios', 'meus']

const stopMoving = () => {
  setKeyboardAxis(0, 0, false)
  setStickAxis(0, 0, false)
  setKeyboardCameraYaw(0)
  clearMoveTarget()
}

/** Modelo girando na vitrine (preview 3D). */
function Preview3D({ breed, coat, rot, equip }: { breed: PetBreed; coat: PetCoat; rot: React.MutableRefObject<{ yaw: number }>; equip?: { collar?: string; bow?: string; outfit?: string } }) {
  const gltf = useGLTF(`${PET_BASE}${breed.file}`)
  const model = useMemo(() => createPetModel(gltf, coat.colors), [gltf, coat])
  const g = useRef<Group>(null)
  useEffect(() => attachAccessories(model, breed, equip), [model, breed, equip])
  useEffect(() => {
    const a = model.actions.idle
    a?.reset().play()
    return () => {
      model.mixer.stopAllAction()
    }
  }, [model])
  useFrame((_, dt) => {
    model.mixer.update(Math.min(dt, 0.05))
    if (g.current) g.current.rotation.y = 0.55 + rot.current.yaw
  })
  // racas grandes (ex.: golden) encolhem para caber na vitrine, enquadrada para ~0,5 m de altura
  const fit = Math.min(1, 0.5 / breed.meta.height)
  return (
    <group ref={g} scale={fit}>
      <primitive object={model.scene} />
    </group>
  )
}

function Stage({ breed, coat, equip }: { breed: PetBreed; coat: PetCoat; equip?: { collar?: string; bow?: string; outfit?: string } }) {
  const rot = useRef({ yaw: 0 })
  const drag = useRef<{ x: number; yaw: number } | null>(null)
  const h = 0.58
  return (
    <div
      className="sh-stage"
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
      <Canvas camera={{ position: [0, h * 0.62, 1.95], fov: 32 }} dpr={[1, 1.6]} gl={{ alpha: true }}>
        <ambientLight intensity={1.15} />
        <hemisphereLight args={['#fff4e6', '#8a7a68', 0.9]} />
        <directionalLight position={[2, 3, 2.5]} intensity={2.2} />
        <directionalLight position={[-2.5, 1.5, -1]} intensity={0.9} color="#cfe0ff" />
        <Suspense fallback={null}>
          <group position={[0, -0.2, 0]}>
            <Preview3D breed={breed} coat={coat} rot={rot} equip={equip} />
          </group>
        </Suspense>
      </Canvas>
      <div className="sh-stage__tip">Arraste para girar</div>
    </div>
  )
}

function ask(label: string, currency: 'brilhos' | 'diamantes', price: number, onDone: () => void, doneMessage?: string) {
  useShopStore.getState().ask({ kind: 'service', label, currency, price, onDone, doneMessage })
}

/** Loja do Petshop: pets (raça + pelagem, preço fixo, sem sorteio), ração e acessórios. */
export function PetShopScreen() {
  const open = useShopStore((s) => s.open === 'petshop')
  const close = useShopStore((s) => s.closeShop)
  const breeds = usePetCatalog((s) => s.breeds)
  const loaded = usePetCatalog((s) => s.loaded)
  const owned = useProfileStore((s) => s.owned)
  const [tab, setTab] = useState<Tab>('pets')
  const [species, setSpecies] = useState<'dog' | 'cat'>('dog')
  const [breedId, setBreedId] = useState('poodle')
  const [coatId, setCoatId] = useState('')
  const activePet = usePetStore((s) => s.active)
  const equipMap = usePetStore((s) => s.equip)
  const food = usePetStore((s) => s.food)
  const names = usePetStore((s) => s.names)
  const [previewAcc, setPreviewAcc] = useState<PetAccDef | null>(null)

  useEffect(() => loadPetCatalog(), [])
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('petshop')) useShopStore.getState().openShop('petshop')
  }, [])
  useEffect(() => {
    if (!open) return
    stopMoving()
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (useShopStore.getState().confirm) return
        e.stopPropagation()
        close()
        return
      }
      const t = e.target
      if (t instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return
      e.stopPropagation()
    }
    window.addEventListener('keydown', onKey, true)
    const timer = window.setInterval(stopMoving, 150)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.clearInterval(timer)
      stopMoving()
    }
  }, [open, close])

  const list = breeds.filter((b) => b.species === species)
  const breed = breeds.find((b) => b.id === breedId) ?? list[0]
  const coat = breed?.coats.find((c) => c.id === coatId) ?? breed?.coats[0]
  if (!open) return null

  const owns = (id: string) => owned.includes(id) || ownsItem(id)
  const activeInfo = activePet ? findPet(breeds, activePet) : null
  const myEquip = activePet ? equipMap[activePet] : undefined
  const previewEquip = previewAcc ? { ...(myEquip ?? {}), [previewAcc.slot]: previewAcc.id } : myEquip

  const buyPet = (b: PetBreed, c: PetCoat, cur: 'brilhos' | 'diamantes') => {
    const p = petPrice(b.id, c)
    const price = cur === 'brilhos' ? p.brilhos : (p.diamantes ?? 0)
    const id = petItemId(b.id, c.id)
    ask(`Pet: ${b.label} ${c.label}`, cur, price, () => {
      grantOwnedItem(id)
      usePetStore.getState().setActive(id)
      setTab('meus')
    }, `${b.label} ${c.label} é seu!`)
  }
  const buyFood = (f: PetFoodDef, qty: number) => {
    const price = qty === 1 ? f.price : Math.round(f.price * qty * 0.9)
    ask(`${f.label}${qty > 1 ? ` (pacote com ${qty})` : ''}`, 'brilhos', price, () => usePetStore.getState().addFood(f.id, qty), `Compra feita: ${f.label}${qty > 1 ? ` (pacote com ${qty})` : ''}.`)
  }
  const buyAcc = (a: PetAccDef) =>
    ask(a.label, 'brilhos', a.price, () => {
      grantOwnedItem(a.id)
      const act = usePetStore.getState().active
      if (act) usePetStore.getState().setEquip(act, a.slot, a.id)
    }, `Compra feita: ${a.label}.`)

  const stageBreed = tab === 'pets' || !activeInfo ? breed : activeInfo.breed
  const stageCoat = tab === 'pets' || !activeInfo ? coat : activeInfo.coat

  return (
    <div className="sh-root" role="dialog" aria-modal="true" aria-label="Petshop Patinhas" data-shop="petshop">
      <div className="sh-shell">
        <div className="sh-inner">
          <header className="sh-head">
            <div>
              <h2>Petshop Patinhas</h2>
              <small>Preço fixo e sem sorteio: você escolhe a raça e a pelagem.</small>
            </div>
            <WalletChips />
            <button type="button" className="sh-x" aria-label="Fechar loja" onClick={close}>
              <IconClose width={18} height={18} />
            </button>
          </header>
          <div className="sh-tabs" role="tablist">
            {TABS.map((t) => (
              <button key={t} type="button" role="tab" className="sh-tab" aria-selected={tab === t} onClick={() => setTab(t)}>
                {TAB_LABEL[t]}
              </button>
            ))}
          </div>
          <div className="sh-body">
            {loaded && stageBreed && stageCoat ? <Stage key={stageBreed.id + stageCoat.id} breed={stageBreed} coat={stageCoat} equip={tab === 'pets' ? undefined : previewEquip} /> : <div className="sh-stage"><div className="sh-stage__load">Carregando...</div></div>}
            <div className="sh-content">
              {tab === 'pets' && breed && coat && (
                <>
                  <div className="sh-pills" role="tablist" aria-label="Espécie">
                    {(['dog', 'cat'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        role="tab"
                        className="sh-pill"
                        aria-selected={species === s}
                        onClick={() => {
                          setSpecies(s)
                          const f = breeds.find((b) => b.species === s)
                          if (f) {
                            setBreedId(f.id)
                            setCoatId('')
                          }
                        }}
                      >
                        {s === 'dog' ? 'Cachorros' : 'Gatos'}
                      </button>
                    ))}
                  </div>
                  <div className="pshop-breeds">
                    {list.map((b) => (
                      <button key={b.id} type="button" className="pshop-breed" aria-pressed={b.id === breed.id} onClick={() => (setBreedId(b.id), setCoatId(''))}>
                        <IconPaw />
                        <b>{b.label}</b>
                        <small>a partir de {fmt(Math.min(...b.coats.map((c) => petPrice(b.id, c).brilhos)))}</small>
                      </button>
                    ))}
                  </div>
                  <div className="pshop-sub">Pelagem</div>
                  <div className="pshop-coats">
                    {breed.coats.map((c) => (
                      <button key={c.id} type="button" className="pshop-coat" aria-pressed={c.id === coat.id} onClick={() => setCoatId(c.id)}>
                        <i style={{ background: `linear-gradient(135deg, ${c.colors.coat} 50%, ${c.colors.coat2 && c.colors.coat2 !== c.colors.coat ? c.colors.coat2 : c.colors.belly} 50%)` }} />
                        {c.label}
                        {c.tier === 'raro' && <em>rara</em>}
                      </button>
                    ))}
                  </div>
                  <PetBuy breed={breed} coat={coat} owned={owns(petItemId(breed.id, coat.id))} onBuy={(cur) => buyPet(breed, coat, cur)} />
                </>
              )}

              {tab === 'racao' && (
                <div className="sh-grid">
                  {PET_FOOD.map((f) => (
                    <div className="sh-card" key={f.id}>
                      <div className="sh-card__art">
                        <IconBowl width={40} height={40} />
                      </div>
                      <div className="sh-card__name">{f.label}</div>
                      <div className="sh-card__note">{f.blurb}</div>
                      <div className="sh-card__note">Em estoque: {food[f.id] ?? 0}</div>
                      <div className="sh-card__prices">
                        <span>
                          <CurrencyIcon currency="brilhos" /> <b>{fmt(f.price)}</b>
                        </span>
                      </div>
                      <div className="sh-card__act">
                        <button type="button" className="sh-btn sh-btn--buy" onClick={() => buyFood(f, 1)}>
                          Comprar
                        </button>
                        <button type="button" className="sh-btn" onClick={() => buyFood(f, 5)}>
                          Pacote 5
                        </button>
                      </div>
                    </div>
                  ))}
                  <p className="pet-note" style={{ gridColumn: '1 / -1' }}>
                    Alimente seu pet no painel dele (botão da patinha, no canto da tela). Ele nunca fica doente: só fica mais feliz quando bem cuidado.
                  </p>
                </div>
              )}

              {tab === 'acessorios' && (
                <>
                  {!activePet && <p className="pet-note">Compre um pet para vestir os acessórios nele.</p>}
                  <div className="sh-grid">
                    {PET_ACCESSORIES.filter((a) => !a.hidden).map((a) => {
                      const have = owns(a.id)
                      const fits = petAccFits(a, activeInfo?.breed.id)
                      return (
                        <div className="sh-card" key={a.id}>
                          <div className="sh-card__art">
                            <span className="pshop-swatch" style={{ background: a.color }} />
                          </div>
                          <div className="sh-card__name">{a.label}</div>
                          <div className="sh-card__note">
                            {a.slot === 'collar' ? 'Coleira' : a.slot === 'bow' ? 'Laço' : 'Roupinha'}
                            {a.files ? ' · Só para cães' : ''}
                          </div>
                          <div className="sh-card__prices">
                            <span>
                              <CurrencyIcon currency="brilhos" /> <b>{fmt(a.price)}</b>
                            </span>
                          </div>
                          <div className="sh-card__act">
                            {have ? (
                              <button
                                type="button"
                                className="sh-btn"
                                disabled={!activePet || !fits}
                                title={fits ? undefined : 'Só para cães'}
                                onClick={() => activePet && usePetStore.getState().setEquip(activePet, a.slot, myEquip?.[a.slot] === a.id ? null : a.id)}
                              >
                                {myEquip?.[a.slot] === a.id ? 'Tirar' : 'Vestir'}
                              </button>
                            ) : (
                              <button type="button" className="sh-btn sh-btn--buy" disabled={!fits} title={fits ? undefined : 'Só para cães'} onClick={() => buyAcc(a)}>
                                {fits ? 'Comprar' : 'Só para cães'}
                              </button>
                            )}
                            <button type="button" className="sh-btn" disabled={!activePet || !fits} onPointerDown={() => setPreviewAcc(a)} onPointerUp={() => setPreviewAcc(null)} onPointerLeave={() => setPreviewAcc(null)}>
                              Provar
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {tab === 'meus' && (
                <MyPets owned={owned.filter((o) => o.startsWith('pet.'))} names={names} breeds={breeds} activeId={activePet} onGoShop={() => setTab('pets')} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PetBuy({ breed, coat, owned, onBuy }: { breed: PetBreed; coat: PetCoat; owned: boolean; onBuy: (cur: 'brilhos' | 'diamantes') => void }) {
  const p = petPrice(breed.id, coat)
  const coins = useProfileStore((s) => s.coins)
  const diamonds = useProfileStore((s) => s.diamonds)
  return (
    <div className="pshop-buy">
      <div>
        <h3>
          {breed.label} · {coat.label}
        </h3>
        <small>{breed.species === 'dog' ? 'Cachorro' : 'Gato'} · vem com ração para 2 refeições</small>
      </div>
      {owned ? (
        <span className="pshop-owned">Você já tem este pet</span>
      ) : (
        <div className="pshop-btns">
          <button type="button" className="sh-btn sh-btn--buy" onClick={() => onBuy('brilhos')}>
            <CurrencyIcon currency="brilhos" /> {fmt(p.brilhos)} Brilhos
          </button>
          {p.diamantes != null && (
            <button type="button" className="sh-btn" onClick={() => onBuy('diamantes')}>
              <CurrencyIcon currency="diamantes" /> {fmt(p.diamantes)} Diamantes
            </button>
          )}
        </div>
      )}
      {!owned && coins < p.brilhos && <small className="pshop-hint">Faltam {fmt(p.brilhos - coins)} Brilhos: os minijogos do Petshop rendem Brilhos.</small>}
      {p.diamantes != null && !owned && <small className="pshop-hint">Esta pelagem também sai por Brilhos. Seus Diamantes: {fmt(diamonds)}.</small>}
    </div>
  )
}

function MyPets({ owned, names, breeds, activeId, onGoShop }: { owned: string[]; names: Record<string, string>; breeds: PetBreed[]; activeId: string | null; onGoShop: () => void }) {
  const food = usePetStore((s) => s.food)
  if (!owned.length)
    return (
      <div className="pet-note">
        Você ainda não tem um pet.{' '}
        <button type="button" className="sh-link" onClick={onGoShop}>
          Ver os pets da loja
        </button>
      </div>
    )
  return (
    <div className="pshop-mine">
      {owned.map((id) => {
        const f = findPet(breeds, id)
        if (!f) return null
        const n = usePetStore.getState().needsOf(id)
        return (
          <div className="pshop-pet" key={id}>
            <div className="pshop-pet__head">
              <b>
                {f.breed.label} · {f.coat.label}
              </b>
              <button type="button" className={`sh-btn sh-btn--sm${id === activeId ? ' sh-btn--buy' : ''}`} onClick={() => usePetStore.getState().setActive(id === activeId ? null : id)}>
                <IconHeart /> {id === activeId ? 'Está com você' : 'Levar comigo'}
              </button>
            </div>
            <div className="pet-row">
              <input
                key={`${id}:${names[id] ?? ''}`}
                className="pet-input"
                defaultValue={names[id] ?? ''}
                maxLength={14}
                placeholder="Dar um nome"
                aria-label={`Nome de ${f.breed.label}`}
                onBlur={(e) => usePetStore.getState().rename(id, e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                }}
              />
              <button type="button" className="sh-btn sh-btn--sm" onClick={() => usePetStore.getState().rename(id, PET_NAME_IDEAS[Math.floor(Math.random() * PET_NAME_IDEAS.length)])}>
                Sugerir
              </button>
            </div>
            <div className="pet-bars2">
              <span>Fome {Math.round(n.hunger)}%</span>
              <span>Alegria {Math.round(n.joy)}%</span>
            </div>
            <div className="pet-acc">
              {PET_FOOD.map((fd) => (
                <button key={fd.id} type="button" className="pet-chipbtn" disabled={(food[fd.id] ?? 0) <= 0} onClick={() => usePetStore.getState().feed(id, fd.id)}>
                  {fd.label} ({food[fd.id] ?? 0})
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
