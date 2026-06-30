-- Şifre sıfırlama kimlik doğrulaması ADABEL (firma_calisanlar) personelini de kapsasın.
-- Önceki sürüm yalnızca calisan'a bakıyordu; ADABEL personeli (örn. "A198") eşleşmiyordu.
-- e-posta+TCKN+sicil, calisan VEYA firma_calisanlar ile uyuşur ve aynı e-postalı auth.users
-- hesabı varsa true döner.

CREATE OR REPLACE FUNCTION public.dogrula_sifre_sifirla_kimlik(
  p_email text,
  p_tckn text,
  p_sicil text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    length(regexp_replace(coalesce(p_tckn, ''), '\D', '', 'g')) = 11
    AND (
      EXISTS (
        SELECT 1
        FROM public.calisan c
        INNER JOIN auth.users u ON lower(trim(both from u.email::text)) = lower(trim(both from c.e_posta))
        WHERE lower(trim(both from c.e_posta)) = lower(trim(both from p_email))
          AND regexp_replace(coalesce(c.tckn, ''), '\D', '', 'g') = regexp_replace(coalesce(p_tckn, ''), '\D', '', 'g')
          AND trim(both from c.sicil_no) = trim(both from p_sicil)
      )
      OR EXISTS (
        SELECT 1
        FROM public.firma_calisanlar f
        INNER JOIN auth.users u ON lower(trim(both from u.email::text)) = lower(trim(both from f.e_posta))
        WHERE f.sicil_no IS NOT NULL
          AND lower(trim(both from f.e_posta)) = lower(trim(both from p_email))
          AND regexp_replace(coalesce(f.tckn, ''), '\D', '', 'g') = regexp_replace(coalesce(p_tckn, ''), '\D', '', 'g')
          AND trim(both from f.sicil_no) = trim(both from p_sicil)
      )
    );
$$;

REVOKE ALL ON FUNCTION public.dogrula_sifre_sifirla_kimlik(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dogrula_sifre_sifirla_kimlik(text, text, text) TO anon, authenticated;

COMMENT ON FUNCTION public.dogrula_sifre_sifirla_kimlik(text, text, text) IS
  'Şifre sıfırlama adımı: e-posta+TCKN+sicil calisan VEYA firma_calisanlar (ADABEL) ve auth.users ile uyuyorsa true.';
