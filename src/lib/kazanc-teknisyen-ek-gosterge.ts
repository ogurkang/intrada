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
  sds_orani?: string | null
} | null

/** Tekniker / Bilgisayar İşletmeni / Kimyager / Kütüphaneci satırlarını kazanç haritasından bulmak için id’ler. */
export type TeknisyenEkGostergeBaglam = {
  teknikerUnvanId: number | null
  bilgisayarIsletmeniUnvanId: number | null
  kimyagerUnvanId: number | null
  kutuphaneciUnvanId: number | null
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

/**
 * Teknisyen + önlisans/üstü öğrenim:
 * kadrosu ile ilgili → Tekniker tanımından ek gösterge, ek ödeme, ÖHT, yan ödeme, SDS;
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

  const hedef = kazancSatirOku(lookup, baglam.teknikerUnvanId, derece, baglam.lisansOnlisansOgrenimIds)
  if (!hedef) return puan

  return {
    ...puan,
    ek_gosterge: hedef.ek_gosterge ?? null,
    ek_odeme: hedef.ek_odeme ?? null,
    oht: hedef.oht ?? null,
    yan_odeme: hedef.yan_odeme ?? null,
    yan_odeme_eksi5: hedef.yan_odeme_eksi5 ?? null,
    sds_orani: hedef.sds_orani ?? null,
  }
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

export type TeknisyenOgrenimUyum = 'uyumlu' | 'uyumsuz'

/** Teknisyen + yüksek öğrenim kuralı varsa: ilgili → uyumlu (Tekniker), değilse uyumsuz (Bİ). */
export function teknisyenOgrenimUyum(
  opts: {
    unvanAdi: string | null | undefined
    yuksekOgrenimVar: boolean
    kadrosuIleIlgili: boolean
  },
): TeknisyenOgrenimUyum | null {
  if (!unvanTeknisyenMi(opts.unvanAdi) || !opts.yuksekOgrenimVar) return null
  return opts.kadrosuIleIlgili ? 'uyumlu' : 'uyumsuz'
}

export function teknisyenOgrenimUyumEtiket(uyum: TeknisyenOgrenimUyum | null | undefined): string | null {
  if (uyum === 'uyumlu') return 'Öğrenim Uyumlu'
  if (uyum === 'uyumsuz') return 'Öğrenim Uyumsuz'
  return null
}
