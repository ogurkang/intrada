-- Ayrım kaldır: sözleşmeli personel doğrudan statu=Sözleşmeli ile tutulur.
-- Önce constraint kalkmalı; aksi halde statu güncellenirken ayrim dolu kalıp check'e takılır.

alter table public.kadro_hareketleri
  drop constraint if exists kadro_hareketleri_ayrim_check;

update public.kadro_hareketleri
set statu = 'Sözleşmeli'
where btrim(coalesce(statu, '')) = 'Memur'
  and ayrim = 'Sözleşmeli';

alter table public.kadro_hareketleri
  drop column if exists ayrim;

notify pgrst, 'reload schema';
