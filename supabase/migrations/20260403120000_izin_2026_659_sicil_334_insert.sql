-- Tek seferlik veri düzeltmesi:
-- 2026 yılında sıra 659 ve üzerindeki tüm izin kayıtlarını +1 kaydırır,
-- ardından sicil 334 için 2026/659 numaralı yeni izin satırı ekler (ayrılış 02.04.2026, başlama 03.04.2026).
--
-- Notlar:
-- - tur = 'Yıllık İzin' ve gun = 1 varsayıldı; farklı izin türü / gün gerekiyorsa uygulamadan düzenleyin.
-- - durum = 'Taslak'; onaylı kayıt istiyorsanız 'Onaylandı' yapın ve gerekirse İzin Hakları ekranından kullanılan günü güncelleyin.
-- - Bu migration ikinci kez çalıştırılırsa (sicil 334 + 659 zaten varsa) INSERT atlanır.

DO $$
DECLARE
  r RECORD;
  v_sn text;
  v_num int;
  v_new_sn text;
BEGIN
  -- Aynı kayıt zaten oluşturulduysa tekrar kaydırma yapma (çift çalıştırma veri bozar)
  IF EXISTS (
    SELECT 1
    FROM public.izin_hareketleri
    WHERE yil = 2026
      AND sicil_no = '334'
      AND trim(sira_no) = '659'
      AND (ayrilis)::date = DATE '2026-04-02'
      AND (baslama)::date = DATE '2026-04-03'
  ) THEN
    RETURN;
  END IF;

  FOR r IN
    SELECT id, trim(sira_no) AS sira_no
    FROM public.izin_hareketleri
    WHERE yil = 2026
      AND sira_no IS NOT NULL
      AND trim(sira_no) ~ '^\d+$'
      AND (trim(sira_no)::int) >= 659
    ORDER BY (trim(sira_no)::int) DESC
  LOOP
    v_sn := r.sira_no;
    v_num := v_sn::int + 1;
    v_new_sn := lpad(v_num::text, greatest(length(v_sn), length(v_num::text)), '0');

    UPDATE public.izin_hareketleri
    SET sira_no = v_new_sn
    WHERE id = r.id;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM public.izin_hareketleri
    WHERE yil = 2026
      AND sicil_no = '334'
      AND trim(sira_no) = '659'
  ) THEN
    INSERT INTO public.izin_hareketleri (
      yil,
      sira_no,
      sicil_no,
      tur,
      ayrilis,
      baslama,
      gun,
      durum,
      kayit_tarihi,
      public_id
    ) VALUES (
      2026,
      '659',
      '334',
      'Yıllık İzin',
      '2026-04-02',
      '2026-04-03',
      1,
      'Taslak',
      now(),
      gen_random_uuid()
    );
  END IF;
END $$;
