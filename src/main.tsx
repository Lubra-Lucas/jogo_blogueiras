import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './ui/tokens.css'
import App from './App.tsx'
import { applyTestMode } from './game/testMode'
import './game/character/samplerAudit'

// MODO TESTE (desligar antes do lancamento: TEST_MODE em src/game/testMode.ts)
applyTestMode()

// Evita zoom por gesto de pinca / toque duplo no iOS.
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(ev, (e) => e.preventDefault())
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
