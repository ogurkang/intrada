import { mudurThKariyerUygula } from '@/lib/kazanc-mudur-th-overlay'
import {
  parseDerece,
  teknikerTeknikOgrenimUygula,
  teknisyenEkGostergeUygula,
  yuksekDerece657,
  type KazancSatirLookup,
  type TeknisyenEkGostergeBaglam,
} from '@/lib/kazanc-teknisyen-ek-gosterge'

export type KazancKuralOpts = {
  unvanId: number | null | undefined
  ogrenimId: number | null | undefined
  unvanAdi: string | null | undefined
  kadroDerecesi: string | number | null | undefined
  khaDerece: number | null | undefined
  yuksekOgrenimVar: boolean
  kadrosuIleIlgili: boolean
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

/** Ek gösterge satırını kadro/KHA’dan 657’ye göre yüksek olan dereceden alır. */
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
  const ekDerece = yuksekDerece657(parseDerece(opts.kadroDerecesi), parseDerece(opts.khaDerece))
  const kha = parseDerece(opts.khaDerece)
  if (ekDerece == null) return puan
  if (kha != null && ekDerece === kha) return puan
  const ek = doluMetin(lookup(unvanId, ogrenimId, ekDerece)?.ek_gosterge)
  if (ek == null) return puan
  return { ...puan, ek_gosterge: ek }
}

/**
 * KHA derecesindeki kazanç tanımına sıra ile:
 * 1) ek göstergeyi yüksek 657 derecesinden al
 * 2) teknisyen overlay
 * 3) tekniker + teknik öğrenim overlay
 * 4) asil müdür + TH kariyer overlay
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
  let sonraki = ekGostergeYuksekDerecedenUygula(puan, lookup, {
    unvanId: opts.unvanId,
    ogrenimId: opts.ogrenimId,
    kadroDerecesi: opts.kadroDerecesi,
    khaDerece: opts.khaDerece,
  })
  sonraki = teknisyenEkGostergeUygula(sonraki, lookup, {
    unvanAdi: opts.unvanAdi,
    kadroDerecesi: opts.kadroDerecesi == null ? null : String(opts.kadroDerecesi),
    khaDerece: opts.khaDerece,
    yuksekOgrenimVar: opts.yuksekOgrenimVar,
    kadrosuIleIlgili: opts.kadrosuIleIlgili,
    baglam: opts.baglam,
  })
  sonraki = teknikerTeknikOgrenimUygula(sonraki, lookup, {
    unvanAdi: opts.unvanAdi,
    kadroDerecesi: opts.kadroDerecesi == null ? null : String(opts.kadroDerecesi),
    khaDerece: opts.khaDerece,
    teknikOgrenim: opts.teknikOgrenim,
    baglam: opts.baglam,
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
    teknikOgrenim: r.teknik_ogrenim,
    asilMi: r.asil_mi === true,
    destekYardimciBirim: r.destek_yardimci_birim === true,
    meslegi: r.ogrenim_meslegi ?? null,
    bolum: r.ogrenim_bolum ?? null,
    baglam,
  }
}
