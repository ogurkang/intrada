# YAMA_1 - Terfi + Personel Hareketleri

Bu dosya, bağlam kopması halinde yapılan işleri ve sıradaki adımları tutar.

## İstenen maddeler

1. Terfi ettirilen personeli işlem tarihi + tarihçe göster
2. Terfi geri al (tekli + toplu)
3. Dönem içinde terfi ettirilenler görünmeye devam etsin
4. Geri al düğmesi yalnız terfi ettirilenlerde görünsün
5. Personel Hareketleri > Durum Bilgileri > ESKİ alanları terfiden gelsin (salt okunur)
6. Personel Hareketleri > Durum Bilgileri > YENİ alanları terfiden gelsin (düzenlenebilir) ve terfiye işlensin
7. Yürürlük tarihi en altta Kayıt No sonrasına taşınsın
8. Doğum tarihi formatı gg.aa.yyyy
9. Personel kartı katsayı bölümünde, KHA D/K'ya göre Gösterge Tanımları eşleşmesi gösterilsin (salt okunur)
10. Aramalarda Türkçe karakter duyarsız arama

## Bu turda uygulanacak çekirdek yaklaşım

- Terfi Ettir işlemi için dönem bazlı log tablosu eklenecek.
- Terfi dönem detayında "Terfi Ettirilenler (Tarihçe)" gösterilecek.
- Log üzerinden tekli/toplu geri alma eklenecek.
- Personel Hareketi Değiştir ekranında terfi tabanlı ESKİ/YENİ alanlar beslenecek.
- Personel Hareketi kaydında yeni değerler aynı anda `terfi_hareketleri` tablosuna yazılacak.
- Seçili arama kutularında Türkçe normalize arama uygulanacak.

## Notlar

- Test ortamı olmadığı için geri alma tarafında ekstra korumacı kontroller eklenecek:
  - Log bulunamaz / geri alınmışsa işlem yapma
  - `terfi_id` yoksa işlem yapma
  - İşlem sonrası revalidate zinciri
