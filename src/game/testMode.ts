import { PROFESSIONS, useProfileStore } from '../state/profileStore'
import { useEconomyStore } from './economy/economyStore'
import { BIG_TICKETS, PET_ACCESSORIES, PREMIUM_FINISH_PRICE } from './economy/prices'
import { CARS } from './vehicles/catalog'
import { loadCatalog, useCatalogStore } from './character/catalog'
import { WEARABLES } from './character/items'
import { loadPetCatalog, petItemId, usePetCatalog } from './pets/catalog'
import { PET_PROFESSION } from './minigames/petshared/level'
import { raiseProfessionXpMirror } from './minigames/rewards'
import { useChips } from './casino/chips'

/**
 * MODO TESTE: quem entra pelo link (nova ou antiga) comeca com nivel alto, muitos Brilhos/Diamantes,
 * fichas e TODOS os itens liberados, para testar todos os jogos, cidades e itens.
 *
 * DESLIGAR ANTES DO LANCAMENTO: troque para `false` (nada mais precisa mudar).
 * Para conferir o jogo normal sem mexer no codigo, abra o site com ?testmode=0.
 *
 * Nunca rebaixa: so sobe o que estiver abaixo dos minimos. Idempotente.
 */
export const TEST_MODE = true

export const TEST_LEVEL = 30
export const TEST_COINS = 999_999
export const TEST_DIAMONDS = 99_999
export const TEST_CHIPS = 100_000
/** XP de profissao (cobre todos os desbloqueios: Barista/Salao nv.10, Tosadora nv.5+ etc.) */
export const TEST_PROFESSION_XP = 20_000

/** Modo teste ativo agora? (TEST_MODE e sem ?testmode=0 na URL) */
export function testModeOn(): boolean {
  if (!TEST_MODE) return false
  try {
    return new URLSearchParams(window.location.search).get('testmode') !== '0'
  } catch {
    return true
  }
}

const professions = (): string[] => [...PROFESSIONS, PET_PROFESSION]

/** Itens que nao dependem de manifestos assincronos: cabelos, carros, casas, acessorios de pet. */
function staticItems(): string[] {
  return [
    ...Object.values(WEARABLES).map((w) => w.id),
    ...CARS.map((c) => c.id),
    ...BIG_TICKETS.filter((b) => b.kind === 'house').map((b) => b.id),
    ...PET_ACCESSORIES.map((a) => a.id),
  ]
}

function grantAll(ids: string[]): boolean {
  const p = useProfileStore.getState()
  return p.testGrant({ level: TEST_LEVEL, coins: TEST_COINS, diamonds: TEST_DIAMONDS, professionXp: Object.fromEntries(professions().map((k) => [k, TEST_PROFESSION_XP])), owned: ids })
}

let summaryShown = false
/** Apos conceder, troca a avalanche de avisos (conquistas/nivel) por um unico aviso resumido. */
function settle(changed: boolean) {
  const eco = useEconomyStore.getState()
  for (const f of Object.keys(PREMIUM_FINISH_PRICE)) eco.unlockFinish(f)
  const chips = useChips.getState()
  if (chips.balance < TEST_CHIPS) chips.collect(TEST_CHIPS - chips.balance)
  raiseProfessionXpMirror(professions(), TEST_PROFESSION_XP)
  // restaura o saldo caso conquistas tenham creditado/gasto algo e garante minimos de novo
  useProfileStore.getState().testGrant({ level: TEST_LEVEL, coins: TEST_COINS, diamonds: TEST_DIAMONDS, professionXp: {}, owned: [] })
  useProfileStore.setState({ toast: null })
  if (changed && !summaryShown) {
    summaryShown = true
    useEconomyStore.setState({ notice: { id: Date.now(), text: 'Modo teste ativado', sub: 'Nível, Brilhos, Diamantes e itens liberados.' } })
  } else {
    useEconomyStore.setState({ notice: null })
  }
}

let seq = 0
/** Idempotente. Chamada no carregamento e quando um perfil novo e criado. */
export function applyTestMode(): void {
  if (!testModeOn()) return
  const mine = ++seq
  let changed = grantAll(staticItems())
  settle(changed)

  // manifestos assincronos: roupas/joias (garments.json, jewelry.json) e pets (pets.json)
  const loadPets = new Promise<void>((resolve) => {
    if (usePetCatalog.getState().loaded) return resolve()
    const un = usePetCatalog.subscribe((s) => {
      if (s.loaded) {
        un()
        resolve()
      }
    })
    loadPetCatalog()
    window.setTimeout(resolve, 15000)
  })
  void Promise.all([loadCatalog(), loadPets]).then(() => {
    if (mine !== seq) return
    const clothes = Object.keys(useCatalogStore.getState().items)
    const pets = usePetCatalog.getState().breeds.flatMap((b) => b.coats.map((c) => petItemId(b.id, c.id)))
    const before = useProfileStore.getState().owned.length
    changed = grantAll([...clothes, ...pets]) || changed
    if (useProfileStore.getState().owned.length !== before) settle(changed)
  })
}
