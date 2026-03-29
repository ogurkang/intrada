-- Kadro satırında ünvanı benzersiz tanim_unvan.id ile tut (aynı unvan_adi + farklı sınıf ayrımı).

ALTER TABLE public.kadro_hareketleri
  ADD COLUMN IF NOT EXISTS kadro_unvan_id bigint REFERENCES public.tanim_unvan (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS gorev_unvan_id bigint REFERENCES public.tanim_unvan (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_kadro_hareketleri_kadro_unvan_id ON public.kadro_hareketleri (kadro_unvan_id);
CREATE INDEX IF NOT EXISTS idx_kadro_hareketleri_gorev_unvan_id ON public.kadro_hareketleri (gorev_unvan_id);

-- Yalnızca tek aktif eşleşme varsa id ata; aynı ada birden fazla tanım varsa belirsizlikten kaçın.
UPDATE public.kadro_hareketleri kh
SET kadro_unvan_id = (
  SELECT u.id
  FROM public.tanim_unvan u
  WHERE u.aktif
    AND kh.kadro_unvani IS NOT NULL
    AND btrim(u.unvan_adi) = btrim(kh.kadro_unvani)
  LIMIT 1
)
WHERE kh.kadro_unvani IS NOT NULL
  AND kh.kadro_unvan_id IS NULL
  AND (
    SELECT COUNT(*)::int
    FROM public.tanim_unvan u2
    WHERE u2.aktif
      AND btrim(u2.unvan_adi) = btrim(kh.kadro_unvani)
  ) = 1;

UPDATE public.kadro_hareketleri kh
SET gorev_unvan_id = (
  SELECT u.id
  FROM public.tanim_unvan u
  WHERE u.aktif
    AND kh.gorev_unvani IS NOT NULL
    AND btrim(u.unvan_adi) = btrim(kh.gorev_unvani)
  LIMIT 1
)
WHERE kh.gorev_unvani IS NOT NULL
  AND kh.gorev_unvan_id IS NULL
  AND (
    SELECT COUNT(*)::int
    FROM public.tanim_unvan u2
    WHERE u2.aktif
      AND btrim(u2.unvan_adi) = btrim(kh.gorev_unvani)
  ) = 1;
