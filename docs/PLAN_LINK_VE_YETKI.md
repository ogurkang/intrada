# Plan: Benzersiz linkler + yetki (tüm modüller)

## Amaç

- Adres çubuğunda **tahmin edilebilir** kimlikler (`/izin/123`, `/kadro/45`, `/firma-calisanlar/7`) yerine **UUID tabanlı** canonical URL’ler (`/link/{uuid}` veya tabloda `public_id`).
- Kullanıcı **URL’deki sayıyı değiştirerek** başka bir kayda “deneme yanılma” ile ulaşmasın (enumeration zorlaşsın).

## Kritik: UUID tek başına yetki değildir

| Katman | Ne işe yarar? |
|--------|----------------|
| **1. Belirsiz URL (UUID)** | Sıralı ID denemesini zorlaştırır; paylaşılan linklerde iç ID sızmaz. |
| **2. Supabase RLS** | **Asıl güvenlik:** Oturumdaki kullanıcının hangi satırları okuyabileceğini DB sınırı belirler. RLS yoksa veya “her şeyi aç” ise, UUID’li URL’yi bilen her giriş yapmış kullanıcı yine erişebilir. |
| **3. Uygulama rolü (opsiyonel)** | Müdürlük bazlı kısıt, admin vs. — `profiles`, JWT claims veya RLS içinde fonksiyon. |

**Sonuç:** Bu planda “link düzeni” ve **RLS / rol** birlikte düşünülmelidir.

---

## Mevcut desen (projede)

- Tablo: `app_links` — `slug` (UUID metni), `kind`, `ref_key` (iş mantığı anahtarı).
- Sayfa: `src/app/(dashboard)/link/[slug]/page.tsx` — `kind`’e göre ilgili ekranı yükle.
- `calisan`: `public_id` + `kind = personel'`.
- `mal_bildirimi`: `public_id` + `kind = mal_bildirimi'`.

---

## Önerilen `kind` ve `ref_key` sözleşmesi

`ref_key` tek satırda çözülebilir olsun diye örnek formatlar:

| `kind` | `ref_key` anlamı | Örnek |
|--------|------------------|--------|
| `personel` | `sicil_no` | `15` |
| `mal_bildirimi` | `public_id` (UUID) | aynı slug ile |
| `firma_calisan` | `firma_calisanlar.id` (string) | `42` |
| `kadro_hareketi` | `kadro_hareketleri.id` | `100` |
| `personel_hareketi` | `personel_hareketleri.id` | `500` |
| `izin_hareketi` | `izin_hareketleri.id` | `1001` |
| `izin_hakki` | `izin_haklari.id` veya `yil:sicil` | tercihen `id` |

Yeni kayıt için: ilgili tabloya **`public_id uuid DEFAULT gen_random_uuid()`** + **INSERT trigger** ile `app_links` satırı (personel/mal ile aynı mantık).

---

## Modül → URL → birincil anahtar (şu anki kod)

| Modül | Bugünkü örnek route | PK / anahtar | Önerilen canonical |
|-------|---------------------|--------------|---------------------|
| Firma personel liste/detay | `/firma-calisanlar/[id]` | `firma_calisanlar.id` | `/link/{public_id}` → `kind=firma_calisan` |
| Kadro | `/kadro/[id]`, `.../duzenle` | `kadro_hareketleri.id` | `/link/{public_id}` → `kind=kadro_hareketi` |
| Personel hareketleri | `/personel-hareketleri/[id]/goruntule` vb. | `personel_hareketleri.id` | `/link/{public_id}` → `kind=personel_hareketi` |
| İzin kayıt detay/düzenle | `/izin/[id]` | `izin_hareketleri.id` | `/link/{public_id}` → `kind=izin_hareketi` |
| İzin hakları | `/izin/haklar` (çoğunlukla liste + sicil) | `izin_haklari.id` veya `(yil,sicil)` | Satır bazlı ekran varsa `kind=izin_hakki` + `public_id` |

**Liste sayfaları** (`/izin?yil=`, `/personel`, `/kadro`): genelde filtre parametreleri kalabilir; **detay/düzenle** ekranları öncelik.

---

## Veritabanı işleri (migration şablonu)

Her varlık için tipik paket:

1. `ALTER TABLE ... ADD COLUMN public_id uuid UNIQUE NOT NULL DEFAULT gen_random_uuid();` (veya önce NULL, backfill, sonra NOT NULL).
2. `INSERT INTO app_links (slug, kind, ref_key) SELECT public_id::text, '<kind>', <ref_key_ifadesi> FROM ...`
3. `CREATE TRIGGER ... AFTER INSERT` ile yeni kayıtlar için `app_links` upsert.

Mevcut `app_links_kind_check` constraint’i yeni `kind` değerleriyle genişletilmeli.

---

## Uygulama kodu işleri

1. **`resolveAppLinkSlug`** — yeni `kind` dalları.
2. **`link/[slug]/page.tsx`** — her `kind` için mevcut detay bileşenini veriyle besle (personel/mal gibi).
3. **Listeler ve link üretimi** — `id` yerine `public_id` kullanan `*Href()` yardımcıları (`personelDetayHref` gibi).
4. **Eski rotalar** — İsteğe bağlı: `/kadro/[id]` içinde `id` numerik ise `public_id` ile eşleştir veya 301 ile `/link/...`’e yönlendir (geri uyum).
5. **`revalidatePath`** — `/link/{public_id}` ile birlikte.

---

## Uygulama sırası (güncel)

Ürün kararıyla öncelik sırası:

1. **Firma personel** (`firma_calisanlar`) — *uygulandı: `public_id`, `kind=firma_calisan`, `/link/...`*
2. **Kadro hareketleri** — *uygulandı: `public_id`, `kind=kadro_hareketi`, `/link/...`, migration `20250225120000_kadro_hareketleri_public_id_app_links.sql`*
3. **Personel hareketleri** — *uygulandı: `public_id`, `kind=personel_hareketi`, `/link/...`, migration `20250226120000_personel_izin_hareketleri_public_id_app_links.sql`*
4. **Terfi hareketleri** — **`/link` yok**; uygulama yolu **`NEXT_PUBLIC_TERFI_APP_PATH`** opak segment + proxy (tahmin zorlaştırma). Düzenleme tek sayfa.
5. **İzin hareketleri** — *uygulandı: aynı migration + `kind=izin_hareketi`*
6. **İzin hakları**
7. **Aile bildirimi**
8. **Mal bildirimi** — zaten `public_id` + `mal_bildirimi`

## Önerilen fazlar (teknik)

| Faz | Kapsam | Not |
|-----|--------|-----|
| **Faz 0** | Supabase’te RLS politikalarını gözden geçir (okuma/yazma) | Zorunlu güvenlik katmanı |
| **Faz 1** | `firma_calisanlar` | ✅ |
| **Faz 2** | `kadro_hareketleri` | ✅ |
| **Faz 3** | `personel_hareketleri`, `izin_hareketleri` | ✅ |
| **Faz 4** | `terfi_hareketleri` | |
| **Faz 5** | `izin_haklari` (satır bazlı UI varsa) | |
| **Faz 6** | `aile_bildirimi`, kesintiler dönemleri, vb. | |

---

## İlgili dosyalar

- `docs/PLAN_YETKILENDIRME_ROADMAP.md` — kullanıcı girişi + müdürlük/personel yetkisi sırası ve eksik kalabilecek noktalar
- `docs/CANONICAL_LINKS.md` — mevcut canonical özet
- `src/lib/app-link-resolve.ts`
- `src/app/(dashboard)/link/[slug]/page.tsx`
- `supabase/migrations/*app_links*`

---

## Özet

- **Evet**, firma personel, kadro, personel/izin hareketleri ve izin hakları için aynı **UUID + `app_links` + `/link/...`** modeli uygulanabilir.
- **Yetkisiz** erişimi engellemek için mutlaka **RLS (ve gerekiyorsa rol)** ile birlikte planlanmalı; sadece URL değiştirmek yeterli değildir.
