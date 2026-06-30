-- app_profiles.sicil_no yalnızca calisan'a bağlıydı; ADABEL (firma_calisanlar) personeli
-- yetkilendirilemiyordu (app_profiles_sicil_no_fkey ihlali). Kısıtlamayı kaldırıp, sicil'in
-- calisan VEYA firma_calisanlar'da var olduğunu doğrulayan bir trigger ile değiştiriyoruz.
-- Böylece sistemde kayıtlı her personel (kadro/belediye + ADABEL) yetkilendirilebilir.

-- 1) calisan'a bağlı foreign key'i kaldır.
ALTER TABLE public.app_profiles
  DROP CONSTRAINT IF EXISTS app_profiles_sicil_no_fkey;

-- 2) Sicil doğrulama fonksiyonu: calisan veya firma_calisanlar'da bulunmalı.
CREATE OR REPLACE FUNCTION public.app_profiles_sicil_gecerli()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.sicil_no IS NULL THEN
    RAISE EXCEPTION 'app_profiles.sicil_no boş olamaz.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.calisan c WHERE c.sicil_no = NEW.sicil_no)
     AND NOT EXISTS (SELECT 1 FROM public.firma_calisanlar f WHERE f.sicil_no = NEW.sicil_no)
  THEN
    RAISE EXCEPTION 'Sicil % personel (calisan) veya ADABEL (firma_calisanlar) kayıtlarında bulunamadı.', NEW.sicil_no;
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Insert/update'te sicil doğrulamasını uygula.
DROP TRIGGER IF EXISTS trg_app_profiles_sicil_gecerli ON public.app_profiles;
CREATE TRIGGER trg_app_profiles_sicil_gecerli
  BEFORE INSERT OR UPDATE OF sicil_no ON public.app_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.app_profiles_sicil_gecerli();

COMMENT ON FUNCTION public.app_profiles_sicil_gecerli() IS
  'app_profiles.sicil_no calisan veya firma_calisanlar (ADABEL) içinde olmalı. FK yerine geçer; ADABEL personelinin yetkilendirilmesine izin verir.';
