import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './ui/tokens.css'
import './game/character/samplerAudit'
import { LoginScreen } from './ui/login/LoginScreen'
import { OFFLINE } from './net/supabase'
import { restore, startAutosave, type Save } from './net/save'

// Evita zoom por gesto de pinca / toque duplo no iOS.
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(ev, (e) => e.preventDefault())
}

const root = createRoot(document.getElementById('root')!)

/** O jogo so e importado DEPOIS do save da personagem ir para o localStorage: os stores o leem ao carregar. */
async function startGame(char?: { id: string; save: Save; isNew: boolean }) {
  if (char) {
    restore(char.save)
    startAutosave(char.id)
  }
  const [{ default: App }, { applyTestMode }] = await Promise.all([import('./App.tsx'), import('./game/testMode')])
  // MODO TESTE (desligar antes do lancamento: TEST_MODE em src/game/testMode.ts)
  applyTestMode()
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  if (!char) return
  const [{ startNet }, { useUiStore }] = await Promise.all([import('./game/net/net'), import('./state/uiStore')])
  startNet(char.id)
  // personagem nova: abre o editor de aparencia (o nome ja veio da tela de criacao)
  if (char.isNew) useUiStore.getState().openMenu('aparencia')
}

if (OFFLINE) void startGame()
else root.render(<LoginScreen onPlay={(id, save, isNew) => void startGame({ id, save, isNew })} />)
