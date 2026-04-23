create table if not exists public.stratejik_plan_gosterge (
  id bigserial primary key,
  alt_hedef_id bigint not null references public.stratejik_plan_alt_hedef(id) on delete cascade,
  sira_no integer null,
  gosterge_adi text not null,
  birim text not null,
  yil_1 numeric null,
  yil_2 numeric null,
  yil_3 numeric null,
  yil_4 numeric null,
  yil_5 numeric null,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stratejik_plan_gosterge_birim_ck check (
    birim in ('Yuzde', 'Adet', 'Kisi', 'Gun', 'Hektar', 'Ton', 'Metre', 'Metrekare')
  )
);

create index if not exists idx_stratejik_plan_gosterge_alt_hedef_id
  on public.stratejik_plan_gosterge(alt_hedef_id);

create or replace function public.set_updated_at_stratejik_plan_gosterge()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_updated_at_stratejik_plan_gosterge on public.stratejik_plan_gosterge;
create trigger trg_set_updated_at_stratejik_plan_gosterge
before update on public.stratejik_plan_gosterge
for each row execute function public.set_updated_at_stratejik_plan_gosterge();

alter table public.stratejik_plan_gosterge enable row level security;

drop policy if exists "sp_gosterge_select_auth" on public.stratejik_plan_gosterge;
create policy "sp_gosterge_select_auth"
on public.stratejik_plan_gosterge
for select
to authenticated
using (true);

drop policy if exists "sp_gosterge_insert_auth" on public.stratejik_plan_gosterge;
create policy "sp_gosterge_insert_auth"
on public.stratejik_plan_gosterge
for insert
to authenticated
with check (true);

drop policy if exists "sp_gosterge_update_auth" on public.stratejik_plan_gosterge;
create policy "sp_gosterge_update_auth"
on public.stratejik_plan_gosterge
for update
to authenticated
using (true)
with check (true);
