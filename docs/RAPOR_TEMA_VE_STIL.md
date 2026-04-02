# Rapor modülü — görsel tema (referans)

Yeni rapor ekranları için **ana tema**, **Statüye Göre Cinsiyet** ve **Konuma Göre Cinsiyet** raporlarında kullanılan `StatuyeGoreCinsiyetClient` düzeni ile hizalanmalıdır:

- Üst: başlık + kısa açıklama; sağda (gerekirse) yıl/dönem seçici.
- Sekmeler: yatay kaydırmalı, aktif sekme **teal** vurgulu (`border-teal-600`, `bg-teal-50/50`), inaktif `text-slate-600`.
- Ana tablo: `bg-white`, `rounded-xl`, `border border-slate-200`; başlık satırı `bg-slate-50`; önemli özet satırı `bg-slate-100`, üst çizgi `border-t-2`.
- Firma / özel satırlar: hafif **amber** veya **orange** arka plan ile ayrıştırma (ör. `Firma Personel`, tanımsız statü).
- Alt bloklar: **Gelenler / Ayrılanlar** iki sütunlu kart (`rounded-xl border`), virgülle ayrılmış isim listesi.

Tutarlılık için mevcut `StatuyeGoreCinsiyetClient` bileşenindeki sınıf ve yerleşim desenleri kopyalanabilir veya ortak bir layout bileşenine çıkarılabilir.

---

## Geliştirici notu: Next.js “module factory is not available” (boundary-components)

Bazen geliştirme modunda (özellikle **Turbopack** ile) `next/dist/.../boundary-components.js` ve `app-page` ile ilgili **“module factory is not available”** uyarısı görülebilir; genelde uygulama kodundan çok **derleyici önbelleği / HMR** kaynaklıdır.

Önerilen adımlar:

1. Geliştirme sunucusunu durdurup proje kökünde `.next` klasörünü silin, ardından `npm run dev` ile yeniden başlatın.
2. Sorun sürerse `next dev --turbo` kullanıyorsanız bir süre **webpack** ile deneyin (`next dev` varsayılanı ortamınıza göre değişebilir).
3. Üretim derlemesi (`next build`) temiz tamamlanıyorsa bu uyarı yalnızca geliştirme ortamına özgü olabilir.

Projede kök `src/app/global-error.tsx` tanımlıdır; beklenmeyen hatalarda Next.js sınır bileşenleriyle uyum için minimal bir global hata sayfası sağlar.
