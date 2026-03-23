-- Uygulama kullanıcı profili: auth.users ↔ calisan, rol, menü izinleri (JSON).

CREATE TABLE IF NOT EXISTS public.app_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sicil_no text NOT NULL REFERENCES public.calisan(sicil_no) ON DELETE CASCADE,
  rol text NOT NULL DEFAULT 'kullanici' CHECK (rol IN ('admin', 'kullanici')),
  menu_izinleri jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS app_profiles_sicil_no_key ON public.app_profiles (sicil_no);

COMMENT ON TABLE public.app_profiles IS 'Giriş yapan kullanıcı ↔ sicil; admin tam yetki, kullanici kısıtlı (uygulama kuralları + menu_izinleri).';

-- İlk admin SQL ile eklenmeli (Supabase SQL Editor). RLS sonraki adımda sıkılaştırılabilir.
ALTER TABLE public.app_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_profiles_select_auth"
  ON public.app_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "app_profiles_insert_auth"
  ON public.app_profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "app_profiles_update_auth"
  ON public.app_profiles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "app_profiles_delete_auth"
  ON public.app_profiles FOR DELETE
  TO authenticated
  USING (true);
