-- Çalışan canonical URL: /link/{public_id} — sicil no adres çubuğunda görünmez

ALTER TABLE public.calisan ADD COLUMN IF NOT EXISTS public_id uuid;
UPDATE public.calisan SET public_id = gen_random_uuid() WHERE public_id IS NULL;
ALTER TABLE public.calisan ALTER COLUMN public_id SET DEFAULT gen_random_uuid();
ALTER TABLE public.calisan ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS calisan_public_id_key ON public.calisan (public_id);

-- app_links: kind genişlet (PostgreSQL varsayılan constraint adı)
ALTER TABLE public.app_links DROP CONSTRAINT IF EXISTS app_links_kind_check;
ALTER TABLE public.app_links ADD CONSTRAINT app_links_kind_check
  CHECK (kind IN ('mal_bildirimi', 'personel'));

INSERT INTO public.app_links (slug, kind, ref_key)
SELECT public_id::text, 'personel', sicil_no
FROM public.calisan
ON CONFLICT (slug) DO NOTHING;

CREATE OR REPLACE FUNCTION public.app_link_calisan_ins()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.app_links (slug, kind, ref_key)
  VALUES (NEW.public_id::text, 'personel', NEW.sicil_no)
  ON CONFLICT (slug) DO UPDATE SET ref_key = EXCLUDED.ref_key, kind = EXCLUDED.kind;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calisan_app_link ON public.calisan;
CREATE TRIGGER trg_calisan_app_link
AFTER INSERT ON public.calisan
FOR EACH ROW
EXECUTE PROCEDURE public.app_link_calisan_ins();
