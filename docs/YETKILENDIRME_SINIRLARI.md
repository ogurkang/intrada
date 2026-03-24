# Yetkilendirme sınırları (uygulama kuralları)

Bu belge, **Rol: Yönetici (Admin)** ile **Rol: Kullanıcı** davranışını tanımlar.  
Teknik uygulama: `src/lib/menu-yetki.ts` (`kullaniciPathAllowed`), `PermissionGate`, modül sayfaları.

---

## 1. Yönetici (Admin)

Yetkilendirme ekranında **Admin** seçilen personel = **tam yetki** (süper kullanıcı).  
Menü kutuları salt okunur gösterilir; tüm modüllere ve tanımlara erişir.

---

## 2. Kullanıcı (Kullanıcı)

### 2.1 Personel modülü

- **Sadece kendi detay ekranı** (`/personel/{kendi sicili}` veya kendi `public_id` ile açılan eşdeğer rota): **salt okunur** (düzenleme yok).
- Aynı modüldeki diğer menüler (çalışanlar listesi, ayrılanlar, firma, kadro, personel hareketleri, terfi): kullanıcı rolünde **Terfi / eğitim / yetkilendirme** ekranları açılmaz; **PermissionGate** üzerinde **«Sorumluluk Sınırı!»** uyarısı ve Anasayfa linki gösterilir.

### 2.2 İzin yönetimi

- Tüm alt sayfalar: **aynı uyarı** (erişim yok).

### 2.3 Bildirim

- **Genel bakış** ve **Öğrenim**: **aynı uyarı**.
- **Aile bildirimi** ve **Mal bildirimi**: Kendisiyle ilgili işlemler; personel seçimi **salt okunur**, kendi bilgileriyle dolu.

### 2.4 Kesintiler (Yevmiye & Arazi)

- Dönem listelerini **görür**; dönem **ekleme/düzenleme** yok (tanım).
- **Detay** ekranında: yalnızca kadro hareketlerindeki **görev müdürlükleri** kümesinden müdürlük seçimi; **asil** ve **vekil** satırlarındaki görev müdürlükleri birleşimi kullanılır.
- **Tek müdürlük** (asil ve vekilde aynı): müdürlük seçimi **salt okunur**.
- **Birden fazla müdürlük**: aralarında seçim yapılabilir; seçilen müdürlüğe göre puantör / birim amiri / müdür listeleri **asil ve vekil dahil** personel kurallarına göre dolar.
- İşlem yapabilir (puantaj mantığı; mevcut `kullanici-mudurluk` ile uyumlu).

### 2.5 Eğitim

- Modülün tamamında: **erişim yok** (aynı uyarı).

### 2.6 Tanımlar

- Menü ve içerik **görüntülenir**, **salt okunur**; kayıt ekleme/silme/düzenleme yok.

### 2.7 Yetkilendirme ekranı

- Sadece **yönetici**; normal kullanıcı bu sayfayı kullanamaz (ekran kilidi).

### 2.8 Paylaşım linkleri (Link)

- Yetkilendirme tablosunda **ayrı sütun yok**; rol bazlı özel kural bu belgede ayrıca netleştirilebilir.

---

## 3. Açık sorular (ileride netleştirme)

| Konu | Not |
|------|-----|
| Kesintiler — AYY, RMY, IVY, İZY vb. | Bu belgede kullanıcı için **Yevmiye + Arazi** detayı tariflendi; diğer kesinti alt modülleri varsayılan **kapalı** (uyarı). İstenirse tek tek açılabilir. |
| RLS | Ekran kuralları ile veritabanı RLS’nin birebir uyumu ayrı denetim konusu. |
| Bildirim formları | Sadece `sicil_no = oturum kullanıcısı` doğrulaması sunucu aksiyonlarında pekiştirilmeli. |

---

## 4. Yetkilendirme UI

- **Link** modülü sütunu kaldırıldı; `MENU_YETKILENDIRME_MODULLERI` tabloda kullanılır; sunucu `menu_izinleri` yazımında `link` anahtarı yok.

## 5. Uygulama notları (kod)

- **Personel:** `personel/[sicil_no]/page.tsx` — `kullanici` için yalnızca kendi sicili; `saltOkunur` ile `PersonelDetayClient` düzenleme kapalı. `personel/.../duzenle` — `kullanici` için `notFound()`.
- **Tanımlar:** `tanimlar/layout.tsx` + `TanimlarSaltOkunurContext`; tüm tanım server action’ları `requireTanimlarYazma()` ile korunur.

---

*Son güncelleme: uygulama kodu ile eş zamanlı.*
