-- Makine İkmal Bakım ve Onarım / PH 2.5.1 bağını
-- 9006 (Genel Destek Hizmetleri, id=44) → 9007 (Diğer Destek Hizmetleri, id=40)
-- Altındaki PF faaliyet / gösterge / ödenek kayıtları bag_id üzerinden kalır.
-- Supabase SQL editöründe bir kez çalıştırın (canlıda zaten uygulandıysa idempotent).

update public.performans_programi_alt_program_hedef
set faaliyet_id = 40
where id = 64
  and alt_hedef_id = 17
  and secilen_mudurluk = 'Makine İkmal Bakım ve Onarım Müdürlüğü'
  and faaliyet_id = 44;
