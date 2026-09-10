ALTER TABLE public.calisan_ogrenim
  ADD COLUMN IF NOT EXISTS teknik_ogrenim boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.calisan_ogrenim.teknik_ogrenim IS
  'Varsayılan öğrenimde işaretlenirse Tekniker kadroda ek gösterge Kimyager, yan ödeme Kütüphaneci tanımından alınır.';
