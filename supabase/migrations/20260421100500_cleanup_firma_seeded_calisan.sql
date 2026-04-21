-- Yetkilendirme akışında firma_calisanlar kaydından yanlışlıkla oluşturulmuş
-- "ana personel (calisan)" satırlarını güvenli koşullarla temizler.
-- Sadece kurum personel akışına hiç bağlanmamış kayıtlar silinir.

with aday as (
  select c.sicil_no
  from public.calisan c
  where exists (
    select 1
    from public.firma_calisanlar f
    where f.sicil_no = c.sicil_no
      and f.ayrilis_tarihi is null
  )
    and not exists (select 1 from public.kadro_hareketleri k where k.asil = c.sicil_no or k.vekil = c.sicil_no)
    and not exists (select 1 from public.personel_hareketleri p where p.sicil_no = c.sicil_no)
    and not exists (select 1 from public.personel_audit_log a where a.sicil_no = c.sicil_no)
    and not exists (select 1 from public.terfi_donem_islem_log t where t.sicil_no = c.sicil_no)
    and not exists (select 1 from public.arazi_kayit ar where ar.sicil_no = c.sicil_no)
)
delete from public.calisan c
using aday
where c.sicil_no = aday.sicil_no;
