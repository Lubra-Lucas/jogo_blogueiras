import { createClient } from '@supabase/supabase-js'

// chave publicavel: pode ficar no codigo (vai para o navegador de qualquer jeito); quem protege os dados e o RLS de supabase/schema.sql
export const supabase = createClient('https://iybzfkgjrudvhcmssfnf.supabase.co', 'sb_publishable_gvnJLyp3msp4Bvyay4525w_cz7DMgI6')

export interface CharacterRow {
  id: string
  name: string
  updated_at: string
}

/** `?offline=1`: joga sem login e sem rede, com o save so do navegador (como antes do multiplayer). */
export const OFFLINE = new URLSearchParams(window.location.search).has('offline')
