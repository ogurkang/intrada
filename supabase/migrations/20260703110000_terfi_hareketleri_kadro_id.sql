-- Terfi kaydı ↔ kadro hareketi benzersiz eşlemesi (çoklu vekil/asil ayrımı)
ALTER TABLE public.terfi_hareketleri
  ADD COLUMN IF NOT EXISTS kadro_id integer REFERENCES public.kadro_hareketleri (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.terfi_hareketleri.kadro_id IS
  'Terfi kaydının bağlı olduğu kadro_hareketleri satırı; aynı sicilde birden fazla vekil/asil ayrımı.';

CREATE INDEX IF NOT EXISTS terfi_hareketleri_kadro_id_idx
  ON public.terfi_hareketleri (kadro_id)
  WHERE kadro_id IS NOT NULL;

-- Mevcut kayıtları sicil + rol + kadro_sira_no ile kadroya bağla
UPDATE public.terfi_hareketleri t
SET kadro_id = kh.id
FROM public.kadro_hareketleri kh
WHERE t.kadro_id IS NULL
  AND NULLIF(TRIM(t.kadro_sira_no), '') IS NOT NULL
  AND NULLIF(TRIM(t.rol), '') IS NOT NULL
  AND TRIM(kh.kadro_sira_no) = TRIM(t.kadro_sira_no)
  AND kh.ayrilis_tarihi IS NULL
  AND (
    (LOWER(TRIM(t.rol)) = 'asil' AND kh.asil = t.sicil_no)
    OR (LOWER(TRIM(t.rol)) = 'vekil' AND kh.vekil = t.sicil_no)
  );

-- Rol/kadro_sira_no eksik eski kayıtlar: tek aktif asil kadrosu varsa ona bağla
UPDATE public.terfi_hareketleri t
SET
  kadro_id = kh.id,
  rol = COALESCE(NULLIF(TRIM(t.rol), ''), 'Asil'),
  kadro_sira_no = COALESCE(NULLIF(TRIM(t.kadro_sira_no), ''), kh.kadro_sira_no)
FROM public.kadro_hareketleri kh
WHERE t.kadro_id IS NULL
  AND kh.asil = t.sicil_no
  AND kh.ayrilis_tarihi IS NULL
  AND (
    SELECT COUNT(*)
    FROM public.kadro_hareketleri kh2
    WHERE kh2.asil = t.sicil_no
      AND kh2.ayrilis_tarihi IS NULL
  ) = 1
  AND (
    SELECT COUNT(*)
    FROM public.terfi_hareketleri t2
    WHERE t2.sicil_no = t.sicil_no
  ) = 1;
