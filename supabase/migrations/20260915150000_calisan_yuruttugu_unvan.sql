ALTER TABLE public.calisan
  ADD COLUMN IF NOT EXISTS yuruttugu_unvan_id integer
  REFERENCES public.tanim_unvan(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.calisan.yuruttugu_unvan_id IS
  'Görevlendirmede yürütülen unvan. SDS, bu unvanın kazanç tanımıyla kıyaslanır; notta unvan adı yer alır.';
