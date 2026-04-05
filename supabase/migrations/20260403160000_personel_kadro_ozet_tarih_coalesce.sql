-- personel_kadro_ozet: kıdem/izin hesapları kadro + calisan ile uyumlu olsun.
-- Kadro satırında tarih yoksa veya yalnızca calisan doldurulmuşsa calisan değerleri kullanılır.
create or replace view personel_kadro_ozet as
select
    c.sicil_no,
    c.ad_soyad,
    c.tckn,
    kh.kadro_sira_no,
    kh.kadro_unvani,
    kh.kadro_derecesi,
    kh.statu,
    kh.gorev_unvani,
    kh.kadro_mudurlugu,
    kh.gorev_mudurlugu,
    kh.durumu as kadro_durumu,
    coalesce(kh.memuriyet_tarihi, c.memuriyet_tarihi) as memuriyet_tarihi,
    coalesce(kh.kuruma_giris_tarihi, c.kuruma_giris_tarihi) as kuruma_giris_tarihi
from calisan c
left join kadro_hareketleri kh on kh.asil = c.sicil_no and kh.ayrilis_tarihi is null;
