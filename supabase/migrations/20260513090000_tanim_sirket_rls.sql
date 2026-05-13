-- tanim_sirket tablosu için RLS politikası
-- Tablo önceden oluşturulduysa bu migration RLS'i etkinleştirir

ALTER TABLE public.tanim_sirket ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_full_access" ON public.tanim_sirket;
CREATE POLICY "authenticated_full_access" ON public.tanim_sirket
  FOR ALL USING (auth.role() = 'authenticated');
