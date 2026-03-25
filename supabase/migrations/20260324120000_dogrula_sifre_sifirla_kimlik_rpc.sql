-- Şifre sıfırlama (service role olmadan): anon ile çağrılabilir kimlik doğrulama.
-- calisan satırı + aynı e-postaya sahip auth.users hesabı eşleşmeli.

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
  SELECT EXISTS (
    SELECT 1
    FROM public.calisan c
    INNER JOIN auth.users u ON lower(trim(both from u.email::text)) = lower(trim(both from c.e_posta))
    WHERE lower(trim(both from c.e_posta)) = lower(trim(both from p_email))
      AND regexp_replace(coalesce(c.tckn, ''), '\D', '', 'g') = regexp_replace(coalesce(p_tckn, ''), '\D', '', 'g')
      AND trim(both from c.sicil_no) = trim(both from p_sicil)
      AND length(regexp_replace(coalesce(p_tckn, ''), '\D', '', 'g')) = 11
  );
$$;

REVOKE ALL ON FUNCTION public.dogrula_sifre_sifirla_kimlik(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dogrula_sifre_sifirla_kimlik(text, text, text) TO anon, authenticated;

COMMENT ON FUNCTION public.dogrula_sifre_sifirla_kimlik(text, text, text) IS
  'Şifre sıfırlama adımı: e-posta+TCKN+sicil calisan ve auth.users ile uyuyorsa true.';
