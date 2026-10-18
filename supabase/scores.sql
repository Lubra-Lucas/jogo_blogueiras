-- Jogo das Blogueiras: ranking geral dos minijogos (rodar uma vez no SQL Editor do Supabase, depois de schema.sql).
-- Uma linha por personagem, minijogo e dificuldade com o melhor placar. Todas as jogadoras leem; so a dona grava.
-- Boards diarios usam board_id `<minijogo>-diario:AAAA-MM-DD` (UTC), entao o ranking do dia recomeca sozinho.

create table public.scores (
  char_id uuid not null references public.characters(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 20),
  board_id text not null check (char_length(board_id) between 1 and 80),
  difficulty text not null check (difficulty in ('facil','normal','dificil','estrela')),
  score integer not null check (score >= 0),
  updated_at timestamptz not null default now(),
  primary key (char_id, board_id, difficulty)
);

alter table public.scores enable row level security;

create policy "ranking visivel" on public.scores
  for select to authenticated
  using (true);

create policy "grava o proprio placar" on public.scores
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.characters c where c.id = char_id and c.user_id = (select auth.uid()))
  );

create policy "atualiza o proprio placar" on public.scores
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.characters c where c.id = char_id and c.user_id = (select auth.uid()))
  );
