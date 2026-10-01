/**
 * Yürürlükteki memur katsayıları.
 * Kaynak bir veri servisi değil; Hazine ve Maliye Bakanlığı her yarıyıl
 * yeni bir genelge yayımlar. Rakamlar o genelgeden alınır, ekranda değiştirilebilir.
 */
export const AYLIKTAN_KESME_KATSAYI = {
  donem: '1 Temmuz 2026 – 31 Aralık 2026',
  kaynak: 'Hazine ve Maliye Bakanlığı, 2026 Yılı Temmuz Ayına Ait Mali ve Sosyal Haklara İlişkin Genelge',
  url: 'https://www.hmb.gov.tr/duyuru/2026-yili-temmuz-ayina-ait-mali-ve-sosyal-haklara-iliskin-genelge',
  maas: '1,575512',
  tabanAylik: '25,794915',
  yanOdeme: '0,499649',
} as const

/** 657 md. 43: 1/4 derece göstergesi 1500 + en yüksek ek gösterge 8000. ÖHT ve ek ödeme tabanı. */
export const EN_YUKSEK_DEVLET_MEMURU_GOSTERGE = 9500

/** 7456 sayılı Kanun: seyyanen ilave ödeme = bu gösterge × aylık katsayı. */
export const SEYYANEN_ILAVE_GOSTERGE = 15965

/** Yerel yönetim toplu sözleşmesi: sosyal denge aylık tavanı, en yüksek devlet memuru aylığının bu yüzdesi. */
export const SDS_TAVAN_YUZDE = 120
