// Servidor de teste estavel: sem HMR/watch (outros processos editam o repo e recarregariam a pagina no meio do teste).
// Uso: npx vite --config tools/interior-tests/vite.test.config.mjs --port 5175 --strictPort
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export default defineConfig({
  root: fileURLToPath(new URL('../../', import.meta.url)),
  base: '/jogo_blogueiras/',
  plugins: [react()],
  cacheDir: join(tmpdir(), 'vite-interior-tests'),
  server: { host: true, hmr: false, watch: null },
})
