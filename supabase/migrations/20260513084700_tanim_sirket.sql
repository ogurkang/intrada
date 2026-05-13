-- Şirket tanımları tablosu
-- ADABEL personelinin "Görev Yeri" alanı için şirket listesi kaynağı

CREATE TABLE IF NOT EXISTS tanim_sirket (
  id         SERIAL PRIMARY KEY,
  sirket_adi TEXT    NOT NULL,
  aktif      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
