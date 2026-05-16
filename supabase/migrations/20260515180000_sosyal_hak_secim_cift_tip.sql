-- Sosyal Hak: aynı izin hem RMY hem IZY tipinde seçilebilsin (çift modül)
ALTER TABLE public.sosyal_hak_secim
  DROP CONSTRAINT IF EXISTS sosyal_hak_secim_donem_id_izin_sira_no_key;

ALTER TABLE public.sosyal_hak_secim
  ADD CONSTRAINT sosyal_hak_secim_donem_izin_tip_key
  UNIQUE (donem_id, izin_sira_no, tip);
