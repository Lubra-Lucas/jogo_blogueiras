/** Harness de desenvolvimento (dev.html): monta só o minijogo, sem a cidade. */
import { createRoot } from 'react-dom/client'
import '../../../index.css'
import '../../../ui/tokens.css'
import { FotoGame } from '../../../ui/minigames/foto/FotoGame'
import { live } from './live'

if (import.meta.env.DEV) (window as unknown as { __live: typeof live }).__live = live
createRoot(document.getElementById('root')!).render(<FotoGame onExit={() => console.log('sair')} />)
