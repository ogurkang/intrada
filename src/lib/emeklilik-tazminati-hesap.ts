import { excelRound2 } from '@/lib/ayliktan-kesme-hesap'

export type EmeklilikStatu = 'Memur' | 'İşçi'

/** 375 sayılı KHK m. 1 (D): kanundaki gösterge. İşçi bu sayıyla hesaplanır. */
export const EMEKLILIK_GOSTERGE_KANUN = 12105

/** Kamu görevlileri toplu sözleşmesi: memur için 12.105 yerine uygulanan gösterge. */
export const EMEKLILIK_GOSTERGE_MEMUR = 13558

/** 488 sayılı Damga Vergisi Kanunu: binde 7,59. */
export const DAMGA_VERGISI_ORANI = 0.00759

export const EMEKLILIK_MEMUR_DAYANAK =
  '375 sayılı Kanun Hükmünde Kararnamenin 1 inci maddesinin (D) bendi, tazminatı (12.105) gösterge rakamının memur aylık katsayısı ile çarpımı olarak belirler. Kamu görevlileri toplu sözleşmesi bu göstergeyi memur için (13.558) olarak uygular. Tazminattan yalnız damga vergisi kesilir. Oran 0,00759’dur.'

export const EMEKLILIK_ISCI_DAYANAK =
  '375 sayılı Kanun Hükmünde Kararnamenin 1 inci maddesinin (D) bendi, kamu kurumunda işçi olarak çalışanlardan emekliliğini isteyen veya emekliye sevk olunanlara (12.105) gösterge rakamının memur aylık katsayısı ile çarpımı tutarında tazminat öder. Toplu sözleşmedeki (13.558) gösterge işçiye uygulanmaz. Tazminattan yalnız damga vergisi kesilir. Oran 0,00759’dur.'

export function emeklilikGosterge(statu: EmeklilikStatu): number {
  return statu === 'Memur' ? EMEKLILIK_GOSTERGE_MEMUR : EMEKLILIK_GOSTERGE_KANUN
}

export function emeklilikDayanak(statu: EmeklilikStatu): string {
  return statu === 'Memur' ? EMEKLILIK_MEMUR_DAYANAK : EMEKLILIK_ISCI_DAYANAK
}

export function emeklilikTazminatiHesapla(girdi: {
  statu: EmeklilikStatu
  gosterge: number
  maasKatsayi: number
  damgaOrani: number
}): { gosterge: number; brut: number; damga: number; net: number; dayanak: string } | { hata: string } {
  if (!(girdi.gosterge > 0)) return { hata: 'Gösterge sıfırdan büyük olmalıdır.' }
  if (!(girdi.maasKatsayi > 0)) return { hata: 'Aylık katsayı sıfırdan büyük olmalıdır.' }
  if (!(girdi.damgaOrani >= 0) || girdi.damgaOrani >= 1) return { hata: 'Damga vergisi oranı 0 ile 1 arasında olmalıdır.' }
  const brut = excelRound2(girdi.gosterge * girdi.maasKatsayi)
  const damga = excelRound2(brut * girdi.damgaOrani)
  const net = excelRound2(brut - damga)
  return { gosterge: girdi.gosterge, brut, damga, net, dayanak: emeklilikDayanak(girdi.statu) }
}

export type EmeklilikBelge = {
  sicil_no: string
  ad_soyad: string
  tckn: string
  unvan: string
  statu: EmeklilikStatu
  gosterge: number
  maasKatsayi: number
  damgaOrani: number
  brut: number
  damga: number
  net: number
  dayanak: string
}

export function emeklilikBelgeCoz(raw: unknown): EmeklilikBelge | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as EmeklilikBelge
  if (b.statu !== 'Memur' && b.statu !== 'İşçi') return null
  if (typeof b.net !== 'number' || !b.sicil_no) return null
  return b
}

const EMEKLILIK_AUDIT = [
  { alan: 'ad_soyad', etiket: 'Ad Soyad' },
  { alan: 'statu', etiket: 'Statü' },
  { alan: 'gosterge', etiket: 'Gösterge' },
  { alan: 'maasKatsayi', etiket: 'Aylık katsayı' },
  { alan: 'damgaOrani', etiket: 'Damga vergisi oranı' },
  { alan: 'net', etiket: 'Ödenecek tutar' },
]

export function emeklilikAuditGovde(belge: EmeklilikBelge) {
  return {
    ad_soyad: belge.ad_soyad,
    statu: belge.statu,
    gosterge: belge.gosterge,
    maasKatsayi: belge.maasKatsayi,
    damgaOrani: belge.damgaOrani,
    net: belge.net,
  }
}

export function emeklilikAuditDiffSatirlari(onceki: unknown, sonraki: unknown) {
  const o = (onceki ?? {}) as Record<string, unknown>
  const s = (sonraki ?? {}) as Record<string, unknown>
  const rows: { alan: string; etiket: string; onceki: unknown; sonraki: unknown }[] = []
  for (const { alan, etiket } of EMEKLILIK_AUDIT) {
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

export function emeklilikAuditDegerGoster(_alan: string, deger: unknown): string {
  const v = deger == null ? '' : String(deger).trim()
  return v || '—'
}
