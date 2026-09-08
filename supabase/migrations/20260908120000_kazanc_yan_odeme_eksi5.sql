-- TH sınıfı unvanlarda yan ödeme iki sütunda tutulur:
--   yan_odeme_eksi5  →  "-5 Yıl Yan Ödeme" (kıdem 0–4)
--   yan_odeme        →  "+5 Yıl Yan Ödeme" (kıdem 5–25; mevcut veriler burada kalır)

ALTER TABLE public.tanim_kazanc_bilgisi
  ADD COLUMN IF NOT EXISTS yan_odeme_eksi5 text;

ALTER TABLE public.terfi_hareketleri
  ADD COLUMN IF NOT EXISTS yan_odeme_eksi5 text;
