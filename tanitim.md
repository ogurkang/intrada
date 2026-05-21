# Intrada — Kurumsal Personel ve Operasyon Yönetim Platformu
## Tanıtım Dökümanı (Yönetim Sunumu / Asistan Bilgi Kaynağı)

**Belge adı:** tanitim  
**Sürüm notu:** Menü ve modül listesi uygulama kodu ile uyumlu tutulur (2026).  
**Amaç:** Belediye yönetimine modüler yapıyı özetlemek; INTRADA Asistan’ın “nasıl kullanılır” sorularına kaynak olmak.

---

### 1. Executive özet

**Intrada**, belediye personeli, izinleri, kadrosu, raporları, kesintileri, eğitimini, yerel bilgi girişlerini ve stratejik planlama süreçlerini **tek çatı altında** toplayan modern bir web uygulamasıdır. Arayüz Türkçe; rol ve müdürlük bazlı erişim ile hem merkezi yönetim hem saha müdürlükleri için güvenli çalışma alanı sunar.

**Teknik omurga:** Next.js, React, Supabase (veri + kimlik), Vercel dağıtımı. Raporlar ve puantajlar için Excel uyumlu çıktılar standarttır.

**Ana adres (örnek):** `intrada.adapazari.bel.tr` — kurum içi giriş sonrası kullanılır.

---

### 2. Giriş ve roller

| Rol | Özet |
|-----|------|
| **Yönetici / admin** | Tüm modüller (yetkilendirme tanımına göre); personel ve izin verisi sorgulama. |
| **Kullanıcı** | `app_profiles.menu_izinleri` ile açık modüller; çoğunlukla kendi personel kartı ve sınırlı işlemler. |
| **İlk kurulum** | `/hesap/ilk-kurulum` — menü izinleri seçimi. |

Sol menüde **arama kutusu** tüm başlıkları filtreler; rapor sayfalarında placeholder “Rapor ara…” olur.

---

### 3. Modül rehberi (menü ile uyumlu)

#### 3.1 Personel Yönetimi

| Menü | Yol | Ne işe yarar |
|------|-----|----------------|
| Çalışanlar | `/personel` | Aktif personel listesi, detay kartı, arama. |
| Yerleşke Güncelle (Geçici) | `/personel/yerleske-guncelle` | Kadro personeline toplu yerleşke ataması. |
| Ayrılanlar | `/personel/ayrilanlar` | Ayrılmış personel arşivi. |
| ADABEL Personeli | `/firma-calisanlar` | Sözleşmeli/firma personeli; sıralanabilir liste. |
| Personel Hareketleri | `/personel-hareketleri` | İşe giriş–çıkış ve görev değişim izi. |
| Terfi Hareketleri | Opak URL (ör. `/…`) | Terfi kayıtları; menüde gizli segment. |
| Kadro Hareketleri | `/kadro` | Dolu / boş / vekil kadro; iptal kararı alanları. |

**Konum / yerleşke:** Personel detayında görev konumu (İç/Dış), müdürlük–yerleşke ve şirket–yerleşke tanımlarından türetilir. Tanımlar: **Yerleşke Adresleri**, **Müdürlük**, **Şirket**.

---

#### 3.2 Rapor Yönetimi (`/rapor` genel bakış)

Çoğu raporda **yıl** ve **YILLIK / ay sekmeleri**; **Excel indir** vardır.

| Rapor | Yol |
|-------|-----|
| Genel Bakış | `/rapor` |
| İzin Hareketleri | `/rapor/izin-hareketleri` |
| İşçi İzinleri | `/rapor/isci-izinleri` |
| Statüye Göre Cinsiyet / Sayı / Yaş / Hizmet | `/rapor/statuye-gore-*` |
| Konuma Göre Cinsiyet | `/rapor/konuma-gore-cinsiyet` |
| Yerleşke Adresine Göre Personel Sayısı | `/rapor/yerleske-adresine-gore-personel-sayi` |
| Statüye Göre Öğrenim / Meslek | `/rapor/statuye-gore-ogrenim`, `statuye-gore-meslek` |
| Meslek Sahibi Liste | `/rapor/meslek-sahibi-liste` |
| Görev Yerine / Müdürlüğe Göre Liste | `/rapor/gorev-yerine-gore-liste`, `mudurluge-gore-personel-liste` |
| Tehlike sınıfı raporları | `/rapor/tehlike-*` |
| Kan grubu / Doğum günü | `/rapor/kan-grubuna-gore-personel-liste`, `dogum-gunune-gore-personel-liste` |
| Belediye Geneli Personel | `/rapor/belediye-geneli-personel-liste` |
| ADABEL Personel Bilgileri | `/rapor/adabel-personel-bilgileri-liste` |
| Yönetici iletişim / öğrenim | `/rapor/yonetici-*` |
| Öğrenim / adres / izin limiti listeleri | `/rapor/ogrenim-durumuna-gore-personel-liste`, `adrese-gore-personel-liste`, `izin-limitine-takilan-personel-liste` |
| Belirli günde izinli personel | `/rapor/belirli-gunde-izinli-personel` |
| Maaş öncesi izinli müdürler | `/rapor/maas-oncesi-izinli-mudurler` |
| Görev türüne göre çalışan | `/rapor/gorev-turune-gore-calisan` |
| Personele göre kullanılan izin | `/rapor/personele-gore-kullanilan-izin-listesi` |

---

#### 3.3 İzin Yönetimi

| Menü | Yol | Açıklama |
|------|-----|----------|
| İzin Hareketleri | `/izin` | Talep listesi, onay/iptal, yeni kayıt. |
| Yeni izin | `/izin/yeni` | Sıra no ile yeni izin formu (ör. `2026/001`). |
| İzin Hakları | `/izin/haklar` | Yıllık hak, devreden, kullanılan, **kalan gün** (`izin_haklari`). |
| Geçmiş İzinler | `/izin/gecmis-izinler` | Arşiv izin hareketleri. |

**İzin hakkı alanları (personel başına, yıl):** `devreden_gun`, `hak_edilen_gun`, `kullanilan_gun`, `kalan_gun`. Onaylı izinler kullanılan günü günceller.

**Tipik sorular:** “X kişinin kaç gün izni var?” → İzin Hakları ekranı veya personel kartı → İzin sekmesi; asistan yönetici için veritabanından okuyabilir.

---

#### 3.4 Bildirim Yönetimi

- `/bildirim` — Genel bakış  
- `/bildirim/ogrenim`, `/bildirim/aile`, `/bildirim/mal` — Etik beyan formları  

(Kullanıcı rolünde yalnızca aile/mal açık olabilir.)

---

#### 3.5 İletişim Yönetimi

- `/iletisim-yonetimi/sms-islemleri`  
- `/iletisim-yonetimi/e-posta-islemleri`  
- `/iletisim-yonetimi/tanimlar`  

---

#### 3.6 Kesintiler Yönetimi

| Alt modül | Yol |
|-----------|-----|
| Genel Bakış | `/kesintiler` |
| Yevmiye Puantajı | `/kesintiler/yevmiye` |
| Arazi Puantajı | `/kesintiler/arazi` |
| Aylık Yemek (AYY) | `/kesintiler/ayy` |
| Sosyal Hak Kesintileri | `/kesintiler/sosyal-hak` |
| Raporlu Memurlar | `/kesintiler/rmy` |
| İzinli Vekiller | `/kesintiler/ivy` |
| İzinli Zabıtalar | `/kesintiler/izy` |
| Toplam Raporlu Zabıtalar | `/kesintiler/toplam-raporlu` |

Dönem bazlı çalışma; Excel çıktıları.

---

#### 3.7 Eğitim Yönetimi

- `/egitim` — Eğitim takvimi  
- `/egitim/istatistik` — İstatistik  

---

#### 3.8 Yerel Bilgi Yönetimi

**İşlemler:** kimlik formu, araç, bütçe tahmin/gerçekleşme girişleri (`/yerel-bilgi/islemler/...`).  
**Raporlar:** yaş, araç, bütçe, kimlik formu (`/yerel-bilgi/raporlar/...`).  
**Tanımlar:** araç ve bütçe sözlükleri (`/yerel-bilgi/tanimlar/...`).

---

#### 3.9 Stratejik Yönetim

Her alt modülde **İşlemler / Raporlar / Tanımlar:**

- Stratejik Plan — `/stratejik-yonetim/stratejik-plan`  
- Performans Programı — `/stratejik-yonetim/performans-programi` (bütçe kodu, veri girişi)  
- Faaliyet Raporu — `/stratejik-yonetim/faaliyet-raporu`  

---

#### 3.10 Tanımlar Yönetimi (`/tanimlar/...`)

Öğrenim, kazanç bilgisi, unvan, **müdürlük** (çoklu yerleşke), **yerleşke adresleri** (İç/Dış konum), statü, hareket tanımları, izin türleri, izin tanımları, tatiller, tatil tür tanımları, yıllık izin kuralları, gösterge tanımları, **şirket** (şirket–yerleşke bağlantısı).

---

#### 3.11 Yetkilendirme Yönetimi

- `/yetkilendirme` — Profiller, menü modül izinleri (`personel`, `rapor`, `izin`, …).

---

#### 3.12 Pano (Dashboard) — `/`

Üst KPI kartları:

1. Aktif Personel → `/personel`  
2. Kadro Doluluk → `/kadro`  
3. Yıl İzin Hareketleri → `/izin`  
4. Bekleyen Talepler (Taslak izin) → `/izin`  
5. **Mihenk Taşları** → `/mihenk-taslari` (sürüm / geliştirme kayıtları, git commit listesi)

Alt bölümler: kadro doluluk çubuğu, izin dağılımı, bekleyen izin onayları, yaklaşan tatiller, yıllık izni artacaklar, görev bitiş hatırlatıcıları.

**INTRADA Asistan:** Sağ alttaki sohbet balonu — modül kullanımı ve (yetkili kullanıcı için) personel izin hakkı gibi kısa veri soruları.

---

### 4. Sık sorulan kullanım soruları (asistan için)

- **Yeni izin nasıl açılır?** Sol menü → İzin Yönetimi → İzin Hareketleri → yeni kayıt veya `/izin/yeni`.  
- **İzin hakkı nerede düzenlenir?** `/izin/haklar` veya personel detay → İzin sekmesi.  
- **Excel rapor nasıl indirilir?** İlgili rapor sayfasında yeşil **Excel İndir** (aktif sekme/yıl).  
- **ADABEL personel nerede?** `/firma-calisanlar` ve rapor `/rapor/adabel-personel-bilgileri-liste`.  
- **Yerleşke tanımı?** Tanımlar → Yerleşke Adresleri; müdürlük/şirket ekranlarından bağlanır.  
- **Bekleyen izin onayı?** Ana sayfa “Bekleyen İzin Talepleri” veya `/izin` (Taslak durum).  
- **Personel izin sorgusu (asistan):** Tam ad şart değil; örn. “Gürkan kaç gün izni var”. Birden fazla eşleşmede numaralı listeden seçim yapılır.  

---

### 5. Veri gizliliği (asistan)

- Personel izin hakkı ve kimlik bilgisi yalnızca **yetkili oturum** ile sorgulanır.  
- Kullanıcı rolü başka personelin iznini göremez; kendi sicili veya genel yardım metni.  
- Asistan hukuki karar vermez; resmi işlem için ilgili ekrana yönlendirir.

---

### 6. Kapanış

Intrada; personelden stratejik plana, izinden kesintiye kadar modüler bir platformdur. Bu döküman güncel menü yollarıyla uyumludur; yeni rapor veya modül eklendiğinde `tanitim.md` ve sol menü birlikte güncellenmelidir.

---

*Proje kökündeki `tanitim.md` — Word / Notebook LM / INTRADA Asistan bilgi kaynağı.*
