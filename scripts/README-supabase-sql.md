# Supabase’de SQL dosyası çalıştırma

1. [Supabase Dashboard](https://supabase.com/dashboard) → projeni seç.
2. Sol menüden **SQL Editor**’a tıkla.
3. **New query** ile yeni bir sorgu sekmesi aç.
4. `clear-mal-bildirimi.sql` dosyasının içeriğini kopyalayıp editöre yapıştır (veya dosyayı açıp tümünü kopyala).
5. Sağ alttan **Run** (veya `Ctrl+Enter`) ile çalıştır.
6. Sonuç panelinde hata yoksa işlem tamamdır.

**Not:** `DELETE FROM mal_bildirimi` tüm mal beyan satırlarını siler. Üretim ortamında önce yedek alın.

Alternatif: **Database** → **Migrations** ile migration olarak da eklenebilir; tek seferlik temizlik için SQL Editor yeterlidir.
