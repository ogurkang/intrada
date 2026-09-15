# Izin Hakki Yenileme

Bu dokuman, dashboard uzerindeki "Yillik Izni Artacaklar / Eklenecekler" widgetinin is kurallarini ozetler.

## Is Kurallari

- Bildirim, ilgili personelin cari yil 10. yil +10 hak artisi uygulanana kadar widgette kalir.
- Memur / sozlesmeli: 10. yil dolunca mevcut hakka +10 gun eklenir (ornek: 16 → 26). Tanimdaki 30 gun hedef degildir.
- +10, izin hakki audit kaydinda (onceki + 10 = sonraki) veya onceki yil hakki + 10 = cari hak ile teyit edilir.
- Cari hak zaten 10+ yil tanim tutarina ulasmissa (or. 30) tekrar +10 istenmez.
- Guncelleme sadece cari yil izin hakki (`izin_haklari.yil = cari yil`) icin yapilir.
- Guncelleme yetkisi sadece admin rolu icindir.
- Isci statusundeki personel icin kidem yili, `kuruma_giris_tarihi` bazli tamamlanan yil olarak hesaplanir.
- Isci personelde yil donumu geldigi tarihten sonra, `tanim_izin_hak` kurallarina gore onerilen hak ile cari hak farkliysa widgette listelenir.
- Widget sorgusu sadece dashboard icinde calisir; diger sayfalari etkilemez.

## Listeleme Kriteri

Bir personel satiri listelenir, eger:

1. Memur/sozlesmeli personelde son kidem bilgisi `terfi_hareketleri`nden alinir; isci personelde kidem `kuruma_giris_tarihi`nden hesaplanir.
2. Memur/sozlesmeli personelde 9->10 gecisi (veya 10+) kontrol edilir; iscide yil donumu tarihi gelmis olmalidir.
3. Memur/sozlesmeli: 10. yil +10 artisi henuz uygulanmamissa listelenir (mevcut → mevcut+10).
4. Isci: `tanim_izin_hak` onerilen hakki ile cari hak farkliysa listelenir.

## Aksiyon Akisi

- Widget satirindaki "Izin Hakkini Duzenle" dugmesi, ilgili personeli `/izin/haklar/duzenle` sayfasina goturur; form +10 onerir.
- Kayit sonrasi dashboarda geri donulur.
