/**
 * AYY: önceki dönem kapatma eşiği ile izin kayıt tarihi karşılaştırması.
 * `kapatildi_at` varsa tam zaman (timestamptz) dikkate alınır; yoksa takvim günü (bitiş) ile string karşılaştırma.
 */

export interface AyyOncekiDonemEsik {
  baslangic_tarihi: string
  bitis_tarihi:     string
  kapatildi_at?:   string | null
}

/** Kayıt anının ms değeri. Yalnız tarih (YYYY-MM-DD): o günün UTC 00:00. Tam ISO: Date.parse. */
export function parseKayitZamanMs(kayit: string): number {
  const t = kayit.trim()
  if (t.length <= 10 && /^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const [y, m, d] = t.split('-').map(Number)
    return Date.UTC(y, m - 1, d, 0, 0, 0, 0)
  }
  return new Date(t).getTime()
}

/** Önceki dönem kapatıldıktan / bitiş gününden sonra kaydedilmiş mi? (havuz A ve arada kalan için) */
export function kayitKapatEsigiSonrasiMi(
  kayit: string | null | undefined,
  onceki: AyyOncekiDonemEsik,
): boolean {
  if (!kayit) return false
  if (onceki.kapatildi_at) {
    const km = parseKayitZamanMs(kayit)
    const em = new Date(onceki.kapatildi_at).getTime()
    return km > em
  }
  const kd = kayit.trim().slice(0, 10)
  return kd > onceki.bitis_tarihi.slice(0, 10)
}
