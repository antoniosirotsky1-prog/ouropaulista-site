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

-- Forma de recebimento escolhida na reserva e frete estimado (ver /frete.js). Entrou em 19/11/2026.
alter table public.cadastros add column if not exists entrega jsonb check (pg_column_size(entrega) < 1000);

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

-- ---------------------------------------------------------------------------------------------
-- eventos: medição leve de uso do site (medir.js). Sem dado pessoal, sem IP, sem cookie.
--   * O site só INSERE. Ninguém lê linha a linha pela chave pública.
--   * A leitura é sempre agregada, pela função resumo_eventos(dias), que devolve só contagens.
--   * A mesma função apaga o que tem mais de 90 dias.
-- ---------------------------------------------------------------------------------------------
create table if not exists public.eventos (
  id      bigint generated always as identity primary key,
  em      timestamptz not null default now(),
  sessao  text not null check (sessao ~ '^[a-z0-9]{8,16}$'),
  evento  text not null check (evento in ('pagina_vista','secao_vista','cta_comprar','cta_whatsapp','cta_email',
                                          'peso','duvida','etapa_vista','erro_campo','envio_ok','envio_falha')),
  pagina  text not null check (char_length(pagina) <= 40),
  alvo    text not null default '' check (char_length(alvo) <= 40),
  faixa   text not null check (faixa in ('celular','tablet','computador')),
  origem  text not null default '' check (char_length(origem) <= 40),
  ref     text not null default '' check (char_length(ref) <= 60)
);
create index if not exists eventos_em on public.eventos (em);

alter table public.eventos enable row level security;
revoke all on table public.eventos from anon, authenticated;
grant insert (sessao, evento, pagina, alvo, faixa, origem, ref) on table public.eventos to anon;

drop policy if exists "site insere evento" on public.eventos;
create policy "site insere evento" on public.eventos for insert to anon with check (true);

create or replace function public.resumo_eventos(dias integer default 2)
returns table (dia date, evento text, pagina text, alvo text, faixa text, origem text, ref text, eventos bigint, sessoes bigint)
language plpgsql security definer set search_path = public as $$
begin
  delete from public.eventos e where e.em < now() - interval '90 days';
  return query
    select (e.em at time zone 'America/Sao_Paulo')::date, e.evento, e.pagina, e.alvo, e.faixa, e.origem, e.ref,
           count(*)::bigint, count(distinct e.sessao)::bigint
    from public.eventos e
    where e.em >= now() - make_interval(days => least(greatest(dias, 1), 90))
    group by 1, 2, 3, 4, 5, 6, 7
    order by 1 desc, 8 desc;
end $$;
revoke all on function public.resumo_eventos(integer) from public;
grant execute on function public.resumo_eventos(integer) to anon;
