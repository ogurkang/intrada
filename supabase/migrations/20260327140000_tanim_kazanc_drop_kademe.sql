-- Kazanç bilgisi tanımından kademe alanı kaldırıldı (UI ve iş kuralları gereği).
ALTER TABLE public.tanim_kazanc_bilgisi DROP COLUMN IF EXISTS kademe;
