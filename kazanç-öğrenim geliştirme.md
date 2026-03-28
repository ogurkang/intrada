# Kazanç Bilgileri ve Öğrenim Geliştirme Spesifikasyonu

Bu doküman, Tanımlar Yönetimi altındaki **Kazanç Bilgileri** modülü ile **Öğrenim Bilgileri** (bildirim, tanımlar, personel detay) iyileştirmelerinin gereksinimlerini özetler.

---

## A. Kazanç Bilgileri (Tanımlar Yönetimi)

1. **Menü:** Tanımlar altında **Kazanç Bilgileri** menü öğesi; liste ekranı açılır.

2. **Liste sütunları:** Sıra No, Unvan, Öğrenim, Derece, Kademe, Ek Gösterge, Ek Ödeme, ÖHT, Yan Ödeme, SDS.

3. **Kazanç Bilgisi Ekle** ile açılan form alanları:
   - **Unvan:** Açılır liste — kaynak: Tanımlar Yönetimi → Unvan (`tanim_unvan`).
   - **Öğrenim:** Açılır liste — kaynak: Tanımlar Yönetimi → Öğrenim (`tanim_ogrenim`). *(Kullanıcı metninde “Öğretim” geçmiş; iş kuralı Öğrenim tanımıdır.)*
   - **Derece, Kademe:** Tam sayı.
   - **Ek Gösterge, Ek Ödeme, ÖHT, Yan Ödeme, SDS:** Veri girişi biçimi **terfi hareketleri** ekranındaki ilgili alanlarla aynı (sayısal/metin davranışı Terfi ile uyumlu).

4. **Toplu ekleme:** Aile bildirimindeki **+ Çocuk Ekle** mantığı — satır ekle/sil, çoklu satırı tek **Kaydet** ile gönderme.

5. **Kaydet:** Form(lar) sunucuya kaydedilir; liste yenilenir.

6. **Düzenleme:** Terfi hareketlerinde olduğu gibi hem **satır bazlı** düzenleme hem **toplu düzenle** (benzer UX).

---

## B. Öğrenim Bilgileri — Genel

1. **Sıralama:** Öğrenim kayıtları hem **Öğrenim Bildirimi** (sicil bazlı liste) hem **personel detay → öğrenim** bölümünde, **öğrenim türüne** göre sabit sıra ile listelenir (yukarıdan aşağıya):
   - Okuma-Yazma Yok → Okur-Yazar → İlkokul → İlköğretim → Ortaokul → Lise → Meslek Lisesi → Önlisans → Lisans → Yüksek Lisans → Doktora  
   - Tanımda olup bu listede eşleşmeyen türler sonda (alfabetik veya ek sıra kuralı ile, uygulamada netleştirilir).

2. **Öğrenim türü listesi:** Ekle ve düzenle ekranlarında açılır liste, **Tanımlar → Öğrenim**deki tüm türleri (`tanim_ogrenim`) içerir; sabit kısa liste kullanılmaz.

3. **Aktif/Pasif yerine Varsayılan:** Öğrenim Bilgileri arayüzünde kayıtlar için **Aktif/Pasif** göstergesi kaldırılır; bunun yerine **Varsayılan** işareti (personel başına tek varsayılan öğrenim mantığı — uygulama: birini varsayılan yapınca diğerleri kalkabilir).

4. **Mesleği bilgisi:** Personel öğrenim kaydı eklerken/düzenlerken **Mesleği** alanı eklenir. **Kadro hareketleri** ekle/düzenle formlarından **Mesleği** alanı kaldırılır (veri öğrenim tarafına taşınır).

5. **Personel detay:** Öğrenim tablosunda **Okul Adı** sütunundan hemen sonra **Mesleği** sütunu gösterilir.

6. **Mezuniyet tarihi:** Bildirim/ekle-düzenle işlenen mezuniyet tarihleri, personel detay öğrenim tablosundaki **Mezuniyet tarihi** sütununda görünür (zaten kolon varsa veri akışı doğrulanır).

7. **Yeni Kayıt düğmesi:** İzin hareketlerindeki **Yeni İzin** gibi — **yeni sekmede** açılır; kayıt başarılı olunca sekme kapanır ve **liste sayfası** (parent) yenilenir.

8. **Tek satır + çoklu ekle:** Yeni kayıt akışında hem **tek satır** kayıt hem aile bildirimindeki gibi **çoklu satır (+ satır ekle)** seçeneği.

9. **Düzenle ekranı:** Öğrenim kaydı düzenleme modal/formu **genişletilir** (daha geniş modal / daha fazla alan için yer).

---

## C. Teknik notlar (uygulama için)

- Yeni tablo: `tanim_kazanc_bilgisi` (veya eşdeğeri) — `unvan_id`, `ogrenim_id` FK, sayısal alanlar, `sira_no`, zaman damgası.
- `calisan_ogrenim`: `meslegi` (text, nullable), `varsayilan` (boolean); `aktif` sütunu veritabanında kalabilir fakat öğrenim bildirimi UI’da **Varsayılan** ile değiştirilir.
- Kadro: `KadroForm` / `KadroDuzenleClient` ve `kadro/actions` içinde `meslegi` kaldırılır; mevcut DB kolonu istenirse migration ile düşürülebilir veya kullanılmayan bırakılabilir (tercih: UI kaldırma + opsiyonel migration).

---

*Oluşturulma: geliştirme talebine göre.*
