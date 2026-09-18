import { unvanAdiNorm } from '@/lib/kazanc-yan-odeme'
import { OGRENIM_TURU_SIRA, ogrenimTuruSiraIndex } from '@/lib/ogrenim-sira'

const ONLISANS_SIRA = OGRENIM_TURU_SIRA.indexOf('Önlisans')
const LISANS_SIRA = OGRENIM_TURU_SIRA.indexOf('Lisans')
const BILINMEYEN_OGRENIM_SIRA = 9000

export type KazancSatirLookup = (
  unvanId: number,
  ogrenimId: number,
  derece: number,
) => {
  ek_gosterge: string | null
  ek_odeme?: string | null
  oht?: string | null
  yan_odeme?: string | null
  yan_odeme_eksi5?: string | null
  yan_odeme_bilgisayarsiz?: string | null
  sds_orani?: string | null
} | null

/** Tekniker / Bilgisayar İşletmeni / Kimyager / Kütüphaneci / Mühendis satırlarını kazanç haritasından bulmak için id’ler. */
export type TeknisyenEkGostergeBaglam = {
  teknikerUnvanId: number | null
  bilgisayarIsletmeniUnvanId: number | null
  kimyagerUnvanId: number | null
  kutuphaneciUnvanId: number | null
  muhendisUnvanId: number | null
  icMimarUnvanId: number | null
  peyzajMimarUnvanId: number | null
  /** Lisans ve Önlisans `tanim_ogrenim.id` — tanımlar aynı, sırayla denenir. */
  lisansOnlisansOgrenimIds: number[]
}

export function unvanTeknisyenMi(unvanAdi: string | null | undefined): boolean {
  return unvanAdiNorm(unvanAdi) === 'TEKNISYEN'
}

export function unvanTeknikerMi(unvanAdi: string | null | undefined): boolean {
  return unvanAdiNorm(unvanAdi) === 'TEKNIKER'
}

/** Önlisans ve üzeri (lisans, yüksek lisans, doktora). */
export function ogrenimYuksekMi(ogrenimTuru: string | null | undefined): boolean {
  const idx = ogrenimTuruSiraIndex(ogrenimTuru)
  return idx >= ONLISANS_SIRA && idx < BILINMEYEN_OGRENIM_SIRA
}

export function parseDerece(v: string | number | null | undefined): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number.parseInt(String(v).trim(), 10)
  return Number.isFinite(n) && n >= 1 ? n : null
}

/** 657: küçük sayı daha yüksek derecedir (1 > 5). */
export function yuksekDerece657(
  ...dereceler: Array<number | null | undefined>
): number | null {
  const valid = dereceler.filter((d): d is number => d != null && Number.isFinite(d) && d >= 1)
  if (!valid.length) return null
  return Math.min(...valid)
}

/** Şartsız personelde bakılan en düşük 657 derecesi (1 yüksek, 5 düşük). */
export const KAZANC_YUKSEK_DERECE_TABAN = 5

export function derece1Ile5Mi(derece: number | null | undefined): boolean {
  return derece != null && Number.isFinite(derece) && derece >= 1 && derece <= KAZANC_YUKSEK_DERECE_TABAN
}

/** Kadro ve KHA ikisi de 1–5 olmalı; biri 6+ ise kural yok (yalnız biri 5 yetmez). */
export function kadroVeKha1Ile5Mi(
  kadroDerecesi: string | number | null | undefined,
  khaDerece: string | number | null | undefined,
): boolean {
  const kadro = parseDerece(kadroDerecesi)
  const kha = parseDerece(khaDerece)
  return derece1Ile5Mi(kadro) && derece1Ile5Mi(kha)
}

export function lisansOnlisansOgrenimIdsBul(
  tanimOgList: Array<{ id: number; isim: string }>,
): number[] {
  const lisans: number[] = []
  const onlisans: number[] = []
  for (const o of tanimOgList) {
    const idx = ogrenimTuruSiraIndex(o.isim)
    if (idx === LISANS_SIRA) lisans.push(o.id)
    else if (idx === ONLISANS_SIRA) onlisans.push(o.id)
  }
  return [...lisans, ...onlisans]
}

export function unvanIdAdindanBul(
  unvanlar: Array<{ id: number; unvan_adi: string | null }>,
  hedefAd: string,
): number | null {
  const hedef = unvanAdiNorm(hedefAd)
  const bulunan = unvanlar.find(u => unvanAdiNorm(u.unvan_adi) === hedef)
  return bulunan?.id ?? null
}

export function teknisyenEkGostergeBaglamKur(input: {
  unvanlar: Array<{ id: number; unvan_adi: string | null }>
  tanimOgList: Array<{ id: number; isim: string }>
}): TeknisyenEkGostergeBaglam {
  return {
    teknikerUnvanId: unvanIdAdindanBul(input.unvanlar, 'Tekniker'),
    bilgisayarIsletmeniUnvanId: unvanIdAdindanBul(input.unvanlar, 'Bilgisayar İşletmeni'),
    kimyagerUnvanId: unvanIdAdindanBul(input.unvanlar, 'Kimyager'),
    kutuphaneciUnvanId: unvanIdAdindanBul(input.unvanlar, 'Kütüphaneci'),
    muhendisUnvanId: unvanIdAdindanBul(input.unvanlar, 'Mühendis'),
    icMimarUnvanId: unvanIdAdindanBul(input.unvanlar, 'İç Mimar'),
    peyzajMimarUnvanId: unvanIdAdindanBul(input.unvanlar, 'Peyzaj Mimarı'),
    lisansOnlisansOgrenimIds: lisansOnlisansOgrenimIdsBul(input.tanimOgList),
  }
}

function kazancSatirOku(
  lookup: KazancSatirLookup,
  unvanId: number | null,
  derece: number,
  ogrenimIds: number[],
): NonNullable<ReturnType<KazancSatirLookup>> | null {
  if (unvanId == null || !ogrenimIds.length) return null
  for (const ogId of ogrenimIds) {
    const row = lookup(unvanId, ogId, derece)
    if (row) return row
  }
  return null
}

function doluMetin(v: string | null | undefined): string | null {
  const t = String(v ?? '').trim()
  return t ? (v ?? null) : null
}

export type TeknisyenKariyerUnvan = 'tekniker' | 'muhendis'

/**
 * Kadrosu ile ilgili işaretli yüksek öğrenim kayıtlarından kariyer unvanı.
 * Önlisans → Tekniker; lisans ve üzeri (YL / doktora) → Mühendis.
 * Birden fazla işaret varsa en yüksek tür seçilir.
 */
export function teknisyenKariyerUnvanFromOgrenimRows(
  rows: Array<{ ogrenim_turu?: string | null; kadrosu_ile_ilgili?: boolean | null }>,
): TeknisyenKariyerUnvan | null {
  let bestIdx = -1
  for (const r of rows) {
    if (!r.kadrosu_ile_ilgili) continue
    if (!ogrenimYuksekMi(r.ogrenim_turu)) continue
    const idx = ogrenimTuruSiraIndex(r.ogrenim_turu)
    if (idx > bestIdx) bestIdx = idx
  }
  if (bestIdx < 0) return null
  if (bestIdx >= LISANS_SIRA && bestIdx < BILINMEYEN_OGRENIM_SIRA) return 'muhendis'
  return 'tekniker'
}

function teknisyenKariyerUnvanId(
  baglam: TeknisyenEkGostergeBaglam,
  kariyer: TeknisyenKariyerUnvan,
): number | null {
  return kariyer === 'muhendis' ? baglam.muhendisUnvanId : baglam.teknikerUnvanId
}

/**
 * Teknisyen + önlisans/üstü öğrenim:
 * kadrosu ile ilgili → ÖHT ve yan ödeme (−5/+5) kariyer unvanından
 * (önlisans: Tekniker, lisans+: Mühendis); ek gösterge, ek ödeme, SDS teknisyende kalır.
 * değilse → yalnızca ek göstergeyi Bilgisayar İşletmeni tanımından alır.
 */
export function teknisyenEkGostergeUygula<
  T extends {
    ek_gosterge: string | null
    ek_odeme?: string | null
    oht?: string | null
    yan_odeme?: string | null
    yan_odeme_eksi5?: string | null
    sds_orani?: string | null
  },
>(
  puan: T,
  lookup: KazancSatirLookup,
  opts: {
    unvanAdi: string | null | undefined
    kadroDerecesi: string | null | undefined
    khaDerece: number | null | undefined
    yuksekOgrenimVar: boolean
    kadrosuIleIlgili: boolean
    teknisyenKariyer?: TeknisyenKariyerUnvan | null
    baglam: TeknisyenEkGostergeBaglam | null | undefined
  },
): T {
  const baglam = opts.baglam
  if (!baglam) return puan
  if (!unvanTeknisyenMi(opts.unvanAdi) || !opts.yuksekOgrenimVar) return puan

  const derece = yuksekDerece657(parseDerece(opts.kadroDerecesi), parseDerece(opts.khaDerece))
  if (derece == null) return puan

  if (!opts.kadrosuIleIlgili) {
    const biId = baglam.bilgisayarIsletmeniUnvanId
    if (biId == null) return puan
    for (const ogId of baglam.lisansOnlisansOgrenimIds) {
      const ek = doluMetin(lookup(biId, ogId, derece)?.ek_gosterge)
      if (ek != null) return { ...puan, ek_gosterge: ek }
    }
    return puan
  }

  const kariyer: TeknisyenKariyerUnvan = opts.teknisyenKariyer === 'muhendis' ? 'muhendis' : 'tekniker'
  const hedef = kazancSatirOku(
    lookup,
    teknisyenKariyerUnvanId(baglam, kariyer),
    derece,
    baglam.lisansOnlisansOgrenimIds,
  )
  if (!hedef) return puan

  let sonraki: T = puan
  const oht = doluMetin(hedef.oht)
  if (oht != null) sonraki = { ...sonraki, oht }
  const yan = doluMetin(hedef.yan_odeme)
  if (yan != null) sonraki = { ...sonraki, yan_odeme: yan }
  const yanEksi5 = doluMetin(hedef.yan_odeme_eksi5)
  if (yanEksi5 != null) sonraki = { ...sonraki, yan_odeme_eksi5: yanEksi5 }
  return sonraki
}

/**
 * Tekniker + varsayılan öğrenimde Teknik Öğrenim tiki:
 * ek gösterge Kimyager, yan ödeme (−5 / +5 sütunları) Kütüphaneci lisans/önlisans tanımından.
 * Ek ödeme, ÖHT, SDS Tekniker tanımında kalır.
 */
export function teknikerTeknikOgrenimUygula<
  T extends {
    ek_gosterge: string | null
    yan_odeme?: string | null
    yan_odeme_eksi5?: string | null
  },
>(
  puan: T,
  lookup: KazancSatirLookup,
  opts: {
    unvanAdi: string | null | undefined
    kadroDerecesi: string | null | undefined
    khaDerece: number | null | undefined
    teknikOgrenim: boolean
    baglam: TeknisyenEkGostergeBaglam | null | undefined
  },
): T {
  const baglam = opts.baglam
  if (!baglam) return puan
  if (!unvanTeknikerMi(opts.unvanAdi) || !opts.teknikOgrenim) return puan

  const derece = yuksekDerece657(parseDerece(opts.kadroDerecesi), parseDerece(opts.khaDerece))
  if (derece == null) return puan

  let sonraki: T = puan
  const kimyagerId = baglam.kimyagerUnvanId
  if (kimyagerId != null) {
    for (const ogId of baglam.lisansOnlisansOgrenimIds) {
      const ek = doluMetin(lookup(kimyagerId, ogId, derece)?.ek_gosterge)
      if (ek != null) {
        sonraki = { ...sonraki, ek_gosterge: ek }
        break
      }
    }
  }

  const kutup = kazancSatirOku(lookup, baglam.kutuphaneciUnvanId, derece, baglam.lisansOnlisansOgrenimIds)
  if (kutup) {
    sonraki = {
      ...sonraki,
      yan_odeme: kutup.yan_odeme ?? sonraki.yan_odeme ?? null,
      yan_odeme_eksi5: kutup.yan_odeme_eksi5 ?? sonraki.yan_odeme_eksi5 ?? null,
    }
  }
  return sonraki
}

export type TeknisyenOgrenimUyum = 'uyumlu_tekniker' | 'uyumlu_muhendis' | 'uyumsuz'

/** Teknisyen + yüksek öğrenim kuralı varsa: ilgili → kariyer (Tekniker/Mühendis), değilse uyumsuz (Bİ). */
export function teknisyenOgrenimUyum(
  opts: {
    unvanAdi: string | null | undefined
    yuksekOgrenimVar: boolean
    kadrosuIleIlgili: boolean
    teknisyenKariyer?: TeknisyenKariyerUnvan | null
  },
): TeknisyenOgrenimUyum | null {
  if (!unvanTeknisyenMi(opts.unvanAdi) || !opts.yuksekOgrenimVar) return null
  if (!opts.kadrosuIleIlgili) return 'uyumsuz'
  return opts.teknisyenKariyer === 'muhendis' ? 'uyumlu_muhendis' : 'uyumlu_tekniker'
}

export function teknisyenOgrenimUyumEtiket(uyum: TeknisyenOgrenimUyum | null | undefined): string | null {
  if (uyum === 'uyumlu_tekniker') return 'Öğrenim Uyumlu (Tekniker)'
  if (uyum === 'uyumlu_muhendis') return 'Öğrenim Uyumlu (Mühendis)'
  if (uyum === 'uyumsuz') return 'Öğrenim Uyumsuz'
  return null
}
