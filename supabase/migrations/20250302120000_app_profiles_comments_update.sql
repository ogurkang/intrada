-- Eski güvenlik sorusu hash akışı kaldırıldı; sütun yorumlarını güncelle
COMMENT ON COLUMN public.app_profiles.ilk_giris_tamam IS 'İlk girişte kullanıcı adı + yeni şifre tamamlandı mı';
COMMENT ON COLUMN public.app_profiles.kurtarma_hash IS 'Kullanılmıyor (eski tasarım: güvenlik yanıtları hash); JSON boş kalabilir';
