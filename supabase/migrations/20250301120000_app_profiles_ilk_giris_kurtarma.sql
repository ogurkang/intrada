-- İlk giriş kurulumu + kurtarma yanıtları (şifre sıfırlama)

ALTER TABLE public.app_profiles
  ADD COLUMN IF NOT EXISTS kullanici_adi text,
  ADD COLUMN IF NOT EXISTS ilk_giris_tamam boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kurtarma_hash jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS app_profiles_kullanici_adi_key
  ON public.app_profiles (kullanici_adi)
  WHERE kullanici_adi IS NOT NULL AND trim(kullanici_adi) <> '';

COMMENT ON COLUMN public.app_profiles.kullanici_adi IS 'Benzersiz kullanıcı adı (girişte e-posta yerine kullanılabilir)';
COMMENT ON COLUMN public.app_profiles.ilk_giris_tamam IS 'İlk girişte kullanıcı adı + şifre + kurtarma yanıtları tamamlandı mı';
COMMENT ON COLUMN public.app_profiles.kurtarma_hash IS 'Şifre sıfırlama için 3 yanıtın hash''i (a,b,c anahtarları)';

-- Mevcut profiller: zaten giriş yapmış say
UPDATE public.app_profiles SET ilk_giris_tamam = true WHERE ilk_giris_tamam IS NOT TRUE;
