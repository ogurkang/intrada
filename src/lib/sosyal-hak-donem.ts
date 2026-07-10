/** Sosyal Hak dönem tarih zinciri doğrulaması */

export interface SosyalHakDonemTarih {
  id?: number
  baslangic_tarihi: string
  bitis_tarihi: string
  donem_adi?: string | null
}

/** ISO tarih (YYYY-MM-DD) → ertesi gün */
export function donemErtesiGun(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export function donemTarihFormatTr(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('tr-TR')
}

function donemlerKesisiyor(
  aBas: string,
  aBit: string,
  bBas: string,
  bBit: string,
): boolean {
  return aBas <= bBit && aBit >= bBas
}

/**
 * Dönemler kesişemez; bitişten sonraki gün başlangıç olmalı (boşluk veya aynı gün yasak).
 */
export function validateSosyalHakDonemTarihleri(
  baslangic: string,
  bitis: string,
  mevcut: SosyalHakDonemTarih[],
  haricId?: number,
): string | null {
  if (!baslangic || !bitis) return 'Başlangıç ve bitiş tarihleri zorunludur.'
  if (bitis < baslangic) return 'Bitiş tarihi başlangıçtan önce olamaz.'

  const diger = mevcut.filter(d => d.id !== haricId)

  for (const d of diger) {
    if (donemlerKesisiyor(baslangic, bitis, d.baslangic_tarihi, d.bitis_tarihi)) {
      const ad = d.donem_adi?.trim() || 'Başka bir dönem'
      return `${ad} (${donemTarihFormatTr(d.baslangic_tarihi)} – ${donemTarihFormatTr(d.bitis_tarihi)}) ile tarih aralığı çakışıyor.`
    }
  }

  const onceki = diger
    .filter(d => d.bitis_tarihi < baslangic)
    .sort((a, b) => b.bitis_tarihi.localeCompare(a.bitis_tarihi))[0]

  const sonraki = diger
    .filter(d => d.baslangic_tarihi > bitis)
    .sort((a, b) => a.baslangic_tarihi.localeCompare(b.baslangic_tarihi))[0]

  if (onceki) {
    const beklenenBas = donemErtesiGun(onceki.bitis_tarihi)
    if (baslangic !== beklenenBas) {
      const ad = onceki.donem_adi?.trim() || 'Önceki dönem'
      return `${ad} ${donemTarihFormatTr(onceki.bitis_tarihi)} tarihinde bitiyor; bu dönemin başlangıcı ${donemTarihFormatTr(beklenenBas)} olmalıdır.`
    }
  }

  if (sonraki) {
    const beklenenSonrakiBas = donemErtesiGun(bitis)
    if (sonraki.baslangic_tarihi !== beklenenSonrakiBas) {
      const ad = sonraki.donem_adi?.trim() || 'Sonraki dönem'
      return `Bu dönem ${donemTarihFormatTr(bitis)} tarihinde bitmeli; ${ad} ${donemTarihFormatTr(sonraki.baslangic_tarihi)} tarihinde başlıyor. Dönemler arasında boşluk veya çakışma olamaz.`
    }
  }

  return null
}
