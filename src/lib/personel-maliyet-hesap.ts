/** ADABEL sendika pazarlığı. Taban tutarlar tanımda durur; ekranda yalnızca artış oranı oynar. */

export type MaliyetBirim = 'ucret_30' | 'fiili_gun' | 'ay' | 'ikramiye' | 'olay'

export const MALIYET_BIRIMLERI: { id: MaliyetBirim; etiket: string }[] = [
  { id: 'ucret_30', etiket: 'Günlük ücret × 30 gün' },
  { id: 'fiili_gun', etiket: 'Günlük × fiili gün' },
  { id: 'ay', etiket: 'Aylık, kişi başı' },
  { id: 'ikramiye', etiket: 'İkramiye gün sayısı' },
  { id: 'olay', etiket: 'Olay tutarı (yıllık adet)' },
]

export interface PersonelMaliyetGrup {
  id: string
  ad: string
  adet: number
  fiili_gun: number
}

export interface PersonelMaliyetKalem {
  id: string
  ad: string
  birim: MaliyetBirim
  prime_esas: boolean
  /** null ise tüm görev grupları */
  grup_idler: string[] | null
  grup_ozel: boolean
  taban: number
  olay_adet: number
  grup_taban: Record<string, number>
}

export interface MaliyetOran {
  yil1: number
  yil2: number
}

export interface PersonelMaliyetBelge {
  sgk_isveren: number
  issizlik_isveren: number
  gruplar: PersonelMaliyetGrup[]
  kalemler: PersonelMaliyetKalem[]
  oranlar: Record<string, MaliyetOran>
}

export interface KalemMaliyet {
  id: string
  ad: string
  aylik: number
}

export interface DonemMaliyet {
  kalemler: KalemMaliyet[]
  toplam_aylik: number
  toplam_yillik: number
}

export interface MaliyetKiyas {
  mevcut: DonemMaliyet
  yil1: DonemMaliyet
  yil2: DonemMaliyet
}

function round2(n: number): number {
  return Math.round(Number((n * 100).toFixed(8))) / 100
}

function sayi(n: unknown): number {
  const x = typeof n === 'number' ? n : Number(n)
  return Number.isFinite(x) ? x : 0
}

export function oranAl(belge: PersonelMaliyetBelge, kalemId: string): MaliyetOran {
  const o = belge.oranlar[kalemId]
  return { yil1: sayi(o?.yil1), yil2: sayi(o?.yil2) }
}

function carpan(yuzde: number): number {
  return 1 + sayi(yuzde) / 100
}

function tabanTutar(kalem: PersonelMaliyetKalem, grupId: string): number {
  if (kalem.grup_ozel) return sayi(kalem.grup_taban[grupId] ?? kalem.taban)
  return sayi(kalem.taban)
}

/** Taban sıfırsa ve tutar sıfır değilse yüzde karşılığı yoktur. */
export function yuzdeFromMiktar(baz: number, miktar: number): number | null {
  if (!baz) return miktar === 0 ? 0 : null
  return ((miktar / baz) - 1) * 100
}

/** 2. yıl oranı, 1. yılın üzerine biner. */
export function etkinTutar(taban: number, oran: MaliyetOran, donem: 'mevcut' | 'yil1' | 'yil2'): number {
  if (donem === 'mevcut') return round2(taban)
  const y1 = round2(taban * carpan(oran.yil1))
  if (donem === 'yil1') return y1
  return round2(y1 * carpan(oran.yil2))
}

function grubaUygun(kalem: PersonelMaliyetKalem, grupId: string): boolean {
  if (kalem.birim === 'olay') return false
  if (kalem.grup_idler == null) return true
  return kalem.grup_idler.includes(grupId)
}

/** Olay kaleminde yıllık olay adedi; diğerlerinde kapsanan görev gruplarının personel toplamı. */
export function kalemPersonelSayisi(belge: PersonelMaliyetBelge, kalem: PersonelMaliyetKalem): number {
  if (kalem.birim === 'olay') return sayi(kalem.olay_adet)
  return belge.gruplar.reduce((t, g) => t + (grubaUygun(kalem, g.id) ? sayi(g.adet) : 0), 0)
}

function yevmiyeTaban(belge: PersonelMaliyetBelge, grupId: string, donem: 'mevcut' | 'yil1' | 'yil2'): number {
  for (const kalem of belge.kalemler) {
    if (kalem.birim !== 'ucret_30' || !grubaUygun(kalem, grupId)) continue
    return etkinTutar(tabanTutar(kalem, grupId), oranAl(belge, kalem.id), donem)
  }
  return 0
}

/** 2026 ücret tarifesi. 2027 dilimleri henüz yayımlanmadı. */
const VERGI_DILIMLERI: { tavan: number; oran: number }[] = [
  { tavan: 190_000, oran: 0.15 },
  { tavan: 400_000, oran: 0.2 },
  { tavan: 1_500_000, oran: 0.27 },
  { tavan: 5_300_000, oran: 0.35 },
  { tavan: Number.POSITIVE_INFINITY, oran: 0.4 },
]
const ASGARI_BRUT = 33030
const SGK_ISCI = 0.14
const ISSIZLIK_ISCI = 0.01
const DAMGA = 0.00759
const YEMEK_GUNLUK_ISTISNA = 300
const SGK_TAVAN_KAT = 7.5
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'] as const

export interface OrnekAy {
  ay: string
  net: number
  vergi: number
  maliyet: number
}

function kumulatifVergi(matrah: number): number {
  let alt = 0
  let vergi = 0
  let kalan = Math.max(0, matrah)
  for (const dilim of VERGI_DILIMLERI) {
    const genislik = dilim.tavan - alt
    const parca = Math.min(kalan, genislik)
    if (parca > 0) vergi += parca * dilim.oran
    kalan -= parca
    alt = dilim.tavan
    if (kalan <= 0) break
  }
  return vergi
}

function yemekKalemi(kalem: PersonelMaliyetKalem): boolean {
  return kalem.id === 'yemek' || kalem.ad.trim().toLocaleLowerCase('tr-TR') === 'yemek'
}

function kisiAylik(
  belge: PersonelMaliyetBelge,
  kalem: PersonelMaliyetKalem,
  grup: PersonelMaliyetGrup,
  donem: 'mevcut' | 'yil1' | 'yil2',
): number {
  const tutar = etkinTutar(tabanTutar(kalem, grup.id), oranAl(belge, kalem.id), donem)
  if (kalem.birim === 'ucret_30') return round2(tutar * 30)
  if (kalem.birim === 'fiili_gun') return round2(tutar * sayi(grup.fiili_gun))
  if (kalem.birim === 'ay') return round2(tutar)
  if (kalem.birim === 'ikramiye') return round2((yevmiyeTaban(belge, grup.id, donem) * tutar) / 12)
  return 0
}

/** Bir görev grubundan örnek kişinin 12 ayı. İkramiye aya bölünür; evlenme ve doğum yazılmaz. */
export function ornekKisiAyAy(
  belge: PersonelMaliyetBelge,
  grup: PersonelMaliyetGrup,
  donem: 'mevcut' | 'yil1' | 'yil2',
): OrnekAy[] {
  let brut = 0
  let yemek = 0
  for (const kalem of belge.kalemler) {
    if (!grubaUygun(kalem, grup.id)) continue
    const aylik = kisiAylik(belge, kalem, grup, donem)
    brut = round2(brut + aylik)
    if (yemekKalemi(kalem)) yemek = round2(yemek + aylik)
  }
  const istisnaTavan = round2(YEMEK_GUNLUK_ISTISNA * sayi(grup.fiili_gun))
  const yemekIstisna = Math.min(yemek, istisnaTavan)
  const sgkHam = Math.max(0, round2(brut - yemekIstisna))
  const sgkMatrah = Math.min(sgkHam, round2(ASGARI_BRUT * SGK_TAVAN_KAT))
  const isciSgk = round2(sgkMatrah * SGK_ISCI)
  const isciIssizlik = round2(sgkMatrah * ISSIZLIK_ISCI)
  const gvMatrah = Math.max(0, round2(brut - isciSgk - isciIssizlik - yemekIstisna))
  const damgaMatrah = Math.max(0, round2(brut - yemekIstisna))
  const damga = round2(damgaMatrah * DAMGA)
  const asgariMatrah = round2(ASGARI_BRUT * (1 - SGK_ISCI - ISSIZLIK_ISCI))
  const damgaIstisna = round2(ASGARI_BRUT * DAMGA)
  const isveren =
    round2(sgkMatrah * sayi(belge.sgk_isveren) / 100) +
    round2(sgkMatrah * sayi(belge.issizlik_isveren) / 100)
  const maliyet = round2(brut + isveren)

  let kumulatif = 0
  let asgariKumulatif = 0
  return AYLAR.map(ay => {
    const gv = round2(kumulatifVergi(kumulatif + gvMatrah) - kumulatifVergi(kumulatif))
    const gvIstisna = round2(kumulatifVergi(asgariKumulatif + asgariMatrah) - kumulatifVergi(asgariKumulatif))
    kumulatif = round2(kumulatif + gvMatrah)
    asgariKumulatif = round2(asgariKumulatif + asgariMatrah)
    const kesilenGv = Math.max(0, round2(gv - gvIstisna))
    const kesilenDv = Math.max(0, round2(damga - damgaIstisna))
    const vergi = round2(kesilenGv + kesilenDv)
    const net = round2(brut - isciSgk - isciIssizlik - vergi)
    return { ay, net, vergi, maliyet }
  })
}

function donemHesapla(belge: PersonelMaliyetBelge, donem: 'mevcut' | 'yil1' | 'yil2'): DonemMaliyet {
  const oran = (sayi(belge.sgk_isveren) + sayi(belge.issizlik_isveren)) / 100
  const kalemToplam = new Map<string, number>()

  for (const grup of belge.gruplar) {
    for (const kalem of belge.kalemler) {
      if (!grubaUygun(kalem, grup.id)) continue
      const kurum = round2(kisiAylik(belge, kalem, grup, donem) * sayi(grup.adet))
      const prime = kalem.prime_esas ? round2(kurum * oran) : 0
      kalemToplam.set(kalem.id, round2((kalemToplam.get(kalem.id) ?? 0) + kurum + prime))
    }
  }

  for (const kalem of belge.kalemler) {
    if (kalem.birim !== 'olay') continue
    const tutar = etkinTutar(sayi(kalem.taban), oranAl(belge, kalem.id), donem)
    const adet = sayi(kalem.olay_adet)
    const aylik = round2((tutar * adet) / 12)
    const prime = kalem.prime_esas ? round2(aylik * oran) : 0
    kalemToplam.set(kalem.id, round2(aylik + prime))
  }

  const kalemler = belge.kalemler.map(k => ({ id: k.id, ad: k.ad, aylik: kalemToplam.get(k.id) ?? 0 }))
  const toplam = round2(kalemler.reduce((t, k) => t + k.aylik, 0))
  return { kalemler, toplam_aylik: toplam, toplam_yillik: round2(toplam * 12) }
}

export function personelMaliyetKiyas(belge: PersonelMaliyetBelge): MaliyetKiyas {
  return {
    mevcut: donemHesapla(belge, 'mevcut'),
    yil1: donemHesapla(belge, 'yil1'),
    yil2: donemHesapla(belge, 'yil2'),
  }
}

export function farkPayi(fark: number, toplamFark: number): number {
  if (!toplamFark) return 0
  return (fark / toplamFark) * 100
}

function bosOran(): MaliyetOran {
  return { yil1: 0, yil2: 0 }
}

export function varsayilanPersonelMaliyetBelge(): PersonelMaliyetBelge {
  const gruplar: PersonelMaliyetGrup[] = [
    { id: 'a1', ad: 'Büro çalışanları', adet: 136, fiili_gun: 22 },
    { id: 'a2', ad: 'Düz işçi / süpürge + küreme', adet: 115, fiili_gun: 22 },
    { id: 'a3', ad: 'Çim biçme', adet: 31, fiili_gun: 22 },
    { id: 'a4', ad: 'Çöp aracı araç arkası', adet: 89, fiili_gun: 22 },
    { id: 'a5', ad: 'Usta', adet: 5, fiili_gun: 22 },
    { id: 'a6', ad: 'Barınak çalışanları', adet: 12, fiili_gun: 22 },
    { id: 'a7', ad: 'Şoför ve operatör', adet: 115, fiili_gun: 22 },
    { id: 'a8', ad: 'Makam hizmetleri', adet: 7, fiili_gun: 22 },
    { id: 'a9', ad: 'Tır şoförü', adet: 1, fiili_gun: 22 },
    { id: 'a10', ad: 'Özel güvenlik şirket yöneticisi', adet: 1, fiili_gun: 22 },
    { id: 'a11', ad: 'Amir (temizlik-destek)', adet: 11, fiili_gun: 22 },
    { id: 'a12', ad: 'Özel güvenlik personeli', adet: 21, fiili_gun: 22 },
    { id: 'a13', ad: 'Teknik personel', adet: 15, fiili_gun: 22 },
    { id: 'a14', ad: 'Veteriner ve çevre mühendisi', adet: 5, fiili_gun: 22 },
    { id: 'a15', ad: 'Ekipler amiri / baş şoför', adet: 3, fiili_gun: 22 },
  ]
  const sorumluluk: Record<string, number> = {
    a1: 66.2, a2: 26.48, a3: 52.96, a4: 66.2, a5: 66.2, a6: 66.2, a7: 231.68, a8: 119.15,
    a9: 330.98, a10: 330.98, a11: 231.68, a12: 99.29, a13: 330.98, a14: 231.68, a15: 330.98,
  }
  const kalemler: PersonelMaliyetKalem[] = [
    { id: 'yevmiye', ad: 'Yevmiye', birim: 'ucret_30', prime_esas: true, grup_idler: null, grup_ozel: false, taban: 1985.85, olay_adet: 0, grup_taban: {} },
    { id: 'yol', ad: 'Yol', birim: 'fiili_gun', prime_esas: true, grup_idler: null, grup_ozel: false, taban: 99.29, olay_adet: 0, grup_taban: {} },
    { id: 'yemek', ad: 'Yemek', birim: 'fiili_gun', prime_esas: true, grup_idler: null, grup_ozel: false, taban: 209.18, olay_adet: 0, grup_taban: {} },
    { id: 'yakacak', ad: 'Yakacak', birim: 'ay', prime_esas: true, grup_idler: null, grup_ozel: false, taban: 330.98, olay_adet: 0, grup_taban: {} },
    { id: 'sorumluluk', ad: 'Sorumluluk', birim: 'fiili_gun', prime_esas: true, grup_idler: null, grup_ozel: true, taban: 0, olay_adet: 0, grup_taban: sorumluluk },
    { id: 'koku', ad: 'Koku primi', birim: 'fiili_gun', prime_esas: true, grup_idler: [], grup_ozel: false, taban: 72.81, olay_adet: 0, grup_taban: {} },
    { id: 'ikramiye', ad: 'İkramiye', birim: 'ikramiye', prime_esas: true, grup_idler: null, grup_ozel: false, taban: 60, olay_adet: 0, grup_taban: {} },
    { id: 'evlenme', ad: 'Evlenme yardımı', birim: 'olay', prime_esas: false, grup_idler: null, grup_ozel: false, taban: 13239, olay_adet: 0, grup_taban: {} },
    { id: 'dogum', ad: 'Doğum yardımı', birim: 'olay', prime_esas: false, grup_idler: null, grup_ozel: false, taban: 0, olay_adet: 0, grup_taban: {} },
  ]
  return {
    sgk_isveren: 20.75,
    issizlik_isveren: 2,
    gruplar,
    kalemler,
    oranlar: Object.fromEntries(kalemler.map(k => [k.id, bosOran()])),
  }
}

function kalemNormalize(raw: unknown): PersonelMaliyetKalem | null {
  if (!raw || typeof raw !== 'object') return null
  const k = raw as PersonelMaliyetKalem & {
    tutarlar?: Record<string, number>
    grup_tutarlari?: Record<string, Record<string, number>>
    olay_adet?: number | Record<string, number>
  }
  if (!k.id || !k.ad) return null
  const eskiTutar = k.tutarlar?.mevcut
  const grup_taban: Record<string, number> = { ...(k.grup_taban ?? {}) }
  if (k.grup_tutarlari) {
    for (const [gid, sen] of Object.entries(k.grup_tutarlari)) {
      if (grup_taban[gid] == null) grup_taban[gid] = sayi(sen.mevcut)
    }
  }
  const olayHam = k.olay_adet as number | Record<string, number> | undefined
  const olay_adet = typeof olayHam === 'number' ? olayHam : sayi(olayHam?.mevcut)
  return {
    id: String(k.id),
    ad: String(k.ad),
    birim: k.birim ?? 'ay',
    prime_esas: Boolean(k.prime_esas),
    grup_idler: k.grup_idler == null ? null : k.grup_idler.map(String),
    grup_ozel: Boolean(k.grup_ozel),
    taban: sayi(k.taban ?? eskiTutar),
    olay_adet,
    grup_taban,
  }
}

export function personelMaliyetBelgeCoz(raw: unknown): PersonelMaliyetBelge | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Partial<PersonelMaliyetBelge>
  if (!Array.isArray(b.gruplar) || !Array.isArray(b.kalemler)) return null
  const kalemler = b.kalemler.map(kalemNormalize).filter((k): k is PersonelMaliyetKalem => k != null)
  if (!kalemler.length) return null
  const oranlar: Record<string, MaliyetOran> = {}
  for (const k of kalemler) {
    const o = b.oranlar?.[k.id]
    oranlar[k.id] = { yil1: sayi(o?.yil1), yil2: sayi(o?.yil2) }
  }
  return {
    sgk_isveren: sayi(b.sgk_isveren ?? 20.75),
    issizlik_isveren: sayi(b.issizlik_isveren ?? 2),
    gruplar: b.gruplar.map(g => ({
      id: String(g.id),
      ad: String(g.ad ?? ''),
      adet: sayi(g.adet),
      fiili_gun: sayi(g.fiili_gun ?? 22),
    })),
    kalemler,
    oranlar,
  }
}
