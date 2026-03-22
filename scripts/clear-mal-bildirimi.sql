-- Tek seferlik: mal bildirimi tablosunu sıfırlamak için (Supabase SQL editöründe çalıştırın).
-- DİKKAT: Tüm mal beyan kayıtları silinir.

-- TRUNCATE ... CASCADE kullanmadan önce FK'leri kontrol edin.
DELETE FROM public.mal_bildirimi;
