import { unvanAdiNorm } from '@/lib/kazanc-yan-odeme'
import { OGRENIM_TURU_SIRA, ogrenimTuruSiraIndex } from '@/lib/ogrenim-sira'

const ONLISANS_SIRA = OGRENIM_TURU_SIRA.indexOf('Önlisans')
const LISANS_SIRA = OGRENIM_TURU_SIRA.indexOf('Lisans')
const BILINMEYEN_OGRENIM_SIRA = 9000

export type KazancSatirLookup = (
  unvanId: number,
  ogrenimId: number,
  derece: number,
) => { ek_gosterge: string | null } | null

/** Tekniker / Bilgisayar İşletmeni satırlarını kazanç haritasından bulmak için id’ler. */
export type TeknisyenEkGostergeBaglam = {
  teknikerUnvanId: number | null
  bilgisayarIsletmeniUnvanId: number | null
  /** Lisans ve Önlisans `tanim_ogrenim.id` — tanımlar aynı, sırayla denenir. */
  lisansOnlisansOgrenimIds: number[]
}

export function unvanTeknisyenMi(unvanAdi: string | null | undefined): boolean {
  return unvanAdiNorm(unvanAdi) === 'TEKNISYEN'
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
    lisansOnlisansOgrenimIds: lisansOnlisansOgrenimIdsBul(input.tanimOgList),
  }
}

function ekGostergeOku(
  lookup: KazancSatirLookup,
  unvanId: number | null,
  derece: number,
  ogrenimIds: number[],
): string | null {
  if (unvanId == null || !ogrenimIds.length) return null
  for (const ogId of ogrenimIds) {
    const row = lookup(unvanId, ogId, derece)
    const v = String(row?.ek_gosterge ?? '').trim()
    if (v) return row!.ek_gosterge ?? null
  }
  return null
}

/**
 * Teknisyen + önlisans/üstü öğrenimde yalnızca ek göstergeyi
 * Tekniker veya Bilgisayar İşletmeni tanımından yazar.
 * Diğer kazanç alanları olduğu gibi kalır.
 */
export function teknisyenEkGostergeUygula<T extends { ek_gosterge: string | null }>(
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

  const hedefUnvanId = opts.kadrosuIleIlgili
    ? baglam.teknikerUnvanId
    : baglam.bilgisayarIsletmeniUnvanId
  const ek = ekGostergeOku(lookup, hedefUnvanId, derece, baglam.lisansOnlisansOgrenimIds)
  if (ek == null) return puan
  return { ...puan, ek_gosterge: ek }
}
