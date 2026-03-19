# INTRADA v4 – Personel Yönetim Sistemi

Next.js 16 + Supabase (PostgreSQL) + Vercel mimarisi üzerine kurulu, belediye personel yönetim uygulaması.

---

## Teknoloji Yığını

| Katman      | Teknoloji                              |
|-------------|----------------------------------------|
| Frontend    | Next.js 16 (App Router), TypeScript    |
| Stil        | Tailwind CSS                           |
| Veritabanı  | Supabase (PostgreSQL)                  |
| Auth        | Supabase Auth (e-posta/şifre)          |
| Deploy      | Vercel                                 |

---

## Kurulum

### 1. Repoyu klonlayın (veya bu klasörü açın)

```bash
cd intrada
npm install
```

### 2. Ortam değişkenlerini ayarlayın

```bash
cp .env.local.example .env.local
```

`.env.local` dosyasını açın ve Supabase proje bilgilerinizi girin:

```
NEXT_PUBLIC_SUPABASE_URL=https://PROJE_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

> **Supabase değerlerinizi nerede bulursunuz?**
> Supabase Dashboard → Projeniz → Settings → API

### 3. Veritabanını oluşturun

Supabase Dashboard → SQL Editor bölümünü açın.
`../supabase_schema.sql` dosyasının içeriğini kopyalayıp yapıştırın ve çalıştırın.
30 tablo + 2 view oluşturulacaktır.

### 4. İlk kullanıcıyı oluşturun

Supabase Dashboard → Authentication → Users → "Invite User" ile
yönetici e-postanızı ve şifrenizi ekleyin.

### 5. Geliştirme sunucusunu başlatın

```bash
npm run dev
```

Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresini açın.

---

## Proje Yapısı

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx        # Giriş sayfası
│   └── (dashboard)/
│       ├── layout.tsx            # Sidebar + Header
│       ├── page.tsx              # Ana sayfa (özet kartlar)
│       ├── personel/page.tsx     # Çalışanlar listesi
│       ├── kadro/page.tsx        # Kadro hareketleri
│       ├── izin/page.tsx         # İzin hareketleri
│       ├── bildirim/page.tsx     # Mal & Aile bildirimi
│       ├── egitim/page.tsx       # Eğitim takvimi
│       └── kesintiler/page.tsx   # Kesinti modülleri
├── components/
│   └── layout/
│       ├── Sidebar.tsx           # Sol navigasyon
│       └── Header.tsx            # Üst bar + çıkış
├── lib/
│   └── supabase/
│       ├── client.ts             # Tarayıcı istemcisi
│       ├── server.ts             # Sunucu istemcisi (RSC)
│       └── middleware.ts         # Oturum yenileme
├── middleware.ts                 # Route koruması
└── types/
    └── database.ts               # TypeScript tip tanımları
```

---

## Vercel'e Deploy

```bash
# Vercel CLI ile (isteğe bağlı)
npx vercel

# veya GitHub → Vercel Dashboard'dan otomatik deploy
```

Vercel Dashboard → Settings → Environment Variables bölümüne
`.env.local` içindeki iki değişkeni ekleyin.

---

## TypeScript Tiplerini Yenileme

Supabase CLI kurulduktan sonra:

```bash
npx supabase gen types typescript --project-id PROJE_ID > src/types/database.ts
```

Bu komut `src/types/database.ts` dosyasını otomatik günceller.

---

## Modüller

| Modül           | Sayfa                | Açıklama                              |
|-----------------|----------------------|---------------------------------------|
| Personel        | `/personel`          | Çalışan listesi (kadro özetiyle)      |
| Kadro           | `/kadro`             | Kadro hareketleri                     |
| İzin            | `/izin`              | İzin talepleri ve onayları            |
| Bildirim        | `/bildirim`          | Mal beyanı ve aile bildirimi          |
| Eğitim          | `/egitim`            | Eğitim takvimi ve istatistik          |
| Kesintiler      | `/kesintiler`        | AYY, RMY, İVY, İZY, Yevmiye          |
