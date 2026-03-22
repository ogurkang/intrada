# Plan notları — URL genişletme, kullanıcı girişi, modül önerileri

*Son güncelleme: kullanıcı talebi üzerine (sabah 1–2. maddeler için uygulama)*

---

## 1. URL yapısı (`public_id` / tahmin edilemez segment)

**Durum:** `mal_bildirimi` için `public_id` (UUID) + route çözümlemesi yapıldı; liste/detay/düzenle/Excel uyumlu.

**Hedef:** Aynı mantığın **tüm yapıda** kullanılması — adres çubuğunda sıralı sayısal `id` yerine UUID (veya eşdeğer opak anahtar).

**Yapılacaklar (sabah / sonraki sprint):**

| Alan | Örnek mevcut URL | Not |
|------|------------------|-----|
| Aile bildirimi | `/bildirim/aile/[id]` | `public_id` kolonu + sorgu + linkler |
| Öğrenim bildirimi | ilgili detay rotaları | Aynı pattern |
| İzin kayıtları | `/izin/[id]` | Aynı pattern |
| Personel hareketleri | `/personel-hareketleri/[id]/...` | Çok alt rota; tek `public_id` |
| Kadro | `/kadro/[id]` | Aynı |
| Firma çalışan | `/firma-calisanlar/[id]` | Aynı |
| Kesintiler dönemleri | `[donem_id]` sayısal dönem | İsterseniz dönem için ayrı `public_id` veya dönem kodu |
| Eğitim | `[donem_id]` | Üstteki gibi |

**Teknik özet:** Her “detay” kaydı için DB’de `public_id uuid UNIQUE DEFAULT gen_random_uuid()`, migration, `parse*RouteParam` benzeri yardımcı, sayfa sorgularında `.eq('public_id', …) | .eq('id', …)` geriye dönük uyum, `revalidatePath` segmentleri.

**Bilinçli bırakılan:** Mal bildirimi **çok satırlı Excel** satır kaydırma sorunu — şimdilik dokunulmayacak.

---

## 2. Kullanıcı ekleme ve giriş (ilk giriş + kullanıcı adı + şifre)

Aşağıdakiler **ürün gereksinimi notu**dur; uygulama sabah yapılacak.

### İlk giriş — varsayılan kimlik bilgisi

- Sistemde tanımlı **e-posta** ile giriş.
- **İlk şifre kuralı (netleştirme gerekebilir):**  
  Kullanıcı örneği: `252.1987` gibi — metinde geçen ifade: *TC kimlik numarasının ilgili kısmı + nokta + doğum yılı*.  
  **→ Sabah netleştirilecek:** TCKN’nin kaç hanesi (ilk 1 / ilk 3 / başka) + ayırıcı + doğum yılı 4 hane mi.

### İlk oturum sonrası

- Kullanıcıdan **kullanıcı adı** seçmesi istenecek (bir kez).
- Sonraki girişler: **kullanıcı adı + şifre** (e-posta ile giriş yerine bu kullanıcı adı mı — netleştirilecek).

### Şifre değiştirme

- Giriş yapmış kullanıcı için **şifre değiştirme** ekranı.

### “Şifremi unuttum / sıfırla” (login)

- TC + **telefon** + **doğum yılı** (tarih seçici ile — muhtemelen yıl veya tam tarih).
- Üçü doğruysa → **yeni şifre belirleme** ekranı.
- Yeni şifre, eski şifrenin yerine geçer.

### Teknik notlar (Supabase)

- Kimlik doğrulama genelde **Supabase Auth** (`auth.users`) ile yapılır; `calisan` / personel ile **eşleme** (sicil, tckn, e-posta) gerekir.
- Kullanıcı adı: `raw_user_meta_data` veya ayrı `profiles` / `kullanici` tablosu + **benzersiz index**.
- İlk şifre kuralı: ya ilk kullanıcı oluşturulurken script ile set edilir ya da “ilk girişte zorunlu sıfırlama” akışı.
- Şifre sıfırlama (TC+tel+doğum): **custom RPC veya Edge Function** + rate limit; doğum yılı için `calisan` kaydındaki alanlarla karşılaştırma.

---

## 3. Maaş dışında hangi modüller? (öneri sıralaması)

Mevcut menü ve sayfa yapısına göre (**Sidebar**, `src/app/(dashboard)`). “Maaş” modülü kodda ayrı bir başlık olarak görünmüyor; aşağıdakiler **iş değeri / geliştirme sırası** önerisidir.

### Yüksek öncelik (çok kullanıcıya dokunur, duyuru ile iyi gider)

1. **Duyuru yönetimi** — istenen modül; dashboard’da “Son duyurular”, hedef kitle (tüm personel / müdürlük / rol), yayın tarihi, sabitleme.
2. **Bildirimler** — Mal / Aile / Öğrenim için zaten veri var; **durum / onay akışı**, hatırlatma e-postası (opsiyonel) bir sonraki adım olabilir.
3. **İzin** — `/izin`, haklar; personel self-servis “izin talebi” + onay hattı (şu an çoğunlukla IK ekranı gibi).

### Orta öncelik

4. **Eğitim** — takvim + istatistik var; katılım onayı, sertifika yükleme, tekrarlayan eğitim uyarısı.
5. **Kesintiler (puantaj / yemek / raporlu)** — çok sayfa; seçilen dönemlerde **personelin kendi dökümünü görmesi** self-servis değeri yüksek.
6. **Personel hareketleri / terfi** — okuma + onay veya PDF özet.

### Tanımlar / yönetim (destekleyici)

7. **Tanımlar** (ünvan, müdürlük, izin türü, tatil…) — çoğu zaten var; **yetki**: kim düzenleyebilir (rol) ile sınırlama.

### Düşük öncelik veya “ileride”

8. **Firma personel** — ayrı kitle; modül içi duyuru veya sözleşme hatırlatıcısı.
9. **Raporlama / export** — Excel/PDF toplu (kesinti, izin, bildirim özetleri).

**Özet sıra (öneri):**  
**Duyuru** → (paralel veya hemen ardından) **kullanıcı/rol + giriş** → **bildirim onay/self-servis** veya **izin talebi** → eğitim/kesinti self-servis.

---

## Referans dosyalar

- URL migration örneği: `supabase/migrations/20250218120000_mal_bildirimi_public_id.sql`
- Route yardımcısı: `src/lib/mal-bildirim-route.ts` (benzeri diğer modüller için genelleştirilebilir)
