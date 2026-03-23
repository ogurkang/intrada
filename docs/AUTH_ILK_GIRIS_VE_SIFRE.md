# İlk giriş, şifre politikası ve ortam değişkenleri

## Akış

1. **Supabase Auth**’ta kullanıcı, `calisan.e_posta` ile aynı e-posta ve **ilk şifre** ile oluşturulur.
2. İlk şifre formatı (uygulama ile uyumlu): **TCKN ilk 3 rakam + nokta + doğum yılı 4 hane** (örn. `252.1987`).  
   - Kullanıcı oluştururken bu metni şifre alanına yazın veya Admin API ile `password` olarak verin.
3. Kullanıcı giriş yapınca e-posta eşleşirse `app_profiles` otomatik oluşur (`ilk_giris_tamam = false`).
4. **Hesap kurulumu** (`/hesap/ilk-kurulum`): kalıcı **kullanıcı adı** + **yeni şifre** (aşağıdaki kural). Güvenlik sorusu yok.
5. **Şifremi sıfırla** (`/sifre-sifirla`): **e-posta + TCKN (11 hane) + sicil** doğrulanır; ardından aynı şifre kuralıyla yeni şifre set edilir.  
   - Sunucuda `SUPABASE_SERVICE_ROLE_KEY` gerekir (Auth şifre güncelleme + `calisan` okuma).

## Ortam değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `SUPABASE_SERVICE_ROLE_KEY` | Sadece sunucu; şifre sıfırlama ve Auth admin işlemleri. **İstemciye asla verilmez.** |

## Şifre kuralı (yeni şifre)

- **Uzunluk:** 1–6 karakter (en fazla 6).
- **İzinli karakterler:** yalnızca Latin harf (`A–Z`, `a–z`) ve rakam (`0–9`). Boşluk, Türkçe harf (ı, ş, ğ …) ve özel karakter (`!@#` …) **yok**.
- Örnek: `ab12`, `Xy9`, `Aa1b2c` (6 karakter).

### Supabase ile uyum

Uygulama 1–6 karakter kabul eder; **Supabase Auth** varsayılanında “minimum şifre uzunluğu” genelde **6** olabilir. Kısa şifrelerin (1–5 karakter) kaydedilebilmesi için Supabase Dashboard → **Authentication** → **Providers** → **Email** (veya **Password** ayarları) bölümünde **Minimum password length** değerini **1** yapın (veya en azından uygulamanın izin verdiği minimumla eşleştirin). Aksi halde API `updateUser` / `updateUserById` şifreyi reddedebilir.

## Veritabanı

Migration: `20250301120000_app_profiles_ilk_giris_kurtarma.sql`  
(`kurtarma_hash` sütunu artık kullanılmıyor; boş bırakılabilir.)

## Toplu Auth kullanıcısı (SQL yerine script)

`auth.users` içine ham SQL ile toplu insert **önerilmez** (şifre bcrypt ile üretilir; TCKN/tarih mantığı uygulamada).

**Hazır script:** `npm run bulk-auth-users` — `calisan` üzerinden e-posta + kurum şifresi ile toplu Auth kullanıcısı oluşturur.  
Adım adım: [TOPLU_AUTH_KULLANICI.md](./TOPLU_AUTH_KULLANICI.md).

Gereksinim: `.env.local` içinde `NEXT_PUBLIC_SUPABASE_URL` ve `SUPABASE_SERVICE_ROLE_KEY`.  
Ortam: [ORTAM_DEGISKENLERI.md](./ORTAM_DEGISKENLERI.md).
