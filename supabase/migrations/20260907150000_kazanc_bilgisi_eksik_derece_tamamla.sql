-- Kazanç bilgisi: aynı ünvanda eşdeğer öğrenim satırı bulunan eksik dereceleri tamamlar.
--
-- Terfi motoru (src/lib/terfi-ettir-hesap.ts) kazanç değerlerini
-- (unvan_id, ogrenim_id, derece) üçlüsüyle arar. Üçlü bulunamazsa personelin
-- ek gösterge / ek ödeme / ÖHT / yan ödeme / SDS değerleri eski derecede kalır.
--
-- Aşağıdaki iki boşluk, aynı ünvanda eşdeğer öğrenim satırı zaten var olduğu için
-- birebir kopyalanarak kapatılıyor. Değer üretilmiyor, mevcut satır çoğaltılıyor.
--
-- Kaynak satırı bulunmayan diğer eksikler (Eğitmen 1. derece Lisans/Önlisans,
-- Belediye Başkan Yardımcısı 2-6. derece, Arşiv Müdürü ve Sağlık Memuru ünvanlarının
-- tamamı) mevzuat değeri gerektirdiği için bu migration kapsamına alınmadı;
-- Tanımlar › Kazanç Bilgileri ekranından elle girilecek.

-- 1) Tekniker (182) + Lisans (8), 5. derece
--    Bu ünvanda 1-4 ve 6-9. derecelerde Lisans ile Önlisans değerleri birebir aynı;
--    yalnızca 5. derecenin Lisans satırı eksik kalmış. Mevcut gruba ekleniyor.
INSERT INTO public.tanim_kazanc_bilgisi
  (unvan_id, ogrenim_id, derece, ek_gosterge, ek_odeme, oht, yan_odeme, sds_orani, sira_no, kazanc_grup_id, updated_at)
SELECT k.unvan_id, 8, k.derece, k.ek_gosterge, k.ek_odeme, k.oht, k.yan_odeme, k.sds_orani,
       k.sira_no, k.kazanc_grup_id, now()
FROM public.tanim_kazanc_bilgisi k
WHERE k.unvan_id = 182 AND k.ogrenim_id = 7 AND k.derece = 5
  AND NOT EXISTS (
    SELECT 1 FROM public.tanim_kazanc_bilgisi x
    WHERE x.unvan_id = k.unvan_id AND x.ogrenim_id = 8 AND x.derece = k.derece
  );

-- 2) Teknisyen (183) + Lise (5), 1-12. derece
--    Bu ünvanda Lise satırı hiç yok. Eğitmen ünvanında Lise ile Meslek Lisesi
--    değerleri her derecede birebir aynı ve aynı grupta tutuluyor; aynı kurgu
--    Teknisyen için de uygulanıyor.
INSERT INTO public.tanim_kazanc_bilgisi
  (unvan_id, ogrenim_id, derece, ek_gosterge, ek_odeme, oht, yan_odeme, sds_orani, sira_no, kazanc_grup_id, updated_at)
SELECT k.unvan_id, 5, k.derece, k.ek_gosterge, k.ek_odeme, k.oht, k.yan_odeme, k.sds_orani,
       k.sira_no, k.kazanc_grup_id, now()
FROM public.tanim_kazanc_bilgisi k
WHERE k.unvan_id = 183 AND k.ogrenim_id = 6
  AND NOT EXISTS (
    SELECT 1 FROM public.tanim_kazanc_bilgisi x
    WHERE x.unvan_id = k.unvan_id AND x.ogrenim_id = 5 AND x.derece = k.derece
  );
