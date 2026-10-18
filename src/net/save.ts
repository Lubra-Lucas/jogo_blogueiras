import { supabase } from './supabase'

/**
 * Save da personagem no Supabase. O jogo continua lendo e gravando no localStorage como sempre; aqui so trocamos o
 * conteudo dele pelo da personagem escolhida (antes de carregar o jogo) e mandamos uma copia para o banco de tempos em tempos.
 * Assim todo o progresso (Brilhos, nivel, missoes, aparencia, inventario, recordes...) vai junto sem mexer em cada store.
 */
export type Save = Record<string, string>

/** chaves do aparelho (qualidade grafica, som, avisos ja vistos) e a sessao do Supabase (`sb-*`): ficam fora do save */
const DEVICE = new Set(['jb.quality.v1', 'jb.settings.v1', 'jb.uiprefs.v1', 'jb.hint.v1', 'jb.fsask.v1'])
const isDevice = (k: string) => DEVICE.has(k) || k.startsWith('sb-')

function keys(): string[] {
  const out: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k !== null && !isDevice(k)) out.push(k)
  }
  return out.sort()
}

export function snapshot(): Save {
  const s: Save = {}
  for (const k of keys()) s[k] = localStorage.getItem(k) ?? ''
  return s
}

/** Troca o progresso do navegador pelo da personagem (save vazio = personagem nova). Chamar ANTES de importar o jogo. */
export function restore(save: Save) {
  for (const k of keys()) localStorage.removeItem(k)
  for (const [k, v] of Object.entries(save)) if (typeof v === 'string' && !isDevice(k)) localStorage.setItem(k, v)
}

let charId: string | null = null
let last = ''

/** Envia o save se mudou desde o ultimo envio. Chame antes de recarregar a pagina (trocar personagem, resetar save). */
export async function flushSave(): Promise<void> {
  if (!charId) return
  const save = snapshot()
  const json = JSON.stringify(save)
  if (json === last) return
  let name: string | undefined
  try {
    name = String(JSON.parse(save['jb.profile.v1'] ?? '{}').name ?? '').trim().slice(0, 20) || undefined
  } catch {
    /* perfil ilegivel: mantem o nome do banco */
  }
  const { error } = await supabase.from('characters').update({ save, updated_at: new Date().toISOString(), ...(name ? { name } : {}) }).eq('id', charId)
  if (error) console.warn('[save] falhou, tenta de novo no proximo ciclo:', error.message)
  else last = json
}

// shortcut: a mesma personagem aberta em 2 abas sobrescreve o save uma da outra (ganha a ultima); bloquear quando sair do teste da equipe
export function startAutosave(id: string) {
  charId = id
  last = JSON.stringify(snapshot())
  // shortcut: ate 20 s de progresso podem se perder se a aba fechar de repente; para o teste da equipe basta
  window.setInterval(() => void flushSave(), 20_000)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushSave()
  })
}

/** Recarrega a pagina depois de salvar (volta para a tela de personagens, ou entra de novo no modo offline). */
export async function saveAndReload() {
  await flushSave()
  window.location.reload()
}
