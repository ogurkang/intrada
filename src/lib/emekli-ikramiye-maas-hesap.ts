/**
 * 4/C emekli ikramiye + 5434 usulü maaş (tahmini).
 * Dayanak: 5434 md. 89 / ek md. 70 / ek md. 82; 657 md. 43; HMB katsayı genelgeleri.
 * 5510 emekli aylığı bu motorla hesaplanmaz (PEK gerekir); ikramiye 5434 emsalidir.
 */
import { EN_YUKSEK_DEVLET_MEMURU_GOSTERGE } from '@/lib/ayliktan-kesme-katsayi'
import { excelRound2, gostergeBul } from '@/lib/ayliktan-kesme-hesap'

export type EmekliKanun = '5434' | '5510'

export type EmekliKatsayiDonem = {
  id: string
  etiket: string
  baslangic: string
  aylik: number
  taban: number
}

/** SGK formundaki «Aylık Tarihi» seçenekleri (yeni → eski). */
export const EMEKLI_KATSAYI_DONEMLERI: readonly EmekliKatsayiDonem[] = [
  {
    id: '2026-07-01',
    etiket: '01.07.2026',
    baslangic: '2026-07-01',
    aylik: 1.575512,
    taban: 25.794915,
  },
  {
    id: '2026-01-01',
    etiket: '01.01.2026',
    baslangic: '2026-01-01',
    aylik: 1.387871,
    taban: 22.722793,
  },
  {
    id: '2025-07-01',
    etiket: '01.07.2025',
    baslangic: '2025-07-01',
    aylik: 1.170211,
    taban: 18.316014,
  },
  {
    id: '2025-01-01',
    etiket: '01.01.2025',
    baslangic: '2025-01-01',
    aylik: 1.012556,
    taban: 15.848415,
  },
] as const

export const EMEKLI_IKRAMIYE_UYARI =
  'Yapılan maaş ve ikramiye hesaplamaları yalnızca girilen bilgiler baz alınarak yapılmaktadır. Bilgi amaçlıdır; resmiyet arzetmez. 5510 sayılı Kanuna tabi personelde emekli aylığı PEK usulüyle hesaplanır; bu araç 5434 usulü maaş gösterir ve ikramiyeyi 5434 emsaliyle hesaplar.'

/** 5434 ek md. 70/b — ek gösterge dilimine göre yansıtma oranı (%). */
export function emekliTazminatOrani(ekGosterge: number): number {
  const eg = Math.max(0, Math.trunc(ekGosterge))
  if (eg >= 8400) return 255
  if (eg >= 7800) return 215
  if (eg >= 7000) return 195
  if (eg >= 5400) return 165
  if (eg >= 3600) return 145
  if (eg >= 2800) return 85
  return 55
}

/** 5434 bağlama oranı: 25 yıl %75; üzeri her yıl +1; ay kesri 1/12. Günler aya tamamlanır (≥15 → +1 ay). */
export function emekliBaglamaOrani(hizmetYil: number, hizmetAy: number, hizmetGun = 0): number {
  let yil = Math.max(0, Math.trunc(hizmetYil))
  let ay = Math.max(0, Math.trunc(hizmetAy))
  let gun = Math.max(0, Math.trunc(hizmetGun))
  if (gun >= 15) ay += 1
  if (ay >= 12) {
    yil += Math.floor(ay / 12)
    ay = ay % 12
  }
  const toplamYil = yil + ay / 12
  if (toplamYil <= 0) return 0
  if (toplamYil <= 25) return 75 * (toplamYil / 25)
  return 75 + (toplamYil - 25)
}

export type EmekliIkramiyeGirdi = {
  kanun: EmekliKanun
  derece: number
  kademe: number
  ekGosterge: number
  /** Kad. taz. ek gösterge; 0 ise dilimde ekGosterge kullanılır. */
  kadTazEkGosterge: number
  kidemYili: number
  hizmetYil: number
  hizmetAy: number
  hizmetGun: number
  /** İkramiyeye esas tam yıl; 0 ise hizmetYil. */
  ikramiyeYili: number
  makamTemsilGorevGosterge: number
  donemId: string
  /** Opsiyonel; maaş çarpanı (varsayılan 1/1). */
  pay: number
  payda: number
}

export type EmekliMatrahKalem = {
  ad: string
  gosterge: number
  tutar: number
  aciklama: string
}

export type EmekliIkramiyeSonuc = {
  kanun: EmekliKanun
  donem: EmekliKatsayiDonem
  gosterge: number
  tazminatOrani: number
  baglamaOrani: number
  matrahKalemler: EmekliMatrahKalem[]
  matrah: number
  ikramiyeYili: number
  ikramiye: number
  maas5434: number | null
  maasUyari: string | null
  uyari: string
}

export function emekliKatsayiDonemBul(id: string): EmekliKatsayiDonem | null {
  return EMEKLI_KATSAYI_DONEMLERI.find(d => d.id === id) ?? null
}

export function emekliIkramiyeMaasHesapla(girdi: EmekliIkramiyeGirdi): EmekliIkramiyeSonuc | { hata: string } {
  const donem = emekliKatsayiDonemBul(girdi.donemId)
  if (!donem) return { hata: 'Aylık katsayı dönemini seçin.' }
  const gosterge = gostergeBul(girdi.derece, girdi.kademe)
  if (gosterge == null) return { hata: 'Derece/kademe 657 gösterge tablosunda yok.' }
  if (!(girdi.ekGosterge >= 0)) return { hata: 'Ek gösterge 0 veya pozitif olmalıdır.' }
  if (!(girdi.kidemYili >= 0)) return { hata: 'Kıdem yılı geçersiz.' }
  if (!(girdi.hizmetYil >= 0)) return { hata: 'Hizmet yılı geçersiz.' }
  if (girdi.hizmetAy < 0 || girdi.hizmetAy > 11) return { hata: 'Hizmet ayı 0–11 arasında olmalıdır.' }
  if (!(girdi.makamTemsilGorevGosterge >= 0)) return { hata: 'Makam/temsil/görev göstergesi geçersiz.' }

  const dilimEg =
    girdi.kadTazEkGosterge > 0 ? Math.trunc(girdi.kadTazEkGosterge) : Math.trunc(girdi.ekGosterge)
  const tazOran = emekliTazminatOrani(dilimEg)
  const kidemGosterge = Math.min(25, Math.trunc(girdi.kidemYili)) * 20
  const aylikK = donem.aylik
  const tabanK = donem.taban

  const kalemler: EmekliMatrahKalem[] = [
    {
      ad: 'Gösterge aylığı',
      gosterge,
      tutar: excelRound2(gosterge * aylikK),
      aciklama: `${girdi.derece}/${girdi.kademe} → ${gosterge} × ${aylikK}`,
    },
    {
      ad: 'Ek gösterge aylığı',
      gosterge: Math.trunc(girdi.ekGosterge),
      tutar: excelRound2(Math.trunc(girdi.ekGosterge) * aylikK),
      aciklama: `${Math.trunc(girdi.ekGosterge)} × ${aylikK}`,
    },
    {
      ad: 'Taban aylık',
      gosterge: 1000,
      tutar: excelRound2(1000 * tabanK),
      aciklama: `1000 × ${tabanK}`,
    },
    {
      ad: 'Kıdem aylığı',
      gosterge: kidemGosterge,
      tutar: excelRound2(kidemGosterge * aylikK),
      aciklama: `min(${Math.trunc(girdi.kidemYili)},25)×20=${kidemGosterge} × ${aylikK}`,
    },
    {
      ad: 'Tazminat (5434 ek md. 70/b)',
      gosterge: EN_YUKSEK_DEVLET_MEMURU_GOSTERGE,
      tutar: excelRound2(EN_YUKSEK_DEVLET_MEMURU_GOSTERGE * aylikK * (tazOran / 100)),
      aciklama: `${EN_YUKSEK_DEVLET_MEMURU_GOSTERGE} × ${aylikK} × %${tazOran} (ek gösterge ${dilimEg})`,
    },
  ]
  if (girdi.makamTemsilGorevGosterge > 0) {
    const mg = Math.trunc(girdi.makamTemsilGorevGosterge)
    kalemler.push({
      ad: 'Makam + temsil + görev',
      gosterge: mg,
      tutar: excelRound2(mg * aylikK),
      aciklama: `${mg} × ${aylikK}`,
    })
  }

  const matrah = excelRound2(kalemler.reduce((s, k) => s + k.tutar, 0))
  const ikrYil =
    girdi.ikramiyeYili > 0 ? Math.trunc(girdi.ikramiyeYili) : Math.trunc(girdi.hizmetYil)
  const ikramiye = excelRound2(matrah * ikrYil)
  const baglama = emekliBaglamaOrani(girdi.hizmetYil, girdi.hizmetAy, girdi.hizmetGun)
  const pay = girdi.pay > 0 ? girdi.pay : 1
  const payda = girdi.payda > 0 ? girdi.payda : 1
  const payCarpan = pay / payda

  let maas5434: number | null = excelRound2(matrah * (baglama / 100) * payCarpan)
  let maasUyari: string | null = null
  if (girdi.kanun === '5510') {
    maasUyari =
      '5510 sayılı Kanuna tabi personelde emekli aylığı PEK ortalaması ile hesaplanır; aşağıdaki 5434 usulü maaş yalnızca kıyas / bilgi amaçlıdır. İkramiye 5434 ek md. 82 emsaliyle hesaplanmıştır.'
  }

  return {
    kanun: girdi.kanun,
    donem,
    gosterge,
    tazminatOrani: tazOran,
    baglamaOrani: excelRound2(baglama * 100) / 100,
    matrahKalemler: kalemler,
    matrah,
    ikramiyeYili: ikrYil,
    ikramiye,
    maas5434,
    maasUyari,
    uyari: EMEKLI_IKRAMIYE_UYARI,
  }
}

export type EmekliIkramiyeBelge = {
  sicil_no: string
  ad_soyad: string
  tckn: string
  unvan: string
  kanun: EmekliKanun
  derece: number
  kademe: number
  ekGosterge: number
  kadTazEkGosterge: number
  kidemYili: number
  hizmetYil: number
  hizmetAy: number
  hizmetGun: number
  ikramiyeYili: number
  makamTemsilGorevGosterge: number
  donemId: string
  pay: number
  payda: number
  gosterge: number
  tazminatOrani: number
  baglamaOrani: number
  matrah: number
  ikramiye: number
  maas5434: number | null
  maasUyari: string | null
  matrahKalemler: EmekliMatrahKalem[]
  uyari: string
  donemEtiket: string
}

export function emekliIkramiyeBelgeCoz(raw: unknown): EmekliIkramiyeBelge | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as EmekliIkramiyeBelge
  if (b.kanun !== '5434' && b.kanun !== '5510') return null
  if (typeof b.ikramiye !== 'number' || !b.sicil_no) return null
  return b
}

const AUDIT = [
  { alan: 'ad_soyad', etiket: 'Ad Soyad' },
  { alan: 'kanun', etiket: 'Kanun' },
  { alan: 'derece', etiket: 'Derece' },
  { alan: 'kademe', etiket: 'Kademe' },
  { alan: 'ekGosterge', etiket: 'Ek gösterge' },
  { alan: 'ikramiyeYili', etiket: 'İkramiye yılı' },
  { alan: 'matrah', etiket: 'Matrah' },
  { alan: 'ikramiye', etiket: 'İkramiye' },
  { alan: 'maas5434', etiket: '5434 maaş' },
]

export function emekliIkramiyeAuditGovde(belge: EmekliIkramiyeBelge) {
  return {
    ad_soyad: belge.ad_soyad,
    kanun: belge.kanun,
    derece: belge.derece,
    kademe: belge.kademe,
    ekGosterge: belge.ekGosterge,
    ikramiyeYili: belge.ikramiyeYili,
    matrah: belge.matrah,
    ikramiye: belge.ikramiye,
    maas5434: belge.maas5434,
  }
}

export function emekliIkramiyeAuditDiffSatirlari(onceki: unknown, sonraki: unknown) {
  const o = (onceki ?? {}) as Record<string, unknown>
  const s = (sonraki ?? {}) as Record<string, unknown>
  const rows: { alan: string; etiket: string; onceki: unknown; sonraki: unknown }[] = []
  for (const { alan, etiket } of AUDIT) {
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

export function emekliIkramiyeAuditDegerGoster(_alan: string, deger: unknown): string {
  const v = deger == null ? '' : String(deger).trim()
  return v || '—'
}
