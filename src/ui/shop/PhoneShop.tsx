import { useState } from 'react'
import { Catalog } from './Catalog'
import { DailyPanel } from './DailyPanel'
import { PremiumStore } from './PremiumStore'
import { Vitrine } from './Vitrine'
import { WalletChips } from './parts'
import { useShopStore, type PhoneShopTab } from './shopStore'

const TABS: Array<[PhoneShopTab, string]> = [
  ['loja', 'Loja'],
  ['diamantes', 'Diamantes'],
  ['diario', 'Diário'],
  ['carros', 'Carros'],
  ['casas', 'Casas'],
]

/** Conteúdo do app "Loja" do celular: mesmo catálogo das lojas, sem provador 3D. */
export function PhoneShop() {
  const tab = useShopStore((s) => s.phoneTab)
  const setTab = useShopStore((s) => s.setPhoneTab)
  const [sub, setSub] = useState<'destaques' | 'catalogo'>('destaques')
  const ctx = { stage: false }
  return (
    <div className="sh-phone">
      <WalletChips onDiamonds={() => setTab('diamantes')} />
      <div className="sh-pills" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" className="sh-pill" aria-selected={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'loja' && (
        <>
          <div className="sh-pills">
            <button type="button" className="sh-pill" aria-pressed={sub === 'destaques'} onClick={() => setSub('destaques')}>
              Destaques
            </button>
            <button type="button" className="sh-pill" aria-pressed={sub === 'catalogo'} onClick={() => setSub('catalogo')}>
              Catálogo
            </button>
          </div>
          {sub === 'destaques' ? <Vitrine shop="tudo" ctx={ctx} onDiamonds={() => setTab('diamantes')} /> : <Catalog shop="tudo" ctx={ctx} compact />}
          <p className="sh-fine">Para provar as peças, visite a Boutique, a Joalheria ou o Salão.</p>
        </>
      )}
      {tab === 'diamantes' && <PremiumStore compact />}
      {tab === 'diario' && <DailyPanel />}
      {tab === 'carros' && <Catalog shop="concessionaria" ctx={ctx} compact />}
      {tab === 'casas' && <Catalog shop="imobiliaria" ctx={ctx} compact />}
    </div>
  )
}
