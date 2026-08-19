-- Ayrım kaldır: sözleşmeli personel doğrudan statu=Sözleşmeli ile tutulur.

update public.kadro_hareketleri
set statu = 'Sözleşmeli'
where btrim(coalesce(statu, '')) = 'Memur'
  and ayrim = 'Sözleşmeli';

alter table public.kadro_hareketleri
  drop constraint if exists kadro_hareketleri_ayrim_check;

alter table public.kadro_hareketleri
  drop column if exists ayrim;

notify pgrst, 'reload schema';
