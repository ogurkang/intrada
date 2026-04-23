create table if not exists public.stratejik_plan_donem (
  id bigserial primary key,
  donem_adi text not null,
  baslangic_tarihi date not null,
  bitis_tarihi date not null,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stratejik_plan_donem_tarih_ck check (baslangic_tarihi <= bitis_tarihi)
);

create table if not exists public.stratejik_plan_amac (
  id bigserial primary key,
  donem_id bigint not null references public.stratejik_plan_donem(id) on delete cascade,
  sira_no integer null,
  kodu text not null,
  amac_adi text not null,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_stratejik_plan_amac_donem_id
  on public.stratejik_plan_amac(donem_id);

create or replace function public.set_updated_at_stratejik_plan_donem()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_updated_at_stratejik_plan_donem on public.stratejik_plan_donem;
create trigger trg_set_updated_at_stratejik_plan_donem
before update on public.stratejik_plan_donem
for each row execute function public.set_updated_at_stratejik_plan_donem();

create or replace function public.set_updated_at_stratejik_plan_amac()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_updated_at_stratejik_plan_amac on public.stratejik_plan_amac;
create trigger trg_set_updated_at_stratejik_plan_amac
before update on public.stratejik_plan_amac
for each row execute function public.set_updated_at_stratejik_plan_amac();

alter table public.stratejik_plan_donem enable row level security;
alter table public.stratejik_plan_amac enable row level security;

drop policy if exists "sp_donem_select_auth" on public.stratejik_plan_donem;
create policy "sp_donem_select_auth"
on public.stratejik_plan_donem
for select
to authenticated
using (true);

drop policy if exists "sp_donem_insert_auth" on public.stratejik_plan_donem;
create policy "sp_donem_insert_auth"
on public.stratejik_plan_donem
for insert
to authenticated
with check (true);

drop policy if exists "sp_donem_update_auth" on public.stratejik_plan_donem;
create policy "sp_donem_update_auth"
on public.stratejik_plan_donem
for update
to authenticated
using (true)
with check (true);

drop policy if exists "sp_amac_select_auth" on public.stratejik_plan_amac;
create policy "sp_amac_select_auth"
on public.stratejik_plan_amac
for select
to authenticated
using (true);

drop policy if exists "sp_amac_insert_auth" on public.stratejik_plan_amac;
create policy "sp_amac_insert_auth"
on public.stratejik_plan_amac
for insert
to authenticated
with check (true);

drop policy if exists "sp_amac_update_auth" on public.stratejik_plan_amac;
create policy "sp_amac_update_auth"
on public.stratejik_plan_amac
for update
to authenticated
using (true)
with check (true);
