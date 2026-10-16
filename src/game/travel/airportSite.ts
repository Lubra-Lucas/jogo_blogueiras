import type { Poi, Road } from '../world/city/layout'

/**
 * Aeroporto da cidade principal (canto noroeste do mapa, fora do canteiro do Bairro Futuro). So dados: o layout.ts da cidade
 * soma a via e a porta DEPOIS de gerar os bairros (nao mexe na semente dos predios) e o `TravelWorlds` desenha o terminal.
 * Mesmas medidas do terminal de Miami (peca `airport_terminal` do kit): frente para +X, saguao central aberto com o balcao.
 */
export const MAIN_AIRPORT = { cx: -156, cz: -125, rot: Math.PI / 2 }

export const AIRPORT_ROAD: Road = { id: 'av-aeroporto', name: 'Avenida do Aeroporto', kind: 'street', width: 8, points: [[-90, 0], [-90, -125], [-138, -125]] }

/** porta do balcao de check-in (olha para +X, de frente para quem chega pela avenida) */
export const AIRPORT_POI: Poi = {
  id: 'aeroporto',
  name: 'Aeroporto',
  kind: 'landmark',
  x: MAIN_AIRPORT.cx + 4.6,
  z: MAIN_AIRPORT.cz,
  facing: Math.PI / 2,
  district: 'centro',
  icon: 'A',
  color: '#35c0bd',
}

/** onde a jogadora aparece ao voltar de viagem */
export const MAIN_ARRIVAL = { x: MAIN_AIRPORT.cx + 11.5, z: MAIN_AIRPORT.cz, yaw: -Math.PI / 2 }
