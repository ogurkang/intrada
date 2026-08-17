-- Statüsü Memur olan kadrolar için alt ayrım: Memur / Sözleşmeli

alter table public.kadro_hareketleri
  add column if not exists ayrim text;

update public.kadro_hareketleri
set ayrim = 'Memur'
where btrim(coalesce(statu, '')) = 'Memur'
  and ayrim is null;

update public.kadro_hareketleri
set ayrim = null
where btrim(coalesce(statu, '')) <> 'Memur'
  and ayrim is not null;

alter table public.kadro_hareketleri
  drop constraint if exists kadro_hareketleri_ayrim_check;

alter table public.kadro_hareketleri
  add constraint kadro_hareketleri_ayrim_check
  check (
    (btrim(coalesce(statu, '')) = 'Memur' and ayrim in ('Memur', 'Sözleşmeli'))
    or
    (btrim(coalesce(statu, '')) <> 'Memur' and ayrim is null)
  );

notify pgrst, 'reload schema';
