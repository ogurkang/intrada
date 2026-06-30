-- ADABEL (firma_calisanlar) sicilleri, kadro/belediye sicilleriyle çakışmasın diye başına 'A'
-- öneki alır. Böylece app_profiles.sicil_no tekil index'inde ve yetkilendirmede çakışma olmaz;
-- yeni ADABEL kayıtları da 'A' önekiyle üretilir (uygulama tarafında sonrakiSicilNo).
--
-- Idempotent: zaten 'A'/'a' ile başlayan siciller atlanır. Boş/null siciller değişmez.

update public.firma_calisanlar
set sicil_no = 'A' || btrim(sicil_no)
where sicil_no is not null
  and btrim(sicil_no) <> ''
  and btrim(sicil_no) !~* '^A';

-- Not: Bu noktada calisan'da olmayan, yalnızca firma'da bulunan bir app_profiles kaydı
-- mevcut değildir (eski FK ADABEL profillerini engelliyordu). Bu nedenle app_profiles.sicil_no
-- ayrıca güncellenmez. İleride gerekirse firma sicil eşlemesi elle gözden geçirilebilir.
