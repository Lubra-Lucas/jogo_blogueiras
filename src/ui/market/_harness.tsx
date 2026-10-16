import { createRoot } from 'react-dom/client'
import '../../index.css'
import '../tokens.css'
import { grantEdition } from '../../game/market/api'
import { useProfileStore } from '../../state/profileStore'
import { MarketHost } from './MarketHost'

/** Entrada de desenvolvimento do mercado (nao entra no build do jogo): /_market_harness.html?market=1&seed=1 */
const q = new URLSearchParams(window.location.search)
if (q.get('seed') && !localStorage.getItem('mk.seeded')) {
  localStorage.setItem('mk.seeded', '1')
  useProfileStore.setState({ coins: 48000 })
  void (async () => {
    for (const id of ['ed.gala_meia_noite', 'ed.laco_bombom', 'ed.corset_camelia', 'ed.cachos_mel', 'ed.jeans_aurora']) await grantEdition(id)
  })()
}
createRoot(document.getElementById('root')!).render(
  <div className="ui-layer" style={{ position: 'fixed', inset: 0, background: '#e9c3d4' }}>
    <MarketHost />
  </div>,
)
