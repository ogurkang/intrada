/**
 * Hafta sonu (HT) hücresinde izin/bayram önceliği:
 * - Resmi tatil / bayram günü önce yazılır (B, RT).
 * - İzin varsa HT yerine izin kodu yazılır.
 * - Yıllık izin (kod S): memur/sözleşmeli için Cmt+Paz; işçi için yalnızca Cmt (Pazar HT kalır).
 * - Yıllık dışı izinler: tüm statülerde Cmt+Paz izin kodu ile gösterilir.
 */

const normStatu = (s: string | null | undefined) => String(s ?? '').trim()

/** Tanımlardaki yıllık izin puantaj kodu (yevmiye/arazi) genelde `S` */
function yillikIzinKoduMu(kod: string | undefined | null): boolean {
  return String(kod ?? '').trim() === 'S'
}

/**
 * Hafta sonu gününde izin kodunun gösterilip gösterilmeyeceği.
 * Dönüş: izin kodu veya null (HT veya başka kurala bırak).
 */
export function haftaSonuIzinHucreKodu(params: {
  statu: string | null | undefined
  izinKodu: string
  haftaGunu: number // 0=Pazar, 6=Cumartesi
}): string | null {
  const { izinKodu, haftaGunu } = params
  const st = normStatu(params.statu)
  if (!yillikIzinKoduMu(izinKodu)) {
    return izinKodu
  }
  if (st === 'İşçi' && haftaGunu === 0) {
    return null
  }
  return izinKodu
}
