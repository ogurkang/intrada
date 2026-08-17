# YS Market — Ürün ve Teknik Plan Taslağı

> **Amaç:** Bireylere su satışı yapan bir firmanın teslimat ve stok geçmişini tutan; mali kayıtları barındıran; alış–satış maliyet karşılaştırmalı raporlar sunan; ileride sanal POS tahsilatı ve müşteri siparişi içerebilecek **bağımsız** bir operasyon + mali platform.
>
> Bu doküman Intrada kod tabanından **ayrı** yeni bir sistem için planlama notudur. Intrada’dan taşınacak olan **kod değil**, modüler yapı, audit geçmişi, rapor hub ve rol bazlı erişim **desenleridir**.

---

## Tek cümlelik tanım

**Müşteri → sipariş → stok çıkışı → teslimat → tahsilat → maliyet/kar** zincirini uçtan uca izleyen, geçmişi ve raporları tek yerde toplayan yazılım.

---

## Intrada desenlerinin karşılıkları

| Intrada deseni | YS Market karşılığı |
|----------------|---------------------|
| Personel kartı | **Müşteri kartı** (adres, abonelik, damacana borcu, iletişim) |
| İzin / kesinti hareketleri | **Teslimat hareketleri**, **stok hareketleri** |
| Bildirim / tanımlar | **Ürün tanımları**, **bölge/rota**, **fiyat listesi** |
| Mali bildirim | **Fatura / tahsilat / alış faturası** |
| Rapor yönetimi hub | **Rapor merkezi** (satış, stok, kar-zarar, müşteri borcu…) |
| Audit + saat ikonu | **Her teslimat, stok ve mali işlemde kim / ne zaman** |
| Yetkilendirme | Şoför / depo / muhasebe / yönetici / (v2) müşteri portalı |

---

## Modül yapısı

### Çekirdek (v1 — olmazsa olmaz)

#### 1. Müşteriler
- Kayıt, adres(ler), iletişim, notlar, aktif/pasif
- Borç bakiyesi, damacana/emtia takibi (su firmalarında kritik)

#### 2. Ürün ve fiyat
- Damacana, pet şişe, aksesuar
- Alış fiyatı, satış fiyatı, dönemsel fiyat (kampanya)

#### 3. Stok
- Depo(lar), giriş (alış), çıkış (teslimat/sipariş), sayım, fire
- **Stok hareket defteri:** tarih, ürün, miktar, hareket tipi, referans (alış no / teslimat no)

#### 4. Sipariş ve teslimat
- Sipariş: müşteri, ürün, miktar, tarih, durum (bekliyor / yolda / teslim / iptal)
- Teslimat: şoför, rota, teslim zamanı, teslim edilen miktar
- Zincir: sipariş → stok düşümü → teslimat kaydı

#### 5. Mali (temel)
- **Alış:** tedarikçi, fatura, birim maliyet
- **Satış:** müşteri faturası veya fiş, tahsilat (nakit / havale / ileride sanal POS)
- **Maliyet–satış karşılaştırması:** dönem bazlı brüt kar, ürün bazlı marj

#### 6. Raporlar
- Günlük / aylık satış
- Stok durumu ve hareket özeti
- Müşteri borç listesi
- Alış vs satış maliyet raporu
- Teslimat performansı (şoför, bölge)

#### 7. Kullanıcı ve yetki
- Roller: admin, muhasebe, depo, şoför
- v2: müşteri portalı

### v2 (sonraki faz)
- Müşteri sipariş portalı (web veya basit mobil)
- Sanal POS / online tahsilat
- Rota optimizasyonu, SMS bildirim
- Abonelik / düzenli teslimat (ör. her hafta X damacana)

---

## Veri modeli (kabaca)

```
musteriler
  id, kod, unvan, telefon, e_posta, aktif, ...

musteri_adresleri
  musteri_id, adres, bolge_id, varsayilan, ...

urunler
  id, ad, birim (adet/litre), alis_fiyati_guncel, satis_fiyati_guncel

depolar

stok_hareketleri
  depo_id, urun_id, miktar (+/-), hareket_tipi (alis|satis|sayim|fire|iade)
  ref_tablo, ref_id, tarih, actor_id

siparisler
  musteri_id, adres_id, durum, siparis_tarihi, planlanan_teslim

siparis_kalemleri
  siparis_id, urun_id, miktar, birim_fiyat

teslimatlar
  siparis_id, teslim_tarihi, teslim_eden_kullanici, not

alis_faturalari / alis_kalemleri   → maliyet
satis_faturalari / satis_kalemleri → gelir
tahsilatlar                        → nakit akışı

audit_log
  modul, islem, ref_table, ref_id, onceki, sonraki, actor, created_at
```

**Altın kural:** Stok ve para hareketleri silinmez; iptal/iade ile **ters kayıt** atılır. Audit log bu sistemde Intrada’dan daha da kritiktir.

---

## İş kuralları (v1 öncesi netleştirilmeli)

1. Teslimatta **boş damacana** geri alındı mı? (emanet stok)
2. Müşteri **vadeli** mi, peşin mi?
3. Sipariş onaylanınca stok **rezerve** mi edilir, teslimatta mı düşülür?
4. Alış fiyatı değişince stok değerlemesi: **FIFO** mu, **ortalama maliyet** mi?
5. Şoför yalnızca kendi rotasını / teslimatlarını görür mü?

Bu maddeler şema ve ekranları doğrudan belirler.

---

## Teknoloji önerisi

### Önerilen stack (MVP için)
- **Next.js** — iç panel + ileride müşteri sipariş arayüzü
- **PostgreSQL (Supabase)** — stok, mali ve ilişkisel veri
- **Vercel** — deploy

### Alternatifler
- **Klasik kurumsal:** React + .NET/Java/NestJS + PostgreSQL + Keycloak/Azure AD
- **Mobil ağırlıklı şoför:** Panel Next.js; şoför için React Native veya PWA (offline kısa süre)

### Sanal POS (v2)
- Türkiye: iyzico, PayTR, Param vb.
- `tahsilatlar` tablosuna `odeme_kanali`, `pos_referans` alanları

---

## Mimari kararlar (başta kilitle)

| Konu | Seçenek / not |
|------|----------------|
| Müşteri anahtarı | `musteri_kodu` veya UUID |
| Stok | Tek hareket defteri; her işlem referanslı |
| Mali | Alış/satış ayrı belgeler; tahsilat ayrı tablo |
| Audit | Tek merkezi `audit_log`; UI’da saat ikonu + geçmiş paneli |
| Yetki | Rol + modül bayrakları (Intrada `menu_izinleri` benzeri) |
| Ortamlar | dev / staging / prod; migration klasörü zorunlu |

---

## Geliştirme sırası (sprint önerisi)

| Sprint | Çıktı |
|--------|--------|
| 1 | Auth, roller, müşteri CRUD, audit altyapısı |
| 2 | Ürün, depo, stok giriş (alış) |
| 3 | Sipariş + teslimat + otomatik stok çıkışı |
| 4 | Satış kaydı, tahsilat, müşteri bakiye |
| 5 | Alış faturaları, maliyet hesabı |
| 6 | Rapor hub + 4–5 temel rapor + Excel |
| 7 | Müşteri sipariş ekranı (basit) |
| 8 | Sanal POS entegrasyonu |

**Tahmini süre**
- İç kullanım MVP (müşteri + stok + teslimat + basit mali + raporlar): **3–4 ay**
- POS + müşteri portalı + gelişmiş raporlar: **+3–6 ay**

---

## v1 minimum canlı kapsam (öneri)

Dar tutulması önerilen ilk canlı sürüm:

- [ ] Müşteri + adres
- [ ] Ürün (ör. damacana dolu, boş emanet, pet)
- [ ] Stok hareketleri
- [ ] Sipariş → teslimat
- [ ] Manuel tahsilat (nakit / havale)
- [ ] 3 rapor: günlük satış, stok özeti, müşteri borç

**v1 dışı (v2):** sanal POS, müşteri self-servis sipariş.

---

## UI / UX desenleri (Intrada’dan ilham)

- **Genel bakış hub:** modül kartları, son işlem özeti, saat → geçmiş paneli
- **Liste ekranları:** göz (detay), kalem (düzenle), saat (audit)
- **Rapor merkezi:** kart grid, rapor açma, Excel export
- **Sunucu:** veri yükleme; **istemci:** etkileşim ve formlar
- **Sunucu → istemci:** fonksiyon prop geçirilmez; audit diff için string anahtar veya client-side map

---

## Açık sorular (planı netleştirmek için)

1. Kaç depo / şube? Tek merkez mi?
2. Teslimat: günlük rota mu, anlık sipariş mi, abonelik var mı?
3. Damacana emanet takibi zorunlu mu?
4. Muhasebe: yalnızca iç takip mi, e-fatura / Logo–Mikro entegrasyonu hedefleniyor mu?
5. Müşteri siparişi: operatör mü girer (v1), müşteri kendi mi verir (v2)?
6. Kullanıcı sayısı: kaç şoför, kaç ofis kullanıcısı?

---

## Intrada’dan alınmaması gerekenler

- Mevcut repo’yu fork’lamak veya modül kopyalamak
- Tüm modülleri v1’de açmak
- Audit’i sonraya bırakmak
- Aktif müşteri / stok filtrelerini ekran ekran farklı yazmak

---

## İlk somut adımlar (yeni repo açıldığında)

1. Ürün dokümanı (1 sayfa): modüller, kullanıcılar, v1 kapsamı
2. ER diyagramı: müşteri, stok, sipariş, mali, audit
3. Yeni repo + yeni Supabase projesi + deploy ortamı
4. İlk migration: `audit_log`, `musteriler`, `kullanicilar` / `app_profiles`
5. İlk ekran: giriş + müşteri listesi (auth + layout iskeleti)

---

*Son güncelleme: planlama taslağı — Intrada geliştirmelerinden bağımsız.*
