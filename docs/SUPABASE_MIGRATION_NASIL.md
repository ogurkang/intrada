# Supabase migration (SQL) nasıl uygulanır?

Bu projede şema değişiklikleri `supabase/migrations/` altındaki `.sql` dosyalarıdır (ör. `mal_bildirimi` için `public_id` sütunu).

## Yöntem 1 — Supabase Dashboard (en kolay)

1. [Supabase](https://supabase.com) → projenizi açın.
2. Sol menüden **SQL Editor**’e gidin.
3. **New query** ile boş bir sorgu açın.
4. İlgili migration dosyasının **tam içeriğini** kopyalayıp yapıştırın  
   (örnek: `supabase/migrations/20250218120000_mal_bildirimi_public_id.sql`).
5. **Run** (veya Ctrl+Enter) ile çalıştırın.
6. Hata yoksa “Success” görünür; tabloda yeni sütun oluşur.

> Aynı migration’ı **iki kez** çalıştırmak genelde güvenlidir (`IF NOT EXISTS` kullanıldığı için); yine de tek sefer yeter.

## Yöntem 2 — Supabase CLI (`db push`)

Bilgisayarınızda Supabase CLI kuruluysa:

```bash
cd intrada
npx supabase login
npx supabase link --project-ref <PROJE_REF_ID>
npx supabase db push
```

- **`<PROJE_REF_ID>`**: Supabase → Project Settings → General → **Reference ID**.

`db push`, yerel `supabase/migrations` ile uzak veritabanını eşitler.

## Yöntem 3 — `psql` ile tek dosyayı çalıştırmak (doğrudan veritabanına)

Bu yöntem SQL’i **Supabase sunucusundaki Postgres’e** doğrudan gönderir; Dashboard’a gerek yok.

### 3.1 Bağlantı dizesini al

1. Supabase → **Project Settings** (dişli) → **Database**.
2. **Connection string** bölümünde **URI** sekmesini seç.
3. Çıkan metinde `[YOUR-PASSWORD]` yerine **veritabanı şifrenizi** yazın (Database sayfasında “Reset database password” ile de ayarlanabilir).
4. Bu **tam URI’yi** bir yere güvenli şekilde yapıştırın (asla Git’e commit etmeyin).

Örnek biçim (projenize göre host/port değişir):

```text
postgresql://postgres.[PROJECT_REF]:SIFRENIZ@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

> **Not:** Migration gibi DDL işleri için genelde **Session** veya **Direct connection** (port **5432**) daha uygundur. Pooler hata verirse aynı sayfada **Direct connection** URI’sini deneyin.

### 3.2 `psql` kurulu mu?

Terminalde `psql --version` yazın. Yoksa:

- [PostgreSQL indir](https://www.postgresql.org/download/windows/) (kurulumda “Command Line Tools” seçili olsun), veya  
- `winget install PostgreSQL.PostgreSQL` (yönetici PowerShell).

### 3.3 Komutu kopyala — çalıştır

**PowerShell** (proje klasörünü kendi yolunuzla değiştirin):

```powershell
cd "C:\Users\Gürkan Gürtemel\Desktop\Yeni_Vercel_Supabase\intrada"

psql "BURAYA_SUPABASE_URI_YAPISTIRIN" -f ".\supabase\migrations\20250218120000_mal_bildirimi_public_id.sql"
```

**Git Bash / macOS / Linux:**

```bash
cd /path/to/intrada

psql "BURAYA_SUPABASE_URI_YAPISTIRIN" -f supabase/migrations/20250218120000_mal_bildirimi_public_id.sql
```

- `BURAYA_SUPABASE_URI_YAPISTIRIN` → tırnak içinde **tek parça** olarak tam `postgresql://...` dizesi.
- Başarılıysa terminalde SQL çıktısı veya `ALTER TABLE` / `UPDATE` satırları görünür; hata varsa kırmızı mesaj gelir.

### 3.4 URI’yi ortam değişkeninde tutmak (önerilir)

Şifreyi komut satırında bırakmamak için:

**PowerShell (o oturum için):**

```powershell
$env:DATABASE_URL = "postgresql://postgres:...@...supabase.com:5432/postgres"
cd "C:\Users\Gürkan Gürtemel\Desktop\Yeni_Vercel_Supabase\intrada"
psql $env:DATABASE_URL -f ".\supabase\migrations\20250218120000_mal_bildirimi_public_id.sql"
Remove-Item Env:DATABASE_URL
```

---

## Kontrol

SQL Editor’de:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'mal_bildirimi' AND column_name = 'public_id';
```

Satır dönüyorsa migration uygulanmıştır.
