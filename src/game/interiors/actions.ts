import { useSitStore } from '../sit/sitStore'
import { useMinigameStore } from '../minigames/minigameStore'
import { useShopStore } from '../../ui/shop/shopStore'
import { useUiStore } from '../../state/uiStore'
import { setHour } from '../world/environment/envStore'
import { playEmote } from '../character/animation/emoteStore'
import { canInteract, exitRoom, showMsg, sleepUntilMorning, useInteriorStore } from './interiorStore'
import type { Spot } from './resolve'
import type { Action } from './types'

/** Executa a acao de um ponto de uso (E / botao). */
export function runSpot(spot: Spot): void {
  if (!canInteract()) return
  const a = spot.action
  if (a === 'exit') {
    void exitRoom()
    return
  }
  if (a === 'talk') {
    showMsg(spot.line ?? '...')
    return
  }
  runAction(a)
}

export function runAction(a: Action): void {
  switch (a.type) {
    case 'minigame':
      useMinigameStore.getState().open(a.id)
      break
    case 'shop':
      useShopStore.getState().openShop(a.id)
      break
    case 'menu':
      useUiStore.getState().openMenu(a.tab)
      break
    case 'sleep':
      void sleepUntilMorning(setHour)
      break
    case 'emote':
      playEmote(a.clip, { once: true })
      break
    case 'toast':
      showMsg(a.text, a.sub)
      break
  }
}

/** Aciona o ponto de uso atual (botao de toque / tecla). */
export function triggerPrompt(): boolean {
  const p = useInteriorStore.getState().prompt
  if (!p || useSitStore.getState().seat) return false
  runSpot(p.spot)
  return true
}

