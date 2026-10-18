import { useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, type CharacterRow } from '../../net/supabase'
import type { Save } from '../../net/save'
import './login.css'

/**
 * Antes do jogo: login (e-mail + senha) e escolha/criacao da personagem. Nao importa nada do jogo
 * (os stores leem o localStorage ao carregar; o save da personagem precisa estar la antes).
 */
const MAX_CHARS = 3

export function LoginScreen({ onPlay }: { onPlay: (id: string, save: Save, isNew: boolean) => void }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  return (
    <div className="login">
      <div className="login__box glass">
        <h1 className="login__title">Jogo das Blogueiras</h1>
        {session === undefined ? <p className="login__msg">Carregando...</p> : session ? <Characters session={session} onPlay={onPlay} /> : <AuthForm />}
      </div>
    </div>
  )
}

function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const go = async (e: { preventDefault(): void }, signUp: boolean) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const creds = { email: email.trim(), password }
    const { data, error } = signUp ? await supabase.auth.signUp(creds) : await supabase.auth.signInWithPassword(creds)
    setBusy(false)
    if (error) setMsg(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message)
    else if (!data.session) setMsg('Conta criada. Confirme o e-mail e depois clique em Entrar.') // so acontece com a confirmacao de e-mail ligada no Supabase
  }
  return (
    <form className="login__form" onSubmit={(e) => go(e, false)}>
      <label>
        E-mail
        <input className="login__input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Senha
        <input className="login__input" type="password" autoComplete="current-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {msg && (
        <p className="login__msg login__msg--err" role="alert">
          {msg}
        </p>
      )}
      <div className="login__row">
        <button className="login__btn login__btn--primary" disabled={busy}>
          Entrar
        </button>
        <button type="button" className="login__btn" disabled={busy} onClick={(e) => e.currentTarget.form?.reportValidity() && go(e, true)}>
          Criar conta
        </button>
      </div>
    </form>
  )
}

function Characters({ session, onPlay }: { session: Session; onPlay: (id: string, save: Save, isNew: boolean) => void }) {
  const [list, setList] = useState<CharacterRow[] | null>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const load = async () => {
    const { data, error } = await supabase.from('characters').select('id, name, updated_at').order('created_at')
    if (error) setMsg(error.message)
    setList(data ?? [])
  }
  useEffect(() => void load(), [])

  const play = async (id: string) => {
    setBusy(true)
    const { data, error } = await supabase.from('characters').select('save').eq('id', id).single()
    if (error) return setBusy(false), setMsg(error.message)
    onPlay(id, (data.save ?? {}) as Save, false)
  }
  const create = async (e: FormEvent) => {
    e.preventDefault()
    const n = name.trim().slice(0, 20)
    if (!n) return
    setBusy(true)
    // a personagem nova ja nasce com o nome (pula a tela de boas-vindas do jogo); a aparencia e feita no editor ao entrar
    const save: Save = { 'jb.profile.v1': JSON.stringify({ v: 1, name: n, named: true }) }
    const { data, error } = await supabase.from('characters').insert({ name: n, save }).select('id').single()
    if (error) return setBusy(false), setMsg(error.message)
    onPlay(data.id, save, true)
  }
  const remove = async (id: string) => {
    setConfirmDel(null)
    const { error } = await supabase.from('characters').delete().eq('id', id)
    if (error) setMsg(error.message)
    load()
  }

  return (
    <>
      <p className="login__msg">
        {session.user.email}{' '}
        <button type="button" className="login__link" onClick={() => supabase.auth.signOut()}>
          Sair
        </button>
      </p>
      <h2 className="login__sub">Suas personagens</h2>
      {list === null ? (
        <p className="login__msg">Carregando...</p>
      ) : (
        <ul className="login__list">
          {list.map((c) => (
            <li key={c.id} className="login__char">
              <span className="login__name">{c.name}</span>
              {confirmDel === c.id ? (
                <>
                  <button type="button" className="login__btn login__btn--danger" onClick={() => remove(c.id)}>
                    Apagar mesmo
                  </button>
                  <button type="button" className="login__btn" onClick={() => setConfirmDel(null)}>
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="login__btn login__btn--primary" disabled={busy} onClick={() => play(c.id)}>
                    Jogar
                  </button>
                  <button type="button" className="login__btn" disabled={busy} aria-label={`Apagar ${c.name}`} onClick={() => setConfirmDel(c.id)}>
                    Apagar
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {list && list.length < MAX_CHARS && (
        <form className="login__row" onSubmit={create}>
          <input className="login__input" maxLength={20} required placeholder="Nome da nova personagem" aria-label="Nome da nova personagem" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="login__btn login__btn--primary" disabled={busy}>
            Criar
          </button>
        </form>
      )}
      {msg && (
        <p className="login__msg login__msg--err" role="alert">
          {msg}
        </p>
      )}
    </>
  )
}
