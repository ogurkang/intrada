-- Ortak kısa/canonical URL: /link/{slug} → kaynak türü + ref
-- Şimdilik: mal_bildirimi — slug = public_id (UUID metni)

CREATE TABLE IF NOT EXISTS public.app_links (
  slug text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('mal_bildirimi')),
  ref_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_links_kind_ref ON public.app_links (kind, ref_key);

INSERT INTO public.app_links (slug, kind, ref_key)
SELECT public_id::text, 'mal_bildirimi', public_id::text
FROM public.mal_bildirimi
ON CONFLICT (slug) DO NOTHING;

CREATE OR REPLACE FUNCTION public.app_link_mal_bildirimi_ins()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.app_links (slug, kind, ref_key)
  VALUES (NEW.public_id::text, 'mal_bildirimi', NEW.public_id::text)
  ON CONFLICT (slug) DO UPDATE SET ref_key = EXCLUDED.ref_key, kind = EXCLUDED.kind;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mal_app_link ON public.mal_bildirimi;
CREATE TRIGGER trg_mal_app_link
AFTER INSERT ON public.mal_bildirimi
FOR EACH ROW
EXECUTE PROCEDURE public.app_link_mal_bildirimi_ins();
