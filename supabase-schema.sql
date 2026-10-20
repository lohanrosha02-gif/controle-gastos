-- Meu Bolso: dados privados sincronizados por usuário.
-- Execute no SQL Editor do SEU projeto Supabase.
-- Nunca use a chave service_role no navegador ou no repositório.

create table if not exists public.meu_bolso_cloud (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  version bigint not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  constraint meu_bolso_payload_object check (jsonb_typeof(payload) = 'object')
);

alter table public.meu_bolso_cloud enable row level security;
revoke all on public.meu_bolso_cloud from anon;
grant select, insert, update on public.meu_bolso_cloud to authenticated;

drop policy if exists meu_bolso_owner_read on public.meu_bolso_cloud;
drop policy if exists meu_bolso_owner_insert on public.meu_bolso_cloud;
drop policy if exists meu_bolso_owner_update on public.meu_bolso_cloud;

create policy meu_bolso_owner_read on public.meu_bolso_cloud
 for select to authenticated
 using ((select auth.uid()) = user_id);

create policy meu_bolso_owner_insert on public.meu_bolso_cloud
 for insert to authenticated
 with check ((select auth.uid()) = user_id);

create policy meu_bolso_owner_update on public.meu_bolso_cloud
 for update to authenticated
 using ((select auth.uid()) = user_id)
 with check ((select auth.uid()) = user_id);

-- Write atomically with an expected version.
-- Prevents a stale browser from silently overwriting another device.
create or replace function public.meu_bolso_write(
  p_expected_version bigint,
  p_payload jsonb
)
returns table (written boolean, server_version bigint)
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_user uuid := (select auth.uid());
  v_version bigint;
begin
  if v_user is null then
    raise exception 'Autenticação necessária' using errcode = '28000';
  end if;
  if p_expected_version is null or p_expected_version < 0 then
    raise exception 'Versão inválida';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Dados inválidos';
  end if;
  if p_expected_version = 0 then
    insert into public.meu_bolso_cloud(user_id,payload,version,updated_at)
    values (v_user,p_payload,1,now())
    on conflict (user_id) do nothing
    returning version into v_version;
  else
    update public.meu_bolso_cloud
    set payload = p_payload, version = version + 1, updated_at = now()
    where user_id = v_user and version = p_expected_version
    returning version into v_version;
  end if;
  return query select (v_version is not null), coalesce(v_version,0)::bigint;
end;
$fn$;

revoke all on function public.meu_bolso_write(bigint,jsonb) from public, anon;
grant execute on function public.meu_bolso_write(bigint,jsonb) to authenticated;

-- The frontend only uses the public/publishable key. Authorization
-- is enforced by Supabase Auth and PostgreSQL Row Level Security.
