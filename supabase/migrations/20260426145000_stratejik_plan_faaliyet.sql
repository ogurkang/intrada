create table if not exists public.stratejik_plan_faaliyet (
  id bigserial primary key,
  alt_hedef_id bigint not null references public.stratejik_plan_alt_hedef(id) on delete cascade,
  sira_no integer null,
  faaliyet_adi text not null,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (alt_hedef_id, sira_no)
);

alter table if exists public.stratejik_plan_gosterge
add column if not exists faaliyet_id bigint null references public.stratejik_plan_faaliyet(id) on delete set null;

create index if not exists idx_stratejik_plan_faaliyet_alt_hedef_id
  on public.stratejik_plan_faaliyet(alt_hedef_id);

create index if not exists idx_stratejik_plan_gosterge_faaliyet_id
  on public.stratejik_plan_gosterge(faaliyet_id);

create or replace function public.set_updated_at_stratejik_plan_faaliyet()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_updated_at_stratejik_plan_faaliyet on public.stratejik_plan_faaliyet;
create trigger trg_set_updated_at_stratejik_plan_faaliyet
before update on public.stratejik_plan_faaliyet
for each row execute function public.set_updated_at_stratejik_plan_faaliyet();

alter table public.stratejik_plan_faaliyet enable row level security;

drop policy if exists "sp_faaliyet_select_auth" on public.stratejik_plan_faaliyet;
create policy "sp_faaliyet_select_auth"
on public.stratejik_plan_faaliyet
for select
to authenticated
using (true);

drop policy if exists "sp_faaliyet_insert_auth" on public.stratejik_plan_faaliyet;
create policy "sp_faaliyet_insert_auth"
on public.stratejik_plan_faaliyet
for insert
to authenticated
with check (true);

drop policy if exists "sp_faaliyet_update_auth" on public.stratejik_plan_faaliyet;
create policy "sp_faaliyet_update_auth"
on public.stratejik_plan_faaliyet
for update
to authenticated
using (true)
with check (true);

insert into public.stratejik_plan_faaliyet (alt_hedef_id, sira_no, faaliyet_adi)
select ah.id, v.sira_no, v.faaliyet_adi
from public.stratejik_plan_alt_hedef ah
cross join (
  values
    (1, 'İş Güvenliği ve İşçi Sağlığı Kanunu kapsamında çalışmalar yapılması'),
    (2, 'Kurum çalışanlarının kapasitesini, verimliliğini ve motivasyonunu arttırarak, insan kaynakları yönetimini geliştirmek.'),
    (3, 'Kurumsal kültür ve örgütsel bağlılık bilincinin etkinliğini sağlamak.')
) as v(sira_no, faaliyet_adi)
where exists (
  select 1
  from public.stratejik_plan_gosterge g
  where g.alt_hedef_id = ah.id
)
on conflict (alt_hedef_id, sira_no)
do update set faaliyet_adi = excluded.faaliyet_adi;

update public.stratejik_plan_gosterge g
set faaliyet_id = f.id
from public.stratejik_plan_faaliyet f
where f.alt_hedef_id = g.alt_hedef_id
  and (
    (f.sira_no = 1 and g.sira_no between 1 and 5)
    or (f.sira_no = 2 and g.sira_no between 6 and 8)
    or (f.sira_no = 3 and g.sira_no between 9 and 14)
  );
