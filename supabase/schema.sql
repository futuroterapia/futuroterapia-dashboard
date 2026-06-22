-- Futuroterapia quiz — analytics schema
-- Rode isso no SQL Editor do seu projeto Supabase

create table if not exists quiz_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  session_id uuid not null,
  event_type text not null check (event_type in (
    'quiz_started',
    'quiz_completed',
    'result_shown',
    'content_click',
    'therapist_click',
    'whatsapp_click',
    'share_click'
  )),
  therapy_id text,
  therapy_name text,
  secondary_therapy_id text,
  secondary_therapy_name text,
  therapist_id text,
  therapist_name text
);

create index if not exists idx_quiz_events_type on quiz_events(event_type);
create index if not exists idx_quiz_events_therapy on quiz_events(therapy_id);
create index if not exists idx_quiz_events_therapist on quiz_events(therapist_id);
create index if not exists idx_quiz_events_created_at on quiz_events(created_at);

alter table quiz_events enable row level security;

-- Permite que o quiz (chave anon) insira eventos
create policy "anon can insert events"
  on quiz_events for insert
  to anon
  with check (true);

-- O dashboard /admin usa a mesma chave anon para leitura.
-- Isso só é seguro porque a tabela não guarda nenhum dado pessoal do
-- usuário do quiz (sem nome, telefone ou IP) — só contadores de terapia/terapeuta/evento.
-- Se no futuro passar a guardar dados pessoais, troque esta policy por
-- autenticação (Supabase Auth) e restrinja o select a usuários logados.
create policy "anon can read events"
  on quiz_events for select
  to anon
  using (true);
