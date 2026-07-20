/** Yeşil pasaport başvuru dilekçesi — ortak metin yardımcıları (önizleme + Word çıktısı). */

export const PASAPORT_MAKAM = 'ADAPAZARI BELEDİYE BAŞKANLIĞINA'
export const PASAPORT_BIRIM = '(İnsan Kaynakları ve Eğitim Müdürlüğü)'
export const PASAPORT_KONU_METNI =
  'Yeşil pasaport ile ilgili başvuru formu işlemlerimin yürütülmesini arz ederim.'

/** Dilekçe alt bilgisinde telefon etiketi (TC satırıyla aynı hizada). */
export const PASAPORT_TELEFON_ETIKET = 'Telefon'

/** Yeşil pasaport başvurusuna uygun kadro dereceleri (1, 2, 3). */
export const PASAPORT_UYGUN_DERECELER = [1, 2, 3] as const

export const PASAPORT_DERECE_UYARI = 'Yeşil pasaport için kadro derecesi yetersiz.'

export type PasaportPersonelDurum = 'calisan' | 'ayrilan'
export type PasaportAyrilisNedeni = 'emekli' | 'istifa'

export const PASAPORT_PERSONEL_DURUM_ETIKET: Record<PasaportPersonelDurum, string> = {
  calisan: 'Çalışan',
  ayrilan: 'Ayrılan',
}

export const PASAPORT_AYRILIS_NEDENI_ETIKET: Record<PasaportAyrilisNedeni, string> = {
  emekli: 'Emekli',
  istifa: 'İstifa',
}

/** Kadro derecesi yeşil pasaport için uygun mu? (yalnızca 1, 2 veya 3). */
export function pasaportDereceUygunMu(derece: string | null | undefined): boolean {
  const n = parseInt(String(derece ?? '').trim(), 10)
  return Number.isFinite(n) && (PASAPORT_UYGUN_DERECELER as readonly number[]).includes(n)
}

/** 11 haneli yalnızca rakam TCKN. */
export function pasaportTcknGecerliMi(tckn: string | null | undefined): boolean {
  return /^\d{11}$/.test(String(tckn ?? '').trim())
}

/** Telefon: en az 10, en fazla 11 rakam (boşluk/tire hariç). */
export function pasaportTelefonGecerliMi(telefon: string | null | undefined): boolean {
  const d = String(telefon ?? '').replace(/\D/g, '')
  return d.length >= 10 && d.length <= 11
}

export function pasaportTelefonNorm(telefon: string | null | undefined): string {
  return String(telefon ?? '').replace(/\D/g, '')
}

export function pasaportPersonelDurumNorm(v: unknown): PasaportPersonelDurum {
  return String(v ?? '').trim() === 'ayrilan' ? 'ayrilan' : 'calisan'
}

export function pasaportAyrilisNedeniNorm(v: unknown): PasaportAyrilisNedeni | null {
  const t = String(v ?? '').trim()
  if (t === 'emekli' || t === 'istifa') return t
  return null
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
  telefon: string
  ad_soyad: string
  personelDurum: PasaportPersonelDurum
  ayrilisNedeni: PasaportAyrilisNedeni | null
}

/** Personel + tarih bilgisinden dilekçe alanlarını hazırlar. */
export function pasaportBelgeAlanlari(
  p: {
    sicil_no: string | null
    ad_soyad: string
    tckn: string | null
    telefon?: string | null
    mudurluk: string | null
    derece: string | null
    unvan: string | null
    personel_durum?: string | null
    ayrilis_nedeni?: string | null
  },
  tarih: string = pasaportTarihFormat(),
): PasaportBelgeAlanlari {
  return {
    tarih,
    mudurlukBaz: mudurlukBaz(p.mudurluk),
    sicil_no: String(p.sicil_no ?? '').trim(),
    derece: String(p.derece ?? '').trim(),
    unvan: String(p.unvan ?? '').trim(),
    tckn: p.tckn ?? '',
    telefon: String(p.telefon ?? '').trim(),
    ad_soyad: p.ad_soyad,
    personelDurum: pasaportPersonelDurumNorm(p.personel_durum),
    ayrilisNedeni: pasaportAyrilisNedeniNorm(p.ayrilis_nedeni),
  }
}

/** Dilekçe ilk paragrafının son kısmı (çalışıyorum / emekli oldum / istifa ettim). */
export function pasaportGorevCumlesiSonu(
  durum: PasaportPersonelDurum,
  neden: PasaportAyrilisNedeni | null,
): string {
  if (durum === 'ayrilan' && neden === 'emekli') return 'kadrosunda iken emekli oldum.'
  if (durum === 'ayrilan' && neden === 'istifa') return 'kadrosunda iken istifa ettim.'
  return 'kadrosunda çalışmaktayım.'
}
