-- Faz 3: personel_hareketleri + izin_hareketleri — /link/{public_id}

-- personel_hareketleri
ALTER TABLE public.personel_hareketleri ADD COLUMN IF NOT EXISTS public_id uuid;
UPDATE public.personel_hareketleri SET public_id = gen_random_uuid() WHERE public_id IS NULL;
ALTER TABLE public.personel_hareketleri ALTER COLUMN public_id SET DEFAULT gen_random_uuid();
ALTER TABLE public.personel_hareketleri ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS personel_hareketleri_public_id_key ON public.personel_hareketleri (public_id);

-- izin_hareketleri
ALTER TABLE public.izin_hareketleri ADD COLUMN IF NOT EXISTS public_id uuid;
UPDATE public.izin_hareketleri SET public_id = gen_random_uuid() WHERE public_id IS NULL;
ALTER TABLE public.izin_hareketleri ALTER COLUMN public_id SET DEFAULT gen_random_uuid();
ALTER TABLE public.izin_hareketleri ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS izin_hareketleri_public_id_key ON public.izin_hareketleri (public_id);

ALTER TABLE public.app_links DROP CONSTRAINT IF EXISTS app_links_kind_check;
ALTER TABLE public.app_links ADD CONSTRAINT app_links_kind_check
  CHECK (kind IN (
    'mal_bildirimi', 'personel', 'firma_calisan', 'kadro_hareketi',
    'personel_hareketi', 'izin_hareketi'
  ));

INSERT INTO public.app_links (slug, kind, ref_key)
SELECT public_id::text, 'personel_hareketi', id::text
FROM public.personel_hareketleri
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.app_links (slug, kind, ref_key)
SELECT public_id::text, 'izin_hareketi', id::text
FROM public.izin_hareketleri
ON CONFLICT (slug) DO NOTHING;

CREATE OR REPLACE FUNCTION public.app_link_personel_hareketi_ins()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.app_links (slug, kind, ref_key)
  VALUES (NEW.public_id::text, 'personel_hareketi', NEW.id::text)
  ON CONFLICT (slug) DO UPDATE SET ref_key = EXCLUDED.ref_key, kind = EXCLUDED.kind;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_personel_hareketleri_app_link ON public.personel_hareketleri;
CREATE TRIGGER trg_personel_hareketleri_app_link
AFTER INSERT ON public.personel_hareketleri
FOR EACH ROW
EXECUTE PROCEDURE public.app_link_personel_hareketi_ins();

CREATE OR REPLACE FUNCTION public.app_link_izin_hareketi_ins()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.app_links (slug, kind, ref_key)
  VALUES (NEW.public_id::text, 'izin_hareketi', NEW.id::text)
  ON CONFLICT (slug) DO UPDATE SET ref_key = EXCLUDED.ref_key, kind = EXCLUDED.kind;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_izin_hareketleri_app_link ON public.izin_hareketleri;
CREATE TRIGGER trg_izin_hareketleri_app_link
AFTER INSERT ON public.izin_hareketleri
FOR EACH ROW
EXECUTE PROCEDURE public.app_link_izin_hareketi_ins();
