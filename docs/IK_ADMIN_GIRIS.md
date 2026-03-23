# “E-posta eşleşmesi bulunamadı” ve İK / yönetici girişi

## Bu uyarı neden çıkar?

Uygulama, giriş yapan kişinin e-postasını `calisan.e_posta` ile **aynı** olacak şekilde arar; eşleşen sicil bulunursa `app_profiles` satırı oluşturulur.

**Service role key** bu eşleştirmeyi yapmaz; sadece sunucu tarafı işlemler (ör. şifre sıfırlama script’i) içindir.

## Ne yapmalısın? (sırayla)

### 1) `calisan` tablosunda e-postayı doğrula

Supabase → **Table Editor** → `calisan` → `insankaynaklari@adapazari.bel.tr` için satır var mı bak.

- **Yoksa:** İK personelini personel ekranından ekle veya SQL ile ekle; `e_posta` alanı **girişte kullandığın adresle birebir** (tercihen küçük harf) olsun.
- **Varsa ama e-posta farklıysa:** O satırda `e_posta` değerini güncelle.

Örnek kontrol (SQL Editor):

```sql
SELECT sicil_no, ad_soyad, e_posta, tckn, dogum_tarihi
FROM calisan
WHERE e_posta ILIKE 'insankaynaklari@adapazari.bel.tr';
```

### 2) Supabase Auth’ta kullanıcı olsun

**Authentication** → **Users** → Aynı e-posta ile kullanıcı tanımlı olmalı.

- Yoksa: **Add user** → e-posta + şifre (veya `npm run bulk-auth-users` ile toplu oluşturma).

İlk şifre formülü (personel kaydındaki TCKN ve doğum tarihine göre):  
**TCKN’nin ilk 3 rakamı + nokta + doğum yılı (4 hane)** — örn. `252.1987`.

### 3) Yerelde `.env.local` ve sunucuyu yenile

`NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_ANON_KEY` **aynı projeyi** göstermeli. Değiştirdiysen `npm run dev`’i durdurup yeniden başlat.

### 4) Yönetici (admin) rolü

İlk girişten sonra `app_profiles` oluşur; tam yetki için `rol = 'admin'` yapılmalı.

**Seçenek A — Yetkilendirme sayfası:** Başka bir admin varsa oradan atama.

**Seçenek B — SQL (Supabase SQL Editor, tek seferlik):**

```sql
UPDATE app_profiles
SET rol = 'admin',
    ilk_giris_tamam = true
WHERE id = (
  SELECT id FROM auth.users
  WHERE lower(email) = lower('insankaynaklari@adapazari.bel.tr')
);
```

`ilk_giris_tamam = true` ile `/hesap/ilk-kurulum` adımını atlatmış olursun; kullanıcı adı / şifre zaten belirlendiyse uygundur.

### `UPDATE app_profiles` giriş ekranını tek başına düzeltir mi?

**Hayır.** “E-posta eşleşmesi bulunamadı” uyarısı, henüz **`app_profiles` satırı yokken** çıkar (`calisan` ile e-posta eşleşmiyorsa). Bu durumda önce `calisan` + Auth düzeltilmeli; giriş yapılabilsin ki profil oluşsun.

**`UPDATE app_profiles` …** şu işe yarar:

- Zaten giriş yapılmış ve `app_profiles` kaydı varken **rolü `admin` yapmak** veya **ilk kurulumu atlatmak** (`ilk_giris_tamam`).
- Yani **ikinci aşama** düzeltmesi; birinci aşama hâlâ `calisan.e_posta` + Auth kullanıcısı.

### Sistem / “godmode” hesabı — personel listesinde görünmesin

İK veya teknik süper hesap `calisan`’da durmalı (FK ve e-posta eşleşmesi için), ama **Personel** ve **Yetkilendirme** listelerinde görünmesin istiyorsanız:

1. O hesabın **sicil numarasını** not edin (örn. `IK001`).
2. `.env.local` ve Vercel’e ekleyin:

```env
APP_GODMODE_SICIL_LIST=IK001
```

Birden fazla: `IK001,IK002` (virgülle; veritabanındaki sicil yazımıyla aynı olsun).

Bu siciller **Personel**, **Ayrılanlar** ve **Yetkilendirme** tablolarında listelenmez. Rol ataması için yine SQL veya `app_profiles` üzerinden güvenilir.

## Hâlâ “E-posta eşleşmesi bulunamadı” (env / server yenileme işe yaramadı)

Bu uyarı **ortam değişkeniyle düzelmez**; sebep neredeyse her zaman veri:

1. **Doğru Supabase projesi mi?**  
   `.env.local` içindeki `NEXT_PUBLIC_SUPABASE_URL` ve **anon key**, Supabase panelinde `calisan` tablosuna baktığın **aynı proje** olmalı. (Yanlış projeye bağlıysan tabloda kayıt varmış gibi görünür ama uygulama başka DB’ye gider.)

2. **Giriş e-postası = `calisan.e_posta` mi?**  
   Authentication → Users → giriş yaptığın kullanıcının **tam e-posta adresini** kopyala.  
   SQL Editor’da:

   ```sql
   SELECT sicil_no, ad_soyad, e_posta
   FROM calisan
   WHERE lower(trim(e_posta)) = lower(trim('BURAYA_AUTH_EPOSTASINI_YAPISTIR'));
   ```

   **Satır dönmüyorsa:** `calisan` satırında `e_posta` yok / yanlış. Düzelt:

   ```sql
   UPDATE calisan
   SET e_posta = 'auth_taki_ile_ayni@adres.bel.tr'
   WHERE sicil_no = 'SICIL_NUMARAN';
   ```

3. **Başında/sonunda boşluk:** Bazen Excel import’ta `e_posta` boşluklu gelir. Gerekirse:

   ```sql
   UPDATE calisan SET e_posta = trim(e_posta) WHERE sicil_no = '...';
   ```

4. **Çıkış yapıp tekrar giriş** (oturum eski e-postayı tutuyor olabilir).

## Kısa kontrol listesi

| Kontrol | Açıklama |
|--------|----------|
| `calisan.e_posta` | Giriş e-postası ile aynı |
| Auth kullanıcısı | Aynı e-posta kayıtlı |
| İlk şifre | TCKN + doğum yılı formülü (o personel satırına göre) |
| `app_profiles.rol` | Yönetim için `admin` |
| `APP_GODMODE_SICIL_LIST` | İsteğe bağlı; bu sicilleri personel/yetkilendirme listelerinden gizler |

## Yetkilendirme: “Oluştur” ve toplu kullanıcı

- **“Profil yok, hesap var”** = Personel (`calisan`) kaydı var, Supabase **Auth**’ta giriş hesabı var, ama henüz **`app_profiles`** satırı yok. (Giriş bilgisi eksik değil; uygulama profili eksik.)

- **Yetkilendirme → Oluştur:** Artık **UUID yapıştırmak zorunlu değil**. `calisan.e_posta` ile Auth’taki kullanıcı **aynı e-posta** ise sistem otomatik eşleştirir (sunucuda `SUPABASE_SERVICE_ROLE_KEY` gerekir). İsterseniz eskisi gibi UUID de girebilirsiniz.

- **700 / 10.000 kişi:** Önce Auth hesaplarını **`npm run bulk-auth-users`** ile toplu açın. Çoğu kullanıcı **ilk girişte** profil zaten otomatik oluşur (`e_posta` uyumluysa). Yetkilendirme ekranındaki “Oluştur” daha çok **giriş yapmadan önce** rol atamak istenen istisnalar içindir.
