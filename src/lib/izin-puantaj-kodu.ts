export { PUANTAJ_KOD_ACIKLAMA } from '@/lib/puantaj-kod-aciklama'

/** tanim_izin_tur satırlarından tur_adi → puantaj kodu (kod boşsa sezgisel eşleme) */
export function buildTurAdiToKodMap(
  rows: { tur_adi: string | null; kod: string | null }[],
): Record<string, string> {
  const turAdiToKod: Record<string, string> = {}
  for (const t of rows) {
    const ad = String(t.tur_adi ?? '').trim()
    const kod = String(t.kod ?? '').trim()
    if (!ad) continue
    turAdiToKod[ad] = kod || turAdindanPuantajKodu(ad, {})
  }
  return turAdiToKod
}

/**
 * İzin hareketindeki `tur` (tanim_izin_tur.tur_adi ile eşleşen) → yevmiye/arazi hücre kodu.
 * Önce tablo eşlemesi; yoksa tür adına göre sezgisel kod (Refakatçi → RR, vb.).
 */
export function turAdindanPuantajKodu(tur: string, turAdiToKod: Record<string, string>): string {
  const t = tur.trim()
  if (!t) return 'S'
  const fromTablo = turAdiToKod[t]
  if (fromTablo) return fromTablo

  const x = t.toLocaleLowerCase('tr-TR')

  if (x.includes('refakat')) return 'RR'
  if (x.includes('heyet')) return 'HR'
  if (x.includes('rapor')) return 'R'
  if (x.includes('yıllık')) return 'S'
  if (x.includes('ölüm')) return 'Öİ'
  if (x.includes('evlilik')) return 'Eİ'
  if (x.includes('babalık')) return 'Bİ'
  if (x.includes('mehil')) return 'MEİ'
  if (x.includes('mazeret')) return 'Mİ'
  if (x.includes('idari')) return 'İİ'
  if (x.includes('doğum öncesi') || x.includes('dogum oncesi')) return 'DÖÇ'
  if (x.includes('doğum sonrası') || x.includes('dogum sonrasi')) return 'DSÇ'
  if (x.includes('ücretsiz')) return 'Ü'
  if (x.includes('ücretli')) return 'Üİ'

  return 'S'
}
