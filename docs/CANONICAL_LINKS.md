# Canonical URL: `/link/{slug}`

## Mal bildirimi detayı

- **Görüntüleme adresi:** `/link/{slug}`  
  - `slug` = `mal_bildirimi.public_id` (UUID metni).  
  - `app_links` tablosunda `kind = 'mal_bildirimi'`, `ref_key` = aynı UUID.

- **Eski adres** `/bildirim/mal/{public_id|sayısal_id}` **çalışmaya devam eder** (geri uyum).

## Firma personel

- **Detay:** `/link/{public_id}` — `firma_calisanlar.public_id`, `app_links.kind = 'firma_calisan'`, `ref_key` = sayısal `id`.
- Migration: `20250220120000_firma_calisan_public_id_app_links.sql`

## Personel hareketleri (düzenle)

- **Canonical:** `/link/{public_id}` — `personel_hareketleri.public_id`, `app_links.kind = 'personel_hareketi'`, `ref_key` = sayısal `id`.
- **`/personel-hareketleri/[id]/duzenle`** açılırsa (sayısal veya UUID) tarayıcı **canonical** `/link/{public_id}` adresine yönlendirilir.
- Migration: `20250226120000_personel_izin_hareketleri_public_id_app_links.sql`

## İzin hareketleri (detay)

- **Canonical:** `/link/{public_id}` — `izin_hareketleri.public_id`, `app_links.kind = 'izin_hareketi'`, `ref_key` = sayısal `id`.
- **`/izin/[id]`** (detay) aynı mantıkla canonical adrese yönlendirilebilir; düzenleme: **`/izin/[id]/duzenle`** (geri uyum).
- Aynı migration dosyası.

## Kadro hareketleri

- **Detay:** `/link/{public_id}` — `kadro_hareketleri.public_id`, `app_links.kind = 'kadro_hareketi'`, `ref_key` = sayısal `id`.
- **`/kadro/{id}`** veya **`/kadro/{uuid}`** açılırsa tarayıcı **canonical** `/link/{public_id}` adresine yönlendirilir (personel ile aynı mantık).
- Düzenleme: **`/kadro/{id}/duzenle`** (sayısal id; geri uyum).
- Migration: `20250225120000_kadro_hareketleri_public_id_app_links.sql`

## Terfi (katsayı)

- **Uygulama yolu:** `NEXT_PUBLIC_TERFI_APP_PATH` ile tek segment (ör. `/f52c68e6f964`). Proxy `/terfi` isteğine **404** verir; opak segment içeriden `/terfi` rotasına rewrite edilir. Tahmin zorlaşır; asıl güvenlik yine oturum + RLS.
- Migration (terfi satırında `public_id` / `app_links` kaldırma): `20250222130000_remove_terfi_app_links_public_id.sql`

## Personel (çalışan) detayı

- **Liste / pano linkleri:** `/link/{public_id}` — `calisan.public_id` (UUID).  
  - `app_links`: `kind = 'personel'`, `ref_key` = `sicil_no`, `slug` = `public_id` metni.

- **`/personel/{sicil_no}`** veya UUID segmentiyle **`/personel/{public_id}`** hâlâ çalışır; UUID ile açılırsa tarayıcı **canonical** `/link/{public_id}` adresine yönlendirilir.

- **Kişisel düzenle:** `/personel/{public_id|sicil}/duzenle` (segment sunucuda çözülür).

## Veritabanı

- `20250219100000_app_links.sql` — mal + `app_links` tablosu  
- `20250219120000_calisan_public_id_app_links_personel.sql` — `calisan.public_id`, `personel` kind, trigger  

## Diğer

- Kullanıcı girişi: `docs/PLAN_KULLANICI_AUTH_URL_DUYURU.md`.
- **Tüm modüller için** benzersiz link + yetki (RLS) planı: `docs/PLAN_LINK_VE_YETKI.md`.
