-- Roleta: registro de quem girou e sorteio feito no banco. Entrou em 19/11/2026.
-- Rodar uma vez no SQL Editor do projeto, depois de backend/supabase.sql. Pode ser rodado de novo sem perder dados.
--
-- Como funciona
--   * O site chama a função girar(nome, e-mail) com a chave pública. O sorteio acontece aqui, não no navegador.
--   * Cada e-mail gira uma vez: chamar de novo devolve o mesmo resultado.
--   * A tabela giros não tem leitura, inserção, alteração nem exclusão para o público. Só a função grava nela.
--   * Prêmio de 10%, 15% ou barra só vale se o código estiver em giros, com o mesmo e-mail da reserva
--     (ver a visão premios_a_conferir). Código que não está aqui não foi sorteado.
--   * Chances a cada 10.000 giros: barra 1, 15% 10, 10% 50, 5% 9.939. São as mesmas de /codigo.js e das regras do
--     site: se mudar aqui, mude lá.
--   * Trava contra abuso: com mais de 300 giros na última hora, o giro só devolve 5% até a hora virar.

create table if not exists public.giros (
  id      bigint generated always as identity primary key,
  em      timestamptz not null default now(),
  nome    text not null check (char_length(nome) between 2 and 80),
  email   text not null unique check (char_length(email) <= 120 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  premio  text not null check (premio in ('5', '10', '15', 'B')),
  codigo  text not null check (codigo ~ '^[0-9A-Z]{9}$')
);
create index if not exists giros_em on public.giros (em);
create index if not exists giros_codigo on public.giros (codigo);

alter table public.giros enable row level security;
revoke all on table public.giros from anon, authenticated;

-- mesmo dígito de conferência de /codigo.js (função digito)
create or replace function public.op_digito(s text) returns text
language plpgsql immutable set search_path = public as $$
declare ch constant text := '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'; n integer := 7;
begin
  for i in 1..char_length(s) loop
    n := (n * 31 + ascii(substr(s, i, 1)) * (i + 2)) % 9973;
  end loop;
  return substr(ch, n % 34 + 1, 1);
end $$;
revoke all on function public.op_digito(text) from public;

create or replace function public.girar(p_nome text, p_email text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  ch constant text := '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_nome  text := left(btrim(regexp_replace(coalesce(p_nome, ''), '\s+', ' ', 'g')), 80);
  v_email text := left(lower(btrim(coalesce(p_email, ''))), 120);
  v_hex   text := md5(gen_random_uuid()::text || gen_random_uuid()::text);
  v_r     integer;
  v_premio text;
  v_codigo text;
  v_base  text;
  g       public.giros%rowtype;
begin
  if char_length(v_nome) < 2 or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'nome ou e-mail invalido' using errcode = '22023';
  end if;
  select * into g from public.giros where email = v_email;
  if found then return jsonb_build_object('premio', g.premio, 'codigo', g.codigo, 'repetido', true); end if;

  v_r := (('x' || substr(v_hex, 1, 7))::bit(28)::integer) % 10000;
  if (select count(*) from public.giros where em > now() - interval '1 hour') > 300 then v_premio := '5';
  elsif v_r < 1 then v_premio := 'B';
  elsif v_r < 11 then v_premio := '15';
  elsif v_r < 61 then v_premio := '10';
  else v_premio := '5';
  end if;

  if v_premio = '5' then v_codigo := 'PAULISTA5';
  else
    v_base := case v_premio when 'B' then 'B1G' when '15' then 'D15' else 'D10' end;
    for i in 0..4 loop
      v_base := v_base || substr(ch, (('x' || substr(v_hex, 9 + i * 4, 4))::bit(16)::integer) % 34 + 1, 1);
    end loop;
    v_codigo := v_base || public.op_digito(v_base);
  end if;

  insert into public.giros (nome, email, premio, codigo) values (v_nome, v_email, v_premio, v_codigo)
  on conflict (email) do nothing;
  if not found then
    select * into g from public.giros where email = v_email;
    return jsonb_build_object('premio', g.premio, 'codigo', g.codigo, 'repetido', true);
  end if;
  return jsonb_build_object('premio', v_premio, 'codigo', v_codigo, 'repetido', false);
end $$;
revoke all on function public.girar(text, text) from public;
grant execute on function public.girar(text, text) to anon;

-- Reservas que usaram código de prêmio, lado a lado com o giro. "confere" = o código foi sorteado para o mesmo e-mail.
create or replace view public.premios_a_conferir with (security_invoker = true) as
  select c.id, c.criado_em, c.nome, c.email, c.barra_g, c.quantidade, c.origem->>'codigo' as codigo,
         g.premio, g.em as girou_em, (g.email is not null and lower(btrim(c.email)) = g.email) as confere
  from public.cadastros c
  left join public.giros g on g.codigo = c.origem->>'codigo'
  where c.origem->>'codigo' ~ '^(D10|D15|B1G)';
revoke all on public.premios_a_conferir from anon, authenticated;
