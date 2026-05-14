ALTER TABLE public.calisan
  ADD COLUMN IF NOT EXISTS gorevlendirilen_kurum text;
COMMENT ON COLUMN public.calisan.gorevlendirilen_kurum IS 'Kurum Görevlendirme türünde görevlendirildiği kurum adı';
