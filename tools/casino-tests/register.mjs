// Permite que o Node (type stripping) resolva imports sem extensao, como o Vite faz.
import { registerHooks } from 'node:module'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if ((specifier.startsWith('.') || specifier.startsWith('/')) && !/\.[cm]?[jt]s$/.test(specifier) && context.parentURL) {
      const base = new URL(specifier, context.parentURL)
      for (const ext of ['.ts', '/index.ts']) {
        const p = base.href + ext
        if (existsSync(fileURLToPath(p))) return nextResolve(p, context)
      }
    }
    return nextResolve(specifier, context)
  },
})
