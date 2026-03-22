-- Mal bildirimi: tahmin edilemez URL segmenti (adres çubuğunda sıralı id yerine UUID)
ALTER TABLE public.mal_bildirimi ADD COLUMN IF NOT EXISTS public_id uuid;
UPDATE public.mal_bildirimi SET public_id = gen_random_uuid() WHERE public_id IS NULL;
ALTER TABLE public.mal_bildirimi ALTER COLUMN public_id SET DEFAULT gen_random_uuid();
ALTER TABLE public.mal_bildirimi ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS mal_bildirimi_public_id_key ON public.mal_bildirimi (public_id);
