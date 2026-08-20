-- Personel kartı: taşınır görevlendirme alanı
ALTER TABLE public.calisan
  ADD COLUMN IF NOT EXISTS tasinir_gorevi text;

COMMENT ON COLUMN public.calisan.tasinir_gorevi IS
  'Taşınır görevlendirme: Taşınır Kayıt Yetkilisi | Taşınır Kontrol Yetkilisi | null';

ALTER TABLE public.calisan
  DROP CONSTRAINT IF EXISTS calisan_tasinir_gorevi_check;

ALTER TABLE public.calisan
  ADD CONSTRAINT calisan_tasinir_gorevi_check
  CHECK (
    tasinir_gorevi IS NULL
    OR tasinir_gorevi IN (
      'Taşınır Kayıt Yetkilisi',
      'Taşınır Kontrol Yetkilisi'
    )
  );

-- Geçici menü bayrakları (sidebar’dan kaldırılabilir)
CREATE TABLE IF NOT EXISTS public.uygulama_ayar (
  anahtar text PRIMARY KEY,
  deger text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.uygulama_ayar IS 'Uygulama geneli anahtar/değer ayarları (geçici menü vb.)';

INSERT INTO public.uygulama_ayar (anahtar, deger)
VALUES ('tasinir_gorevlendirme_menu', 'aktif')
ON CONFLICT (anahtar) DO NOTHING;
