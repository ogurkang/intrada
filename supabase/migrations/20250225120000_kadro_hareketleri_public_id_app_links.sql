-- Kadro hareketleri canonical URL: /link/{public_id} — PLAN_LINK_VE_YETKI Faz 2

ALTER TABLE public.kadro_hareketleri ADD COLUMN IF NOT EXISTS public_id uuid;
UPDATE public.kadro_hareketleri SET public_id = gen_random_uuid() WHERE public_id IS NULL;
ALTER TABLE public.kadro_hareketleri ALTER COLUMN public_id SET DEFAULT gen_random_uuid();
ALTER TABLE public.kadro_hareketleri ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS kadro_hareketleri_public_id_key ON public.kadro_hareketleri (public_id);

ALTER TABLE public.app_links DROP CONSTRAINT IF EXISTS app_links_kind_check;
ALTER TABLE public.app_links ADD CONSTRAINT app_links_kind_check
  CHECK (kind IN ('mal_bildirimi', 'personel', 'firma_calisan', 'kadro_hareketi'));

INSERT INTO public.app_links (slug, kind, ref_key)
SELECT public_id::text, 'kadro_hareketi', id::text
FROM public.kadro_hareketleri
ON CONFLICT (slug) DO NOTHING;

CREATE OR REPLACE FUNCTION public.app_link_kadro_hareketi_ins()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.app_links (slug, kind, ref_key)
  VALUES (NEW.public_id::text, 'kadro_hareketi', NEW.id::text)
  ON CONFLICT (slug) DO UPDATE SET ref_key = EXCLUDED.ref_key, kind = EXCLUDED.kind;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kadro_hareketleri_app_link ON public.kadro_hareketleri;
CREATE TRIGGER trg_kadro_hareketleri_app_link
AFTER INSERT ON public.kadro_hareketleri
FOR EACH ROW
EXECUTE PROCEDURE public.app_link_kadro_hareketi_ins();

COMMENT ON COLUMN public.kadro_hareketleri.public_id IS 'Canonical /link/{slug} — app_links.kind = kadro_hareketi, ref_key = id';
