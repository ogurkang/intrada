import { mudurOhtYuksekDerecedenUygula, mudurThKariyerUygula } from '@/lib/kazanc-mudur-th-overlay'
import { unvanOzelKalemMuduruMi } from '@/lib/kazanc-ozel-kalem'
import {
  kadroVeKha1Ile5Mi,
  parseDerece,
  teknikerTeknikOgrenimUygula,
  teknisyenEkGostergeUygula,
  yuksekDerece657,
  type KazancSatirLookup,
  type TeknisyenEkGostergeBaglam,
  type TeknisyenKariyerUnvan,
} from '@/lib/kazanc-teknisyen-ek-gosterge'

export type KazancKuralOpts = {
  unvanId: number | null | undefined
  ogrenimId: number | null | undefined
  unvanAdi: string | null | undefined
  kadroDerecesi: string | number | null | undefined
  khaDerece: number | null | undefined
  yuksekOgrenimVar: boolean
  kadrosuIleIlgili: boolean
  teknisyenKariyer?: TeknisyenKariyerUnvan | null
  teknikOgrenim: boolean
  asilMi: boolean
  destekYardimciBirim: boolean
  meslegi: string | null | undefined
  bolum: string | null | undefined
  baglam: TeknisyenEkGostergeBaglam | null | undefined
}

function doluMetin(v: string | null | undefined): string | null {
  const t = String(v ?? '').trim()
  return t ? t : null
}

/** İkisi de 1–5 ise kadro/KHA’dan yüksek 657 derecesi; KHA ile aynıysa yok. */
function yuksekDerece1Ile5(
  kadroDerecesi: string | number | null | undefined,
  khaDerece: number | null | undefined,
): number | null {
  if (!kadroVeKha1Ile5Mi(kadroDerecesi, khaDerece)) return null
  const yuksek = yuksekDerece657(parseDerece(kadroDerecesi), parseDerece(khaDerece))
  const kha = parseDerece(khaDerece)
  if (yuksek == null) return null
  if (kha != null && yuksek === kha) return null
  return yuksek
}

/** Ek gösterge: kadro ve KHA 1–5 ise yüksek 657 derecesi. Ek ödeme KHA’da kalır. */
export function ekGostergeYuksekDerecedenUygula<T extends { ek_gosterge: string | null }>(
  puan: T,
  lookup: KazancSatirLookup,
  opts: {
    unvanId: number | null | undefined
    ogrenimId: number | null | undefined
    kadroDerecesi: string | number | null | undefined
    khaDerece: number | null | undefined
  },
): T {
  const unvanId = opts.unvanId
  const ogrenimId = opts.ogrenimId
  if (unvanId == null || ogrenimId == null) return puan
  const ekDerece = yuksekDerece1Ile5(opts.kadroDerecesi, opts.khaDerece)
  if (ekDerece == null) return puan
  const ek = doluMetin(lookup(unvanId, ogrenimId, ekDerece)?.ek_gosterge)
  if (ek == null) return puan
  return { ...puan, ek_gosterge: ek }
}

/** ÖHT: kadro ve KHA 1–5 ise yüksek 657 derecesi. Overlay’ler sonra kendi şartıyla ezer. */
export function ohtYuksekDerecedenUygula<T extends { oht?: string | null }>(
  puan: T,
  lookup: KazancSatirLookup,
  opts: {
    unvanId: number | null | undefined
    ogrenimId: number | null | undefined
    kadroDerecesi: string | number | null | undefined
    khaDerece: number | null | undefined
  },
): T {
  const unvanId = opts.unvanId
  const ogrenimId = opts.ogrenimId
  if (unvanId == null || ogrenimId == null) return puan
  const ohtDerece = yuksekDerece1Ile5(opts.kadroDerecesi, opts.khaDerece)
  if (ohtDerece == null) return puan
  const oht = doluMetin(lookup(unvanId, ogrenimId, ohtDerece)?.oht)
  if (oht == null) return puan
  return { ...puan, oht }
}

/**
 * KHA derecesindeki kazanç tanımına sıra ile:
 * 1) kadro ve KHA 1–5 ise ek gösterge ve ÖHT’yi yüksek 657 derecesinden al (ek ödeme / yan ödeme KHA)
 * 2) teknisyen overlay (uyumlu: ÖHT/yan ödeme kariyer; uyumsuz: ek gösterge Bİ)
 * 3) tekniker + teknik öğrenim overlay
 * 4) asil müdür ÖHT’yi yüksek 657 derecesinden al
 * 5) asil müdür + TH kariyer overlay
 * Özel Kalem Müdürü: 1. derece satırı olduğu gibi kalır (KHA yok sayılır).
 */
export function kazancTaniminiKuralla<
  T extends {
    ek_gosterge: string | null
    ek_odeme?: string | null
    oht?: string | null
    yan_odeme?: string | null
    yan_odeme_eksi5?: string | null
    sds_orani?: string | null
  },
>(puan: T, lookup: KazancSatirLookup, opts: KazancKuralOpts): T {
  if (unvanOzelKalemMuduruMi(opts.unvanAdi)) return puan
  const dereceOpts = {
    unvanId: opts.unvanId,
    ogrenimId: opts.ogrenimId,
    kadroDerecesi: opts.kadroDerecesi,
    khaDerece: opts.khaDerece,
  }
  let sonraki = ekGostergeYuksekDerecedenUygula(puan, lookup, dereceOpts)
  sonraki = ohtYuksekDerecedenUygula(sonraki, lookup, dereceOpts)
  sonraki = teknisyenEkGostergeUygula(sonraki, lookup, {
    unvanAdi: opts.unvanAdi,
    kadroDerecesi: opts.kadroDerecesi == null ? null : String(opts.kadroDerecesi),
    khaDerece: opts.khaDerece,
    yuksekOgrenimVar: opts.yuksekOgrenimVar,
    kadrosuIleIlgili: opts.kadrosuIleIlgili,
    teknisyenKariyer: opts.teknisyenKariyer ?? null,
    baglam: opts.baglam,
  })
  sonraki = teknikerTeknikOgrenimUygula(sonraki, lookup, {
    unvanAdi: opts.unvanAdi,
    kadroDerecesi: opts.kadroDerecesi == null ? null : String(opts.kadroDerecesi),
    khaDerece: opts.khaDerece,
    teknikOgrenim: opts.teknikOgrenim,
    baglam: opts.baglam,
  })
  sonraki = mudurOhtYuksekDerecedenUygula(sonraki, lookup, {
    unvanId: opts.unvanId,
    ogrenimId: opts.ogrenimId,
    unvanAdi: opts.unvanAdi,
    kadroDerecesi: opts.kadroDerecesi,
    khaDerece: opts.khaDerece,
    asilMi: opts.asilMi,
  })
  sonraki = mudurThKariyerUygula(sonraki, lookup, {
    unvanAdi: opts.unvanAdi,
    kadroDerecesi: opts.kadroDerecesi,
    khaDerece: opts.khaDerece,
    asilMi: opts.asilMi,
    destekYardimciBirim: opts.destekYardimciBirim,
    meslegi: opts.meslegi,
    bolum: opts.bolum,
    baglam: opts.baglam,
  })
  return sonraki
}

export function terfiKaynaktanKuralOpts(r: {
  unvan_id: number | null
  ogrenim_id: number | null
  unvan_adi: string | null
  kadro_derecesi: string | null
  kha_derece?: string | null
  yuksek_ogrenim_var: boolean
  kadrosu_ile_ilgili: boolean
  teknisyen_kariyer?: TeknisyenKariyerUnvan | null
  teknik_ogrenim: boolean
  asil_mi?: boolean
  destek_yardimci_birim?: boolean
  ogrenim_meslegi?: string | null
  ogrenim_bolum?: string | null
}, khaDerece: number | null | undefined, baglam: TeknisyenEkGostergeBaglam | null | undefined): KazancKuralOpts {
  return {
    unvanId: r.unvan_id,
    ogrenimId: r.ogrenim_id,
    unvanAdi: r.unvan_adi,
    kadroDerecesi: r.kadro_derecesi,
    khaDerece,
    yuksekOgrenimVar: r.yuksek_ogrenim_var,
    kadrosuIleIlgili: r.kadrosu_ile_ilgili,
    teknisyenKariyer: r.teknisyen_kariyer ?? null,
    teknikOgrenim: r.teknik_ogrenim,
    asilMi: r.asil_mi === true,
    destekYardimciBirim: r.destek_yardimci_birim === true,
    meslegi: r.ogrenim_meslegi ?? null,
    bolum: r.ogrenim_bolum ?? null,
    baglam,
  }
}
