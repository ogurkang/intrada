/** Hizmet birleştirme dilekçesi — ortak metin yardımcıları (önizleme + Word çıktısı). */

export const HIZMET_BIRLESTIRME_MAKAM = 'SOSYAL GÜVENLİK KURUMU BAŞKANLIĞI'
export const HIZMET_BIRLESTIRME_BIRIM = 'Sosyal Sigortalar İl Müdürlüğü'

export const HIZMET_BIRLESTIRME_METIN =
  "Halen 5510 sayılı Kanunun 4/(c) kapsamında iştirakçi olarak çalışmaktayım. Daha önce 4/(a)S.S.K.'na 4/(b)Bağ-Kur'a tabi geçen hizmetimin kurumunuza tabi hizmetimle birleştirilebilmesi için gereğini arz ederim."

export type HizmetBirlestirmePersonelDurum = 'calisan' | 'ayrilan'

export const HIZMET_BIRLESTIRME_PERSONEL_DURUM_ETIKET: Record<
  HizmetBirlestirmePersonelDurum,
  string
> = {
  calisan: 'Çalışan',
  ayrilan: 'Ayrılan',
}

export function hizmetBirlestirmePersonelDurumNorm(v: unknown): HizmetBirlestirmePersonelDurum {
  return String(v ?? '').trim() === 'ayrilan' ? 'ayrilan' : 'calisan'
}

/** 11 haneli yalnızca rakam TCKN. */
export function hizmetBirlestirmeTcknGecerliMi(tckn: string | null | undefined): boolean {
  return /^\d{11}$/.test(String(tckn ?? '').trim())
}

/** İşlem tarihini gg.aa.yyyy biçiminde döndürür. */
export function hizmetBirlestirmeTarihFormat(d: Date = new Date()): string {
  const gun = String(d.getDate()).padStart(2, '0')
  const ay = String(d.getMonth() + 1).padStart(2, '0')
  const yil = d.getFullYear()
  return `${gun}.${ay}.${yil}`
}

export interface HizmetBirlestirmeBelgeAlanlari {
  tarih: string
  ad_soyad: string
  tckn: string
  emeklilik_sicil_no: string
  ssk: string
  bagkur_sicil_no: string
  hizmet_illeri: string
  personelDurum: HizmetBirlestirmePersonelDurum
  sicil_no: string
}

export function hizmetBirlestirmeBelgeAlanlari(
  p: {
    sicil_no?: string | null
    ad_soyad: string
    tckn?: string | null
    emeklilik_sicil_no?: string | null
    ssk?: string | null
    bagkur_sicil_no?: string | null
    hizmet_illeri?: string | null
    personel_durum?: string | null
  },
  tarih: string = hizmetBirlestirmeTarihFormat(),
): HizmetBirlestirmeBelgeAlanlari {
  return {
    tarih,
    ad_soyad: String(p.ad_soyad ?? '').trim(),
    tckn: String(p.tckn ?? '').trim(),
    emeklilik_sicil_no: String(p.emeklilik_sicil_no ?? '').trim(),
    ssk: String(p.ssk ?? '').trim(),
    bagkur_sicil_no: String(p.bagkur_sicil_no ?? '').trim(),
    hizmet_illeri: String(p.hizmet_illeri ?? '').trim(),
    personelDurum: hizmetBirlestirmePersonelDurumNorm(p.personel_durum),
    sicil_no: String(p.sicil_no ?? '').trim(),
  }
}
