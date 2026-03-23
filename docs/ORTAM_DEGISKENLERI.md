# Ortam değişkenleri (`.env` / Vercel)

## `anon` ile `service_role` aynı şey değil

Supabase **Project Settings → API** sayfasında iki ayrı anahtar görürsün:

| İsim | Ne için? |
|------|-----------|
| **anon** `public` | Tarayıcıdaki uygulama (`NEXT_PUBLIC_SUPABASE_ANON_KEY`). RLS kurallarına tabi. |
| **service_role** `secret` | Sadece sunucu tarafı ve güvenli script’ler (`SUPABASE_SERVICE_ROLE_KEY`). RLS’i **bypass** eder; **asla** `NEXT_PUBLIC_` ile expose etme, Git’e koyma. |

Şablonda sadece URL + anon varsa **`SUPABASE_SERVICE_ROLE_KEY` satırını sen eklemen gerekir**; Supabase panelinden kopyala.

## Yerel geliştirme (`intrada` klasöründe)

1. Proje kökünde **`.env.local`** dosyası oluştur veya düzenle (Git’e **ekleme**; `.gitignore`’da kalsın).
2. Aşağıdaki satırları ekle / güncelle:

| Değişken | Nereden? |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → **Project Settings** → **API** → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Aynı sayfa → **anon public** key |
| `SUPABASE_SERVICE_ROLE_KEY` | Aynı sayfa → **service_role** (gizli; sadece sunucu / script) |
| `APP_GODMODE_SICIL_LIST` | İsteğe bağlı; virgülle sicil_no listesi — bu siciller personel / yetkilendirme listelerinde gösterilmez |

Örnek (değerler kendi projene göre):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

3. **Sunucuyu yeniden başlat** (`npm run dev`) değişikliklerden sonra.

---

## Vercel (canlı)

1. Vercel → projen → **Settings** → **Environment Variables**
2. Aynı isimlerle değerleri ekle (Production / Preview isteğe göre).
3. **Deploy** yenile (veya “Redeploy”).

---

## Kontrol

- Uygulama açılıyorsa `NEXT_PUBLIC_*` doğrudur.
- **Şifre sıfırlama** (`/sifre-sifirla`) çalışmıyorsa `SUPABASE_SERVICE_ROLE_KEY` eksik veya yanlış olabilir.
