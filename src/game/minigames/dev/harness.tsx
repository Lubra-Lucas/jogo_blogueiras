import { createRoot } from 'react-dom/client'
import '../../../index.css'
import { CafeGame } from '../../../ui/minigames/cafe/CafeGame'
import { useCafeStore } from '../cafe/store'
import { useInteractionStore } from '../../interaction/interactionStore'
import { InteractionPrompt } from '../../../ui/minigames/InteractionPrompt'
import { MinigameHost } from '../../../ui/minigames/MinigameHost'

// Harness de desenvolvimento (so com _cafe_harness.html): o minijogo sozinho, sem o mundo 3D.
const w = window as unknown as { __cafe: typeof useCafeStore; __bot: (seconds: number, skill?: number) => void }
w.__cafe = useCafeStore
;(w as unknown as { __ia: typeof useInteractionStore }).__ia = useInteractionStore
/** Robo de teste: joga `seconds` de relogio simulado servindo sempre o pedido certo. */
w.__bot = (seconds, skill = 1) => {
  const st = useCafeStore.getState
  for (let t = 0; t < seconds && st().s.phase === 'playing'; t += 0.1) {
    st().step(0.1)
    const c = st().s.customers.find((x) => x && !x.leaving)
    if (c && Math.random() < skill * 0.15) {
      const o = c.order
      st().trash()
      st().ingredient({ kind: 'size', id: o.size })
      st().ingredient({ kind: 'base', id: o.base })
      o.toppings.forEach((id) => st().ingredient({ kind: 'topping', id }))
      if (o.sweet) st().ingredient({ kind: 'sweet', id: o.sweet })
      st().serve(c.slot)
    }
  }
}
createRoot(document.getElementById('root')!).render(
  window.location.search.includes('host') ? (
    <div className="ui-layer">
      <InteractionPrompt />
      <MinigameHost />
    </div>
  ) : (
    <CafeGame onExit={() => console.log('sair')} />
  ),
)
