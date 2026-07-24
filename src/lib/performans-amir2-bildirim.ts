/** Test aşamasında 2. amir bildirim SMS hedefi (prod'da amir2 telefonu kullanılacak). */
export const PERFORMANS_AMIR2_SMS_TEST_TELEFON = '05322804987'

export function performansAmir2BildirimMetni(adSoyad: string, yil: number): string {
  const ad = adSoyad.trim() || 'Yetkili'
  return (
    `Sayın ${ad}, ${yil} yılı personel performans değerlendirmesi 1. amir tarafından tamamlanmış olup ` +
    `tarafınızca değerlendirme yapılması beklenmektedir. Değerlendirme yapmak için intrada.adapazari.bel.tr ` +
    `adresine giriş yapabilirsiniz. Bilgilerinize.`
  )
}
