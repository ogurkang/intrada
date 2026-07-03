-- Personel hareketi ↔ kadro hareketi benzersiz eşlemesi (çoklu vekalet/asil ayrımı)
ALTER TABLE public.personel_hareketleri
  ADD COLUMN IF NOT EXISTS kadro_id integer REFERENCES public.kadro_hareketleri (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS kadro_rol text;

COMMENT ON COLUMN public.personel_hareketleri.kadro_id IS
  'İşlem yapılan kadro_hareketleri satırı; aynı sicilde birden fazla kadro ilişkisini ayırt eder.';
COMMENT ON COLUMN public.personel_hareketleri.kadro_rol IS
  'asil veya vekil — kadro_id ile birlikte kullanılır.';

CREATE INDEX IF NOT EXISTS personel_hareketleri_kadro_id_idx
  ON public.personel_hareketleri (kadro_id)
  WHERE kadro_id IS NOT NULL;
