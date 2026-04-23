create table if not exists public.stratejik_plan_hedef (
  id bigserial primary key,
  amac_id bigint not null references public.stratejik_plan_amac(id) on delete cascade,
  sira_no integer null,
  kodu text not null,
  hedef_adi text not null,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stratejik_plan_alt_hedef (
  id bigserial primary key,
  hedef_id bigint not null references public.stratejik_plan_hedef(id) on delete cascade,
  sira_no integer null,
  kodu text not null,
  alt_hedef_adi text not null,
  mudurluk text not null,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_stratejik_plan_hedef_amac_id
  on public.stratejik_plan_hedef(amac_id);

create index if not exists idx_stratejik_plan_alt_hedef_hedef_id
  on public.stratejik_plan_alt_hedef(hedef_id);

create or replace function public.set_updated_at_stratejik_plan_hedef()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_updated_at_stratejik_plan_hedef on public.stratejik_plan_hedef;
create trigger trg_set_updated_at_stratejik_plan_hedef
before update on public.stratejik_plan_hedef
for each row execute function public.set_updated_at_stratejik_plan_hedef();

create or replace function public.set_updated_at_stratejik_plan_alt_hedef()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_updated_at_stratejik_plan_alt_hedef on public.stratejik_plan_alt_hedef;
create trigger trg_set_updated_at_stratejik_plan_alt_hedef
before update on public.stratejik_plan_alt_hedef
for each row execute function public.set_updated_at_stratejik_plan_alt_hedef();

alter table public.stratejik_plan_hedef enable row level security;
alter table public.stratejik_plan_alt_hedef enable row level security;

drop policy if exists "sp_hedef_select_auth" on public.stratejik_plan_hedef;
create policy "sp_hedef_select_auth"
on public.stratejik_plan_hedef
for select
to authenticated
using (true);

drop policy if exists "sp_hedef_insert_auth" on public.stratejik_plan_hedef;
create policy "sp_hedef_insert_auth"
on public.stratejik_plan_hedef
for insert
to authenticated
with check (true);

drop policy if exists "sp_hedef_update_auth" on public.stratejik_plan_hedef;
create policy "sp_hedef_update_auth"
on public.stratejik_plan_hedef
for update
to authenticated
using (true)
with check (true);

drop policy if exists "sp_alt_hedef_select_auth" on public.stratejik_plan_alt_hedef;
create policy "sp_alt_hedef_select_auth"
on public.stratejik_plan_alt_hedef
for select
to authenticated
using (true);

drop policy if exists "sp_alt_hedef_insert_auth" on public.stratejik_plan_alt_hedef;
create policy "sp_alt_hedef_insert_auth"
on public.stratejik_plan_alt_hedef
for insert
to authenticated
with check (true);

drop policy if exists "sp_alt_hedef_update_auth" on public.stratejik_plan_alt_hedef;
create policy "sp_alt_hedef_update_auth"
on public.stratejik_plan_alt_hedef
for update
to authenticated
using (true)
with check (true);
