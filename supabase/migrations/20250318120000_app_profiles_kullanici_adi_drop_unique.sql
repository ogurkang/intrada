-- Aynı kullanıcı adı farklı kişilerde olabilir (oturum e-posta ile ayrılır).
DROP INDEX IF EXISTS public.app_profiles_kullanici_adi_key;

COMMENT ON COLUMN public.app_profiles.kullanici_adi IS
  'Kurum içi görünen kullanıcı adı (yalnızca A–Z harf, büyük harf kaydı). Benzersiz değildir.';
