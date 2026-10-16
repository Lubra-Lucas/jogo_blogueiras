import { TravelScreen } from '../../travel/TravelScreen'

/** Balcao de check-in do aeroporto: abre a tela de destinos (mesma tela nas duas cidades). */
export default function ViagemGame({ onExit }: { onExit: () => void }) {
  return <TravelScreen mode="counter" onClose={onExit} />
}
