# Izin Hakki Yenileme

Bu dokuman, dashboard uzerindeki "Yillik Izni Artacaklar / Eklenecekler" widgetinin is kurallarini ozetler.

## Is Kurallari

- Bildirim, ilgili personelin cari yil izin hakki duzeltilene kadar widgette kalir.
- Izin hakki dogru degerine guncellendikten sonra ayni personel tekrar listelenmez.
- Guncelleme sadece cari yil izin hakki (`izin_haklari.yil = cari yil`) icin yapilir.
- Guncelleme yetkisi sadece admin rolu icindir.
- Kidem yili 10 olmus ancak cari yil `hak_edilen_gun` degeri hala 20 olan personel listede kalir.
- Isci statusundeki personel icin kidem yili, `kuruma_giris_tarihi` bazli tamamlanan yil olarak hesaplanir.
- Isci personelde yil donumu geldigi tarihten sonra, `tanim_izin_hak` kurallarina gore onerilen hak ile cari hak farkliysa widgette listelenir.
- Widget sorgusu sadece dashboard icinde calisir; diger sayfalari etkilemez.

## Listeleme Kriteri

Bir personel satiri listelenir, eger:

1. Memur/sozlesmeli personelde son kidem bilgisi `terfi_hareketleri`nden alinir; isci personelde kidem `kuruma_giris_tarihi`nden hesaplanir.
2. Memur/sozlesmeli personelde 9->10 gecisi (veya 10+) kontrol edilir; iscide yil donumu tarihi gelmis olmalidir.
3. `tanim_izin_hak` tanimlarina gore hesaplanan onerilen `hak_edilen_gun` degeri ile cari yil `izin_haklari.hak_edilen_gun` farkliysa listelenir.

## Aksiyon Akisi

- Widget satirindaki "Izin Hakkini Duzenle" dugmesi, ilgili personeli filtrelenmis olarak `/izin/haklar` sayfasina goturur.
- Kayit sonrasi dashboarda geri donulur.
