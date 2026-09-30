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
