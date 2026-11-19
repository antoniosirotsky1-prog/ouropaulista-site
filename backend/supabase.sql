-- Banco de cadastros da Ouro Paulista (Supabase, projeto próprio, separado de qualquer outro).
-- Rodar uma vez no SQL Editor do projeto. Pode ser rodado de novo sem perder dados.
--
-- Modelo de segurança
--   * O site usa só a chave pública (anon). Com ela é possível INSERIR um cadastro e ENVIAR arquivos. Nada mais.
--   * Não existe política de leitura, alteração ou exclusão para o público: ninguém lê cadastro nem documento pelo site.
--   * Leitura só pelo painel do Supabase (login do dono, com 2FA) ou com a chave service_role, que nunca vai para o site.
--   * O bucket de documentos é privado, aceita só imagem e PDF, até 10 MB por arquivo.

create table if not exists public.cadastros (
  id                  uuid primary key,
  criado_em           timestamptz not null default now(),
  status              text not null default 'novo',
  barra_g             integer not null check (barra_g in (1, 5, 10, 25, 50, 100)),
  quantidade          integer not null default 1 check (quantidade between 1 and 10),
  nome                text not null check (char_length(nome) between 3 and 120),
  cpf                 text not null check (cpf ~ '^[0-9]{11}$'),
  nascimento          date not null,
  profissao           text check (char_length(profissao) <= 80),
  pep                 boolean not null default false,
  email               text not null check (char_length(email) <= 160),
  celular             text not null check (celular ~ '^[0-9]{10,13}$'),
  cep                 text check (cep ~ '^[0-9]{8}$'),
  logradouro          text check (char_length(logradouro) <= 160),
  numero              text check (char_length(numero) <= 20),
  complemento         text check (char_length(complemento) <= 80),
  bairro              text check (char_length(bairro) <= 80),
  cidade              text check (char_length(cidade) <= 80),
  uf                  text check (uf ~ '^[A-Z]{2}$'),
  documentos          jsonb not null default '[]'::jsonb check (pg_column_size(documentos) < 4000),
  origem              jsonb check (pg_column_size(origem) < 2000),
  consentimento_em    timestamptz not null,
  consentimento_texto text not null check (char_length(consentimento_texto) <= 600),
  observacao          text
);

alter table public.cadastros enable row level security;

revoke all on table public.cadastros from anon, authenticated;
grant insert on table public.cadastros to anon;

drop policy if exists "site insere cadastro" on public.cadastros;
create policy "site insere cadastro" on public.cadastros
  for insert to anon
  with check (status = 'novo' and observacao is null);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos', 'documentos', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "site envia documento" on storage.objects;
create policy "site envia documento" on storage.objects
  for insert to anon
  with check (bucket_id = 'documentos');
