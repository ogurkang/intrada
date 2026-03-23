# Yetkilendirme — seçili müdürlük (kullanıcı rolü, kesintiler / puantaj)

## Kaynak

**Seçili müdürlük**, sisteme giren **kullanıcı** rolündeki personelin **kadro hareketlerinde** (asil **ve** vekil satırları dahil) tanımlı **görev müdürlüğü** alanından türetilir.

- Asil kayıttaki `görev_mudurlugu` (veya projedeki eşdeğer alan adı)
- Vekil kayıttaki `görev_mudurlugu`

Bu iki değerden **ayırt edilmiş müdürlük kümesi** oluşturulur; kullanıcıya sunulan müdürlük seçimi bu kümeden gelir.

## Davranış

### Birden fazla farklı müdürlük

Asilde ve vekilde **farklı** görev müdürlükleri varsa → kullanıcı **iki (veya daha fazla) müdürlük arasından seçim** yapabilir. Seçilen müdürlük bağlamına göre ilgili ekranlar (detay, puantör / birim amiri / müdür listeleri vb.) filtrelenir.

**Örnek 1 — Nigar Bal (sicil 246)**  
- Asil: görev müdürlüğü = **Kentsel Tasarım Müdürlüğü**  
- Vekil: görev müdürlüğü = **Etüt Proje Müdürlüğü**  

→ Müdürlük seçiminde **her iki müdürlük** de listelenir.  
→ Bu kişi, puantör / birim amiri / müdür seçimlerinde de **bu kurallara uygun** şekilde listelenir (asil ve vekil dahil çalışanlar mantığı ile uyumlu).

### Tek müdürlük (asil ve vekil aynı)

Asil ve vekil satırlarında görev müdürlüğü **aynı** müdürlükse → ayırt edilmiş kümede **tek eleman** kalır.

→ Müdürlük seçimi **salt okunur** gösterilir (seçim yok; değer sabit).  
→ Davranış, **Tanımlar** modülündeki “görür ama kayıt edemez” salt okunur tanımı ile aynı prensipte (yalnızca görsel/UX farkı: burada tek değer).

**Örnek 2 — Sibel Turna (sicil 119)**  
- Asil: görev müdürlüğü = **Gelirler Müdürlüğü**  
- Vekil: görev müdürlüğü = **Gelirler Müdürlüğü**  

→ Müdürlük seçimi **salt okunur** (tek müdürlük).

## Uygulama notları

- Veri kaynağı: **kadro hareketleri** (kullanıcıya bağlı asil/vekil sicil eşleşmesi ile).  
- “Seçili müdürlük” değişince, puantör / birim amiri / müdür aday listeleri **seçilen müdürlüğe göre** filtrelenir (önceki mesajdaki “asil ve vekil dahil çalışanlar” listesi ile tutarlı).  
- **Uyarı:** Bu kurallar ekranda + server action’da uygulanmalı; **RLS** ayrı katmandır.

## Uygulama (kod)

- `src/lib/kullanici-mudurluk.ts` — `getKullaniciGorevMudurlukleri`, `assertKullaniciMudurlukErisimi`, `araziSicilMudurlukteMi`
- `src/lib/app-access.ts` — `kullaniciPathAllowed`: `/kesintiler` ( `menu_izinleri.kesintiler === false` ile kapatılabilir )
- `src/components/layout/DashboardShell.tsx` — `PermissionGate` ile sarmalama
- Yevmiye: `yevmiyePuantajYukle(..., { sicilNo })`, `mudurlukSaltOkunur`, `yevmiyePuantajKaydet` + Excel API doğrulaması
- Arazi: `[donem_id]/page.tsx` filtre + `AraziPuantajClient` salt okunur müdürlük; `araziKayitToggle` / `araziKayitTopluKaydet` müdürlük parametresi

## İlgili dosyalar

- `docs/PLAN_YETKILENDIRME_ROADMAP.md`  
- `docs/PLAN_LINK_VE_YETKI.md`  
