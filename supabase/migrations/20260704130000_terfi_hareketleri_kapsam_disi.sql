-- Geçmiş / ayrılmış / artık geçerli olmayan terfi kayıtlarını eşleşmemiş listeden çıkarır (silmez)
ALTER TABLE public.terfi_hareketleri
  ADD COLUMN IF NOT EXISTS kapsam_disi boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.terfi_hareketleri.kapsam_disi IS
  'true ise kadro eşleşmesi beklenmez; eşleşmemiş kayıtlar listesinde gösterilmez.';

CREATE INDEX IF NOT EXISTS terfi_hareketleri_kapsam_disi_idx
  ON public.terfi_hareketleri (kapsam_disi)
  WHERE kapsam_disi = true;
