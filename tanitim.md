# Intrada — Kurumsal Personel ve Operasyon Yönetim Platformu  
## Tanıtım Dökümanı (Yönetim Sunumu / Notebook LM Kaynağı)

**Belge adı:** tanitim  
**Amaç:** Belediye yönetimine; modüler yapıyı, iş değerini ve teknik omurgayı özetleyen tanıtıcı metin. Video özeti veya Word raporuna doğrudan kaynak olarak kullanılabilir.

---

### 1. Executive özet

**Intrada**, belediye personeli, izinleri, kadrosu, raporları, kesintileri, eğitimini, yerel bilgi girişlerini ve stratejik planlama süreçlerini **tek çatı altında** toplayan modern bir web uygulamasıdır. Arayüz Türkçe; rol ve müdürlük bazlı erişim ile hem merkezi yönetim hem saha müdürlükleri için güvenli çalışma alanı sunar.

Uygulama; **Next.js** (sunucu ve istemci bileşenleri), **React**, **Supabase** (veri, kimlik doğrulama, satır düzeyi güvenlik) ve **Vercel** dağıtım pratikleri üzerinde geliştirilmiştir. Raporlar ve puantajlar için **Excel uyumlu çıktılar** standartlaştırılmıştır.

---

### 2. Teknik omurga (güven ve sürdürülebilirlik)

| Alan | Açıklama |
|------|----------|
| **Mimari** | Sayfa bazlı modüller; sunucu tarafında veri çekimi ve iş kuralları; istemcide hızlı etkileşim. |
| **Veri** | İlişkisel model; migration ile sürümlenen şema; tutarlı rapor ve puantaj mantığı. |
| **Güvenlik** | Oturum ve profil tabanlı erişim; yönetici / kullanıcı modları; müdürlük kapsamı ile veri sızıntısı riskinin azaltılması. |
| **Raporlama** | Birçok raporda ortak Excel biçimi; yazdırma ve paylaşım için uygun çıktılar. |

Bu yapı, hem **mevzuata uygun kayıt tutma** hem de **üst yönetime anlık görünürlük** sağlamayı hedefler.

---

### 3. Modül modül tanıtım

Aşağıdaki bölümler menü yapısıyla uyumludur; her modül, belediye operasyonunda somut iş yükünü azaltacak şekilde konumlandırılmıştır.

#### 3.1 Personel Yönetimi

- **Çalışanlar:** Aktif personel kartlarının listelenmesi; arama ve sayfalama; detay sayfasına güvenli geçiş (sicil veya kamuya uygun link segmenti).
- **Ayrılanlar:** Geçmiş personelin ayrılmış kayıtlarının izlenebilmesi; hukuki ve arşiv ihtiyacına uygun ayrım.
- **ADABEL Personeli:** Sözleşmeli / firma personelinin ayrı yaşam döngüsü; kadro memurlarıyla karışmadan yönetim.
- **Kadro Hareketleri:** Dolu / boş / vekil durumları; görev ve kadro müdürlükleri; **iptal kararı** alanları ile hukuki netlik; Excel ve listelerle uyumlu veri modeli.
- **Personel Hareketleri:** İşe giriş–çıkış ve görev değişimlerinin izi; rapor ve izin modülleriyle tutarlılık.
- **Terfi Hareketleri:** Kariyer ve terfi süreçlerinin kayıt altına alınması; katsayı ve özlük verileriyle ilişkilendirme potansiyeli.

**Öne çıkan değer:** Personel, kadro ve hareket verilerinin tek merkezde toplanması; yöneticinin “kim nerede, ne statüde” sorusuna anında yanıt vermesi.

---

#### 3.2 Rapor Yönetimi

İstatistikten listeye geniş bir yelpaze: **statüye göre cinsiyet, sayı, yaş, hizmet, öğrenim, meslek**; **konuma göre cinsiyet**; **meslek sahibi listesi**; **görev yerine / müdürlüğe göre personel**; **tehlike sınıfı** raporları; **kan grubu**; **doğum günü**; **belediye geneli personel listesi**; **yönetici iletişim ve öğrenim listeleri**; **adrese göre personel** vb.

Bazı listelerde **kayıt sırasının özelleştirilmesi**, **Excel indirme** ve **dönem (yıl / ay)** seçimi gibi özellikler, hem İK hem üst yönetim sunumları için güçlü araçlar sunar.

**Öne çıkan değer:** Karar destek; meclis ve encümen hazırlığında tekrarlanan Excel üretiminin otomasyonu ve biçim standardı.

---

#### 3.3 İzin Yönetimi

- **İzin hareketleri:** Talep, onay ve kullanım izinin tek ekrandan izlenmesi.
- **İzin hakları:** Dönem ve personel bazlı hak takibi; haksız kullanımın önlenmesine katkı.

**Öne çıkan değer:** İzin süreçlerinin şeffaflığı ve denetlenebilirliği.

---

#### 3.4 Bildirim Yönetimi (Etik beyan süreçleri)

- **Öğrenim, aile, mal** bildirimleri: Yasal yükümlülüklerin dijital ortamda toplanması ve güncellenmesi.

**Öne çıkan değer:** Kağıt ve e-posta karmaşasının azalması; denetim ve arşiv için tek kaynak.

---

#### 3.5 Kesintiler Yönetimi

- **Yevmiye puantajı**, **arazi puantajı**, **AYY**, **raporlu memurlar**, **izinli vekiller**, **izinli zabıtalar**, **toplam raporlu zabıtalar** gibi alt modüller; dönem bazlı çalışma ve **Excel çıktıları** ile muhasebe ve insan kaynakları iş birliğini destekler.

**Öne çıkan değer:** Puantaj ve kesinti hesaplarının ekran ile Excel arasında **uyumlu** tutulması (tartışmasız veri).

---

#### 3.6 Eğitim Yönetimi

- **Eğitim takvimi** ve **istatistik**; planlama ve geri bildirim için görünürlük.

**Öne çıkan değer:** İSG ve mesleki gelişim yükümlülüklerinin izlenebilir hale gelmesi.

---

#### 3.7 Yerel Bilgi Yönetimi

**İşlemler:** Belediye kimlik formu, araç bilgileri, bütçe tahminleri ve gerçekleşmeleri girişleri.  
**Raporlar:** Yaş dağılımı, araç, bütçe ve kimlik formu raporları.  
**Tanımlar:** Araç sahiplik / durum / tür hiyerarşisi; bütçe gelir–gider kalemleri.

**Öne çıkan değer:** Yerel yönetim raporlama ve şeffaflık ihtiyacına doğrudan cevap veren modüler yapı.

---

#### 3.8 Stratejik Yönetim

- **Stratejik plan:** Dönem, amaç, hedef ve faaliyet hiyerarşisi; işlemler, raporlar ve tanımlar ayrımı.
- **Performans programı:** Yıllık dönemler; program → alt program → faaliyet yapısı; **stratejik plandan amaç bağlama**; **veri girişi** ve **bütçe kodu** yönetimi (içe aktarma ve tanımlar) ile performans takibinin operasyonel hale getirilmesi.
- **Faaliyet raporu:** Planlama döngüsünün tamamlayıcı ayağı.

**Öne çıkan değer:** Stratejik plan ile performans ve bütçe dilinin aynı platformda buluşması; üst yönetim ve müdürlükler arası ortak dil.

---

#### 3.9 Tanımlar Yönetimi

Öğrenim, kazanç bilgisi, unvan, müdürlük, statü, hareket ve izin türleri, tatiller, **tatil tür tanımları** (yasal metinle uyumlu açıklama), yıllık izin kuralları, gösterge tanımları gibi **tüm sistemin sözlüğü** burada toplanır.

**Öne çıkan değer:** Kod değiştirmeden iş kuralı güncellemesi; belediye özelinde esneklik.

---

#### 3.10 Yetkilendirme Yönetimi

Profil ve menü erişimlerinin yönetimi; “kim ne görebilir” sorusunun merkezi cevabı.

**Öne çıkan değer:** KVKK ve iç denetim açısından minimum yetki ilkesinin uygulanabilmesi.

---

#### 3.11 Pano (Dashboard) ve genel kullanılabilirlik

Özet widget’lar (ör. görev hatırlatıcıları, bekleyen izin talepleri vb.) ile yöneticinin **ilk girişte** odaklanacağı işler öne çıkar.

**Öne çıkan değer:** Operasyonel triyaj; ekran başına harcanan sürenin kısalması.

---

### 4. Kullanıcı deneyimi ve sunum notları

- Arayüz **Türkçe** ve belediye terminolojisine yakın etiketlerle kurgulanmıştır.
- **Responsive** düşünülmüş ekranlar; toplantı öncesi tabletten özet alınabilir.
- Rapor ve listelerde **Excel** çıktısı, paylaşım ve arşiv kültürüyle uyumludur.

---

### 5. Kapanış — yönetim mesajı

Intrada; personelden stratejik plana, izinden kesintiye kadar belediye **dijital dönüşüm** yolculuğunda modüler ve büyümeye açık bir platformdur. Her modül, kendi alanında **şeffaflık**, **hız** ve **denetlenebilirlik** hedefiyle öne çıkar. Bu döküman, Notebook LM veya video özeti üretiminde **bölüm başlıkları** olarak bölünerek kullanılabilir; her modül için ayrı “seslendirme metni” genişletilebilir.

---

*Bu metin proje deposundaki `tanitim.md` dosyasıdır. Word’e aktarmak için tüm içeriği kopyalayıp yapıştırmanız veya Word’de “Markdown’dan veya düz metinden biçimlendir” seçeneklerini kullanmanız yeterlidir.*
