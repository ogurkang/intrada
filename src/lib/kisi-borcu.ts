import {
  faizTuruEtiket,
  odemePlaniOlustur,
  type FaizTuru,
  type OdemePlani,
  type PlanSatir,
  type TcmbFaizSatir,
} from '@/lib/kanuni-faiz'

export type KisiBorcuBelge = {
  sicil_no: string
  ad_soyad: string
  tckn: string
  unvan: string
  statu: string
  ana_tutar: number
  odeme_gunu: number
  odeme_baslangic: string
  faiz_baslangic: string
  faiz_turu: FaizTuru
  kaynak: 'tcmb' | 'yedek'
  satirlar: PlanSatir[]
  toplam_faiz: number
  toplam_anapara: number
  toplam_odeme: number
  taksit_sayisi: number
  dayanak: string
}

export const KISI_BORCU_SONRAKI_YIL =
  'Ödemelerin bir sonraki yıl da devam etmesi durumunda 3095 sayılı Kanun hükümleri gereğince TCMB’nin ilgili yıl için ilan edeceği reeskonta göre Kanuni/Temerrüt Faizi ilgili yıl için yeniden hesaplanacaktır.'

export function kisiBorcuDayanak(tur: FaizTuru): string {
  const ortak =
    'Basit faiz, yıl 365 gün. Oran değişen günlerde dönem bölünür. 1 Mayıs 2005–31 Aralık 2005 %12, 1 Ocak 2006–31 Mayıs 2024 %9, 1 Haziran 2024–30 Temmuz 2026 %24. 31 Temmuz 2026’dan sonra 3095 sayılı Kanun m.1: TCMB’nin önceki yıl 31 Aralık reeskontunun %80’i. 30 Haziran reeskontu bu orandan 5 puan veya daha çok farklıysa yılın ikinci yarısında 30 Haziran reeskontunun %80’i uygulanır. Ana tutar taksit sayısına bölünür. İlk taksit ödeme başlama tarihindedir ve faizsizdir. Sonraki taksitler ödeme gününe gelir. Faiz, faiz işlemeye başlama tarihinden itibaren kalan anapara üzerinden işler.'
  if (tur === 'temerrut') {
    return `Temerrüt faizi, 3095 sayılı Kanun m.2 uyarınca sözleşmede ayrı oran kararlaştırılmamışsa m.1 oranıdır. ${ortak}`
  }
  return `Kanuni faiz, 3095 sayılı Kanun m.1. ${ortak}`
}

export function kisiBorcuHesapla(girdi: {
  anaTutar: number
  taksitSayisi: number
  odemeGunu: number
  odemeBaslangic: string
  faizBaslangic: string
  faizTuru: FaizTuru
  kaynak: 'tcmb' | 'yedek'
  tcmb: TcmbFaizSatir[]
  kisi: { sicil_no: string; ad_soyad: string; tckn: string; unvan: string; statu: string }
}): { belge: KisiBorcuBelge; plan: OdemePlani } | { hata: string } {
  if (girdi.faizTuru !== 'kanuni' && girdi.faizTuru !== 'temerrut') return { hata: 'Faiz türünü seçin.' }
  const plan = odemePlaniOlustur({
    anaTutar: girdi.anaTutar,
    taksitSayisi: girdi.taksitSayisi,
    odemeGunu: girdi.odemeGunu,
    odemeBaslangic: girdi.odemeBaslangic,
    faizBaslangic: girdi.faizBaslangic,
    satirlar: girdi.tcmb,
  })
  if ('hata' in plan) return plan
  const belge: KisiBorcuBelge = {
    sicil_no: girdi.kisi.sicil_no.trim(),
    ad_soyad: girdi.kisi.ad_soyad.trim(),
    tckn: girdi.kisi.tckn.trim(),
    unvan: girdi.kisi.unvan.trim(),
    statu: girdi.kisi.statu.trim(),
    ana_tutar: Math.round(girdi.anaTutar * 100) / 100,
    odeme_gunu: girdi.odemeGunu,
    odeme_baslangic: girdi.odemeBaslangic,
    faiz_baslangic: girdi.faizBaslangic,
    faiz_turu: girdi.faizTuru,
    kaynak: girdi.kaynak,
    satirlar: plan.satirlar,
    toplam_faiz: plan.toplamFaiz,
    toplam_anapara: plan.toplamAnapara,
    toplam_odeme: plan.toplamOdeme,
    taksit_sayisi: plan.taksitSayisi,
    dayanak: kisiBorcuDayanak(girdi.faizTuru),
  }
  if (!belge.sicil_no || !belge.ad_soyad) return { hata: 'Personel seçin.' }
  return { belge, plan }
}

export function kisiBorcuBelgeCoz(ham: unknown): KisiBorcuBelge | null {
  if (!ham || typeof ham !== 'object') return null
  const b = ham as Partial<KisiBorcuBelge>
  if (b.faiz_turu !== 'kanuni' && b.faiz_turu !== 'temerrut') return null
  if (!b.sicil_no || !b.ad_soyad || !Array.isArray(b.satirlar)) return null
  return b as KisiBorcuBelge
}

export function kisiBorcuAuditGovde(b: KisiBorcuBelge): Record<string, unknown> {
  return {
    personel: b.ad_soyad,
    faiz: faizTuruEtiket(b.faiz_turu),
    ana_tutar: b.ana_tutar,
    taksit: b.taksit_sayisi,
    odeme_gunu: b.odeme_gunu,
    odeme_baslangic: b.odeme_baslangic,
    baslangic: b.faiz_baslangic,
    toplam: b.toplam_odeme,
  }
}

const KISI_BORCU_AUDIT = [
  { alan: 'personel', etiket: 'Personel' },
  { alan: 'faiz', etiket: 'Faiz türü' },
  { alan: 'ana_tutar', etiket: 'Ana tutar' },
  { alan: 'taksit', etiket: 'Taksit sayısı' },
  { alan: 'odeme_gunu', etiket: 'Ödeme günü' },
  { alan: 'odeme_baslangic', etiket: 'Ödeme başlama tarihi' },
  { alan: 'baslangic', etiket: 'Faiz işlemeye başlama tarihi' },
  { alan: 'toplam', etiket: 'Toplam ödeme' },
]

export function kisiBorcuAuditDiffSatirlari(onceki: unknown, sonraki: unknown) {
  const o = (onceki ?? {}) as Record<string, unknown>
  const s = (sonraki ?? {}) as Record<string, unknown>
  const rows: { alan: string; etiket: string; onceki: unknown; sonraki: unknown }[] = []
  for (const { alan, etiket } of KISI_BORCU_AUDIT) {
    const ov = o[alan]
    const sv = s[alan]
    if (onceki == null) {
      if (sv != null && String(sv) !== '') rows.push({ alan, etiket, onceki: null, sonraki: sv })
      continue
    }
    if (String(ov ?? '') !== String(sv ?? '')) rows.push({ alan, etiket, onceki: ov ?? null, sonraki: sv ?? null })
  }
  return rows
}

export function kisiBorcuAuditDegerGoster(_alan: string, deger: unknown): string {
  if (deger == null || deger === '') return '—'
  return String(deger)
}
