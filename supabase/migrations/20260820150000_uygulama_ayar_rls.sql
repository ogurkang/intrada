-- uygulama_ayar: authenticated kullanıcıların okuma/yazma izni
-- (Görevlendirme Tamamlandı upsert'i RLS nedeniyle reddediliyordu)

ALTER TABLE public.uygulama_ayar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_full_access" ON public.uygulama_ayar;
CREATE POLICY "authenticated_full_access" ON public.uygulama_ayar
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.uygulama_ayar TO authenticated;
