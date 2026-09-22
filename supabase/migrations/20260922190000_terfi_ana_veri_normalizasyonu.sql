-- Personel kimliğinin tek kaynağı public.calisan tablosudur.
-- Terfi kaydı yalnızca sicil_no ile personele bağlanır; ad/ünvan/müdürlük
-- gibi başka alanların kopyasını tutmaz.

ALTER TABLE public.terfi_hareketleri
  DROP COLUMN IF EXISTS ad_soyad,
  DROP COLUMN IF EXISTS unvan,
  DROP COLUMN IF EXISTS mudurluk;

COMMENT ON TABLE public.terfi_hareketleri IS
  'Personel kimliği calisan, kadro bilgisi kadro_hareketleri tablolarından okunur; bu tablo yalnızca terfi/kazanç hareketini tutar.';
