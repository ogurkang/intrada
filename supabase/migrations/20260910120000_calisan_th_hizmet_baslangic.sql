-- TH sınıfı asil kadro hizmet süresi başlangıcı (takvim yılı; −5 / +5 yan ödeme)
ALTER TABLE public.calisan
  ADD COLUMN IF NOT EXISTS th_hizmet_baslangic date;

COMMENT ON COLUMN public.calisan.th_hizmet_baslangic IS
  'Teknik hizmet yılı başlangıç tarihi. Asil kadro TH iken takvim günüyle ilerler; 0–4 yıl −5, 5. yıl dönümü ve sonrası +5 yan ödeme (Terfi Ettir ile yazılır).';
