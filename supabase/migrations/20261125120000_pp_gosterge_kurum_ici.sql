-- Kurum İçi işaretleme gösterge düzeyine taşınır (faaliyet geneline yayılmaz).
alter table public.performans_programi_pf_gosterge
  add column if not exists kurum_ici boolean not null default false;

-- Eski faaliyet bayrağı varsa bağlı göstergelere aktar.
update public.performans_programi_pf_gosterge g
set kurum_ici = true
from public.performans_programi_pf_faaliyet f
where g.faaliyet_id = f.id
  and coalesce(f.kurum_ici, false) = true
  and g.kurum_ici = false;
