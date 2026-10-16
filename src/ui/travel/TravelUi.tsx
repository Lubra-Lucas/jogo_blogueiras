import { useEffect } from 'react'
import { useTravelStore } from '../../game/travel/travelStore'
import { FlightOverlay } from './FlightOverlay'
import { TravelScreen } from './TravelScreen'

/**
 * Camada de UI da viagem (montada em App): a cena da janela do aviao durante o voo e o painel "Viagens" do celular
 * (cidade atual + lista de destinos; as passagens sao vendidas no balcao do aeroporto).
 */
export function TravelUi() {
  const panel = useTravelStore((s) => s.panel)
  const flying = useTravelStore((s) => s.flight !== null)
  useEffect(() => {
    if (!panel) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') useTravelStore.getState().setPanel(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panel])
  return (
    <>
      {panel && !flying && <TravelScreen mode="phone" onClose={() => useTravelStore.getState().setPanel(false)} />}
      <FlightOverlay />
    </>
  )
}
