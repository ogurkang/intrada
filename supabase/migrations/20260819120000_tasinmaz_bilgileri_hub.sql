-- Taşınmaz Bilgileri ana alt menüsünü hub yap; böylece altındaki menüler klasör olarak görünür.
-- LIKE deseni ASCII-safe: ş yerine _ wildcard kullanılır.
update public.kys_menu
set sayfa_turu = 'hub'
where lower(btrim(baslik)) like 'ta__nmaz bilgileri'
  and sayfa_turu <> 'hub';

notify pgrst, 'reload schema';
