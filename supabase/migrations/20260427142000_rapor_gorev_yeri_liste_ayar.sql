create table if not exists public.rapor_gorev_yeri_liste_ayar (
  id bigserial primary key,
  kayit_key text not null unique,
  sira_no integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_rapor_gorev_yeri_liste_ayar_sira
  on public.rapor_gorev_yeri_liste_ayar (sira_no);

create or replace function public.set_updated_at_rapor_gorev_yeri_liste_ayar()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_set_updated_at_rapor_gorev_yeri_liste_ayar on public.rapor_gorev_yeri_liste_ayar;
create trigger trg_set_updated_at_rapor_gorev_yeri_liste_ayar
before update on public.rapor_gorev_yeri_liste_ayar
for each row execute function public.set_updated_at_rapor_gorev_yeri_liste_ayar();

alter table public.rapor_gorev_yeri_liste_ayar enable row level security;

drop policy if exists "rapor_gorev_yeri_liste_ayar_select_auth" on public.rapor_gorev_yeri_liste_ayar;
create policy "rapor_gorev_yeri_liste_ayar_select_auth"
on public.rapor_gorev_yeri_liste_ayar
for select
to authenticated
using (true);

drop policy if exists "rapor_gorev_yeri_liste_ayar_insert_auth" on public.rapor_gorev_yeri_liste_ayar;
create policy "rapor_gorev_yeri_liste_ayar_insert_auth"
on public.rapor_gorev_yeri_liste_ayar
for insert
to authenticated
with check (true);

drop policy if exists "rapor_gorev_yeri_liste_ayar_update_auth" on public.rapor_gorev_yeri_liste_ayar;
create policy "rapor_gorev_yeri_liste_ayar_update_auth"
on public.rapor_gorev_yeri_liste_ayar
for update
to authenticated
using (true)
with check (true);

drop policy if exists "rapor_gorev_yeri_liste_ayar_delete_auth" on public.rapor_gorev_yeri_liste_ayar;
create policy "rapor_gorev_yeri_liste_ayar_delete_auth"
on public.rapor_gorev_yeri_liste_ayar
for delete
to authenticated
using (true);
