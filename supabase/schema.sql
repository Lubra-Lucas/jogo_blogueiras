-- Jogo das Blogueiras: banco do multiplayer (rodar uma vez no SQL Editor do Supabase).
-- Cada conta tem ate 3 personagens; `save` guarda todo o progresso da personagem (Brilhos, nivel, missoes,
-- aparencia, guarda-roupa, inventario...) como o mapa chave -> texto do localStorage do jogo.

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 20),
  save jsonb not null default '{}'::jsonb check (pg_column_size(save) < 3000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index characters_user_id_idx on public.characters (user_id);

-- cada pessoa so ve, cria, edita e apaga as proprias personagens
alter table public.characters enable row level security;

create policy "own characters" on public.characters
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- limite de 3 personagens por conta (o cliente tambem limita; isto vale contra chamadas diretas a API)
create function public.characters_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.characters where user_id = new.user_id) >= 3 then
    raise exception 'limite de 3 personagens por conta';
  end if;
  return new;
end $$;

create trigger characters_limit before insert on public.characters
  for each row execute function public.characters_limit();
