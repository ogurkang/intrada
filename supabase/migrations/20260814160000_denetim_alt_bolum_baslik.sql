-- Başlıklar artık bölüm altındaki sabit alt menülere (gelir tarifesi, bütçe, İKEP …) bağlanır

alter table public.denetim_bolum_baslik
  add column if not exists alt_bolum text;

-- Önceki sürümde alt menüler kayıt olarak tutuluyordu; belgesi olanlar
-- kendi alt menüsünün ilk başlığı olarak korunur, boş olanlar temizlenir.
update public.denetim_bolum_baslik b
set alt_bolum = b.sistem_anahtari
where b.alt_bolum is null
  and b.sistem_anahtari is not null;

delete from public.denetim_bolum_baslik b
where b.sistem_anahtari is not null
  and not exists (
    select 1 from public.denetim_bolum_belge d where d.baslik_id = b.id
  );

delete from public.denetim_bolum_baslik where alt_bolum is null;

alter table public.denetim_bolum_baslik
  alter column alt_bolum set not null;

alter table public.denetim_bolum_baslik
  drop column if exists sistem_anahtari;

drop index if exists public.uq_denetim_bolum_baslik_sistem;
drop index if exists public.uq_denetim_bolum_baslik_ad;
drop index if exists public.idx_denetim_bolum_baslik_donem;

create unique index if not exists uq_denetim_bolum_baslik_ad
  on public.denetim_bolum_baslik (donem_id, bolum, alt_bolum, lower(baslik));

create index if not exists idx_denetim_bolum_baslik_alt
  on public.denetim_bolum_baslik (donem_id, bolum, alt_bolum, sira_no);

-- Varsayılan başlık üretimi kaldırıldı: alt menüler koddan gelir.
drop trigger if exists trg_denetim_donem_baslik_seed on public.denetim_donem;
drop function if exists public.denetim_donem_baslik_seed_trigger();
drop function if exists public.denetim_varsayilan_basliklari_ekle(bigint);
