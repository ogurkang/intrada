import { kazancTaniminiKuralla, type KazancKuralOpts } from '@/lib/kazanc-kural-uygula'
import { unvanMuduruMi } from '@/lib/kazanc-mudur-th-overlay'
import { formatKazancPuan, parseKazancPuan } from '@/lib/kazanc-tasinir-yetkili'
import type { KazancSatirLookup } from '@/lib/kazanc-teknisyen-ek-gosterge'
import { parseDerece } from '@/lib/kazanc-teknisyen-ek-gosterge'
import { parseKidemYili, unvanSinifiThMi, yanOdemeTanimdan } from '@/lib/kazanc-yan-odeme'
import { thYanOdemeYilSec } from '@/lib/th-hizmet-yili'

type KazancPuan = {
  ek_gosterge: string | null
  ek_odeme: string | null
  oht: string | null
  yan_odeme: string | null
  yan_odeme_eksi5: string | null
  yan_odeme_bilgisayarsiz?: string | null
  sds_orani: string | null
}

function kazancSatirToPuan(row: {
  ek_gosterge: string | null
  ek_odeme?: string | null
  oht?: string | null
  yan_odeme?: string | null
  yan_odeme_eksi5?: string | null
  yan_odeme_bilgisayarsiz?: string | null
  sds_orani?: string | null
}): KazancPuan {
  return {
    ek_gosterge: row.ek_gosterge ?? null,
    ek_odeme: row.ek_odeme ?? null,
    oht: row.oht ?? null,
    yan_odeme: row.yan_odeme ?? null,
    yan_odeme_eksi5: row.yan_odeme_eksi5 ?? null,
    yan_odeme_bilgisayarsiz: row.yan_odeme_bilgisayarsiz ?? null,
    sds_orani: row.sds_orani ?? null,
  }
}

export const KAZANC_OK_ISARETI = '→'

/** Vekalet farkına giren kalemler. Ek gösterge kadroya bağlıdır, fark yazılmaz. */
export const KAZANC_VEKIL_FARK_ALANLARI = ['ek_odeme', 'oht', 'yan_odeme', 'sds_orani'] as const

export const KAZANC_FARK_ALANLARI = ['ek_gosterge', ...KAZANC_VEKIL_FARK_ALANLARI] as const

export type KazancFarkAlan = (typeof KAZANC_FARK_ALANLARI)[number]

export type VekilMudurFarkYanCtx = {
  kidemYili?: string | number | null
  thHizmetBaslangic?: string | null
  bilgisayarKullaniyor?: boolean | null
  kendiSinif?: string | null
  mudurSinif?: string | null
}

export function vekilMudurUnvaniMi(unvanAdi: string | null | undefined): boolean {
  return unvanMuduruMi(unvanAdi)
}

/** Kadro durumu vekil ve unvanında «müdürü» geçen kayıt. */
export function vekilMudurFarkKapsamiMi(
  rol: string | null | undefined,
  unvanAdi: string | null | undefined,
): boolean {
  const r = String(rol ?? '').trim().toLowerCase()
  return r === 'vekil' && vekilMudurUnvaniMi(unvanAdi)
}

export function kazancOkMetni(eski: string | null | undefined, yeni: string | null | undefined): string {
  const e = String(eski ?? '').trim() || '—'
  const y = String(yeni ?? '').trim() || '—'
  return `${e} ${KAZANC_OK_ISARETI} ${y}`
}

function farkAlan(mudur: string | null | undefined, kendi: string | null | undefined): string | null {
  const m = parseKazancPuan(mudur)
  const k = parseKazancPuan(kendi)
  if (m == null && k == null) return null
  return formatKazancPuan(Math.max(0, (m ?? 0) - (k ?? 0)))
}

function puanYanOdemeIle(
  puan: KazancPuan,
  unvanAdi: string | null | undefined,
  sinif: string | null | undefined,
  ctx?: VekilMudurFarkYanCtx,
): KazancPuan {
  const thMi = unvanSinifiThMi(sinif)
  const kidem = thYanOdemeYilSec({
    thMi,
    thHizmetBaslangic: ctx?.thHizmetBaslangic,
    kidemYili: parseKidemYili(ctx?.kidemYili),
  })
  const yan = yanOdemeTanimdan(puan, kidem, thMi, unvanAdi, ctx?.bilgisayarKullaniyor)
  return { ...puan, yan_odeme: yan ?? puan.yan_odeme }
}

/** Asil müdür kazancı − kendi asil unvan kazancı; negatif kalem 0. Ek gösterge farka girmez. */
export function kazancVekilMudurFarki(mudur: KazancPuan, kendi: KazancPuan): KazancPuan {
  return {
    ek_gosterge: '0',
    ek_odeme: farkAlan(mudur.ek_odeme, kendi.ek_odeme),
    oht: farkAlan(mudur.oht, kendi.oht),
    yan_odeme: farkAlan(mudur.yan_odeme, kendi.yan_odeme),
    yan_odeme_eksi5: farkAlan(mudur.yan_odeme_eksi5, kendi.yan_odeme_eksi5),
    yan_odeme_bilgisayarsiz: farkAlan(mudur.yan_odeme_bilgisayarsiz, kendi.yan_odeme_bilgisayarsiz),
    sds_orani: farkAlan(mudur.sds_orani, kendi.sds_orani),
  }
}

export function kazancPuanEsit(a: KazancPuan, b: KazancPuan): boolean {
  for (const key of KAZANC_FARK_ALANLARI) {
    const na = parseKazancPuan(a[key])
    const nb = parseKazancPuan(b[key])
    if (na == null && nb == null) {
      if (String(a[key] ?? '').trim() !== String(b[key] ?? '').trim()) return false
      continue
    }
    if (na !== nb) return false
  }
  return true
}

function tanimKuralla(
  lookup: KazancSatirLookup,
  opts: KazancKuralOpts,
  derece: number,
): KazancPuan | null {
  const unvanId = opts.unvanId
  const ogrenimId = opts.ogrenimId
  if (unvanId == null || ogrenimId == null) return null
  const ham = lookup(unvanId, ogrenimId, derece)
  if (!ham) return null
  const kuralli = kazancTaniminiKuralla(
    {
      ek_gosterge: ham.ek_gosterge ?? null,
      ek_odeme: ham.ek_odeme ?? null,
      oht: ham.oht ?? null,
      yan_odeme: ham.yan_odeme ?? null,
      yan_odeme_eksi5: ham.yan_odeme_eksi5 ?? null,
      yan_odeme_bilgisayarsiz: ham.yan_odeme_bilgisayarsiz ?? null,
      sds_orani: ham.sds_orani ?? null,
    },
    lookup,
    { ...opts, khaDerece: derece },
  )
  return kazancSatirToPuan({
    ek_gosterge: kuralli.ek_gosterge ?? null,
    ek_odeme: kuralli.ek_odeme ?? null,
    oht: kuralli.oht ?? null,
    yan_odeme: kuralli.yan_odeme ?? null,
    yan_odeme_eksi5: kuralli.yan_odeme_eksi5 ?? null,
    yan_odeme_bilgisayarsiz: kuralli.yan_odeme_bilgisayarsiz ?? null,
    sds_orani: kuralli.sds_orani ?? null,
  })
}

/** Müdür kadrosunun tanımı KHA’da yoksa kadro derecesi, sonra 1. derece denenir. */
function mudurDereceAdaylari(
  kha: number,
  kadroDerecesi: string | number | null | undefined,
): number[] {
  const aday: number[] = []
  const ekle = (d: number | null | undefined) => {
    if (d == null || d <= 0 || aday.includes(d)) return
    aday.push(d)
  }
  ekle(parseDerece(kadroDerecesi))
  ekle(1)
  ekle(kha)
  return aday
}

export function vekilMudurFarkHesapla(input: {
  lookup: KazancSatirLookup
  khaDerece: number | string | null | undefined
  kendiOpts: KazancKuralOpts
  mudurOpts: KazancKuralOpts
  yanCtx?: VekilMudurFarkYanCtx
}): { kendi: KazancPuan; mudur: KazancPuan; fark: KazancPuan } | null {
  const kha = parseDerece(input.khaDerece)
  if (kha == null) return null
  if (!vekilMudurUnvaniMi(input.mudurOpts.unvanAdi)) return null
  const kendiHam = tanimKuralla(input.lookup, { ...input.kendiOpts, asilMi: true, khaDerece: kha }, kha)
  let mudurHam: KazancPuan | null = null
  for (const derece of mudurDereceAdaylari(kha, input.mudurOpts.kadroDerecesi)) {
    mudurHam = tanimKuralla(input.lookup, { ...input.mudurOpts, asilMi: true, khaDerece: derece }, derece)
    if (mudurHam) break
  }
  if (!kendiHam || !mudurHam) return null
  const kendi = puanYanOdemeIle(kendiHam, input.kendiOpts.unvanAdi, input.yanCtx?.kendiSinif, input.yanCtx)
  const mudur = puanYanOdemeIle(mudurHam, input.mudurOpts.unvanAdi, input.yanCtx?.mudurSinif, input.yanCtx)
  return { kendi, mudur, fark: kazancVekilMudurFarki(mudur, kendi) }
}
