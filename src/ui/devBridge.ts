import { intent, cameraIntent } from '../game/input/intent'
import { useUiPrefs } from './uiPrefs'
import { useProfileStore } from '../state/profileStore'
import { useUiStore } from '../state/uiStore'
import { useShopStore } from './shop/shopStore'
import { useMarketUi } from './market/marketUi'
import { useMinigameStore } from '../game/minigames/minigameStore'
import { useInteractionStore } from '../game/interaction/interactionStore'

/** Ferramenta de QA: `?uidebug=1` expoe as stores de UI em window.__ui (para screenshots automatizados). */
if (new URLSearchParams(window.location.search).get('uidebug') === '1') {
  ;(window as unknown as { __ui: unknown }).__ui = { useUiStore, useShopStore, useMarketUi, useMinigameStore, useInteractionStore, useProfileStore, intent, cameraIntent, useUiPrefs }
}
