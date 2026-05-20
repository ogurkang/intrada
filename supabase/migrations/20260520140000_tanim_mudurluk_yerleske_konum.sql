-- Konum: müdürlükten değil, müdürlük–yerleşke eşlemesinde

ALTER TABLE public.tanim_mudurluk_yerleske
  ADD COLUMN IF NOT EXISTS konum TEXT NOT NULL DEFAULT 'İç';

COMMENT ON COLUMN public.tanim_mudurluk_yerleske.konum IS 'Bu müdürlüğün ilgili yerleşkedeki konumu: İç veya Dış';

UPDATE public.tanim_mudurluk_yerleske my
SET konum = CASE
  WHEN TRIM(COALESCE(m.konum, '')) = 'Dış' THEN 'Dış'
  ELSE 'İç'
END
FROM public.tanim_mudurluk m
WHERE my.mudurluk_id = m.id;

ALTER TABLE public.tanim_mudurluk DROP COLUMN IF EXISTS konum;
