# Yetkilendirme ve kullanıcı yol haritası (plan tamamlayıcı)

Bu dosya, senin tarif ettiğin sırayı **destekler** ve planda sık atlanan noktaları listeler.  
İlgili: `PLAN_LINK_VE_YETKI.md`, `PLAN_KULLANICI_AUTH_URL_DUYURU.md`, `CANONICAL_LINKS.md`.

---

## Senin sıran (özet)

1. **Aşama aşama** canonical link / `public_id` (`PLAN_LINK_VE_YETKI`).
2. Bu işler **mantıklı ölçüde** bitince: **giriş / kullanıcıların sisteme nasıl gireceği** (kimlik modeli, ilk şifre, davet, vb.).
3. Ardından: **hangi müdürlük / hangi personel / nerelere erişim** — yetkilendirme **ekranı** + kurallar.

Bu sıra **uygulanabilir**; özellikle zaten Supabase Auth + tek rol ile çalışan bir ürün için doğal.

---

## Plana eklemen iyi olur (eksik kalabilecek noktalar)

### 1) İlk yönetici (tavuk–yumurta)

Yetkilendirme ekranını **kim** ilk kez kullanacak?  
- İlk kurulumda **manuel** Supabase Dashboard’dan bir admin oluşturma, veya  
- `.env` / seed ile **tek süper-admin**, veya  
- “İlk kayıt olan kullanıcı admin olsun” (küçük kurumlarda riskli).

Bunu bir cümleyle **karar** olarak yazın; yoksa geliştirme ortasında takılırsınız.

### 2) Kimlik ↔ personel eşlemesi

“Hangi personel nerelere erişir” derken:

- Uygulama kullanıcısı **her zaman** `calisan` / `sicil_no` ile mi eşlenecek?  
- Sadece büro personeli mi girecek, **firma çalışanı** veya dış kullanıcı var mı?  
- Bir kullanıcı **birden fazla rol** veya **birden fazla müdürlük** ile mi bağlı olabilir?

Bunlar **yetkilendirme ekranının alanlarını** doğrudan belirler (ör. `user_id` + `sicil_no` nullable + `mudurluk_id[]`).

### 3) RLS ile yetkilendirme ekranı aynı hikâye

- **Ekran** “kim neye erişsin” kaydını yazar.  
- **RLS** aynı kuralları okurken uygular; aksi halde biri API’den veya eski URL’den yine veri çekebilir.

Yani yetki ekranı gelmeden **en azından** kritik tablolar için RLS taslağı (veya “şimdilik sadece authenticated”) düşünülmesi iyi olur. Tam detay sonra da genişletilebilir.

### 4) Müdürlük kaynağı

Kural “X müdürlüğü” diyecekse, bu bilgi uygulamada **nereden** geliyor? (`tanim_mudurluk`, personel kadro özeti, elle atama…)  
Kaynak net değilse yetki kuralları çift yorumlanır.

### 5) Denetim (audit)

Kamu / iç denetim için sık istenir: **Kim, hangi yetkiyi, ne zaman değiştirdi?**  
İstersen sonra eklenir; ama tablo tasarımına **bir alan / log tablosu** için yer açmak erken düşünülürse ucuz olur.

### 6) Özel durumlar

- **İzinli süper kullanıcı** (acil müdahale) — kapatma politikası.  
- **İşten ayrılan** personel: hesap kapatma veya otomatik devre dışı.

### 7) URL / UUID işi ile yetki işinin ilişkisi

- UUID’li linkler **gizlilik / tahmin zorluğu** sağlar.  
- **Yetki** ayrı katmandır; ikisini aynı sprintte bitirmek şart değil, ama dokümanda ikisinin de olduğunu yazmak faydalı.

---

## Önerilen faz sırası (özet)

| Faz | İçerik |
|-----|--------|
| A | Canonical `public_id` + `app_links` (modül modül, `PLAN_LINK_VE_YETKI`) |
| B | Kimlik modeli + giriş akışı netleştirme (`PLAN_KULLANICI_AUTH…`) |
| C | `profiles` / `user_permissions` benzeri şema + bootstrap admin |
| D | Yetkilendirme UI + RLS politikaları ile hizalama |
| E | Audit, ayrılan personel, özel admin |

---

## Sonuç

Planda **büyük bir mantık hatası yok**; sadece **ilk admin**, **kullanıcı–personel eşlemesi** ve **RLS ile ekranın birlikte düşünülmesi** üçlüsünü yazılı hale getirmen, ileride sürpribi azaltır.

---

## Bekleyen UX (kullanıcı rolü)

| Konu | Not |
|------|-----|
| **Şifre değiştirme** | Normal kullanıcılar için giriş sonrası şifre güncelleme ekranı yok; `/hesap/...` veya benzeri + `supabase.auth.updateUser({ password })` + mevcut `sifre-politikasi` ile eklenecek. |
| **Ana sayfa widget’ları** | Hoş geldiniz kartına ek olarak, `menu_izinleri` ile açık modüller için kısayol kartları (ör. Personel kartım, Yevmiye/Arazi puantaj) — `KullaniciAnaSayfa` + ortak stil. |
