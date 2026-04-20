# Changelog

Bu dosya projedeki onemli degisiklikleri ozetler.

## 2026-04-20

### Added
- `personel_audit_log` tablosu eklendi (audit altyapisi).
- `src/lib/personel-audit.ts` ile merkezi audit log yazim yardimcilari eklendi.
- Personel detay verisi yuklemesine audit loglar dahil edildi.

### Changed
- Personel "Gecmis" sekmesi audit timeline odakli olarak yenilendi.
- Gecmis ekranina modul/islem arama, tarih araligi filtreleri ve sayfalama eklendi.
- Satir detayinda `Once`/`Sonra` JSON gorunumu ve hassas alan maskelemesi eklendi.
- Referans kayitlar icin tiklanabilir baglantilar eklendi.
- `izin`, `personel_hareketleri`, `ogrenim`, `aile`, `izin_hakki` islemlerine audit kaydi yazimi eklendi.

### Fixed
- Gecmis tabinda kayit yokken basliklarin ve filtrelerin gorunmemesi sorunu giderildi.
