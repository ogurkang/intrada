-- Araç kayıtları için otomatik sıra numarası (liste: en yeni en üstte)

ALTER TABLE public.yerel_bilgi_arac ADD COLUMN IF NOT EXISTS sira_no bigint;

CREATE SEQUENCE IF NOT EXISTS public.yerel_bilgi_arac_sira_seq;

UPDATE public.yerel_bilgi_arac AS y
SET sira_no = sub.rn
FROM (
  SELECT id, row_number() OVER (ORDER BY id ASC) AS rn
  FROM public.yerel_bilgi_arac
) AS sub
WHERE y.id = sub.id;

ALTER TABLE public.yerel_bilgi_arac
  ALTER COLUMN sira_no SET DEFAULT nextval('public.yerel_bilgi_arac_sira_seq');

ALTER TABLE public.yerel_bilgi_arac
  ALTER COLUMN sira_no SET NOT NULL;

SELECT setval(
  'public.yerel_bilgi_arac_sira_seq',
  (SELECT COALESCE(MAX(sira_no), 0) FROM public.yerel_bilgi_arac)
);

CREATE INDEX IF NOT EXISTS idx_yerel_bilgi_arac_sira_desc ON public.yerel_bilgi_arac (sira_no DESC);

COMMENT ON COLUMN public.yerel_bilgi_arac.sira_no IS 'Otomatik artan kayıt sıra no (liste ve raporlar)';
