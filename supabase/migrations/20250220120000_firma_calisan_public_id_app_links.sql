-- Firma personel canonical URL: /link/{public_id}

ALTER TABLE public.firma_calisanlar ADD COLUMN IF NOT EXISTS public_id uuid;
UPDATE public.firma_calisanlar SET public_id = gen_random_uuid() WHERE public_id IS NULL;
ALTER TABLE public.firma_calisanlar ALTER COLUMN public_id SET DEFAULT gen_random_uuid();
ALTER TABLE public.firma_calisanlar ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS firma_calisanlar_public_id_key ON public.firma_calisanlar (public_id);

ALTER TABLE public.app_links DROP CONSTRAINT IF EXISTS app_links_kind_check;
ALTER TABLE public.app_links ADD CONSTRAINT app_links_kind_check
  CHECK (kind IN ('mal_bildirimi', 'personel', 'firma_calisan'));

INSERT INTO public.app_links (slug, kind, ref_key)
SELECT public_id::text, 'firma_calisan', id::text
FROM public.firma_calisanlar
ON CONFLICT (slug) DO NOTHING;

CREATE OR REPLACE FUNCTION public.app_link_firma_calisan_ins()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.app_links (slug, kind, ref_key)
  VALUES (NEW.public_id::text, 'firma_calisan', NEW.id::text)
  ON CONFLICT (slug) DO UPDATE SET ref_key = EXCLUDED.ref_key, kind = EXCLUDED.kind;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_firma_calisan_app_link ON public.firma_calisanlar;
CREATE TRIGGER trg_firma_calisan_app_link
AFTER INSERT ON public.firma_calisanlar
FOR EACH ROW
EXECUTE PROCEDURE public.app_link_firma_calisan_ins();
