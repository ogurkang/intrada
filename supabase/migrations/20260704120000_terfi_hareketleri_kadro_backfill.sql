-- Ek backfill: kadro_id / rol / kadro_sira_no (yalnızca tek adaylı güvenli eşleşmeler)

-- A) kadro_id dolu ama rol veya kadro_sira_no eksik → kadro satırından doldur
UPDATE public.terfi_hareketleri t
SET
  rol = CASE
    WHEN kh.asil = t.sicil_no THEN 'Asil'
    WHEN kh.vekil = t.sicil_no THEN 'Vekil'
    ELSE t.rol
  END,
  kadro_sira_no = COALESCE(NULLIF(TRIM(t.kadro_sira_no), ''), kh.kadro_sira_no)
FROM public.kadro_hareketleri kh
WHERE t.kadro_id = kh.id
  AND (
    NULLIF(TRIM(t.rol), '') IS NULL
    OR NULLIF(TRIM(t.kadro_sira_no), '') IS NULL
  );

-- B) Tek aktif vekil kadrosu + sicil başına tek eşleşmemiş terfi
UPDATE public.terfi_hareketleri t
SET
  kadro_id = kh.id,
  rol = 'Vekil',
  kadro_sira_no = COALESCE(NULLIF(TRIM(t.kadro_sira_no), ''), kh.kadro_sira_no)
FROM public.kadro_hareketleri kh
WHERE t.kadro_id IS NULL
  AND kh.vekil = t.sicil_no
  AND kh.ayrilis_tarihi IS NULL
  AND (
    SELECT COUNT(*)
    FROM public.kadro_hareketleri kh2
    WHERE kh2.vekil = t.sicil_no
      AND kh2.ayrilis_tarihi IS NULL
  ) = 1
  AND (
    SELECT COUNT(*)
    FROM public.terfi_hareketleri t2
    WHERE t2.sicil_no = t.sicil_no
      AND t2.kadro_id IS NULL
  ) = 1;

-- C) Sicil + kadro_sira_no ile tek aktif kadro adayı
UPDATE public.terfi_hareketleri t
SET
  kadro_id = kh.id,
  rol = CASE
    WHEN kh.asil = t.sicil_no THEN 'Asil'
    WHEN kh.vekil = t.sicil_no THEN 'Vekil'
    ELSE t.rol
  END,
  kadro_sira_no = kh.kadro_sira_no
FROM public.kadro_hareketleri kh
WHERE t.kadro_id IS NULL
  AND NULLIF(TRIM(t.kadro_sira_no), '') IS NOT NULL
  AND TRIM(kh.kadro_sira_no) = TRIM(t.kadro_sira_no)
  AND kh.ayrilis_tarihi IS NULL
  AND (kh.asil = t.sicil_no OR kh.vekil = t.sicil_no)
  AND (
    SELECT COUNT(*)
    FROM public.kadro_hareketleri kh3
    WHERE kh3.ayrilis_tarihi IS NULL
      AND TRIM(kh3.kadro_sira_no) = TRIM(t.kadro_sira_no)
      AND (kh3.asil = t.sicil_no OR kh3.vekil = t.sicil_no)
  ) = 1;
