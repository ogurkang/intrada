-- Unvan: Müdür mü? + kadro türü. Supabase SQL editöründe bir kez çalıştırın.

alter table public.tanim_unvan
  add column if not exists mudur_mu boolean not null default false;

alter table public.tanim_unvan
  add column if not exists kadro_turu text null;

comment on column public.tanim_unvan.mudur_mu is
  'Birim amiri / harcama yetkilisi adayı müdür unvanı. Metinde müdürü aramak yerine bu bayrak kullanılır.';

comment on column public.tanim_unvan.kadro_turu is
  'diger | idari | zorunlu. İdari = yönetmelik eki (IV) sayılı liste (idari personel kadro unvanları).';

-- Başlangıç: adında «müdürü» geçen, yardımcı/şube olmayan unvanlar
update public.tanim_unvan
set mudur_mu = true
where mudur_mu = false
  and unvan_adi ilike '%müdürü%'
  and unvan_adi not ilike '%yardımcı%'
  and unvan_adi not ilike '%şube%';
