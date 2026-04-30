# Rapor Sihirbazı - Beyin Firtinasi Notlari

## Hedef
Kullanicinin sectigi basliklardan olusan, hem ekranda hem Excel'de ayni kolon sirasiyla rapor uretebilen bir yapi.

## Onerilen Akis
1. Rapor kaynagi secimi (Personel, Izin, Kadro, Terfi vb.)
2. Kolon secimi (checkbox)
3. Kolon siralama (surukle-birak)
4. Filtre adimi (mudurluk, statu, tarih araligi vb.)
5. Onizleme (ilk 20 satir)
6. Cikti (Excel indir) ve sablon olarak kaydetme

## Teknik Yapi
- Kolon katalogu (metadata):
  - key, label, type, excelFormat, getter
- Sablon tablosu:
  - rapor_sihirbazi_sablon (id, ad, kaynak, kolonlar jsonb, filtreler jsonb, olusturan, paylasim_tipi, created_at)
- Calistirma motoru:
  - kaynak + filtre + secili kolonlara gore sorgu
  - tek mapleme ile hem tablo hem excel
- Guvenlik:
  - mevcut rol/RLS kurallari aynen uygulanir

## UX Onerileri
- Hazir paket kolon setleri (Temel Personel, Iletisim, Kadro+Unvan vb.)
- Kolonlarda hizli arama
- Zorunlu kolon secenegi (ornek: Sicil No)
- Son kullanilan raporlar
- Sablon paylasimi (Sadece ben / Kurum geneli)

## Fazlandirma
- Faz 1 (MVP): Personel kaynagi + kolon sec/sirala + Excel + sablon kaydet
- Faz 2: Filtreleme + onizleme + yeni kaynaklar
- Faz 3: Paylasimli sablonlar + gelismis yetki + zamanlanmis export
