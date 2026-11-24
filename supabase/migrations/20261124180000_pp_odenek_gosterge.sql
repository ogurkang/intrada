-- Ödenek teklifi performans faaliyetinden göstergeye taşınır.
-- Tek göstergeli faaliyetlerde doğrudan; birden çok göstergede ilk sıradaki göstergeye (sira_no).

alter table public.performans_programi_pf_odenek
  add column if not exists pf_gosterge_id bigint;

update public.performans_programi_pf_odenek o
set pf_gosterge_id = g.id
from (
  select distinct on (faaliyet_id)
    id,
    faaliyet_id
  from public.performans_programi_pf_gosterge
  order by faaliyet_id, sira_no nulls last, id
) g
where o.pf_faaliyet_id = g.faaliyet_id
  and o.pf_gosterge_id is null;

-- Eşleşmeyen (gösterge yok) satır kalmamalı; güvenlik için sil.
delete from public.performans_programi_pf_odenek
where pf_gosterge_id is null;

alter table public.performans_programi_pf_odenek
  alter column pf_gosterge_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'performans_programi_pf_odenek_pf_gosterge_id_fkey'
  ) then
    alter table public.performans_programi_pf_odenek
      add constraint performans_programi_pf_odenek_pf_gosterge_id_fkey
      foreign key (pf_gosterge_id)
      references public.performans_programi_pf_gosterge(id)
      on delete cascade;
  end if;
end $$;

alter table public.performans_programi_pf_odenek
  drop constraint if exists performans_programi_pf_odenek_pf_faaliyet_id_butce_kodu_id_key;

alter table public.performans_programi_pf_odenek
  drop constraint if exists performans_programi_pf_odenek_pf_faaliyet_id_fkey;

alter table public.performans_programi_pf_odenek
  drop column if exists pf_faaliyet_id;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'performans_programi_pf_odenek_pf_gosterge_id_butce_kodu_id_key'
  ) then
    alter table public.performans_programi_pf_odenek
      add constraint performans_programi_pf_odenek_pf_gosterge_id_butce_kodu_id_key
      unique (pf_gosterge_id, butce_kodu_id);
  end if;
end $$;
