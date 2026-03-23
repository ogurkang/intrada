# Toplu Auth kullanıcısı (kurum şifresi ile)

`calisan` tablosundaki her satır için: **e-posta** + **TCKN** + **doğum tarihi** kullanılarak Supabase **Authentication** içinde kullanıcı açılır.

**İlk şifre kuralı** (uygulama ile aynı):

- TCKN’nin **ilk 3 rakamı** + **nokta** + **doğum yılının 4 hanesi**  
- Örnek: TCKN `12345678901`, doğum `1987` → şifre `123.1987`

## Ne lazım?

- Proje kökünde `.env.local` içinde:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- `calisan` satırlarında **e-posta**, **TCKN**, **doğum tarihi** dolu olmalı (eksik olanlar atlanır).

## Nasıl çalıştırılır?

Terminalde **proje klasöründe** (`intrada`):

1. **Önce deneme (hiçbir şey oluşturmaz, sadece listeler):**

   ```bash
   npm run bulk-auth-users:dry
   ```

2. **Gerçekten Auth’a eklemek için:**

   ```bash
   npm run bulk-auth-users
   ```

Sunucuyu (`npm run dev`) durdurmana gerek yok; bu komut ayrı bir terminalde çalışır.

## Zaten kayıtlı e-posta

Aynı e-posta Auth’ta varsa satır **atlanır** (“zaten var”), hata sayılmaz.

## İK / sistem hesabı (godmode)

`.env.local` içinde `APP_GODMODE_SICIL_LIST=IK001` gibi tanımlı siciller **Auth’a toplu eklenmez** (manuel açılmış hesapların üzerine yazılmaz).

## Sonrasında

Kullanıcılar ilk girişte **hesap kurulumu** ekranına düşebilir; yetkiler **Yetkilendirme** veya SQL ile verilir.
