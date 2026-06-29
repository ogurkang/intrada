/** Yeşil pasaport başvuru dilekçesi — ortak metin yardımcıları (önizleme + Word çıktısı). */

export const PASAPORT_MAKAM = 'ADAPAZARI BELEDİYE BAŞKANLIĞINA'
export const PASAPORT_BIRIM = '(İnsan Kaynakları ve Eğitim Müdürlüğü)'
export const PASAPORT_KONU_METNI =
  'Yeşil pasaport ile ilgili başvuru formu işlemlerimin yürütülmesini arz ederim.'

/** Yeşil pasaport başvurusuna uygun kadro dereceleri (1, 2, 3). */
export const PASAPORT_UYGUN_DERECELER = [1, 2, 3] as const

export const PASAPORT_DERECE_UYARI = 'Yeşil pasaport için kadro derecesi yetersiz.'

/** Kadro derecesi yeşil pasaport için uygun mu? (yalnızca 1, 2 veya 3). */
export function pasaportDereceUygunMu(derece: string | null | undefined): boolean {
  const n = parseInt(String(derece ?? '').trim(), 10)
  return Number.isFinite(n) && (PASAPORT_UYGUN_DERECELER as readonly number[]).includes(n)
}

/** Müdürlük adından sondaki "Müdürlüğü" ekini çıkarır: "Yapı Kontrol Müdürlüğü" → "Yapı Kontrol". */
export function mudurlukBaz(mudurluk: string | null | undefined): string {
  const m = String(mudurluk ?? '').trim()
  if (!m) return ''
  return m.replace(/\s*müdürlüğü\s*$/i, '').trim() || m
}

/** İşlem tarihini gg.aa.yyyy biçiminde döndürür. */
export function pasaportTarihFormat(d: Date = new Date()): string {
  const gun = String(d.getDate()).padStart(2, '0')
  const ay = String(d.getMonth() + 1).padStart(2, '0')
  const yil = d.getFullYear()
  return `${gun}.${ay}.${yil}`
}

export interface PasaportBelgeAlanlari {
  tarih: string
  mudurlukBaz: string
  sicil_no: string
  derece: string
  unvan: string
  tckn: string
  ad_soyad: string
}

/** Personel + tarih bilgisinden dilekçe alanlarını hazırlar (altı çizili gösterilecek değerler). */
export function pasaportBelgeAlanlari(
  p: {
    sicil_no: string
    ad_soyad: string
    tckn: string | null
    mudurluk: string
    derece: string
    unvan: string
  },
  tarih: string = pasaportTarihFormat(),
): PasaportBelgeAlanlari {
  return {
    tarih,
    mudurlukBaz: mudurlukBaz(p.mudurluk),
    sicil_no: p.sicil_no,
    derece: p.derece,
    unvan: p.unvan,
    tckn: p.tckn ?? '',
    ad_soyad: p.ad_soyad,
  }
}
